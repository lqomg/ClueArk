import { http } from '../http';
import type { Source } from '@/types/models';

/** 与后端 clueark-sources 导出结构一致 */
export type AdminSourcesExportJson = {
  format: 'clueark-sources';
  version: number;
  exportedAt: string;
  sources: Omit<Source, 'openUrl'>[];
};

export type AdminSourcesImportResult = {
  created: number;
  updated: number;
  skippedDuplicate: number;
  failed: { index: number; reason: string }[];
};

export async function listAdminSources(): Promise<Source[]> {
  const { data } = await http.get<Source[]>('/admin/sources?includeDisabled=1');
  return data;
}

export async function exportAdminSourcesJson(): Promise<AdminSourcesExportJson> {
  const { data } = await http.get<AdminSourcesExportJson>('/admin/sources/export/json');
  return data;
}

export async function importAdminSourcesJson(body: unknown): Promise<AdminSourcesImportResult> {
  const { data } = await http.post<AdminSourcesImportResult>('/admin/sources/import/json', body);
  return data;
}

export async function createAdminSource(body: Record<string, unknown>): Promise<void> {
  await http.post('/admin/sources', body);
}

export async function patchAdminSource(id: string, body: Record<string, unknown>): Promise<void> {
  await http.patch(`/admin/sources/${id}`, body);
}

export async function deleteAdminSource(id: string): Promise<void> {
  await http.delete(`/admin/sources/${id}`);
}
