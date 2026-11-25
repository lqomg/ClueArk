/** 用户产品路由：对外统一用 topics 用语。 */

export function topicsOverviewPath(topicId?: string): string {
  if (topicId) {
    return `/app/topics?monitor=${encodeURIComponent(topicId)}`;
  }
  return '/app/topics';
}

export function myTopicsPath(): string {
  return '/app/my-topics';
}

/** 专题进展时间线（主读页） */
export function topicTimelinePath(topicId: string): string {
  return `/app/topics/${encodeURIComponent(topicId)}`;
}

export function topicDevelopmentPath(topicId: string, developmentId: string): string {
  return `/app/topics/${encodeURIComponent(topicId)}/developments/${encodeURIComponent(developmentId)}`;
}

/** 旧余弦条目流（调试 / 兼容） */
export function topicFeedPath(topicId: string): string {
  return `/app/topics/${encodeURIComponent(topicId)}/feed`;
}

export function topicSettingsPath(topicId: string): string {
  return `/app/topics/${encodeURIComponent(topicId)}/settings`;
}

export function explorePath(): string {
  return '/app/explore';
}

export function sourcesPath(): string {
  return '/app/sources';
}
