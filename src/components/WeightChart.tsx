import { Dimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { C } from '../theme';

export interface ChartPoint { date: string; weightKg: number }

export function WeightChart({ points }: { points: ChartPoint[] }) {
  const w = Math.min(Dimensions.get('window').width - 64, 420);
  const h = 150;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 20;
  if (points.length === 0) return null;

  const vals = points.map((p) => p.weightKg);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 1) { min -= 0.5; max += 0.5; }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;

  const x = (i: number) => padL + (w - padL - padR) * (points.length === 1 ? 0.5 : i / (points.length - 1));
  const y = (v: number) => padT + (h - padT - padB) * (1 - (v - min) / (max - min || 1));

  const pts = points.map((p, i) => `${x(i)},${y(p.weightKg)}`).join(' ');
  const last = points[points.length - 1];
  const gridVals = [max, (max + min) / 2, min];
  const shortDate = (k: string) => `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}`;

  return (
    <Svg width={w} height={h}>
      {gridVals.map((v, i) => (
        <Line key={i} x1={padL} y1={y(v)} x2={w - padR} y2={y(v)} stroke={C.line} strokeWidth={1} strokeDasharray={i === 0 || i === 2 ? '' : '3,3'} />
      ))}
      {gridVals.map((v, i) => (
        <SvgText key={`t${i}`} x={4} y={y(v) + 4} fill={C.sub} fontSize={10}>{v.toFixed(1)}</SvgText>
      ))}
      <Polyline points={pts} fill="none" stroke={C.accent} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(points.length - 1)} cy={y(last.weightKg)} r={4} fill={C.accent} />
      <SvgText x={x(points.length - 1) - 6} y={y(last.weightKg) - 9} fill={C.accent} fontSize={11} fontWeight="700">
        {last.weightKg.toFixed(1)}
      </SvgText>
      {points.length > 1 && (
        <>
          <SvgText x={padL} y={h - 4} fill={C.sub} fontSize={10}>{shortDate(points[0].date)}</SvgText>
          <SvgText x={w - padR - 26} y={h - 4} fill={C.sub} fontSize={10}>{shortDate(last.date)}</SvgText>
        </>
      )}
    </Svg>
  );
}
