import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View, type StyleProp, type ViewStyle } from 'react-native';
import { Press, Sub } from './ui';
import { C, R } from '../theme';
import { todayKey } from '../lib/date';

const WEEK = ['一', '二', '三', '四', '五', '六', '日'];
const pad = (n: number) => String(n).padStart(2, '0');
const monthOf = (key: string) => ({ y: Number(key.slice(0, 4)), m: Number(key.slice(5, 7)) - 1 });

/**
 * 月历：手帐页的记录回看用（日历页已并入手帐页）。
 * - 点击日期回调 onSelect（未来日期不可选）
 * - hasLog/hasJournal 决定日期格上的标记（训练完成 = 红底，有手帐 = 粉点）
 */
export function MonthCalendar({
  selected, onSelect, hasLog, hasJournal, month, onMonthChange, style,
}: {
  selected: string;
  onSelect: (key: string) => void;
  hasLog?: (key: string) => boolean;
  hasJournal?: (key: string) => boolean;
  /** 受控月份（不传则组件内部管理）；需要按"当前显示的月份"算统计时传入 */
  month?: { y: number; m: number };
  onMonthChange?: (m: { y: number; m: number }) => void;
  style?: StyleProp<ViewStyle>;
}) {
  const [inner, setInner] = useState(() => monthOf(selected));
  const cursor = month ?? inner;

  const goMonth = (next: { y: number; m: number }) => {
    if (month && onMonthChange) onMonthChange(next);
    else setInner(next);
  };

  // 非受控模式下，选中日期换月时跟着翻页
  useEffect(() => {
    if (month) return;
    const m = monthOf(selected);
    setInner((c) => (c.y === m.y && c.m === m.m ? c : m));
  }, [selected, month]);

  const today = todayKey();
  const ym = `${cursor.y}-${pad(cursor.m + 1)}`;
  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7; // 周一 = 0
  const canNext = ym !== today.slice(0, 7);

  const shiftMonth = (delta: number) => {
    const d = new Date(cursor.y, cursor.m + delta, 1);
    goMonth({ y: d.getFullYear(), m: d.getMonth() });
  };

  return (
    <View style={style}>
      <View style={s.monthNav}>
        <Press style={s.monthBtn} onPress={() => shiftMonth(-1)}>
          <Text style={s.monthBtnT}>‹</Text>
        </Press>
        <Text style={s.monthT}>{`${cursor.y}年${cursor.m + 1}月`}</Text>
        <Press style={[s.monthBtn, !canNext && { opacity: 0.35 }]} onPress={() => canNext && shiftMonth(1)}>
          <Text style={s.monthBtnT}>›</Text>
        </Press>
      </View>

      <View style={s.weekRow}>
        {WEEK.map((w) => (
          <Text key={w} style={s.weekT}>{w}</Text>
        ))}
      </View>

      <View style={s.grid}>
        {Array.from({ length: lead }, (_, i) => (
          <View key={`b${i}`} style={s.cell} />
        ))}
        {Array.from({ length: days }, (_, i) => i + 1).map((d) => {
          const key = `${ym}-${pad(d)}`;
          const isToday = key === today;
          const isFuture = key > today;
          const isSel = key === selected;
          const logged = hasLog?.(key) ?? false;
          const journaled = hasJournal?.(key) ?? false;
          return (
            <Pressable key={key} style={s.cell} disabled={isFuture} onPress={() => onSelect(key)}>
              <View
                style={[
                  s.dayCell,
                  logged && s.dayCellDone,
                  isSel && { borderColor: C.markerInk, backgroundColor: C.marker, borderWidth: 2 },
                  isToday && !isSel && { borderWidth: 2, borderColor: C.text },
                  isFuture && { opacity: 0.3 },
                ]}
              >
                <Text style={[s.dayT, logged && !isSel && { color: C.onAccent, fontWeight: '800' }, isSel && { color: C.markerInk, fontWeight: '800' }]}>{d}</Text>
              </View>
              <View style={s.dotRow}>
                {isToday ? <View style={[s.dot, { backgroundColor: C.accent }]} /> : null}
                {journaled ? <View style={[s.dot, { backgroundColor: C.pink }]} /> : null}
              </View>
            </Pressable>
          );
        })}
      </View>

      {(hasLog || hasJournal) ? (
        <View style={s.legend}>
          {hasLog ? <><View style={[s.dot, { backgroundColor: C.accent }]} /><Sub style={s.legendT}>完成训练</Sub></> : null}
          {hasJournal ? <><View style={[s.dot, { backgroundColor: C.pink }]} /><Sub style={s.legendT}>有手帐</Sub></> : null}
        </View>
      ) : null}
    </View>
  );
}

const s = StyleSheet.create({
  monthNav: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10 },
  monthBtn: { width: 34, height: 34, borderRadius: 999, backgroundColor: C.card, borderWidth: 1.5, borderColor: C.inkAlpha, alignItems: 'center', justifyContent: 'center' },
  monthBtnT: { color: C.text, fontSize: 20, fontWeight: '700', marginTop: -2 },
  monthT: { color: C.text, fontSize: 17, fontWeight: '800' },
  weekRow: { flexDirection: 'row', marginBottom: 6 },
  weekT: { flex: 1, color: C.sub, fontSize: 11, textAlign: 'center', fontWeight: '600' },
  grid: { flexDirection: 'row', flexWrap: 'wrap' },
  cell: { width: '14.28%', alignItems: 'center', marginBottom: 8, position: 'relative' },
  dayCell: {
    width: 36, height: 36, borderRadius: 12, borderWidth: 1.5, borderColor: C.line,
    backgroundColor: C.inset, alignItems: 'center', justifyContent: 'center',
  },
  dayCellDone: { backgroundColor: C.accent, borderColor: C.accentDeep },
  dayT: { color: C.sub, fontSize: 13, fontWeight: '600' },
  dotRow: { position: 'absolute', bottom: 1, flexDirection: 'row', gap: 3 },
  dot: { width: 4, height: 4, borderRadius: 99 },
  legend: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 2 },
  legendT: { fontSize: 10, marginRight: 8 },
  card: { backgroundColor: C.card, borderRadius: R.lg, padding: 16 },
});
