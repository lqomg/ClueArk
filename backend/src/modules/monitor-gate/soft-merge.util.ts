import { cosineSimilarity } from '../feed-items/feed-similarity.util';

const GENERIC_TITLE_STOP = new Set(
  [
    'the',
    'a',
    'an',
    'and',
    'or',
    'to',
    'of',
    'in',
    'on',
    'for',
    'with',
    'is',
    'are',
    'at',
    'by',
    'from',
    'as',
    'new',
    'model',
    'models',
    'ai',
    'api',
    'release',
    'releases',
    'launches',
    'launch',
    'announces',
    'announced',
    'official',
    '正式',
    '发布',
    '推出',
    '上线',
    '模型',
    '系列',
    '版本',
    '更新',
    '宣布',
    '官宣',
  ].map((s) => s.toLowerCase()),
);

function foldLatinToken(tok: string): string {
  return tok.toLowerCase().replace(/[\s._+-]+/g, '');
}

function isDottedVersionToken(tok: string): boolean {
  return /^\d+\.\d/.test(tok.toLowerCase());
}

/** 标题实词：拉丁词折叠空白/连字符，点分版本与前词粘合（grok 4.6 ≡ grok-4.6）。 */
export function tokenizeTitleForNearDup(
  title: string,
  excludeTerms: string[] = [],
): string[] {
  const excludeFolded = new Set(
    excludeTerms
      .map((t) => foldLatinToken(String(t ?? '').trim()))
      .filter((t) => t.length >= 2),
  );
  const excludeRaw = new Set(
    excludeTerms
      .map((t) => String(t ?? '').trim().toLowerCase())
      .filter((t) => t.length >= 2),
  );
  const raw = String(title ?? '').toLowerCase();
  if (!raw) return [];

  const pieces: string[] = [];
  const re = /[a-z0-9][a-z0-9._+-]*|[\u4e00-\u9fff]{2,}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(raw))) {
    const tok = m[0];
    if (/[\u4e00-\u9fff]/.test(tok)) {
      pieces.push(tok);
      continue;
    }
    const parts = tok.split(/[-_]+/).filter((p) => p.length >= 1);
    if (parts.length > 1) pieces.push(...parts);
    else pieces.push(tok);
  }

  const glued: string[] = [];
  for (let i = 0; i < pieces.length; i++) {
    const a = pieces[i];
    const b = pieces[i + 1];
    if (b && /^[a-z]/.test(a) && isDottedVersionToken(b)) {
      glued.push(foldLatinToken(`${a}${b}`));
      i += 1;
      continue;
    }
    glued.push(/[\u4e00-\u9fff]/.test(a) ? a : foldLatinToken(a));
  }

  const tokens: string[] = [];
  for (const tok of glued) {
    if (tok.length < 2) continue;
    if (GENERIC_TITLE_STOP.has(tok)) continue;
    if (excludeFolded.has(tok) || excludeRaw.has(tok)) continue;
    tokens.push(tok);
  }
  return [...new Set(tokens)];
}

export function titleNearDupOverlap(
  titleA: string,
  titleB: string,
  excludeTerms: string[] = [],
): {
  jaccard: number;
  shared: number;
  coverageMin: number;
  tokensA: string[];
  tokensB: string[];
} {
  const tokensA = tokenizeTitleForNearDup(titleA, excludeTerms);
  const tokensB = tokenizeTitleForNearDup(titleB, excludeTerms);
  if (!tokensA.length || !tokensB.length) {
    return { jaccard: 0, shared: 0, coverageMin: 0, tokensA, tokensB };
  }
  const setB = new Set(tokensB);
  let shared = 0;
  for (const t of tokensA) {
    if (setB.has(t)) shared += 1;
  }
  const union = new Set([...tokensA, ...tokensB]).size;
  const jaccard = union > 0 ? shared / union : 0;
  const coverageMin = shared / Math.min(tokensA.length, tokensB.length);
  return { jaccard, shared, coverageMin, tokensA, tokensB };
}

export type ConsolidateDevelopmentRow = {
  id: string;
  mergeScopeKey: string;
  title: string;
  summary: string;
  timelineAtMs: number;
  evidenceItemIds: string[];
  clusterIds: string[];
  primaryEvidenceItemId: string | null;
  vector?: number[] | null;
};

export type ConsolidateEdgeReason = 'cluster' | 'near_dup' | 'llm';

export type ConsolidateEdge = {
  keeperId: string;
  loserId: string;
  reason: ConsolidateEdgeReason;
};

export function developmentIdentityKeys(row: {
  mergeScopeKey?: string;
  clusterIds?: string[];
}): Set<string> {
  const out = new Set<string>();
  const key = String(row.mergeScopeKey ?? '').trim();
  if (key) out.add(key);
  for (const raw of row.clusterIds ?? []) {
    const id = String(raw ?? '').trim();
    if (id) out.add(id);
  }
  return out;
}

export function sharesClusterIdentity(
  a: { mergeScopeKey?: string; clusterIds?: string[] },
  b: { mergeScopeKey?: string; clusterIds?: string[] },
): boolean {
  const left = developmentIdentityKeys(a);
  if (!left.size) return false;
  for (const id of developmentIdentityKeys(b)) {
    if (left.has(id)) return true;
  }
  return false;
}

function compareConsolidateKeeper(
  a: ConsolidateDevelopmentRow,
  b: ConsolidateDevelopmentRow,
): number {
  const ea = a.evidenceItemIds?.length ?? 0;
  const eb = b.evidenceItemIds?.length ?? 0;
  if (eb !== ea) return eb - ea;
  if (a.timelineAtMs !== b.timelineAtMs) return a.timelineAtMs - b.timelineAtMs;
  return a.id.localeCompare(b.id);
}

/**
 * 规划整窗 consolidate：时间窗内同簇身份、向量近重或标题近重 → 并查集；
 * 返回「吸收进 keeper、删除 loser」的边。不含灰区 LLM。
 */
export function planDevelopmentConsolidations(
  rows: ConsolidateDevelopmentRow[],
  opts: {
    windowHours: number;
    minCosine: number;
    minTitleJaccard: number;
    minSharedTokens: number;
    excludeTerms?: string[];
  },
): ConsolidateEdge[] {
  if (rows.length < 2) return [];
  const windowMs = Math.max(1, opts.windowHours) * 3600_000;
  const parent = rows.map((_, i) => i);
  const find = (i: number): number => {
    let x = i;
    while (parent[x] !== x) x = parent[x];
    let y = i;
    while (parent[y] !== y) {
      const n = parent[y];
      parent[y] = x;
      y = n;
    }
    return x;
  };
  const union = (i: number, j: number) => {
    const a = find(i);
    const b = find(j);
    if (a !== b) parent[b] = a;
  };

  const shouldMerge = (a: ConsolidateDevelopmentRow, b: ConsolidateDevelopmentRow): boolean => {
    const dt = Math.abs((a.timelineAtMs || 0) - (b.timelineAtMs || 0));
    if (dt > windowMs) return false;
    if (sharesClusterIdentity(a, b)) return true;
    const va = a.vector;
    const vb = b.vector;
    if (Array.isArray(va) && Array.isArray(vb) && va.length && va.length === vb.length) {
      if (cosineSimilarity(va, vb) >= opts.minCosine) return true;
    }
    const { jaccard, shared, coverageMin } = titleNearDupOverlap(a.title, b.title, opts.excludeTerms ?? []);
    return (
      shared >= opts.minSharedTokens &&
      (jaccard >= opts.minTitleJaccard || coverageMin >= 0.5)
    );
  };

  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      if (shouldMerge(rows[i], rows[j])) union(i, j);
    }
  }

  const groups = new Map<number, number[]>();
  for (let i = 0; i < rows.length; i++) {
    const root = find(i);
    const g = groups.get(root) ?? [];
    g.push(i);
    groups.set(root, g);
  }

  const edges: ConsolidateEdge[] = [];
  for (const idxs of groups.values()) {
    if (idxs.length < 2) continue;
    idxs.sort((ia, ib) => compareConsolidateKeeper(rows[ia], rows[ib]));
    const keeper = rows[idxs[0]];
    for (let k = 1; k < idxs.length; k++) {
      const loser = rows[idxs[k]];
      edges.push({
        keeperId: keeper.id,
        loserId: loser.id,
        reason: sharesClusterIdentity(keeper, loser) ? 'cluster' : 'near_dup',
      });
    }
  }
  return edges;
}

/**
 * 身份/近重尚未合上、且向量落在灰区的对。余弦只负责召回，不在这里合并。
 */
export function listUnmergedGrayZonePairs(
  rows: ConsolidateDevelopmentRow[],
  mergedEdges: Array<{ keeperId: string; loserId: string }>,
  opts: {
    windowHours: number;
    minScore: number;
    maxScoreExclusive: number;
    limit: number;
  },
): Array<{ keeperId: string; loserId: string; score: number }> {
  if (rows.length < 2) return [];
  const windowMs = Math.max(1, opts.windowHours) * 3600_000;
  const parent = new Map<string, string>();
  const find = (id: string): string => {
    const p = parent.get(id) ?? id;
    if (p === id) {
      parent.set(id, id);
      return id;
    }
    const root = find(p);
    parent.set(id, root);
    return root;
  };
  const union = (a: string, b: string) => {
    const ra = find(a);
    const rb = find(b);
    if (ra !== rb) parent.set(rb, ra);
  };
  for (const row of rows) parent.set(row.id, row.id);
  for (const edge of mergedEdges) union(edge.keeperId, edge.loserId);

  const pairs: Array<{ keeperId: string; loserId: string; score: number }> = [];
  for (let i = 0; i < rows.length; i++) {
    for (let j = i + 1; j < rows.length; j++) {
      const a = rows[i];
      const b = rows[j];
      if (find(a.id) === find(b.id)) continue;
      const dt = Math.abs((a.timelineAtMs || 0) - (b.timelineAtMs || 0));
      if (dt > windowMs) continue;
      const va = a.vector;
      const vb = b.vector;
      if (!Array.isArray(va) || !Array.isArray(vb) || va.length !== vb.length || !va.length) {
        continue;
      }
      const score = cosineSimilarity(va, vb);
      if (score < opts.minScore || score >= opts.maxScoreExclusive) continue;
      const [keeper, loser] = compareConsolidateKeeper(a, b) <= 0 ? [a, b] : [b, a];
      pairs.push({ keeperId: keeper.id, loserId: loser.id, score });
    }
  }
  pairs.sort((x, y) => y.score - x.score || x.loserId.localeCompare(y.loserId));
  return pairs.slice(0, Math.max(0, opts.limit));
}
