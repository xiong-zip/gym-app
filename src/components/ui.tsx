import type { ReactNode } from 'react';
import { forwardRef, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, ImageSourcePropType, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View, type ScrollViewProps, type StyleProp, type TextStyle, type ViewStyle } from 'react-native';
import Animated, { FadeInDown, FadeOutUp, useAnimatedProps, useAnimatedStyle, useSharedValue, withTiming } from 'react-native-reanimated';
import Svg, { Circle } from 'react-native-svg';
import * as Haptics from 'expo-haptics';
import { C, DUR, FONT, R, SH } from '../theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);
const AnimatedPressable = Animated.createAnimatedComponent(Pressable);

/* ---------- 统一滚动容器：强制隐藏滚动指示条（Web 端滚动条由全局 CSS 隐藏） ---------- */

export const Scroll = forwardRef<ScrollView, ScrollViewProps>(function Scroll(props, ref) {
  return (
    <ScrollView
      ref={ref}
      {...props}
      showsVerticalScrollIndicator={false}
      showsHorizontalScrollIndicator={false}
    />
  );
});

/* ---------- 触感反馈 ---------- */

export function haptic(kind: 'light' | 'medium' | 'success' | 'warning' = 'light') {
  if (Platform.OS === 'web') return;
  try {
    if (kind === 'success' || kind === 'warning') {
      Haptics.notificationAsync(kind === 'success' ? Haptics.NotificationFeedbackType.Success : Haptics.NotificationFeedbackType.Warning);
    } else {
      Haptics.impactAsync(kind === 'medium' ? Haptics.ImpactFeedbackStyle.Medium : Haptics.ImpactFeedbackStyle.Light);
    }
  } catch { /* 无触感硬件时静默 */ }
}

/* ---------- 可按压容器：缩放 + 触感 ---------- */

export function Press({
  children, onPress, style, disabled, hitSlop, haptic: hap = 'light',
}: {
  children: ReactNode; onPress?: () => void; style?: StyleProp<ViewStyle>; disabled?: boolean; hitSlop?: number; haptic?: 'light' | 'medium' | false;
}) {
  const scale = useSharedValue(1);
  const aStyle = useAnimatedStyle(() => ({ transform: [{ scale: scale.value }] }), [scale]);
  return (
    <AnimatedPressable
      disabled={disabled}
      hitSlop={hitSlop}
      onPressIn={() => { scale.value = withTiming(0.96, { duration: DUR.fast }); }}
      onPressOut={() => { scale.value = withTiming(1, { duration: DUR.fast }); }}
      onPress={() => { if (hap) haptic(hap); onPress?.(); }}
      style={[aStyle, style, disabled && { opacity: 0.4 }]}
    >
      {children}
    </AnimatedPressable>
  );
}

/* ---------- 纸卡：白纸 + 墨线 + 硬偏移阴影，可选胶带 ---------- */

export function Card({ children, style, taped, onPress }: { children: ReactNode; style?: StyleProp<ViewStyle>; taped?: boolean | string; onPress?: () => void }) {
  const body = (
    <View style={[s.card, style]}>
      {taped ? <Tape color={typeof taped === 'string' ? taped : undefined} /> : null}
      {children}
    </View>
  );
  if (onPress) return <Press onPress={onPress} style={s.cardPress}>{body}</Press>;
  return body;
}

/** 手帐胶带：贴在卡片顶部中央 */
export function Tape({ color = '#F2C94C', width = 72, rotate = -3 }: { color?: string; width?: number; rotate?: number }) {
  return (
    <View
      pointerEvents="none"
      style={{
        position: 'absolute', top: -9, alignSelf: 'center', width, height: 18,
        backgroundColor: color, opacity: 0.8, borderRadius: 2,
        borderWidth: 1, borderColor: 'rgba(43,36,22,0.10)',
        transform: [{ rotate: `${rotate}deg` }],
        shadowColor: C.shadowInk, shadowOffset: { width: 1, height: 1 }, shadowOpacity: 0.08, shadowRadius: 0, elevation: 1,
      } as ViewStyle}
    />
  );
}

/* ---------- 标题：荧光笔划过 ---------- */

export function SectionTitle({ children, right, mark = true }: { children: ReactNode; right?: ReactNode; mark?: boolean }) {
  return (
    <View style={s.sectionRow}>
      <View
        style={{
          alignSelf: 'flex-start', borderRadius: 5, paddingHorizontal: 8, paddingVertical: 2,
          backgroundColor: mark ? C.marker : 'transparent',
          transform: [{ rotate: '-0.6deg' }],
        }}
      >
        <Text style={s.sectionT}>{children}</Text>
      </View>
      {right}
    </View>
  );
}

export function Sub({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[s.sub, style]}>{children}</Text>;
}

/* ---------- 按钮：印章式按压（按下时阴影被压平） ---------- */

export function Button({
  title, onPress, kind = 'primary', disabled, loading, small,
}: {
  title: string;
  onPress: () => void;
  kind?: 'primary' | 'ghost' | 'danger';
  disabled?: boolean;
  loading?: boolean;
  small?: boolean;
}) {
  const press = useSharedValue(0);
  const aStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: press.value * 2.5 }, { translateY: press.value * 2.5 }, { scale: 1 - press.value * 0.02 }],
  }), [press]);
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? '#F6DBD5' : C.card;
  const fg = kind === 'primary' ? C.onAccent : kind === 'danger' ? C.danger : C.text;
  return (
    <AnimatedPressable
      disabled={disabled || loading}
      onPress={() => { haptic('light'); onPress(); }}
      onPressIn={() => { press.value = withTiming(1, { duration: DUR.fast }); }}
      onPressOut={() => { press.value = withTiming(0, { duration: DUR.fast }); }}
      style={[
        s.btn, small && s.btnSm,
        { backgroundColor: bg },
        aStyle,
        kind === 'primary' ? { ...SH.sm, borderWidth: 1.5, borderColor: C.accentDeep } : { borderWidth: 1.5, borderColor: C.inkAlpha },
        (disabled || loading) && { opacity: 0.4, shadowOpacity: 0 },
      ]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : (
        <Text style={[s.btnT, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
      )}
    </AnimatedPressable>
  );
}

/* ---------- Chip / Segmented ---------- */

export function Chip({ label, selected, onPress, sub }: { label: string; selected: boolean; onPress: () => void; sub?: string }) {
  return (
    <Press onPress={onPress} style={[
      s.chip,
      selected && { backgroundColor: C.marker, borderColor: 'rgba(107,90,16,0.35)' },
    ]}>
      <Text style={[s.chipT, selected && { color: C.markerInk }]}>{label}</Text>
      {sub ? <Text style={[s.chipSub, selected && { color: C.markerInk }]}>{sub}</Text> : null}
    </Press>
  );
}

export interface SegOption<T> { value: T; label: string }

export function Segmented<T extends string | number>({ options, value, onChange }: { options: SegOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.segWrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Press key={String(o.value)} onPress={() => onChange(o.value)} style={[s.segItem, on && { backgroundColor: C.text, borderColor: C.text }]}>
            <Text style={[s.segT, on && { color: C.card }]}>{o.label}</Text>
          </Press>
        );
      })}
    </View>
  );
}

/* ---------- 输入 ---------- */

export function NumberInput({
  value, onChange, placeholder, suffix, style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  style?: ViewStyle;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <View style={[s.numWrap, focus && s.focusBorder, style]}>
      <TextInput
        style={s.numInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^\d.]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={C.faint}
        keyboardType="decimal-pad"
        onFocus={() => setFocus(true)}
        onBlur={() => setFocus(false)}
      />
      {suffix ? <Text style={s.numSuffix}>{suffix}</Text> : null}
    </View>
  );
}

export function TextInputLine({
  value, onChange, placeholder, secure, style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  secure?: boolean;
  style?: ViewStyle;
}) {
  const [focus, setFocus] = useState(false);
  return (
    <TextInput
      style={[s.lineInput, focus && s.focusBorder, style]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.faint}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
      onFocus={() => setFocus(true)}
      onBlur={() => setFocus(false)}
    />
  );
}

export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <View style={s.field}>
      <Text style={s.fieldLabel}>{label}</Text>
      {children}
    </View>
  );
}

/* ---------- 底部弹层（纸面） ---------- */

export function Sheet({
  visible, onClose, title, children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={s.sheetBackdrop} onPress={onClose}>
        <Pressable style={s.sheetBody} onPress={(e) => e.stopPropagation()}>
          <View style={s.sheetHandle} />
          {title ? <Text style={s.sheetTitle}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

/* ---------- 进度环：虚线轨道（手绘感）+ 动画填充 ---------- */

export function Ring({
  size = 140, stroke = 12, progress = 0, color = C.accent, children, animate = true,
}: {
  size?: number;
  stroke?: number;
  progress?: number;
  color?: string;
  children?: ReactNode;
  animate?: boolean;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  const sv = useSharedValue(animate ? 0 : p);
  useEffect(() => { sv.value = withTiming(p, { duration: 700 }); }, [p, sv]);
  const props = useAnimatedProps(() => ({ strokeDashoffset: circ * (1 - sv.value) }), [circ, sv]);
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.lineStrong} strokeWidth={stroke * 0.55} fill="none" strokeDasharray="0.1 8" strokeLinecap="round" />
        <AnimatedCircle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ}`} strokeLinecap="round"
          animatedProps={props}
        />
      </Svg>
      <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

/* ---------- 进度条（动画） ---------- */

export function Bar({ value, target, color, height = 8 }: { value: number; target: number; color: string; height?: number }) {
  const p = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  const sv = useSharedValue(0);
  useEffect(() => { sv.value = withTiming(p, { duration: 600 }); }, [p, sv]);
  const aStyle = useAnimatedStyle(() => ({ width: `${sv.value * 100}%` }), [sv]);
  return (
    <View style={[s.barTrack, { height }]}>
      <Animated.View style={[{ height, backgroundColor: color, borderRadius: height / 2 }, aStyle]} />
    </View>
  );
}

/* ---------- 数字滚动 ---------- */

export function useCountUp(target: number, duration = 800) {
  const [v, setV] = useState(0);
  const fromRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const t0 = Date.now();
    let raf = 0;
    const step = () => {
      const k = Math.min(1, (Date.now() - t0) / duration);
      const eased = 1 - Math.pow(1 - k, 3);
      const cur = from + (target - from) * eased;
      setV(cur);
      fromRef.current = cur;
      if (k < 1) raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
  }, [target, duration]);
  return v;
}

export function Stat({ label, value, unit, color, count }: { label: string; value: string | number; unit?: string; color?: string; count?: boolean }) {
  const animated = useCountUp(typeof value === 'number' && count ? value : 0);
  const num = typeof value === 'number' && count ? Math.round(animated) : value;
  return (
    <View style={s.stat}>
      <Text style={[s.statV, color ? { color } : null]} numberOfLines={1}>
        {num}
        {unit ? <Text style={s.statU}> {unit}</Text> : null}
      </Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

/* ---------- 印章 ---------- */

export function Stamp({ label, rotate = -6, color = C.accent, fontSize = 13 }: { label: string; rotate?: number; color?: string; fontSize?: number }) {
  return (
    <View style={{ transform: [{ rotate: `${rotate}deg` }], opacity: 0.92 }}>
      <View style={{ borderWidth: 1.5, borderColor: color, borderRadius: 8, padding: 2 }}>
        <View style={{ borderWidth: 1.5, borderColor: color, borderRadius: 5, paddingVertical: 3, paddingHorizontal: 10, alignItems: 'center' }}>
          <Text style={{ color, fontSize, fontWeight: '800', fontFamily: FONT.bold, letterSpacing: 3 }}>{label}</Text>
        </View>
      </View>
    </View>
  );
}

/* ---------- 贴纸照片：白边相纸 ---------- */

export function Sticker({
  source, rotation = 0, width = 120, ratio = 1.25, style, children,
}: {
  source: ImageSourcePropType; rotation?: number; width?: number; ratio?: number; style?: ViewStyle; children?: ReactNode;
}) {
  return (
    <View style={[{
      backgroundColor: '#FFFFFF', padding: 6, paddingBottom: children ? 6 : 10, borderRadius: 3,
      borderWidth: 1, borderColor: C.inkAlphaSoft, ...SH.sm,
      transform: [{ rotate: `${rotation}deg` }],
    }, style as ViewStyle]}>
      <Image source={source} style={{ width, height: width * ratio, borderRadius: 2 }} resizeMode="cover" />
      {children}
    </View>
  );
}

/* ---------- 手帐点阵背景 ---------- */

export function DotsBg({ width, height, color = C.bgDot }: { width: number | string; height: number | string; color?: string }) {
  return (
    <View pointerEvents="none" style={{
      position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', borderRadius: 4,
      backgroundImage: `radial-gradient(${color} 1.2px, transparent 1.2px)`,
      backgroundSize: '16px 16px',
      opacity: 0.6,
    } as ViewStyle} />
  );
}

/* ---------- 进场编排 ---------- */

export function stagger(i = 0) {
  return FadeInDown.delay(60 * i).duration(320);
}

export { FadeInDown, FadeOutUp, Animated };

/* ---------- 撒花（训练完成庆祝） ---------- */

const CONFETTI_COLORS = [C.accent, C.marker, C.good, C.info, C.pink];

export function Confetti({ count = 36, duration = 1800 }: { count?: number; duration?: number }) {
  const parts = useMemo(
    () => Array.from({ length: count }, (_, i) => ({
      key: i,
      x: Math.random() * 100,
      delay: Math.random() * 350,
      dur: 900 + Math.random() * 800,
      size: 6 + Math.random() * 6,
      color: CONFETTI_COLORS[i % CONFETTI_COLORS.length],
      round: Math.random() > 0.5,
      drift: (Math.random() - 0.5) * 90,
      spin: 360 + Math.random() * 720,
    })),
    [count],
  );
  return (
    <View pointerEvents="none" style={{ position: 'absolute', left: 0, right: 0, top: 0, bottom: 0, overflow: 'hidden', zIndex: 50 }}>
      {parts.map((p) => (
        <ConfettiBit
          key={p.key}
          x={p.x}
          delay={p.delay}
          dur={p.dur}
          size={p.size}
          color={p.color}
          round={p.round}
          drift={p.drift}
          spin={p.spin}
        />
      ))}
    </View>
  );
}

function ConfettiBit({ x, delay, dur, size, color, round, drift, spin }: {
  x: number; delay: number; dur: number; size: number; color: string; round: boolean; drift: number; spin: number;
}) {
  const t = useSharedValue(-40);
  useEffect(() => {
    const timer = setTimeout(() => {
      t.value = withTiming(900, { duration: dur });
    }, delay);
    return () => clearTimeout(timer);
  }, [delay, dur, t]);
  const aStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: drift * (t.value / 900) },
      { translateY: t.value },
      { rotate: `${spin * (t.value / 900)}deg` },
    ],
    opacity: 1 - Math.max(0, (t.value - 500) / 400),
  }), [t, drift, spin]);
  return (
    <Animated.View
      style={[aStyle, {
        position: 'absolute', left: `${x}%`, top: 0,
        width: size, height: round ? size : size * 0.55,
        borderRadius: round ? size / 2 : 1.5,
        backgroundColor: color,
      }]}
    />
  );
}

/* ---------- 样式 ---------- */

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: R.lg,
    padding: 16,
    borderWidth: 1.5,
    borderColor: C.inkAlphaSoft,
    ...SH.md,
  },
  cardPress: { borderRadius: R.lg },
  sectionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
    marginTop: 6,
  },
  sectionT: {
    color: C.text,
    fontSize: 16,
    fontWeight: '700',
  },
  sub: {
    color: C.sub,
    fontSize: 12,
    lineHeight: 17,
  },
  btn: {
    borderRadius: R.md,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnSm: { height: 38, borderRadius: R.sm, paddingHorizontal: 14 },
  btnT: { fontSize: 16, fontWeight: '800', fontFamily: FONT.extra },
  chip: {
    borderRadius: 999,
    borderWidth: 1.5,
    borderColor: C.inkAlpha,
    backgroundColor: C.card,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
  chipT: { color: C.text, fontSize: 14, fontWeight: '600' },
  chipSub: { color: C.sub, fontSize: 11, marginTop: 2 },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: C.inset,
    borderRadius: R.sm + 1,
    padding: 4,
    borderWidth: 1.5,
    borderColor: C.inkAlpha,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center', borderWidth: 1.5, borderColor: 'transparent' },
  segT: { color: C.sub, fontSize: 13, fontWeight: '600' },
  numWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: C.inkAlpha,
    paddingHorizontal: 12,
    height: 46,
  },
  numInput: { flex: 1, color: C.text, fontSize: 16, fontWeight: '600', paddingVertical: 0, fontFamily: FONT.semi },
  numSuffix: { color: C.sub, fontSize: 13, marginLeft: 6 },
  focusBorder: { borderColor: C.accent },
  lineInput: {
    color: C.text,
    fontSize: 14,
    backgroundColor: C.card,
    borderRadius: R.sm,
    borderWidth: 1.5,
    borderColor: C.inkAlpha,
    paddingHorizontal: 12,
    height: 46,
  },
  field: { marginBottom: 14 },
  fieldLabel: { color: C.sub, fontSize: 13, marginBottom: 7, fontWeight: '600' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(43,36,22,0.45)', justifyContent: 'flex-end' },
  sheetBody: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    maxHeight: '88%',
    borderWidth: 1.5,
    borderColor: C.inkAlpha,
    ...SH.lg,
  },
  sheetHandle: { alignSelf: 'center', width: 40, height: 5, borderRadius: 99, backgroundColor: C.lineStrong, marginBottom: 12 },
  sheetTitle: { color: C.text, fontSize: 17, fontWeight: '800', marginBottom: 14 },
  barTrack: { flex: 1, backgroundColor: C.inset, borderRadius: 99, overflow: 'hidden', borderWidth: 1, borderColor: C.inkAlphaSoft },
  stat: { flex: 1, alignItems: 'center' },
  statV: { color: C.text, fontSize: 20, fontWeight: '800', fontFamily: FONT.extra },
  statU: { color: C.sub, fontSize: 11, fontWeight: '600' },
  statL: { color: C.sub, fontSize: 11, marginTop: 3 },
});
