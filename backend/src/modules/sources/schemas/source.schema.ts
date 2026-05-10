import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { SOURCE_KINDS, type SourceKind } from '../source-kind';

export type SourceDocument = Source & Document;

@Schema({ _id: false })
export class SourceWebCrawlSelectors {
  @Prop({ required: true, trim: true, maxlength: 512 })
  item: string;

  @Prop({ required: true, trim: true, maxlength: 512 })
  link: string;

  @Prop({ required: true, trim: true, maxlength: 512 })
  title: string;

  @Prop({ trim: true, maxlength: 512 })
  summary?: string;

  @Prop({ trim: true, maxlength: 512 })
  date?: string;
}
export const SourceWebCrawlSelectorsSchema = SchemaFactory.createForClass(SourceWebCrawlSelectors);

@Schema({ _id: false })
export class SourceWeb {
  @Prop({ required: true, trim: true, maxlength: 2048 })
  url: string;

  /** 爬虫请求的列表页；缺省用 url */
  @Prop({ trim: true, maxlength: 2048 })
  crawlListUrl?: string;

  @Prop({ type: SourceWebCrawlSelectorsSchema })
  crawlSelectors?: SourceWebCrawlSelectors;
}
export const SourceWebSchema = SchemaFactory.createForClass(SourceWeb);

@Schema({ _id: false })
export class SourceRss {
  @Prop({ required: true, trim: true, maxlength: 2048 })
  feedUrl: string;

  @Prop({ trim: true, maxlength: 2048 })
  siteUrl?: string;

  @Prop({ trim: true, maxlength: 200 })
  titleHint?: string;
}
export const SourceRssSchema = SchemaFactory.createForClass(SourceRss);

export type HotApiMapper = {
  /**
   * items 数组路径（简化语法：`$.a.b[0].c`；仅支持 dot + 数字下标，不支持表达式）
   * 缺省为 `$.items`
   */
  itemsPath: string;
  /** 每条 item 的标题路径；缺省 `$.title` */
  titlePath?: string;
  /** 每条 item 的链接路径；缺省 `$.url` */
  urlPath?: string;
  /** 可选：每条 item 的 id 路径；缺省 `$.id` */
  idPath?: string;
  /** 可选：每条 item 的发布时间路径；缺省 `$.pubDate` */
  pubDatePath?: string;
  /** 可选：每条 item 的摘要路径；缺省 `$.summary` */
  summaryPath?: string;
};

/** 热点 API：单 URL 拉取，通过 mapper 将 JSON 转换为 items 格式 */
@Schema({ _id: false })
export class SourceHotApi {
  /** 单一接口 URL（返回 JSON；通过 formatter 映射为 items） */
  @Prop({ required: true, trim: true, maxlength: 2048 })
  url: string;

  @Prop({ type: Date, default: null })
  lastPollAt: Date | null;

  /**
   * 可选：声明式映射配置（不执行脚本），将任意 JSON 映射为 items 数组。
   */
  @Prop({ type: Object, default: null })
  mapper: HotApiMapper | null;
}
export const SourceHotApiSchema = SchemaFactory.createForClass(SourceHotApi);

/**
 * 全站统一信源。
 * `isOfficial`：启动时自 built-in-catalog 注入的种子信源；管理员/演示账号可在后台修改或软删除。
 * `createdBy`：null 为运营在后台维护的信源；非 null 为用户贡献（预留）。
 */
@Schema({ timestamps: true })
export class Source {
  @Prop({ type: String, enum: SOURCE_KINDS, required: true, index: true })
  kind: SourceKind;

  @Prop({ required: true, trim: true, maxlength: 200 })
  displayName: string;

  @Prop({ required: true, maxlength: 512, index: true })
  fingerprint: string;

  @Prop({ type: SourceWebSchema })
  web?: SourceWeb;

  @Prop({ type: SourceRssSchema })
  rss?: SourceRss;

  @Prop({ type: SourceHotApiSchema })
  hot?: SourceHotApi;

  @Prop({ default: '', trim: true, maxlength: 2000 })
  note: string;

  @Prop({ trim: true, maxlength: 512, default: null })
  avatarUrl: string | null;

  /** 启动种子注入的官方信源 */
  @Prop({ default: false, index: true })
  isOfficial: boolean;

  /** null 表示非用户自建（运营池或种子） */
  @Prop({ type: Types.ObjectId, ref: 'User', default: null, index: true })
  createdBy: Types.ObjectId | null;

  @Prop({ default: true, index: true })
  enabled: boolean;

  @Prop({ default: 0 })
  sortOrder: number;

  @Prop({ type: Date, default: null })
  deletedAt: Date | null;
}

export const SourceSchema = SchemaFactory.createForClass(Source);

SourceSchema.index(
  { fingerprint: 1 },
  { unique: true, partialFilterExpression: { $or: [{ deletedAt: null }, { deletedAt: { $exists: false } }] } },
);

SourceSchema.index({ enabled: 1, sortOrder: 1, displayName: 1 });
SourceSchema.index({ enabled: 1, kind: 1, updatedAt: -1 });
