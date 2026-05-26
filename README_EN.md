<div align="center">
  <img src="./assets/apple-touch-icon.png" width="96" height="96" alt="ClueArk Logo" />

  <h1>ClueArk</h1>

  <p>
    <a href="./README.md">简体中文</a> |
    <a href="./README_EN.md">English</a>
  </p>

  <p>
    <strong>An AI-powered intelligence aggregation platform for individuals and teams.</strong>
  </p>

  <p>
    ClueArk organizes information around <strong>topic monitoring</strong>: describe a monitor in one sentence, and the system plans the brief, binds sources, and surfaces a semantic timeline plus scheduled intelligence briefs. It ingests RSS, web lists, and hot-topic APIs, and is designed for self-hosted deployment—suited to research, trend tracking, and personal knowledge intake.
  </p>
</div>

Repository: [https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

Demo: [https://clueark.com](https://clueark.com)

> A full-stack project with React, TypeScript, NestJS, MongoDB, and Docker Compose—a practical reference for frontend developers learning full-stack delivery.

<img width="1920" height="919" alt="ClueArk preview" src="/assets/demo.png" />

## Features

- **AI topic monitors**: Create from a short intent sentence; auto-expanded briefs, recommended sources, semantic timeline, and async intelligence briefs.
- **Multiple source types**: RSS/Atom, web list pages (optional crawl rules), and JSON hot-topic APIs in one shared pool.
- **Standalone admin console**: Users, monitors, sources, and job audit—separate from the user-facing app.
- **Docker one-command deploy**: MongoDB, Redis, Qdrant, API, worker, user web, admin console, and crawler start together by default.
- **Email OTP auth**: Registration, login, and password reset; when SMTP is unset, codes are logged for local development.

## Roadmap

> `[x]` shipped · `[ ]` planned · `[~]` partial

### Shipped

- [x] **AI topic monitors**: One-sentence intent → LLM brief, source planning, and binding
- [x] **Multiple public source types**: RSS/Atom, web list crawler (Cheerio + CSS selectors), JSON hot-topic API (`hot_api`)
- [x] **Built-in source catalog**: 50+ Chinese/English RSS and web examples (`data/built-in-catalog.json`)
- [x] **Semantic matching & clustering**: Embeddings + Qdrant; incremental similar-article clustering
- [x] **LLM item enrichment**: Async summaries and recommendation copy (does not block match notifications)
- [x] **Match notifications**: In-app alerts with dedupe and cooldown
- [x] **Intelligence briefs**: Async rolling-window reports (default: last 7 days)
- [x] **Monitor snapshot read model**: Fast list/overview reads (`monitor_snapshots`)
- [x] **User timezone**: IANA timezone in profile; lists and trends bucketed by user calendar
- [x] **Standalone admin console**: Users, monitors, sources, and job audit
- [x] **Docker Compose deploy**: MongoDB, Redis, Qdrant, API, worker, frontends, and crawler in one stack
- [x] **Email OTP auth**: Registration, login, and password reset
- [x] **Async job pipeline**: BullMQ (ingest → embed → match → notify / enrich)

### Planned

- [ ] **Native social platform integrations**
  - [ ] **X (Twitter)**: Timelines, keyword search, or list-page ingestion
  - [ ] **Weibo**: Author feeds, topics, and trending monitors
  - [ ] **WeChat Official Accounts**: Subscription/service account article lists (where compliant)
  - [ ] More: Zhihu, Toutiao, Xiaohongshu, etc. (phased rollout)
- [ ] **Product i18n**
  - [~] Backend `nestjs-i18n` for errors/notifications (zh-CN, en, ja, ko)
  - [ ] User-facing UI localization (English first, then more languages)
  - [ ] Admin console localization
- [ ] **More built-in platform sources**: Hot API templates and preset configs
- [ ] **Calendar-based brief windows**: Daily/weekly/monthly briefs (`calendar_range`)
- [ ] **Real-time notifications**: SSE / WebSocket instead of polling unread counts

Discuss priorities or pick up tasks via [Issues](https://github.com/lqomg/ClueArk/issues). See [AGENTS.md](AGENTS.md) for architecture conventions.

## Source types

| Type | Description |
|------|-------------|
| **RSS / Atom** | Incremental fetch from standard feed URLs |
| **Web** | Site or list page; crawl rules when no feed is available |
| **Hot API** | JSON over HTTP with configurable field mapping |

Built-in examples: `data/built-in-catalog.json`.

## Tech stack

| Area | Stack |
|------|-------|
| User app | React 18, TypeScript, Vite, Tailwind CSS |
| Admin console | React 18, Vite, Ant Design |
| Backend | NestJS, MongoDB, Redis, Qdrant |
| Crawler | NestJS, Cheerio (see [crawler/README.md](crawler/README.md)) |

Subprojects: `frontend/`, `admin-web/`, `backend/`, `crawler/` (no unified root `package.json`).

## Quick deploy

**Requirements:** Docker, Docker Compose (v2).

```bash
git clone <repository-url>
cd <cloned-directory>

cp .env.example .env
# Edit .env: use strong passwords/secrets in production (see .env.example)
# Set FEED_EMBEDDING_API_KEY and DEEPSEEK_API_KEY

docker compose up -d --build
```

**Access**

- User app: `http://<host>:8080` (default `WEB_PORT=8080`; without it, host port 80 may be used)
- Admin console: `http://<host>:8081` (`ADMIN_WEB_PORT`), sign in with `ADMIN_EMAIL` / `ADMIN_PASSWORD`
- HTTP API: proxied at `/api` via the frontend Nginx; backend is not exposed separately

Full environment variables: **[`.env.example`](.env.example)**.

## Local development

Node.js 20+, plus MongoDB, Redis, and Qdrant. Configure connections and API keys in `backend/.env`.

```bash
cd backend && cp .env.example .env && npm install && npm run dev
cd frontend && npm install && npm run dev
cd admin-web && npm install && npm run dev   # default :5174
cd crawler && cp .env.example .env && npm install && npm run start:dev
```

Architecture, modules, and integration notes: **[AGENTS.md](AGENTS.md)**. Backend and crawler env templates: `backend/.env.example`, `crawler/.env.example`.

## Compliance and security

When accessing third-party sites, comply with applicable laws, each site’s terms, and `robots.txt`. **You are responsible for compliance.**

## License

This project is open source under the **[MIT License](LICENSE)**.

## Contributing

Issues and pull requests are welcome. See [AGENTS.md](AGENTS.md) for architecture and collaboration conventions.
