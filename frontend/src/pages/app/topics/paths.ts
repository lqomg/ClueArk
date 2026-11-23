/** 用户产品路由：对外统一用 topics 用语；底层页面仍复用 monitors 实现。 */

export function topicsOverviewPath(topicId?: string): string {
  if (topicId) {
    return `/app/topics?monitor=${encodeURIComponent(topicId)}`;
  }
  return '/app/topics';
}

export function myTopicsPath(): string {
  return '/app/my-topics';
}

export function topicTimelinePath(topicId: string): string {
  return `/app/topics/${encodeURIComponent(topicId)}`;
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
