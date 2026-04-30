# ClueArk Crawler

独立 **NestJS** 服务（与主站 `backend` 技术栈一致）：对 Web **列表页**拉取 HTML，用 **cheerio + 可配置 CSS 选择器** 抽取条目，返回与主站 `FeedItem` 写入字段对齐的 JSON（**不使用 LLM**）。

## 运行

```bash
cd crawler
cp .env.example .env
# 配置 CRAWLER_SECRET、CLUEARK_BACKEND_URL、CRAWLER_INGEST_SECRET（与主站一致）
npm install
npm run start:dev
```

默认端口 **3100**（`PORT` 可改）。全局路由前缀 **`/api`**。

## API

| 方法 | 路径 | 说明 |
|------|------|------|
| GET | `/api/health` | 健康检查，无需密钥 |
| POST | `/api/crawl/run` | 手动执行一次列表页解析 |
| （内置） | 每 15 分钟 | 见下文「定时闭环」 |

### POST `/api/crawl/run`

**鉴权**（二选一）：

- `Authorization: Bearer <CRAWLER_SECRET>`
- `x-crawler-secret: <CRAWLER_SECRET>`

未配置 `CRAWLER_SECRET` 时：生产环境返回 **503**；开发环境放行（请仅在内网使用）。

**请求体**（JSON，`class-validator` 校验）：

| 字段 | 类型 | 必填 | 说明 |
|------|------|------|------|
| `sourceId` | MongoId | 是 | 与主站 `Source._id` 一致 |
| `listUrl` | URL | 是 | 列表页绝对地址 |
| `selectors` | 对象 | 否 | `item` / `link` / `title` 必填；`summary` / `date` 可选 |
| `maxItems` | int | 否 | 1～200，默认 50 |

**响应**：见 `contracts/crawl-result.schema.json`。`itemKey` 由主站后端计算。

## 定时闭环（方案 1）

进程**启动完成后**会先异步跑**一轮**爬取（与下面逻辑相同，不阻塞端口监听）；之后 **每 15 分钟**（`0 */15 * * * *`）自动：

1. `GET {CLUEARK_BACKEND_URL}/api/internal/feed-items/crawl-sources`（Bearer **`CRAWLER_INGEST_SECRET`**，须与主站相同变量一致）
2. 对每个 `sources[]` 项：`listUrl` 为主站 **`web.crawlListUrl` 或 `web.url`**；若带 **`selectors`**（`item`/`link`/`title` 等）则与手动 `POST /api/crawl/run` 一致传入解析
3. `POST .../crawl-ingest` 上报结果

环境变量：

| 变量 | 说明 |
|------|------|
| `CLUEARK_BACKEND_URL` | 主站根地址，无尾斜杠，如 `http://localhost:3000` |
| `CRAWLER_INGEST_SECRET` | 与主站 `CRAWLER_INGEST_SECRET` 相同 |
| `CRAWLER_MAX_ITEMS` | 每信源最多条数，默认 50 |
| `CRAWLER_POLL_DISABLED` | 设为 `true` 关闭定时与启动首轮 |

## 与主站接口

- **`GET /api/internal/feed-items/crawl-sources`**：返回 `{ sources: [{ sourceId, listUrl, selectors? }] }`（经主站包装为 `data.sources`）。`selectors` 仅在主站信源配置了 `web.crawlSelectors` 时出现。
- **`POST /api/internal/feed-items/crawl-ingest`**：请求体与 `POST /api/crawl/run` 的响应 JSON 同形。

手动推送示例：

```bash
curl -sS -X POST "$BACKEND/api/internal/feed-items/crawl-ingest" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $CRAWLER_INGEST_SECRET" \
  -d @crawl-result.json
```

## 契约

- `contracts/crawl-result.schema.json`
