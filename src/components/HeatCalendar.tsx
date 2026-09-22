import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { addDays, todayKey } from '../lib/date';
import { C } from '../theme';

const LEVEL_ALPHA = [0, 0.32, 0.58, 0.88];
const GAP = 3;
const LABEL_W = 16;

function gridCell(weeks: number): number {
  const w = Math.min(Dimensions.get('window').width - 68, 336);
  return Math.max(10, Math.min(16, Math.floor((w - (weeks - 1) * GAP) / weeks)));
}

/** 按容量给格子分档：0 没练 / 1 轻松 / 2 常规 / 3 大容量 */
function levelOf(v: number | undefined): number {
  if (!v || v <= 0) return 0;
  if (v < 2000) return 1;
  if (v < 4500) return 2;
  return 3;
}

/** GitHub 风格打卡热力图：近 N 周，周一为行首；点格子可跳到那天 */
export function HeatCalendar({
  data, selected, onSelect, weeks = 13,
}: {
  data: Record<string, number>;
  selected?: string;
  onSelect?: (key: string) => void;
  weeks?: number;
}) {
  const today = todayKey();
  const cell = gridCell(weeks);
  const gridW = weeks * cell + (weeks - 1) * GAP;

  // 对齐到 weeks-1 周前的周一
  const wd = (new Date().getDay() + 6) % 7; // 0=周一
  const monday = addDays(today, -wd - (weeks - 1) * 7);

  const cols: { key: string; v: number }[][] = [];
  const monthMarks = new Map<number, string>();
  for (let c = 0; c < weeks; c++) {
    const col: { key: string; v: number }[] = [];
    for (let r = 0; r < 7; r++) {
      const k = addDays(monday, c * 7 + r);
      col.push({ key: k, v: k > today ? -1 : (data[k] ?? 0) });
    }
    cols.push(col);
    const first = col[0].key;
    if (Number(first.slice(8, 10)) <= 7) monthMarks.set(c, `${Number(first.slice(5, 7))}月`);
  }

  const cellColor = (v: number) => {
    if (v < 0) return 'transparent';
    const a = LEVEL_ALPHA[levelOf(v)];
    return a === 0 ? '#EBE2CF' : `rgba(217,72,31,${a})`;
  };

  const weekdayLabels = ['一', '', '', '四', '', '', '日'];

  return (
    <View>
      <View style={{ paddingLeft: LABEL_W }}>
        <View style={s.monthRow}>
          {cols.map((_, c) => (
            <View key={c} style={{ width: cell, marginRight: c === weeks - 1 ? 0 : GAP }}>
              <Text style={s.monthT} numberOfLines={1}>{monthMarks.get(c) ?? ''}</Text>
            </View>
          ))}
        </View>
        <View style={s.gridRow}>
          <View style={{ width: LABEL_W }}>
            {weekdayLabels.map((t, i) => (
              <View key={i} style={{ height: cell, marginBottom: i === 6 ? 0 : GAP, alignItems: 'center', justifyContent: 'center' }}>
                <Text style={s.wdT}>{t}</Text>
              </View>
            ))}
          </View>
          <View style={{ width: gridW }}>
            {[0, 1, 2, 3, 4, 5, 6].map((r) => (
              <View key={r} style={[s.weekRow, { marginBottom: r === 6 ? 0 : GAP, height: cell }]}>
                {cols.map((col, c) => {
                  const d = col[r];
                  const isToday = d.key === today;
                  const isSel = selected === d.key;
                  return (
                    <Pressable
                      key={d.key}
                      disabled={!onSelect || d.v < 0}
                      onPress={() => onSelect?.(d.key)}
                      style={[
                        {
                          width: cell, height: cell, borderRadius: 3,
                          backgroundColor: cellColor(d.v),
                          marginRight: c === weeks - 1 ? 0 : GAP,
                        },
                        isToday && s.todayCell,
                        isSel && s.selCell,
                      ]}
                    />
                  );
                })}
              </View>
            ))}
          </View>
        </View>
      </View>
      <View style={s.legendRow}>
        <Text style={s.legendT}>少</Text>
        {LEVEL_ALPHA.map((a) => (
          <View key={a} style={[s.legendCell, { backgroundColor: a === 0 ? '#EBE2CF' : `rgba(217,72,31,${a})` }]} />
        ))}
        <Text style={s.legendT}>多</Text>
      </View>
    </View>
  );
}

const s = StyleSheet.create({
  monthRow: { flexDirection: 'row', marginBottom: 4, height: 12 },
  monthT: { color: C.sub, fontSize: 9, fontWeight: '600' },
  gridRow: { flexDirection: 'row' },
  weekRow: { flexDirection: 'row' },
  wdT: { color: C.faint, fontSize: 9, fontWeight: '600' },
  todayCell: { borderWidth: 1.5, borderColor: C.text },
  selCell: { borderWidth: 2, borderColor: C.info },
  legendRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 10, paddingLeft: LABEL_W + 2 },
  legendCell: { width: 10, height: 10, borderRadius: 3 },
  legendT: { color: C.faint, fontSize: 10, marginHorizontal: 2 },
});
