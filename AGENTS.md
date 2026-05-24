# ClueArk 协作说明

本文档归纳仓库布局、部署与本地开发的常用入口。完整功能说明见 **[README.md](./README.md)**、**[README_EN.md](./README_EN.md)**；爬虫服务见 **[crawler/README.md](./crawler/README.md)**。

## 概述

**ClueArk（线索方舟）**：面向个人与团队的 AI 情报聚合平台。围绕话题监控聚合 RSS/Atom、网页列表（独立爬虫）、JSON 热点 API 等公开信源；可选接入 DeepSeek 兼容 API 做条目富化、OpenAI 兼容 Embeddings 做语义匹配与相似报道聚类。技术栈：**React 18 + TypeScript + Vite**（前端）、**NestJS + MongoDB（Mongoose）**（主 API）、**独立 NestJS 爬虫服务（Cheerio）**、**Docker Compose** 部署。

## 仓库结构

| 路径 | 说明 |
|------|------|
| `frontend/` | 用户 Web 前端（Vite + React） |
| `admin-web/` | 独立运营后台（Vite + React + Ant Design；仅 admin 登录） |
| `backend/` | 主 HTTP API（NestJS）；运营能力在 `/api/admin/*` |
| `crawler/` | Web 列表页爬虫服务，与主站契约对齐上报 |
| `data/` | 内置信源种子等（如 `built-in-catalog.json`） |
| `docker-compose.yml` | 推荐部署入口：MongoDB + backend + web + admin-web + crawler |
| `.env.example` | 根目录 Compose 环境变量模板（复制为 `.env`） |
| `backend/.env.example`、`crawler/.env.example` | 本地开发参考 |

## 后端模块（`backend/src/modules/`）

- `feed-items/` — 条目、采集 ingest、RSS/热点等管线（无用户向列表 API）
- `sources/` — 统一信源池；RSS/热点轮询由 **worker** 内 `SourcePollScheduler` 调度
- `worker-scheduler/` — 仅 worker 进程：`@Cron`（信源轮询、快照/Brief 入队、相似聚类维护）
- `monitors/` — 话题监控、`monitor_snapshots` 物化读模型
- `vector-store/` — Qdrant 向量 upsert/search（禁止 HTTP 读路径做余弦）
- `queue/` — BullMQ 流水线；**`worker` 容器**（`node dist/worker`）消费
- `notifications/` — 匹配推送与应用内通知
- `monitor-pipeline/` — ingest 后 embed → match → notify
- `llm/` — 条目富化（`enrich_llm` 队列；仅监控信源经 pipeline 入队，无 Cron 扫全库）
- `aggregation-policy/` — 聚合策略
- `admin/`、`auth/`、`users/` — 管理与认证

爬虫实现在 `crawler/src/`（按 `nextPollAt` 拉取 Web 信源，详见 `crawler/README.md`）。

## 架构约束（监控优先）

1. **Mongo** 仅存业务字段，不存 `simEmbed*` / `descriptionEmbedding` 等向量数组。
2. **相似检索** 仅经 `VectorStoreService` → Qdrant；HTTP 读 API 禁止 `cosineSimilarity`。
3. **推送路径**：新条目（仅 `monitoredByCount > 0` 信源）→ `pipeline:process_new_item` → 通知；**不等待** LLM 富化。
4. **列表/研判**：`GET /monitors` 读 `monitor_snapshots`；`GET /monitors/:id/intelligence` 禁止同步全量打分。
5. **Compose 栈**：`mongodb` + `redis` + `qdrant` + `worker`（必须先就绪；**Cron + BullMQ 消费**）+ `backend`（HTTP + 入队，无 `@Cron`）+ `web`（用户产品）+ `admin-web`（运营后台）+ `crawler`。
6. **启动校验**：`REDIS_URL`、`QDRANT_URL`、`FEED_EMBEDDING_API_KEY`、`DEEPSEEK_API_KEY` 必填；Mongo/Redis/Qdrant 连不上则进程退出；API 启动前等待 worker Redis 心跳。本地 `npm run dev` 同时起 API 与 worker。
7. **前端**：用户产品默认 `/app/monitors`；运营后台为独立 SPA（`admin-web/`，`POST /api/admin/auth/login`）。主站已移除 embedded `/app/admin/*`。

## 部署（Docker Compose）

```bash
cp .env.example .env
# 生产务必修改：MONGO_INITDB_ROOT_PASSWORD、JWT_SECRET、ADMIN_PASSWORD、
# CRAWLER_INGEST_SECRET、CRAWLER_SECRET 等（见 .env.example 注释）

docker compose up -d --build
```

- Web（用户产品）：若设置 `WEB_PORT=8080` 一般为 `http://<host>:8080`；未设置 `WEB_PORT` 时可能映射宿主机 **80**。
- Admin Web（运营后台）：`http://<host>:${ADMIN_WEB_PORT:-8081}`；使用 `ADMIN_EMAIL` / `ADMIN_PASSWORD` 种子账号或后台创建的管理员登录。
- API：经 **`/api`** 由 Nginx 反代；默认 Compose 下 backend 不单独对外映射业务端口。
- MongoDB：映射 `MONGO_BIND_PORT`（默认 27017）；公网部署需限制访问面。

完整变量见 **`/.env.example`**；DeepSeek、Embedding、RSS/热点等可选开关见 **`backend/.env.example`**。

## 本地开发

需自备 **MongoDB**、**Redis**、**Qdrant**，Node **20+**；`backend/.env` 须配置 `REDIS_URL`、`QDRANT_URL`、`FEED_EMBEDDING_API_KEY`、`DEEPSEEK_API_KEY`。各子项目独立安装与启动：

```bash
cd backend && cp .env.example .env   # 按本地修改
npm install && npm run dev           # 同时启动 API + BullMQ worker

cd frontend && npm install && npm run dev

cd admin-web && npm install && npm run dev   # 默认 :5174，/api 代理到 backend

cd crawler && cp .env.example .env
npm install && npm run start:dev
```

常用脚本：`frontend` / `admin-web` — `npm run dev`、`npm run build`；`backend` — `dev`（API+worker）、`start:dev`（仅 API）、`start:worker:dev`（仅 worker）、`start:prod` / `start:worker:prod`；`crawler` — `start:dev`、`start:prod`。爬虫与主站联调时需配置一致的 `CRAWLER_INGEST_SECRET` 等。

## 时间与多时区

- **存储与 API**：信源、条目等业务时间以 **UTC 瞬时**（如 ISO 8601）落库并在接口中返回；业务正确性不依赖部署机所在时区。
- **展示与分桶**：用户可在个人资料中设置 **IANA 时区**（如 `Asia/Shanghai`）。情报列表、监控总览、近 7 日趋势按日历日分桶、研判摘要中的「当前时刻」等，在前后端均按 **该用户时区**（或监控 owner 时区等约定角色）解释日历日与展示文案。
- **工具库**：前后端时间处理统一使用 **dayjs**（`utc` + `timezone` 插件），避免用宿主机本地时区对「用户日历」做分桶。
- **默认与配置**：未配置或非法时区回退到应用默认（见 `backend/.env.example` 中 **`APP_DEFAULT_TIMEZONE`**，实现上常与 `Asia/Shanghai` 对齐）。
- **开发注意**：新增「按日统计」「今天 / 昨天」等与日历相关的逻辑时，须显式传入 **IANA 时区**，勿依赖 `new Date()` 在未指定时区下表示「用户的某一天」。
- **定时任务**：若 Cron 按「服务器午夜」触发，语义会随容器 / 宿主 `TZ` 变化；若业务需要「用户当地日界」或固定业务日界，须在任务内显式按时区计算，而非假定部署地域。

## 贡献约定

1. **性能**：采集、列表查询、聚类、embedding 批量等路径注意避免不必要开销；大集合查询配合索引与分页（遵循现有 Mongoose 用法）。
2. **安全**：外部 URL、用户输入与 NoSQL 查询保持校验；勿向仓库提交真实密钥；日志勿打印令牌。
3. **范围**：改动围绕需求，避免无关大范围格式化或连带修改无关文件。
4. **模块注册**：新增 Nest 提供方或依赖时，在 `app.module` / 子模块中正确注册，避免运行时未注入。
5. **合规**：抓取须遵守法律、站点条款与 robots；详见 README「合规与安全」。

## 提交信息

建议简洁说明改动意图；团队若有约定，可采用如：`fix(模块): 简述`、`feature(模块): 简述`。

## 许可证

**[MIT License](./LICENSE)**
