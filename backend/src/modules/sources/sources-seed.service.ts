import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Source, SourceDocument } from './schemas/source.schema';
import { CatalogJsonLoader } from './catalog-json.loader';
import { SOURCE_KIND } from './source-kind';
import { checkUrlReachable, isValidHttpUrl } from './url-check.util';
import { buildFingerprint } from './fingerprint.util';

@Injectable()
export class SourcesSeedService implements OnModuleInit {
  private readonly logger = new Logger(SourcesSeedService.name);

  constructor(
    @InjectModel(Source.name) private readonly sourceModel: Model<SourceDocument>,
    private readonly catalogJson: CatalogJsonLoader,
  ) {}

  async onModuleInit() {
    await this.seedOfficialFromJson();
  }

  private async seedOfficialFromJson() {
    const rows = this.catalogJson.data.sources;
    let n = 0;
    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];
      const kind = row.kind ?? SOURCE_KIND.WEB;

      if (kind === SOURCE_KIND.WEB) {
        const rawUrl = row.url;
        if (!rawUrl || !isValidHttpUrl(rawUrl)) continue;
        const reach = await checkUrlReachable(rawUrl);
        const url = reach.normalized && reach.ok ? reach.normalized : rawUrl;
        if (!isValidHttpUrl(url)) continue;
        const fingerprint = buildFingerprint(SOURCE_KIND.WEB, { webUrl: url });
        if (!fingerprint) continue;

        const existing = await this.sourceModel.findOne({ fingerprint }).lean().exec();
        if (existing) {
          if (existing.createdBy) {
            this.logger.warn(`种子跳过（指纹已被用户信源占用）: ${row.id}`);
          }
          continue;
        }

        await this.sourceModel.create({
          kind: SOURCE_KIND.WEB,
          fingerprint,
          displayName: row.name,
          web: { url },
          note: row.description.slice(0, 2000),
          sortOrder: i,
          enabled: true,
          createdBy: null,
          avatarUrl: null,
          deletedAt: null,
        });
        n += 1;
        continue;
      }

      if (kind === SOURCE_KIND.HOT_API) {
        const rawUrl = row.hotUrl?.trim();
        if (!rawUrl || !isValidHttpUrl(rawUrl)) continue;
        const reach = await checkUrlReachable(rawUrl);
        const url = reach.normalized && reach.ok ? reach.normalized : rawUrl;
        if (!isValidHttpUrl(url)) continue;

        const fingerprint = buildFingerprint(SOURCE_KIND.HOT_API, { hotUrl: url });
        if (!fingerprint) continue;

        const existing = await this.sourceModel.findOne({ fingerprint }).lean().exec();
        if (existing) {
          if (existing.createdBy) {
            this.logger.warn(`种子跳过（指纹已被用户信源占用）: ${row.id}`);
          }
          continue;
        }

        await this.sourceModel.create({
          kind: SOURCE_KIND.HOT_API,
          fingerprint,
          displayName: row.name,
          hot: {
            url,
            mapper: null,
          },
          note: row.description.slice(0, 2000),
          sortOrder: i,
          enabled: true,
          createdBy: null,
          avatarUrl: null,
          deletedAt: null,
        });
        n += 1;
        continue;
      }

      const rawFeed = row.feedUrl;
      if (!rawFeed || !isValidHttpUrl(rawFeed)) continue;
      const feedReach = await checkUrlReachable(rawFeed);
      const feedUrl = feedReach.normalized && feedReach.ok ? feedReach.normalized : rawFeed;
      if (!isValidHttpUrl(feedUrl)) continue;

      let siteUrlNorm: string | undefined;
      const rawSite = row.siteUrl?.trim();
      if (rawSite && isValidHttpUrl(rawSite)) {
        const siteReach = await checkUrlReachable(rawSite);
        siteUrlNorm = siteReach.normalized && siteReach.ok ? siteReach.normalized : rawSite;
      }

      const fingerprint = buildFingerprint(SOURCE_KIND.RSS, { rssFeedUrl: feedUrl });
      if (!fingerprint) continue;

        const existing = await this.sourceModel.findOne({ fingerprint }).lean().exec();
        if (existing) {
          if (existing.createdBy) {
            this.logger.warn(`种子跳过（指纹已被用户信源占用）: ${row.id}`);
          }
          continue;
        }

        await this.sourceModel.create({
          kind: SOURCE_KIND.RSS,
          fingerprint,
          displayName: row.name,
          rss: {
            feedUrl,
            ...(siteUrlNorm ? { siteUrl: siteUrlNorm } : {}),
          },
          note: row.description.slice(0, 2000),
          sortOrder: i,
          enabled: true,
          createdBy: null,
          avatarUrl: null,
          deletedAt: null,
        });
        n += 1;
    }
    this.logger.log(`官方信源种子完成：${rows.length} 条配置（本次新建 ${n} 条）`);
  }
}
