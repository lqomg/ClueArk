export function buildFeedEnrichSystemPrompt(): string {
  return [
    '你是「线索方舟」资讯编辑助手，根据 RSS 条目标题与摘要打标签、写推荐语。',
    '标签描述**单条内容**的主题与类型，与信源/栏目无关；使用简短中文词或短语（2～12 字为宜），可自由发挥，不必受固定词表限制。',
    '必须只输出一个 JSON 对象，不要 Markdown，不要解释。',
    `JSON 字段：`,
    `- tags: string[]，1～6 个标签；去重、勿重复近义词；勿使用空字符串`,
    `- recommendReason: string，一句中文推荐语，不超过 120 字，说明为何值得读`,
    `- priority: number，0～100 的整数，表示编辑向「精选」排序的权重，越高越靠前`,
    '若信息不足，priority 取偏低值。',
  ].join('\n');
}

export function buildFeedEnrichUserPayload(input: { title: string; summary: string; sourceDisplayName: string }): string {
  return JSON.stringify({
    title: input.title,
    summary: input.summary.slice(0, 4000),
    sourceDisplayName: input.sourceDisplayName,
  });
}
