import type { ReactNode } from 'react';
import { ActivityIndicator, Modal, Pressable, StyleSheet, Text, TextInput, View, type TextStyle, type ViewStyle } from 'react-native';
import Svg, { Circle } from 'react-native-svg';
import { C } from '../theme';

export function Card({ children, style }: { children: ReactNode; style?: ViewStyle }) {
  return <View style={[s.card, style]}>{children}</View>;
}

export function SectionTitle({ children, right }: { children: ReactNode; right?: ReactNode }) {
  return (
    <View style={s.sectionRow}>
      <Text style={s.sectionT}>{children}</Text>
      {right}
    </View>
  );
}

export function Sub({ children, style }: { children: ReactNode; style?: TextStyle }) {
  return <Text style={[s.sub, style]}>{children}</Text>;
}

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
  const bg = kind === 'primary' ? C.accent : kind === 'danger' ? '#3A1518' : C.card2;
  const fg = kind === 'primary' ? C.onAccent : kind === 'danger' ? C.danger : C.text;
  return (
    <Pressable
      disabled={disabled || loading}
      onPress={onPress}
      style={[s.btn, small && s.btnSm, { backgroundColor: bg, opacity: disabled || loading ? 0.4 : 1 }, kind === 'ghost' && { borderWidth: 1, borderColor: C.border }]}
    >
      {loading ? <ActivityIndicator color={fg} size="small" /> : (
        <Text style={[s.btnT, { color: fg }, small && { fontSize: 13 }]}>{title}</Text>
      )}
    </Pressable>
  );
}

export function Chip({ label, selected, onPress, sub }: { label: string; selected: boolean; onPress: () => void; sub?: string }) {
  return (
    <Pressable
      onPress={onPress}
      style={[s.chip, selected && { backgroundColor: C.accent, borderColor: C.accent }]}
    >
      <Text style={[s.chipT, selected && { color: C.onAccent }]}>{label}</Text>
      {sub ? <Text style={[s.chipSub, selected && { color: C.onAccent }]}>{sub}</Text> : null}
    </Pressable>
  );
}

export interface SegOption<T> { value: T; label: string }

export function Segmented<T extends string | number>({ options, value, onChange }: { options: SegOption<T>[]; value: T; onChange: (v: T) => void }) {
  return (
    <View style={s.segWrap}>
      {options.map((o) => {
        const on = o.value === value;
        return (
          <Pressable key={String(o.value)} onPress={() => onChange(o.value)} style={[s.segItem, on && { backgroundColor: C.accent }]}>
            <Text style={[s.segT, on && { color: C.onAccent, fontWeight: '700' }]}>{o.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}

export function NumberInput({
  value, onChange, placeholder, suffix, style,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  suffix?: string;
  style?: ViewStyle;
}) {
  return (
    <View style={[s.numWrap, style]}>
      <TextInput
        style={s.numInput}
        value={value}
        onChangeText={(t) => onChange(t.replace(/[^\d.]/g, ''))}
        placeholder={placeholder}
        placeholderTextColor={C.sub}
        keyboardType="decimal-pad"
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
  return (
    <TextInput
      style={[s.lineInput, style]}
      value={value}
      onChangeText={onChange}
      placeholder={placeholder}
      placeholderTextColor={C.sub}
      secureTextEntry={secure}
      autoCapitalize="none"
      autoCorrect={false}
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

export function Sheet({
  visible, onClose, title, children,
}: {
  visible: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
}) {
  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <Pressable style={s.sheetBackdrop} onPress={onClose}>
        <Pressable style={s.sheetBody} onPress={(e) => e.stopPropagation()}>
          {title ? <Text style={s.sheetTitle}>{title}</Text> : null}
          {children}
        </Pressable>
      </Pressable>
    </Modal>
  );
}

export function Ring({
  size = 140, stroke = 12, progress = 0, color = C.accent, children,
}: {
  size?: number;
  stroke?: number;
  progress?: number;
  color?: string;
  children?: ReactNode;
}) {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const p = Math.max(0, Math.min(1, progress));
  return (
    <View style={{ width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
      <Svg width={size} height={size} style={{ transform: [{ rotate: '-90deg' }] }}>
        <Circle cx={size / 2} cy={size / 2} r={r} stroke={C.border} strokeWidth={stroke} fill="none" />
        <Circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth={stroke} fill="none"
          strokeDasharray={`${circ}`} strokeDashoffset={circ * (1 - p)} strokeLinecap="round"
        />
      </Svg>
      <View style={{ position: 'absolute', width: size, height: size, alignItems: 'center', justifyContent: 'center' }}>
        {children}
      </View>
    </View>
  );
}

export function Bar({ value, target, color, height = 8 }: { value: number; target: number; color: string; height?: number }) {
  const p = target > 0 ? Math.max(0, Math.min(1, value / target)) : 0;
  return (
    <View style={[s.barTrack, { height }]}>
      <View style={{ height, width: `${p * 100}%`, backgroundColor: color, borderRadius: height / 2 }} />
    </View>
  );
}

export function Stat({ label, value, unit, color }: { label: string; value: string | number; unit?: string; color?: string }) {
  return (
    <View style={s.stat}>
      <Text style={[s.statV, color ? { color } : null]} numberOfLines={1}>
        {value}
        {unit ? <Text style={s.statU}> {unit}</Text> : null}
      </Text>
      <Text style={s.statL}>{label}</Text>
    </View>
  );
}

const s = StyleSheet.create({
  card: {
    backgroundColor: C.card,
    borderRadius: 16,
    padding: 16,
    borderWidth: 1,
    borderColor: C.border,
  },
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
    borderRadius: 14,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 18,
  },
  btnSm: { height: 38, borderRadius: 10, paddingHorizontal: 14 },
  btnT: { fontSize: 16, fontWeight: '700' },
  chip: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    backgroundColor: C.card2,
    paddingHorizontal: 14,
    paddingVertical: 9,
    alignItems: 'center',
  },
  chipT: { color: C.text, fontSize: 14, fontWeight: '600' },
  chipSub: { color: C.sub, fontSize: 11, marginTop: 2 },
  segWrap: {
    flexDirection: 'row',
    backgroundColor: C.card2,
    borderRadius: 12,
    padding: 3,
    borderWidth: 1,
    borderColor: C.border,
  },
  segItem: { flex: 1, paddingVertical: 8, borderRadius: 9, alignItems: 'center' },
  segT: { color: C.sub, fontSize: 13, fontWeight: '600' },
  numWrap: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: C.card2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 46,
  },
  numInput: { flex: 1, color: C.text, fontSize: 16, fontWeight: '600', paddingVertical: 0 },
  numSuffix: { color: C.sub, fontSize: 13, marginLeft: 6 },
  lineInput: {
    color: C.text,
    fontSize: 14,
    backgroundColor: C.card2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: C.border,
    paddingHorizontal: 12,
    height: 46,
  },
  field: { marginBottom: 14 },
  fieldLabel: { color: C.sub, fontSize: 13, marginBottom: 7, fontWeight: '600' },
  sheetBackdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.55)', justifyContent: 'flex-end' },
  sheetBody: {
    backgroundColor: C.card,
    borderTopLeftRadius: 22,
    borderTopRightRadius: 22,
    padding: 18,
    maxHeight: '88%',
    borderWidth: 1,
    borderColor: C.border,
  },
  sheetTitle: { color: C.text, fontSize: 17, fontWeight: '700', marginBottom: 14 },
  barTrack: { flex: 1, backgroundColor: C.card2, borderRadius: 99, overflow: 'hidden' },
  stat: { flex: 1, alignItems: 'center' },
  statV: { color: C.text, fontSize: 18, fontWeight: '800' },
  statU: { color: C.sub, fontSize: 11, fontWeight: '600' },
  statL: { color: C.sub, fontSize: 11, marginTop: 3 },
});
