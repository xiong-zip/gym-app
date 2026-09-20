import type { AISettings } from '../types';

export interface TextPart { type: 'text'; text: string }
export interface ImagePart { type: 'image_url'; image_url: { url: string } }
export type MessageContent = string | (TextPart | ImagePart)[];

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: MessageContent;
}

/** 调用兼容 OpenAI 接口的大模型服务（OpenAI / 智谱 GLM / DeepSeek 等） */
export async function chat(settings: AISettings, messages: ChatMessage[], temperature = 0.7, timeoutMs = 45000): Promise<string> {
  const base = settings.baseUrl.replace(/\/+$/, '');
  if (!settings.apiKey) throw new Error('未配置 API Key');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(`${base}/chat/completions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${settings.apiKey}` },
      body: JSON.stringify({ model: settings.model, messages, temperature }),
      signal: controller.signal,
    });
    if (!res.ok) {
      const t = await res.text().catch(() => '');
      throw new Error(`AI 接口错误 ${res.status}：${t.slice(0, 120)}`);
    }
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const content = data.choices?.[0]?.message?.content;
    if (typeof content !== 'string' || !content.trim()) throw new Error('AI 返回为空');
    return content;
  } catch (e: unknown) {
    if (e instanceof Error && e.name === 'AbortError') throw new Error('AI 请求超时');
    throw e;
  } finally {
    clearTimeout(timer);
  }
}

/** 从模型输出中提取 JSON（容忍 ```json 围栏与前后缀文本） */
export function extractJson(raw: string): unknown {
  let t = raw.trim();
  const fence = t.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fence) t = fence[1].trim();
  const start = t.indexOf('{');
  const end = t.lastIndexOf('}');
  if (start === -1 || end <= start) throw new Error('AI 未返回 JSON');
  return JSON.parse(t.slice(start, end + 1));
}

/* ---------- 拍照识餐（多模态） ---------- */

export interface MealItem {
  name: string;
  grams: number;
  kcal: number;
  protein: number;
  carbs: number;
  fat: number;
}

export interface MealRecognition {
  items: MealItem[];
  note?: string;
}

const MEAL_PROMPT = `你是饮食识别助手。看这张照片里的食物，识别并估算重量与营养。
只返回 JSON，不要任何多余文本，格式：
{"items":[{"name":"食物中文名","grams":份数克重,"kcal":这一份的总热量,"protein":蛋白质克,"carbs":碳水克,"fat":脂肪克}],"note":"一句不超过20字的轻松点评"}
要求：items 最多 3 个，按主要食物排序；数值取整数；热量按整份估算；看不出食物时 items 为空数组。`;

const num = (v: unknown): number => {
  const n = Number(v);
  return Number.isFinite(n) && n > 0 ? Math.round(n) : 0;
};

/** 拍照识餐：传照片 base64（或 data URI），返回识别出的食物列表 */
export async function recognizeMeal(settings: AISettings, imageBase64: string): Promise<MealRecognition> {
  const uri = imageBase64.startsWith('data:') ? imageBase64 : `data:image/jpeg;base64,${imageBase64}`;
  const raw = await chat(settings, [{
    role: 'user',
    content: [
      { type: 'text', text: MEAL_PROMPT },
      { type: 'image_url', image_url: { url: uri } },
    ],
  }], 0.3, 60000);
  const json = extractJson(raw) as { items?: unknown[]; note?: unknown };
  const items: MealItem[] = (Array.isArray(json.items) ? json.items : [])
    .slice(0, 3)
    .map((it) => {
      const o = (it ?? {}) as Record<string, unknown>;
      const name = typeof o.name === 'string' ? o.name.trim().slice(0, 20) : '';
      if (!name) return null;
      return {
        name,
        grams: num(o.grams) || 100,
        kcal: num(o.kcal),
        protein: num(o.protein),
        carbs: num(o.carbs),
        fat: num(o.fat),
      } satisfies MealItem;
    })
    .filter((x): x is MealItem => x !== null && x.kcal > 0);
  const note = typeof json.note === 'string' ? json.note.slice(0, 30) : undefined;
  return { items, note };
}
