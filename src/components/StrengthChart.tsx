import { Dimensions } from 'react-native';
import Svg, { Circle, Line, Polyline, Text as SvgText } from 'react-native-svg';
import { C } from '../theme';

export interface StrengthPoint { date: string; value: number }

/** 某动作的估算 1RM 趋势线（与体重曲线同一套手绘风） */
export function StrengthChart({ points }: { points: StrengthPoint[] }) {
  const w = Math.min(Dimensions.get('window').width - 64, 420);
  const h = 150;
  const padL = 36;
  const padR = 14;
  const padT = 16;
  const padB = 20;
  if (points.length === 0) return null;

  const vals = points.map((p) => p.value);
  let min = Math.min(...vals);
  let max = Math.max(...vals);
  if (max - min < 2.5) { min -= 1; max += 1; }
  const pad = (max - min) * 0.12;
  min -= pad;
  max += pad;

  const x = (i: number) => padL + (w - padL - padR) * (points.length === 1 ? 0.5 : i / (points.length - 1));
  const y = (v: number) => padT + (h - padT - padB) * (1 - (v - min) / (max - min || 1));

  const pts = points.map((p, i) => `${x(i)},${y(p.value)}`).join(' ');
  const last = points[points.length - 1];
  // 历史最高的点（PR）标星号
  let prIdx = 0;
  points.forEach((p, i) => { if (p.value > points[prIdx].value) prIdx = i; });
  const pr = points[prIdx];
  const gridVals = [max, (max + min) / 2, min];
  const shortDate = (k: string) => `${Number(k.slice(5, 7))}/${Number(k.slice(8, 10))}`;

  return (
    <Svg width={w} height={h}>
      {gridVals.map((v, i) => (
        <Line key={i} x1={padL} y1={y(v)} x2={w - padR} y2={y(v)} stroke={C.line} strokeWidth={1} strokeDasharray={i === 0 || i === 2 ? '' : '3,3'} />
      ))}
      {gridVals.map((v, i) => (
        <SvgText key={`t${i}`} x={4} y={y(v) + 4} fill={C.sub} fontSize={10}>{Math.round(v)}</SvgText>
      ))}
      <Polyline points={pts} fill="none" stroke={C.good} strokeWidth={2.5} strokeLinejoin="round" strokeLinecap="round" />
      <Circle cx={x(prIdx)} cy={y(pr.value)} r={4.5} fill={C.marker} stroke={C.markerInk} strokeWidth={1} />
      <SvgText x={Math.min(x(prIdx) + 6, w - 40)} y={y(pr.value) - 8} fill={C.markerInk} fontSize={10} fontWeight="700">
        {`PR ${pr.value}`}
      </SvgText>
      <Circle cx={x(points.length - 1)} cy={y(last.value)} r={4} fill={C.good} />
      <SvgText x={x(points.length - 1) - 6} y={y(last.value) - 9} fill={C.good} fontSize={11} fontWeight="700">
        {last.value}
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
