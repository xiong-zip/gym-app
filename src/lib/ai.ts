import type { AISettings } from '../types';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

/** 调用兼容 OpenAI 接口的大模型服务（OpenAI / 智谱 GLM / DeepSeek 等） */
export async function chat(settings: AISettings, messages: ChatMessage[], temperature = 0.7): Promise<string> {
  const base = settings.baseUrl.replace(/\/+$/, '');
  if (!settings.apiKey) throw new Error('未配置 API Key');
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 45000);
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
