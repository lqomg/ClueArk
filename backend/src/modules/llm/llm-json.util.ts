/** 解析模型返回的 JSON（可带 ```json 围栏） */
export function parseJsonContent(text: string): unknown {
  let t = text.trim();
  const fence = /^```(?:json)?\s*([\s\S]*?)```$/im.exec(t);
  if (fence) t = fence[1].trim();
  return JSON.parse(t) as unknown;
}
