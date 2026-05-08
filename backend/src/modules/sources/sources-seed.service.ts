import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Source, SourceDocument } from './schemas/source.schema';
import { CatalogJsonLoader } from './catalog-json.loader';
import { SOURCE_KIND } from './source-kind';
import { isValidHttpUrl } from './url-check.util';
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
        const url = rawUrl;
        const fingerprint = buildFingerprint(SOURCE_KIND.WEB, { webUrl: url });
        if (!fingerprint) continue;

        let crawlListUrl: string | undefined;
        const rawCrawlList = row.crawlListUrl?.trim();
        if (rawCrawlList && isValidHttpUrl(rawCrawlList)) {
          crawlListUrl = rawCrawlList;
        }

        const web: {
          url: string;
          crawlListUrl?: string;
          crawlSelectors?: { item: string; link: string; title: string; summary?: string; date?: string };
        } = { url };
        if (crawlListUrl) web.crawlListUrl = crawlListUrl;
        if (row.crawlSelectors) web.crawlSelectors = row.crawlSelectors;

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
          web,
          note: row.description.slice(0, 2000),
          sortOrder: i,
          enabled: true,
          isOfficial: true,
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
        const url = rawUrl;

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
          isOfficial: true,
          createdBy: null,
          avatarUrl: null,
          deletedAt: null,
        });
        n += 1;
        continue;
      }

      const rawFeed = row.feedUrl;
      if (!rawFeed || !isValidHttpUrl(rawFeed)) continue;
      const feedUrl = rawFeed;

      let siteUrl: string | undefined;
      const rawSite = row.siteUrl?.trim();
      if (rawSite && isValidHttpUrl(rawSite)) {
        siteUrl = rawSite;
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
          ...(siteUrl ? { siteUrl } : {}),
        },
        note: row.description.slice(0, 2000),
        sortOrder: i,
        enabled: true,
        isOfficial: true,
        createdBy: null,
        avatarUrl: null,
        deletedAt: null,
      });
      n += 1;
    }
    this.logger.log(`官方信源种子完成：${rows.length} 条配置（本次新建 ${n} 条）`);
  }
}
