/** 热路径进展编辑：目录全貌 + 精读子集（不用向量/标题近重过滤）。 */

export type EditorEvidenceRow = {
  id: string;
  title: string;
  summary: string;
  timelineAt: string;
  mergeScopeKey: string;
};

export type EditorCatalogCard = {
  id: string;
  title: string;
  timelineAt: string;
  blurb: string;
};

export type EditorFocusCard = {
  id: string;
  title: string;
  summary: string;
};

export type EditorEvidencePack = {
  catalog: EditorCatalogCard[];
  focus: EditorFocusCard[];
  rowsById: Map<string, EditorEvidenceRow>;
};

export function clipDevelopmentBlurb(summary: string, max: number): string {
  const s = String(summary ?? '').trim().replace(/\s+/g, ' ');
  if (!s) return '';
  const cap = Math.max(1, Math.floor(Number(max) || 0));
  return s.length <= cap ? s : s.slice(0, cap);
}

function toEditorRow(raw: {
  id?: string;
  title?: string;
  summary?: string;
  timelineAt?: string;
  mergeScopeKey?: string;
}): EditorEvidenceRow | null {
  const id = String(raw.id ?? '').trim();
  if (!id) return null;
  const mergeScopeKey = String(raw.mergeScopeKey ?? '').trim();
  return {
    id,
    title: String(raw.title ?? ''),
    summary: String(raw.summary ?? ''),
    timelineAt: String(raw.timelineAt ?? ''),
    mergeScopeKey,
  };
}

function timelineMs(iso: string): number {
  const t = Date.parse(iso);
  return Number.isFinite(t) ? t : 0;
}

/**
 * listed 已按 timelineAt 新→旧。同簇卡若不在硬顶内则插到目录最前。
 * 精读 = 同簇卡 + 目录中最近 focusRecent 张（按 timelineAt，去重）。
 */
export function buildEditorEvidencePack(params: {
  listed: Array<{
    id: string;
    title: string;
    summary: string;
    timelineAt: string;
    mergeScopeKey?: string;
  }>;
  sameCluster: {
    id: string;
    title: string;
    summary: string;
    timelineAt: string;
    mergeScopeKey?: string;
  } | null;
  catalogCap: number;
  focusRecent: number;
  blurbMax: number;
}): EditorEvidencePack {
  const catalogCap = Math.max(1, Math.floor(Number(params.catalogCap) || 1));
  const focusRecent = Math.max(0, Math.floor(Number(params.focusRecent) || 0));
  const blurbMax = Math.max(1, Math.floor(Number(params.blurbMax) || 1));

  const listedRows: EditorEvidenceRow[] = [];
  const seen = new Set<string>();
  for (const raw of params.listed) {
    const row = toEditorRow(raw);
    if (!row || seen.has(row.id)) continue;
    seen.add(row.id);
    listedRows.push(row);
  }

  const same = params.sameCluster ? toEditorRow(params.sameCluster) : null;
  let catalogRows = listedRows.slice(0, catalogCap);
  if (same && !catalogRows.some((r) => r.id === same.id)) {
    catalogRows = [same, ...catalogRows];
    if (catalogRows.length > catalogCap) {
      catalogRows = catalogRows.slice(0, catalogCap);
    }
  }

  const rowsById = new Map<string, EditorEvidenceRow>();
  for (const row of catalogRows) rowsById.set(row.id, row);
  if (same) rowsById.set(same.id, same);

  const catalog: EditorCatalogCard[] = catalogRows.map((row) => ({
    id: row.id,
    title: row.title.slice(0, 300),
    timelineAt: row.timelineAt,
    blurb: clipDevelopmentBlurb(row.summary, blurbMax),
  }));

  const newest = [...catalogRows]
    .sort((a, b) => {
      const dt = timelineMs(b.timelineAt) - timelineMs(a.timelineAt);
      return dt !== 0 ? dt : b.id.localeCompare(a.id);
    })
    .slice(0, focusRecent);

  const focusIds: string[] = [];
  const focusSeen = new Set<string>();
  const pushFocus = (id: string | undefined) => {
    const key = String(id ?? '').trim();
    if (!key || focusSeen.has(key)) return;
    focusSeen.add(key);
    focusIds.push(key);
  };
  if (same) pushFocus(same.id);
  for (const row of newest) pushFocus(row.id);

  const focus: EditorFocusCard[] = [];
  for (const id of focusIds) {
    const row = rowsById.get(id);
    if (!row) continue;
    focus.push({
      id: row.id,
      title: row.title.slice(0, 300),
      summary: row.summary.slice(0, 2000),
    });
  }

  return { catalog, focus, rowsById };
}
