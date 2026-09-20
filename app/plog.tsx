import { useLocalSearchParams, useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';
import { Image, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, { useAnimatedStyle, useSharedValue } from 'react-native-reanimated';
import * as ImagePicker from 'expo-image-picker';
import Svg, { Polyline } from 'react-native-svg';
import { Button, DotsBg, Press, Sub, Tape, haptic } from '../src/components/ui';
import { cutoutSticker } from '../src/lib/cutout';
import { takePendingPhoto } from '../src/lib/pendingPhoto';
import { todayKey } from '../src/lib/date';
import { useJournalStore } from '../src/store/journal';
import { C, FONT, R, SH } from '../src/theme';
import type { JournalKind, JournalSticker } from '../src/types';

const KIND_ZH: Record<JournalKind, string> = { workout: '训练', meal: '饮食', free: '日常' };
const PEN_COLORS = [C.accent, C.good, C.info, C.pink];
const DEFAULT_POS = [
  { x: 0.24, y: 0.24, rot: -9 },
  { x: 0.62, y: 0.3, rot: 7 },
  { x: 0.32, y: 0.58, rot: -5 },
  { x: 0.66, y: 0.6, rot: 11 },
];

interface DrawPath { id: string; color: string; width: number; points: number[][] }

export default function PlogScreen() {
  const router = useRouter();
  const params = useLocalSearchParams<{ kind?: string; title?: string; stats?: string; id?: string }>();
  const addEntry = useJournalStore((s) => s.add);
  const updateEntry = useJournalStore((s) => s.update);
  const allEntries = useJournalStore((s) => s.entries);
  // 编辑模式：带上 id 进入，载入既有内容
  const editingEntry = typeof params.id === 'string' ? allEntries.find((e) => e.id === params.id) ?? null : null;
  const editing = editingEntry !== null;

  const [kind, setKind] = useState<JournalKind>((['workout', 'meal', 'free'] as const).includes(params.kind as JournalKind) ? (params.kind as JournalKind) : 'free');
  const [note, setNote] = useState('');
  const [stickers, setStickers] = useState<JournalSticker[]>([]);
  const [paths, setPaths] = useState<DrawPath[]>([]);
  const [tool, setTool] = useState<'sticker' | 'pen'>('sticker');
  const [penColor, setPenColor] = useState(PEN_COLORS[0]);
  const [selected, setSelected] = useState<string | null>(null);
  const [canvas, setCanvas] = useState({ w: 0, h: 0 });
  const [cutting, setCutting] = useState(false);
  const activePath = useRef<DrawPath | null>(null);

  // 载入待编辑的手帐内容（只执行一次）
  const loaded = useRef(false);
  useEffect(() => {
    if (loaded.current || !editingEntry) return;
    loaded.current = true;
    setKind(editingEntry.kind);
    setNote(editingEntry.note);
    setStickers(editingEntry.stickers);
    setPaths(editingEntry.doodles);
  }, [editingEntry]);

  // 接住从「拍照识餐」等页面传来的照片，自动贴上并预填
  const consumedPending = useRef(false);
  useEffect(() => {
    if (consumedPending.current || editingEntry) return;
    consumedPending.current = true;
    const p = takePendingPhoto();
    if (p) {
      if (p.kind) setKind(p.kind);
      if (p.note) setNote(p.note);
      void addPhotoAsSticker(p.uri);
    }
  }, []);

  const d = new Date();
  const dateText = `${d.getFullYear()}.${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`;

  const addSticker = (uri: string, meta?: { cutout?: boolean; iw?: number; ih?: number }) => {
    const i = stickers.length % DEFAULT_POS.length;
    const p = DEFAULT_POS[i];
    setStickers((arr) => [
      ...arr,
      { id: `st-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`, uri, x: p.x, y: p.y, rot: p.rot, scale: 1, cutout: meta?.cutout, iw: meta?.iw, ih: meta?.ih },
    ]);
  };

  /** 原生端自动抠图描边；Web 端或失败时回退整张照片 */
  const addPhotoAsSticker = async (uri: string) => {
    haptic('light');
    if (Platform.OS !== 'web') {
      setCutting(true);
      try {
        const res = await cutoutSticker(uri);
        if (res) {
          addSticker(res.uri, { cutout: true, iw: res.width, ih: res.height });
          return;
        }
      } finally {
        setCutting(false);
      }
    }
    addSticker(uri);
  };

  const pickPhoto = async (fromCamera: boolean) => {
    haptic('light');
    try {
      const opts: ImagePicker.ImagePickerOptions = { mediaTypes: ['images'], quality: 0.6, base64: true, allowsEditing: false };
      const res = fromCamera
        ? await ImagePicker.launchCameraAsync(opts)
        : await ImagePicker.launchImageLibraryAsync({ ...opts, allowsMultipleSelection: true });
      if (res.canceled) return;
      for (const asset of res.assets) {
        await addPhotoAsSticker(asset.base64 ? `data:image/jpeg;base64,${asset.base64}` : asset.uri);
      }
    } catch {
      // 用户取消或权限拒绝时静默
    }
  };

  const commitSticker = (id: string, x: number, y: number) => {
    setStickers((arr) => arr.map((s) => (s.id === id ? { ...s, x, y } : s)));
  };

  const mutateSelected = (fn: (s: JournalSticker) => JournalSticker) => {
    if (!selected) return;
    haptic('light');
    setStickers((arr) => arr.map((s) => (s.id === selected ? fn(s) : s)));
  };

  /* ---------- 涂鸦手势 ---------- */

  const drawGesture = Gesture.Pan()
    .runOnJS(true)
    .onBegin((e) => {
      if (!canvas.w || !canvas.h) return;
      activePath.current = { id: `dp-${Date.now()}`, color: penColor, width: 4, points: [[e.x / canvas.w, e.y / canvas.h]] };
      setPaths((arr) => [...arr, activePath.current!]);
    })
    .onUpdate((e) => {
      if (!activePath.current || !canvas.w || !canvas.h) return;
      activePath.current.points.push([e.x / canvas.w, e.y / canvas.h]);
      setPaths((arr) => [...arr]);
    })
    .onEnd(() => { activePath.current = null; });

  const save = () => {
    const doodles = paths.map((p) => ({ id: p.id, color: p.color, width: p.width, points: p.points }));
    if (editingEntry) {
      // 编辑既有手帐：保留 id / 日期 / 标题 / 训练数据
      updateEntry({
        ...editingEntry,
        kind,
        note: note.trim(),
        stickers,
        doodles,
      });
    } else {
      addEntry({
        id: `j-${Date.now()}`,
        date: todayKey(),
        kind,
        title: typeof params.title === 'string' && params.title ? params.title : `${KIND_ZH[kind]}手帐`,
        note: note.trim(),
        stickers,
        doodles,
        statsText: typeof params.stats === 'string' && params.stats ? params.stats : undefined,
        createdAt: Date.now(),
      });
    }
    haptic('success');
    router.back();
  };

  const selectedSticker = stickers.find((s) => s.id === selected) ?? null;

  return (
    <SafeAreaView style={s.safe} edges={['top']}>
      <View style={s.head}>
        <Pressable hitSlop={10} onPress={() => router.back()}>
          <Text style={s.closeT}>✕</Text>
        </Pressable>
        <Text style={s.headT}>{editing ? '编辑手帐' : '记一页手帐'}</Text>
        <Press style={s.saveBtn} onPress={save}>
          <Text style={s.saveT}>保存</Text>
        </Press>
      </View>

      <ScrollView contentContainerStyle={s.body} keyboardShouldPersistTaps="handled">
        <View style={s.kindRow}>
          {(['workout', 'meal', 'free'] as const).map((k) => (
            <Press key={k} style={[s.kindChip, kind === k && s.kindChipOn]} onPress={() => setKind(k)}>
              <Text style={[s.kindT, kind === k && s.kindTOn]}>{KIND_ZH[k]}</Text>
            </Press>
          ))}
        </View>

        {/* 画布：点阵纸页 */}
        <View
          style={s.canvas}
          onLayout={(e) => setCanvas({ w: e.nativeEvent.layout.width, h: e.nativeEvent.layout.height })}
        >
          <DotsBg width="100%" height="100%" />
          <Svg style={StyleSheet.absoluteFill} width="100%" height="100%">
            {paths.map((p) => (
              <Polyline
                key={p.id}
                points={p.points.map((pt) => `${pt[0] * canvas.w},${pt[1] * canvas.h}`).join(' ')}
                stroke={p.color}
                strokeWidth={p.width}
                strokeLinejoin="round"
                strokeLinecap="round"
                fill="none"
                opacity={0.85}
              />
            ))}
          </Svg>

          {stickers.map((st) => (
            <CanvasSticker
              key={st.id}
              sticker={st}
              canvas={canvas}
              interactive={tool === 'sticker'}
              isSelected={selected === st.id}
              onTap={() => setSelected((cur) => (cur === st.id ? null : st.id))}
              onCommit={commitSticker}
            />
          ))}

          <View style={s.canvasHead} pointerEvents="none">
            <Text style={s.dateT}>{dateText}</Text>
            <Text style={s.kindTag}>{KIND_ZH[kind]}</Text>
          </View>
          {typeof params.stats === 'string' && params.stats ? (
            <View style={s.statsStamp} pointerEvents="none">
              <Text style={s.statsT} numberOfLines={2}>{params.stats}</Text>
            </View>
          ) : null}

          {cutting ? (
            <View style={s.cuttingChip} pointerEvents="none">
              <Text style={s.cuttingT}>✂️ 抠图描边中…</Text>
            </View>
          ) : null}

          {/* 涂鸦层 */}
          {tool === 'pen' ? (
            <GestureDetector gesture={drawGesture}>
              <View style={StyleSheet.absoluteFill} />
            </GestureDetector>
          ) : null}
        </View>

        {/* 工具栏 */}
        <View style={s.toolbar}>
          <View style={s.toolRow}>
            <Press style={[s.toolBtn, tool === 'sticker' && s.toolBtnOn]} onPress={() => { setTool('sticker'); setSelected(null); }}>
              <Text style={[s.toolT, tool === 'sticker' && s.toolTOn]}>📷 贴照片</Text>
            </Press>
            <Press style={[s.toolBtn, tool === 'pen' && s.toolBtnOn]} onPress={() => { setTool('pen'); setSelected(null); }}>
              <Text style={[s.toolT, tool === 'pen' && s.toolTOn]}>✎ 涂鸦</Text>
            </Press>
            {tool === 'pen' ? (
              <Press style={s.toolBtn} onPress={() => setPaths((arr) => arr.slice(0, -1))}>
                <Text style={s.toolT}>↩︎</Text>
              </Press>
            ) : null}
          </View>

          {tool === 'pen' ? (
            <View style={s.colorRow}>
              {PEN_COLORS.map((c) => (
                <Press key={c} style={[s.colorDot, penColor === c && { borderWidth: 3, borderColor: C.text }]} onPress={() => { setPenColor(c); haptic('light'); }}>
                  <View style={{ width: 20, height: 20, borderRadius: 99, backgroundColor: c }} />
                </Press>
              ))}
            </View>
          ) : (
            <View style={s.photoRow}>
              {Platform.OS !== 'web' ? (
                <Button title="拍照" kind="ghost" small onPress={() => pickPhoto(true)} />
              ) : null}
              <Button title="从相册选" kind="ghost" small onPress={() => pickPhoto(false)} />
            </View>
          )}

          {tool === 'sticker' && selectedSticker ? (
            <View style={s.editRow}>
              <Press style={s.editBtn} onPress={() => mutateSelected((st) => ({ ...st, rot: st.rot - 12 }))}>
                <Text style={s.editT}>⟲</Text>
              </Press>
              <Press style={s.editBtn} onPress={() => mutateSelected((st) => ({ ...st, rot: st.rot + 12 }))}>
                <Text style={s.editT}>⟳</Text>
              </Press>
              <Press style={s.editBtn} onPress={() => mutateSelected((st) => ({ ...st, scale: Math.max(0.5, st.scale - 0.15) }))}>
                <Text style={s.editT}>−</Text>
              </Press>
              <Press style={s.editBtn} onPress={() => mutateSelected((st) => ({ ...st, scale: Math.min(2, st.scale + 0.15) }))}>
                <Text style={s.editT}>＋</Text>
              </Press>
              <Press
                style={[s.editBtn, { borderColor: C.danger }]}
                onPress={() => { setStickers((arr) => arr.filter((x) => x.id !== selected)); setSelected(null); haptic('warning'); }}
              >
                <Text style={[s.editT, { color: C.danger }]}>🗑</Text>
              </Press>
            </View>
          ) : null}
        </View>

        <TextInput
          style={s.noteInput}
          value={note}
          onChangeText={setNote}
          placeholder="写一句今天的感受…"
          placeholderTextColor={C.faint}
          maxLength={60}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

/* ---------- 画布内可拖拽贴纸 ---------- */

function CanvasSticker({
  sticker, canvas, interactive, isSelected, onTap, onCommit,
}: {
  sticker: JournalSticker;
  canvas: { w: number; h: number };
  interactive: boolean;
  isSelected: boolean;
  onTap: () => void;
  onCommit: (id: string, x: number, y: number) => void;
}) {
  const tx = useSharedValue(sticker.x * canvas.w);
  const ty = useSharedValue(sticker.y * canvas.h);
  const startX = useSharedValue(0);
  const startY = useSharedValue(0);

  const pan = Gesture.Pan()
    .runOnJS(true)
    .enabled(interactive)
    .onStart(() => { startX.value = tx.value; startY.value = ty.value; })
    .onUpdate((e) => { tx.value = startX.value + e.translationX; ty.value = startY.value + e.translationY; })
    .onEnd(() => onCommit(sticker.id, tx.value / Math.max(1, canvas.w), ty.value / Math.max(1, canvas.h)));
  const tap = Gesture.Tap().runOnJS(true).enabled(interactive).onStart(() => onTap());
  const gesture = Gesture.Simultaneous(pan, tap);

  const aStyle = useAnimatedStyle(() => ({ transform: [{ translateX: tx.value }, { translateY: ty.value }] }), [tx, ty]);
  const w = 118 * sticker.scale;

  return (
    <GestureDetector gesture={gesture}>
      <Animated.View style={[{ position: 'absolute', left: 0, top: 0 }, aStyle]}>
        {sticker.cutout ? (
          <View style={[isSelected && { borderWidth: 2, borderColor: C.accent, borderRadius: 8, padding: 2 }, { transform: [{ rotate: `${sticker.rot}deg` }] }]}>
            <Image
              source={{ uri: sticker.uri }}
              style={{ width: w, aspectRatio: sticker.iw && sticker.ih ? sticker.iw / sticker.ih : 1 }}
              resizeMode="contain"
            />
          </View>
        ) : (
          <View
            style={[
              s.stickerCard,
              { transform: [{ rotate: `${sticker.rot}deg` }] },
              isSelected && { borderColor: C.accent, borderWidth: 2 },
            ]}
          >
            <Image source={{ uri: sticker.uri }} style={{ width: w, height: w * 1.2, borderRadius: 2 }} resizeMode="cover" />
            <Tape width={44} rotate={-4} />
          </View>
        )}
      </Animated.View>
    </GestureDetector>
  );
}

const s = StyleSheet.create({
  safe: { flex: 1, backgroundColor: C.bg },
  head: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1.5, borderBottomColor: C.inkAlphaSoft, backgroundColor: C.card,
  },
  closeT: { color: C.sub, fontSize: 20, fontWeight: '700' },
  headT: { color: C.text, fontSize: 16, fontWeight: '800' },
  saveBtn: { backgroundColor: C.accent, borderRadius: R.sm, paddingHorizontal: 18, paddingVertical: 8, borderWidth: 1.5, borderColor: C.accentDeep, ...SH.sm },
  saveT: { color: C.onAccent, fontWeight: '800', fontSize: 14 },
  body: { padding: 16, gap: 12, paddingBottom: 40 },
  kindRow: { flexDirection: 'row', gap: 8 },
  kindChip: {
    paddingHorizontal: 16, paddingVertical: 7, borderRadius: 999, borderWidth: 1.5, borderColor: C.inkAlpha,
    backgroundColor: C.card, transform: [{ rotate: '-0.6deg' }],
  },
  kindChipOn: { backgroundColor: C.marker, borderColor: 'rgba(107,90,16,0.4)' },
  kindT: { color: C.sub, fontSize: 13, fontWeight: '700' },
  kindTOn: { color: C.markerInk },
  canvas: {
    aspectRatio: '3/4', backgroundColor: C.card, borderRadius: R.md, borderWidth: 1.5, borderColor: C.inkAlpha,
    overflow: 'hidden', ...SH.md,
  },
  canvasHead: { position: 'absolute', top: 10, left: 12, right: 12, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  dateT: { color: C.sub, fontSize: 20, fontFamily: FONT.hand, lineHeight: 24 },
  kindTag: { color: C.accent, fontSize: 11, fontWeight: '800', letterSpacing: 2, opacity: 0.8 },
  statsStamp: {
    position: 'absolute', bottom: 10, left: 12, right: 12,
    borderTopWidth: 1, borderTopColor: C.line, borderStyle: 'dashed', paddingTop: 6,
  },
  statsT: { color: C.sub, fontSize: 11, fontFamily: FONT.semi, lineHeight: 15 },
  cuttingChip: {
    position: 'absolute', bottom: 40, alignSelf: 'center',
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.accent, borderRadius: 999,
    paddingHorizontal: 16, paddingVertical: 8, ...SH.md,
  },
  cuttingT: { color: C.accent, fontSize: 13, fontWeight: '800' },
  toolbar: { gap: 10 },
  toolRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  toolBtn: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.inkAlpha,
    backgroundColor: C.card, transform: [{ rotate: '-0.5deg' }],
  },
  toolBtnOn: { backgroundColor: C.text, borderColor: C.text },
  toolT: { color: C.sub, fontSize: 13, fontWeight: '700' },
  toolTOn: { color: C.card },
  colorRow: { flexDirection: 'row', gap: 10 },
  colorDot: { padding: 2, borderRadius: 99, borderWidth: 3, borderColor: 'transparent' },
  photoRow: { flexDirection: 'row', gap: 10 },
  editRow: { flexDirection: 'row', gap: 8, alignItems: 'center' },
  editBtn: {
    width: 40, height: 40, borderRadius: R.sm, borderWidth: 1.5, borderColor: C.inkAlpha, backgroundColor: C.card,
    alignItems: 'center', justifyContent: 'center',
  },
  editT: { color: C.text, fontSize: 16, fontWeight: '800' },
  noteInput: {
    color: C.text, fontSize: 15, fontFamily: FONT.semi,
    backgroundColor: C.card, borderWidth: 1.5, borderColor: C.inkAlpha, borderRadius: R.sm,
    height: 48, paddingHorizontal: 14,
  },
  stickerCard: {
    backgroundColor: '#FFFFFF', padding: 6, paddingBottom: 10, borderRadius: 3,
    borderWidth: 1, borderColor: C.inkAlphaSoft, ...SH.sm,
  },
});
