import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { randomBytes } from 'crypto';
import { promises as fs } from 'fs';
import * as path from 'path';
import { Source, SourceDocument } from './schemas/source.schema';
import { checkUrlReachable, isValidHttpUrl } from './url-check.util';
import { buildFingerprint, openUrlForSource } from './fingerprint.util';
import { SOURCE_KIND, type SourceKind } from './source-kind';
import type { CreateSourceDto } from './dto/create-source.dto';
import type { UpdateSourceDto } from './dto/update-source.dto';
import type { ListSourcesQueryDto } from './dto/list-sources.query.dto';
import { assertSourceAvatarUrlOwned, avatarExtForMime } from './source-avatar.util';
import {
  SOURCES_JSON_FORMAT,
  SOURCES_JSON_VERSION,
  importRowToCreateDto,
  importRowToUpdateDto,
  isObjectId24,
  normalizeImportSourcesArray,
  type OfficialCreateWithFlags,
} from './sources-json-io.util';

export type JwtUserRole = 'user' | 'admin';

function escapeRegex(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function notDeletedFilter(): Record<string, unknown> {
  return { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] };
}

function serializeSource(doc: Record<string, unknown>) {
  const kind = doc.kind as SourceKind;
  const web = doc.web as
    | { url?: string; crawlListUrl?: string; crawlSelectors?: { item?: string; link?: string; title?: string; summary?: string; date?: string } }
    | undefined;
  const rss = doc.rss as { feedUrl?: string; siteUrl?: string; titleHint?: string } | undefined;
  const hot = doc.hot as
    | { url?: string; mapper?: unknown; lastPollAt?: Date | null }
    | undefined;
  const createdBy = doc.createdBy as Types.ObjectId | null | undefined;
  return {
    id: String(doc._id),
    kind,
    displayName: doc.displayName,
    avatarUrl: (doc.avatarUrl as string | null | undefined) ?? null,
    fingerprint: doc.fingerprint,
    web: web ?? null,
    rss: rss ?? null,
    hot: hot
      ? {
          url: hot.url ?? '',
          mapper: (hot.mapper as unknown) ?? null,
          lastPollAt: hot.lastPollAt instanceof Date ? hot.lastPollAt.toISOString() : null,
        }
      : null,
    note: doc.note ?? '',
    enabled: doc.enabled !== false,
    sortOrder: typeof doc.sortOrder === 'number' ? doc.sortOrder : 0,
    createdBy: createdBy ? String(createdBy) : null,
    isOfficial: !createdBy,
    openUrl: openUrlForSource(kind, web, rss, hot),
    createdAt: doc.createdAt,
    updatedAt: doc.updatedAt,
  };
}

/** 信源池仅管理员可写；普通用户只读（后续「监控」再引用池中信源） */
function canWrite(_userId: string, role: JwtUserRole, _doc: SourceDocument | Record<string, unknown>): boolean {
  return role === 'admin';
}

@Injectable()
export class SourcesService {
  constructor(@InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>) {}

  async adminList(includeDisabled: boolean): Promise<ReturnType<typeof serializeSource>[]> {
    const filter: Record<string, unknown> = { ...notDeletedFilter() };
    if (!includeDisabled) filter.enabled = true;
    const items = await this.sourceModel.find(filter).sort({ sortOrder: 1, displayName: 1 }).lean().exec();
    return items.map((d) => serializeSource(d as Record<string, unknown>));
  }

  async adminCreateOfficial(
    adminUserId: string,
    dto: CreateSourceDto & { enabled?: boolean; sortOrder?: number },
  ) {
    const row = await this.buildPayloadFromCreateDto(adminUserId, dto);
    const sortOrder = dto.sortOrder ?? 0;
    try {
      const doc = await this.sourceModel.create({
        ...row,
        enabled: dto.enabled ?? true,
        sortOrder,
        createdBy: null,
        deletedAt: null,
      });
      return serializeSource(doc.toObject() as unknown as Record<string, unknown>);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: number }).code === 11000) {
        throw new ConflictException('source_duplicate');
      }
      throw e;
    }
  }

  async adminUpdateAny(adminUserId: string, sourceId: string, dto: UpdateSourceDto) {
    const existing = await this.sourceModel.findOne({ _id: sourceId, ...notDeletedFilter() }).exec();
    if (!existing) throw new NotFoundException('source_not_found');
    return this.applyUpdate('admin', adminUserId, existing, dto);
  }

  async adminSoftDelete(sourceId: string) {
    const res = await this.sourceModel
      .updateOne({ _id: sourceId, ...notDeletedFilter() }, { $set: { deletedAt: new Date(), enabled: false } })
      .exec();
    if (res.matchedCount === 0) throw new NotFoundException('source_not_found');
    return { ok: true };
  }

  async adminExportJson(): Promise<{
    format: typeof SOURCES_JSON_FORMAT;
    version: typeof SOURCES_JSON_VERSION;
    exportedAt: string;
    sources: Omit<ReturnType<typeof serializeSource>, 'openUrl'>[];
  }> {
    const list = await this.adminList(true);
    return {
      format: SOURCES_JSON_FORMAT,
      version: SOURCES_JSON_VERSION,
      exportedAt: new Date().toISOString(),
      sources: list.map(({ openUrl: _openUrl, ...rest }) => rest),
    };
  }

  async adminImportJson(
    adminUserId: string,
    body: unknown,
  ): Promise<{
    created: number;
    updated: number;
    skippedDuplicate: number;
    failed: { index: number; reason: string }[];
  }> {
    let rows: unknown[];
    try {
      rows = normalizeImportSourcesArray(body);
    } catch (e) {
      const msg = e instanceof Error ? e.message : '';
      if (msg === 'too_many_sources') throw new BadRequestException('import_too_many_sources');
      throw new BadRequestException('import_invalid_json');
    }

    const failed: { index: number; reason: string }[] = [];
    let created = 0;
    let updated = 0;
    let skippedDuplicate = 0;
    const CONC = 6;

    const processOne = async (index: number, row: unknown) => {
      try {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {
          throw new Error('invalid_row');
        }
        const r = row as Record<string, unknown>;
        const idRaw = typeof r.id === 'string' ? r.id.trim() : '';
        let targetId: string | null = null;
        let existingKind: SourceKind | null = null;
        if (idRaw && isObjectId24(idRaw)) {
          const ex = await this.sourceModel.findOne({ _id: idRaw, ...notDeletedFilter() }).lean().exec();
          if (ex) {
            targetId = idRaw;
            existingKind = ex.kind as SourceKind;
          }
        }

        if (targetId && existingKind) {
          const patch = this.sanitizeUpdateAvatar(adminUserId, importRowToUpdateDto(existingKind, r));
          await this.adminUpdateAny(adminUserId, targetId, patch);
          updated += 1;
          return;
        }

        const dto = this.sanitizeCreateAvatar(adminUserId, importRowToCreateDto(r));
        try {
          await this.adminCreateOfficial(adminUserId, dto);
          created += 1;
        } catch (e: unknown) {
          if (e instanceof ConflictException) {
            skippedDuplicate += 1;
            return;
          }
          throw e;
        }
      } catch (e: unknown) {
        if (e instanceof BadRequestException) {
          failed.push({ index, reason: String(e.message) });
          return;
        }
        failed.push({ index, reason: e instanceof Error ? e.message : 'unknown_error' });
      }
    };

    for (let i = 0; i < rows.length; i += CONC) {
      const slice = rows.slice(i, i + CONC);
      await Promise.all(slice.map((row, j) => processOne(i + j, row)));
    }

    return { created, updated, skippedDuplicate, failed };
  }

  private sanitizeCreateAvatar(adminUserId: string, dto: OfficialCreateWithFlags): OfficialCreateWithFlags {
    const raw = dto.avatarUrl?.trim();
    if (!raw) return dto;
    try {
      assertSourceAvatarUrlOwned(adminUserId, raw);
      return dto;
    } catch {
      const { avatarUrl: _a, ...rest } = dto;
      return { ...rest };
    }
  }

  private sanitizeUpdateAvatar(adminUserId: string, dto: UpdateSourceDto): UpdateSourceDto {
    if (dto.avatarUrl === undefined) return dto;
    if (dto.avatarUrl === null) return dto;
    const raw = dto.avatarUrl.trim();
    if (!raw) return { ...dto, avatarUrl: null };
    try {
      assertSourceAvatarUrlOwned(adminUserId, raw);
      return dto;
    } catch {
      const { avatarUrl: _a, ...rest } = dto;
      return rest;
    }
  }

  async saveAvatarBuffer(userId: string, buffer: Buffer, mimetype: string): Promise<{ avatarUrl: string }> {
    const ext = avatarExtForMime(mimetype);
    if (!ext) throw new BadRequestException('invalid_image_type');
    const name = `${userId}-${Date.now()}-${randomBytes(6).toString('hex')}.${ext}`;
    const dir = path.join(process.cwd(), 'uploads', 'source-avatars');
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(path.join(dir, name), buffer);
    return { avatarUrl: `/api/uploads/source-avatars/${name}` };
  }

  async validateUrl(url: string): Promise<{ valid: boolean; normalized: string | null }> {
    if (!isValidHttpUrl(url)) {
      return { valid: false, normalized: null };
    }
    const r = await checkUrlReachable(url);
    return { valid: r.ok, normalized: r.normalized };
  }

  async getOne(userId: string, role: JwtUserRole, sourceId: string) {
    const doc = await this.sourceModel.findOne({ _id: sourceId, ...notDeletedFilter() }).lean().exec();
    if (!doc) throw new NotFoundException('source_not_found');
    if (!doc.enabled && role !== 'admin') throw new NotFoundException('source_not_found');
    return serializeSource(doc as Record<string, unknown>);
  }

  async list(_userId: string, q: ListSourcesQueryDto) {
    const page = q.page ?? 1;
    const pageSize = q.pageSize ?? 20;
    const filter: Record<string, unknown> = { enabled: true, ...notDeletedFilter() };
    if (q.search?.trim()) {
      const s = q.search.trim();
      filter.$or = [
        { displayName: { $regex: escapeRegex(s), $options: 'i' } },
        { note: { $regex: escapeRegex(s), $options: 'i' } },
      ];
    }
    if (q.kind) {
      filter.kind = q.kind;
    }
    const sortBy = q.sortBy ?? 'createdAt';
    const sortOrder = q.sortOrder === 'asc' ? 1 : -1;
    const sort: Record<string, 1 | -1> =
      sortBy === 'displayName'
        ? { sortOrder: 1, displayName: sortOrder, createdAt: -1 }
        : { sortOrder: 1, createdAt: sortOrder };

    const [total, items] = await Promise.all([
      this.sourceModel.countDocuments(filter).exec(),
      this.sourceModel
        .find(filter)
        .sort(sort)
        .skip((page - 1) * pageSize)
        .limit(pageSize)
        .lean()
        .exec(),
    ]);
    return {
      items: items.map((doc) => serializeSource(doc as Record<string, unknown>)),
      total,
      page,
      pageSize,
    };
  }

  private async buildPayloadFromCreateDto(
    actingUserId: string,
    dto: CreateSourceDto,
  ): Promise<{
    kind: SourceKind;
    displayName: string;
    fingerprint: string;
    web?: {
      url: string;
      crawlListUrl?: string;
      crawlSelectors?: { item: string; link: string; title: string; summary?: string; date?: string };
    };
    rss?: { feedUrl: string; siteUrl?: string; titleHint?: string };
    hot?: { url: string; mapper: Record<string, unknown> | null; lastPollAt: null };
    note: string;
    avatarUrl: string | null;
  }> {
    this.validateCreateShape(dto);
    const avatarTrim = dto.avatarUrl?.trim();
    if (avatarTrim) assertSourceAvatarUrlOwned(actingUserId, avatarTrim);

    const kind = dto.kind;
    let web:
      | {
          url: string;
          crawlListUrl?: string;
          crawlSelectors?: { item: string; link: string; title: string; summary?: string; date?: string };
        }
      | undefined;
    let rss: { feedUrl: string; siteUrl?: string; titleHint?: string } | undefined;
    let hot: | { url: string; mapper: Record<string, unknown> | null; lastPollAt: null } | undefined;
    let fingerprint: string | null = null;

    if (kind === SOURCE_KIND.WEB) {
      const raw = dto.web!.url;
      if (!isValidHttpUrl(raw)) throw new BadRequestException('invalid_url');
      const reach = await checkUrlReachable(raw);
      if (!reach.ok || !reach.normalized) throw new BadRequestException('invalid_url');
      web = { url: reach.normalized };
      const clRaw = dto.web!.crawlListUrl?.trim();
      if (clRaw) {
        if (!isValidHttpUrl(clRaw)) throw new BadRequestException('invalid_crawl_list_url');
        const clReach = await checkUrlReachable(clRaw);
        if (!clReach.ok || !clReach.normalized) throw new BadRequestException('invalid_crawl_list_url');
        web.crawlListUrl = clReach.normalized;
      }
      if (dto.web!.crawlSelectors) {
        const s = dto.web!.crawlSelectors;
        web.crawlSelectors = {
          item: s.item.trim(),
          link: s.link.trim(),
          title: s.title.trim(),
          ...(s.summary?.trim() ? { summary: s.summary.trim() } : {}),
          ...(s.date?.trim() ? { date: s.date.trim() } : {}),
        };
      }
      fingerprint = buildFingerprint(SOURCE_KIND.WEB, { webUrl: reach.normalized });
    } else if (kind === SOURCE_KIND.RSS) {
      const raw = dto.rss!.feedUrl;
      if (!isValidHttpUrl(raw)) throw new BadRequestException('invalid_feed_url');
      const reach = await checkUrlReachable(raw);
      if (!reach.ok || !reach.normalized) throw new BadRequestException('invalid_feed_url');
      const siteUrl = dto.rss!.siteUrl?.trim();
      rss = {
        feedUrl: reach.normalized,
        ...(siteUrl && isValidHttpUrl(siteUrl) ? { siteUrl } : {}),
        ...(dto.rss!.titleHint?.trim() ? { titleHint: dto.rss!.titleHint.trim() } : {}),
      };
      fingerprint = buildFingerprint(SOURCE_KIND.RSS, { rssFeedUrl: reach.normalized });
    } else if (kind === SOURCE_KIND.HOT_API) {
      const rawUrl = dto.hot!.url.trim();
      if (!isValidHttpUrl(rawUrl)) throw new BadRequestException('invalid_url');
      const reach = await checkUrlReachable(rawUrl);
      if (!reach.ok || !reach.normalized) throw new BadRequestException('invalid_url');
      const mapper = dto.hot!.mapper ?? null;
      if (mapper && (typeof mapper !== 'object' || Array.isArray(mapper))) {
        throw new BadRequestException('invalid_hot_mapper');
      }
      if (mapper && typeof (mapper as { itemsPath?: unknown }).itemsPath !== 'string') {
        throw new BadRequestException('invalid_hot_mapper');
      }
      hot = {
        url: reach.normalized,
        mapper: mapper ? (mapper as unknown as Record<string, unknown>) : null,
        lastPollAt: null,
      };
      fingerprint = buildFingerprint(SOURCE_KIND.HOT_API, {
        hotUrl: reach.normalized,
      });
    } else {
      throw new BadRequestException('invalid_kind');
    }

    if (!fingerprint) throw new BadRequestException('invalid_fingerprint');

    return {
      kind,
      displayName: dto.displayName.trim(),
      fingerprint,
      web,
      rss,
      hot,
      note: (dto.note ?? '').trim(),
      avatarUrl: avatarTrim || null,
    };
  }

  private validateCreateShape(dto: CreateSourceDto): void {
    const { kind, web, rss } = dto;
    if (kind === SOURCE_KIND.WEB) {
      if (!web?.url) throw new BadRequestException('web_required');
      if (rss || dto.hot) throw new BadRequestException('extra_payload');
      return;
    }
    if (kind === SOURCE_KIND.RSS) {
      if (!rss?.feedUrl) throw new BadRequestException('rss_required');
      if (web || dto.hot) throw new BadRequestException('extra_payload');
      return;
    }
    if (kind === SOURCE_KIND.HOT_API) {
      if (!dto.hot?.url?.trim()) {
        throw new BadRequestException('hot_required');
      }
      if (web || rss) throw new BadRequestException('extra_payload');
      return;
    }
    throw new BadRequestException('invalid_kind');
  }

  private async applyUpdate(role: JwtUserRole, actingUserId: string, existing: SourceDocument, dto: UpdateSourceDto) {
    const $set: Record<string, unknown> = {};

    if (dto.displayName != null) $set.displayName = dto.displayName.trim();
    if (dto.note != null) $set.note = dto.note.trim();
    if (dto.avatarUrl !== undefined) {
      const raw = dto.avatarUrl === null ? '' : dto.avatarUrl.trim();
      if (raw) {
        const avatarOwner = existing.createdBy ? String(existing.createdBy) : actingUserId;
        assertSourceAvatarUrlOwned(avatarOwner, raw);
      }
      $set.avatarUrl = raw || null;
    }

    if (role === 'admin') {
      if (dto.enabled != null) $set.enabled = dto.enabled;
      if (dto.sortOrder != null) $set.sortOrder = dto.sortOrder;
    }

    const kind = existing.kind as SourceKind;

    if (dto.web != null && kind === SOURCE_KIND.WEB) {
      const cur = existing.web as
        | { url?: string; crawlListUrl?: string; crawlSelectors?: { item: string; link: string; title: string; summary?: string; date?: string } }
        | undefined;
      const raw = dto.web.url ?? cur?.url;
      if (!raw || !isValidHttpUrl(raw)) throw new BadRequestException('invalid_url');
      const reach = await checkUrlReachable(raw);
      if (!reach.ok || !reach.normalized) throw new BadRequestException('invalid_url');
      const urlNorm = reach.normalized;
      const fp = buildFingerprint(SOURCE_KIND.WEB, { webUrl: urlNorm });
      if (!fp) throw new BadRequestException('invalid_fingerprint');

      let crawlListUrl = cur?.crawlListUrl;
      if (dto.web.crawlListUrl !== undefined) {
        const t = dto.web.crawlListUrl?.trim();
        if (!t) crawlListUrl = undefined;
        else {
          if (!isValidHttpUrl(t)) throw new BadRequestException('invalid_crawl_list_url');
          const rr = await checkUrlReachable(t);
          if (!rr.ok || !rr.normalized) throw new BadRequestException('invalid_crawl_list_url');
          crawlListUrl = rr.normalized;
        }
      }

      let crawlSelectors = cur?.crawlSelectors;
      if (dto.web.crawlSelectors !== undefined) {
        if (dto.web.crawlSelectors === null) {
          crawlSelectors = undefined;
        } else {
          const act = dto.web.crawlSelectors;
          const item = act.item?.trim();
          const link = act.link?.trim();
          const title = act.title?.trim();
          if (!item || !link || !title) {
            throw new BadRequestException('crawl_selectors_incomplete');
          }
          crawlSelectors = {
            item,
            link,
            title,
            ...(act.summary?.trim() ? { summary: act.summary.trim() } : {}),
            ...(act.date?.trim() ? { date: act.date.trim() } : {}),
          };
        }
      }

      const webOut: Record<string, unknown> = { url: urlNorm };
      if (crawlListUrl) webOut.crawlListUrl = crawlListUrl;
      if (crawlSelectors) webOut.crawlSelectors = crawlSelectors;
      $set.web = webOut;
      $set.fingerprint = fp;
    }
    if (dto.rss != null && kind === SOURCE_KIND.RSS) {
      const cur = existing.rss as { feedUrl?: string; siteUrl?: string; titleHint?: string } | undefined;
      const raw = dto.rss.feedUrl ?? cur?.feedUrl;
      if (!raw || !isValidHttpUrl(raw)) throw new BadRequestException('invalid_feed_url');
      const reach = await checkUrlReachable(raw);
      if (!reach.ok || !reach.normalized) throw new BadRequestException('invalid_feed_url');
      const siteUrl = (dto.rss.siteUrl ?? cur?.siteUrl)?.trim();
      const titleHint = (dto.rss.titleHint ?? cur?.titleHint)?.trim();
      $set.rss = {
        feedUrl: reach.normalized,
        ...(siteUrl && isValidHttpUrl(siteUrl) ? { siteUrl } : {}),
        ...(titleHint ? { titleHint } : {}),
      };
      const fp = buildFingerprint(SOURCE_KIND.RSS, { rssFeedUrl: reach.normalized });
      if (!fp) throw new BadRequestException('invalid_fingerprint');
      $set.fingerprint = fp;
    }
    if (dto.hot != null && kind === SOURCE_KIND.HOT_API) {
      const cur = existing.hot as
        | { url?: string; mapper?: Record<string, unknown> | null; lastPollAt?: Date | null }
        | undefined;
      const rawUrl = dto.hot.url ?? cur?.url;
      if (!rawUrl?.trim()) throw new BadRequestException('invalid_url');
      if (!isValidHttpUrl(rawUrl.trim())) throw new BadRequestException('invalid_url');
      const reach = await checkUrlReachable(rawUrl.trim());
      if (!reach.ok || !reach.normalized) throw new BadRequestException('invalid_url');
      const prevLast = cur?.lastPollAt ?? null;
      const nextMapper =
        dto.hot.mapper === undefined
          ? (cur?.mapper ?? null)
          : dto.hot.mapper === null
            ? null
            : {
                ...(cur?.mapper ?? {}),
                ...(dto.hot.mapper as unknown as Record<string, unknown>),
              };
      if (nextMapper && typeof (nextMapper as { itemsPath?: unknown }).itemsPath !== 'string') {
        throw new BadRequestException('invalid_hot_mapper');
      }
      $set.hot = {
        url: reach.normalized,
        mapper: nextMapper,
        lastPollAt: prevLast,
      };
      const fp = buildFingerprint(SOURCE_KIND.HOT_API, {
        hotUrl: reach.normalized,
      });
      if (!fp) throw new BadRequestException('invalid_fingerprint');
      $set.fingerprint = fp;
    }

    if (!Object.keys($set).length) {
      return serializeSource(existing.toObject() as unknown as Record<string, unknown>);
    }

    try {
      const updated = await this.sourceModel
        .findOneAndUpdate({ _id: existing._id, ...notDeletedFilter() }, { $set }, { new: true })
        .lean()
        .exec();
      if (!updated) throw new NotFoundException('source_not_found');
      return serializeSource(updated as Record<string, unknown>);
    } catch (e: unknown) {
      if (e && typeof e === 'object' && 'code' in e && (e as { code: number }).code === 11000) {
        throw new ConflictException('source_duplicate');
      }
      throw e;
    }
  }

  async update(userId: string, role: JwtUserRole, sourceId: string, dto: UpdateSourceDto) {
    const existing = await this.sourceModel.findOne({ _id: sourceId, ...notDeletedFilter() }).exec();
    if (!existing) throw new NotFoundException('source_not_found');
    if (!canWrite(userId, role, existing)) throw new ForbiddenException('forbidden');
    if (dto.enabled != null && role !== 'admin') throw new ForbiddenException('forbidden');
    if (dto.sortOrder != null && role !== 'admin') throw new ForbiddenException('forbidden');
    return this.applyUpdate(role, userId, existing, dto);
  }

  async remove(userId: string, role: JwtUserRole, sourceId: string) {
    const existing = await this.sourceModel.findOne({ _id: sourceId, ...notDeletedFilter() }).exec();
    if (!existing) throw new NotFoundException('source_not_found');
    if (!canWrite(userId, role, existing)) throw new ForbiddenException('forbidden');
    const res = await this.sourceModel.updateOne({ _id: sourceId }, { $set: { deletedAt: new Date() } }).exec();
    if (res.matchedCount === 0) throw new NotFoundException('source_not_found');
    return { ok: true };
  }

  async batchRemove(userId: string, role: JwtUserRole, ids: string[]) {
    const docs = await this.sourceModel.find({ _id: { $in: ids }, ...notDeletedFilter() }).exec();
    const allowed = docs.filter((d) => canWrite(userId, role, d)).map((d) => d._id);
    if (!allowed.length) throw new NotFoundException('sources_not_found');
    const res = await this.sourceModel.updateMany({ _id: { $in: allowed } }, { $set: { deletedAt: new Date() } }).exec();
    return { deleted: res.modifiedCount ?? 0 };
  }
}
