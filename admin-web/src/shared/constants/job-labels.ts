import { JOB_STATUSES, JOB_TYPES, SOURCE_KINDS } from '@/shared/constants';
import i18n from '@/i18n';
import type { AdminTranslationKey } from '@/i18n/locales/en';

function tJobType(type: string): string {
  const key = `job.type.${type}` as AdminTranslationKey;
  return i18n.t(key, { defaultValue: type });
}

function tJobTypeHint(type: string): string {
  const key = `job.typeHint.${type}` as AdminTranslationKey;
  return i18n.t(key, { defaultValue: type });
}

function tJobStatus(status: string): string {
  const key = `job.status.${status}` as AdminTranslationKey;
  return i18n.t(key, { defaultValue: status });
}

function tSourceKind(kind: string): string {
  const key = `source.kind.${kind}` as AdminTranslationKey;
  return i18n.t(key, { defaultValue: kind });
}

export function jobTypeLabel(type: string): string {
  return tJobType(type);
}

export function jobTypeHint(type: string): string {
  return tJobTypeHint(type);
}

export function jobStatusLabel(status: string): string {
  return tJobStatus(status);
}

export function sourceKindLabel(kind: string | null | undefined): string {
  if (!kind) return '';
  return tSourceKind(kind);
}

export function jobTypeValueEnum(): Record<string, { text: string }> {
  return Object.fromEntries(JOB_TYPES.map((t) => [t, { text: jobTypeLabel(t) }]));
}

export function jobStatusValueEnum(): Record<string, { text: string }> {
  return Object.fromEntries(JOB_STATUSES.map((s) => [s, { text: jobStatusLabel(s) }]));
}

export function sourceKindValueEnum(): Record<string, { text: string }> {
  return Object.fromEntries(SOURCE_KINDS.map((k) => [k, { text: tSourceKind(k) }]));
}
