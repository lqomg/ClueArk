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
    ClueArk organizes information around <strong>topic monitoring</strong>: you describe a monitor in one sentence; the backend uses an LLM to expand the brief and bind sources, then embeddings power a semantic timeline and scheduled briefs. Underneath, it ingests public sources such as RSS, web crawling, and hot-topic APIs, with optional LLM enrichment, embedding-based matching, and clustering of similar stories so users can surface actionable signals in noisy streams. The project is a lightweight, self-hostable information workspace suited to industry research, technology trend tracking, public-event observation, and personal knowledge intake.
  </p>
</div>

Repository: [https://github.com/lqomg/ClueArk](https://github.com/lqomg/ClueArk)

Demo: [https://clueark.com](https://clueark.com)

> Built with React + TypeScript + NestJS + MongoDB + Docker, ClueArk is a full-stack reference with a frontend-oriented perspective, and can serve as a practical starting point for frontend developers learning full-stack delivery.

<img width="1920" height="919" alt="ClueArk preview" src="/assets/demo.png" />

## Features

- **Unified source model**: Official built-in entries and user-created sources share the same types and fingerprinting strategy for easier extension and operations.
- **AI-assisted topic monitors**: Create a monitor from a short intent sentence; the system expands the brief, extracts keywords and entities, and recommends bound sources from the enabled pool. You can adjust bound sources and the cosine threshold (`minCosine`) in settings. The timeline and sidebar metrics rely on embeddings; briefs are generated asynchronously by a backend scheduler (see **Topic monitoring** below).
- **Multiple ingestion paths**: One pool supports **RSS/Atom**, **Web (optional list-page crawling)**, and **JSON hot-topic APIs (configurable field mapping)**—pick what fits instead of a single crawl mode.
- **Standalone web crawler service**: For sites without a stable feed, list pages are parsed with **CSS selectors** (NestJS + Cheerio) and reported to the main app with a **contract-aligned** payload; the crawler does not depend on an LLM. See [`crawler/README.md`](crawler/README.md).
- **Optional intelligence**: Wire in DeepSeek, item enrichment, embeddings, clustering, and related features via environment variables (root `.env.example` and `backend/.env.example`). **Creating a monitor** requires embeddings to be enabled, and feed items need compatible semantic vectors for the timeline to populate.
- **Docker Compose single-node stack**: MongoDB, backend API, frontend (Nginx reverse proxy), and crawler are built and started together by default for quick deployment.

Personal intelligence collection: subscribe to topics on the shared pool, read a semantically filtered timeline, and review generated briefs with less manual searching.

## Topic monitoring (how it works)

- **Create**: You enter a short monitoring intent. The backend calls an LLM for title, long-form description, keywords, and entities, then picks bound sources from the **enabled** catalog (limits such as `MONITOR_MIN_SOURCES`, `MONITOR_MAX_SOURCES`, `MONITOR_LLM_SOURCE_CATALOG_CAP`—see `backend/.env.example`). The long description is embedded and stored on the monitor.
- **Semantic timeline**: Only enriched items from bound sources that carry a full-text embedding are considered. Items are scored by **cosine similarity** to the monitor description vector; items below `minCosine` (default ~0.43) are dropped. Default lookback and candidate caps are controlled by `MONITOR_DEFAULT_RECENT_HOURS`, `MONITOR_TIMELINE_CANDIDATE_CAP`, etc.
- **Intelligence cards and trends**: Heat, 7-day trend (bucketed by calendar day in the user’s **IANA timezone** from their profile), tag distribution, and latest items are derived from the filtered set. An overview API batches list plus card metrics.
- **Briefs**: After startup the backend runs one async pass, then runs **daily at 08:00 (Asia/Shanghai)** for all active monitors. Results are stored in MongoDB; the UI reads the latest successful run. The default window is a rolling last-N-hours span (`MONITOR_BRIEF_WEEKLY_ROLLING_HOURS`, default 168). The API field is still named `weeklyBrief` for historical reasons. Evidence caps and truncation use `MONITOR_BRIEF_*` variables.

## Source types

| Type | Description | Typical use |
|------|-------------|-------------|
| **RSS / Atom** | Incremental fetch from standard feed URLs | News sites, blogs, and other sources that publish feeds |
| **Web** | Site URL; optional `crawlListUrl` + `crawlSelectors` for the crawler to parse list pages | Pages with HTML lists only, where rule-based extraction is enough |
| **Hot API (`hot_api`)** | JSON over HTTP + configurable mapper (e.g. array path and field mapping) | Structured hot lists and leaderboard-style APIs |

Built-in seeds live in **`data/built-in-catalog.json`** (includes RSS examples). Set **`BUILTIN_CATALOG_PATH`** to point at a custom catalog at deploy time.

## Demo

- **URL:** [https://clueark.com](https://clueark.com) — anyone can register as a normal user.
- **Demo account:** `show@clueark.com` / `123456qian`

## Tech stack

| Area | Stack |
|------|-------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, Zustand, React Router |
| Backend | NestJS, MongoDB (Mongoose), JWT, scheduled tasks |
| Crawler | NestJS, Cheerio, configurable selectors (contract-aligned with the main app) |

`frontend/`, `backend/`, and `crawler/` are independent subprojects. There is no unified root `package.json`.

## Repository layout (excerpt)

```
├── backend/           # Main API (NestJS)
├── crawler/           # Web list crawler (NestJS); see crawler/README.md
├── frontend/          # Web app (Vite + React)
├── data/              # Built-in source seeds (e.g. built-in-catalog.json)
├── docker-compose.yml # Recommended deploy entry
├── .env.example       # Env template (copy to .env)
└── LICENSE            # MIT
```

## Sources and built-in catalog

All sources share one pool (MongoDB `sources` collection): official-style rows have empty `createdBy`; user-created rows record the creator.

The repo’s **`data/built-in-catalog.json`** (`sources` array) is only a **bootstrap seed** for writing official-site-style sources. Override the path with **`BUILTIN_CATALOG_PATH`** (in Docker, this is typically a path mounted into the container).

## Requirements

- **Recommended:** Docker, Docker Compose (v2)
- **Local development:** Node.js 20+ (aligned with subprojects), MongoDB

## Deployment (Docker Compose, recommended)

Root `docker-compose.yml` is the **recommended single-machine entry**: MongoDB + backend + web (Nginx serves the frontend and proxies the API) + crawler.

### First start

```bash
git clone <repository-url>
cd <cloned-directory>

cp .env.example .env
# Edit .env: use strong passwords/secrets in production, including at least:
#   MONGO_INITDB_ROOT_PASSWORD, JWT_SECRET, ADMIN_PASSWORD
#   CRAWLER_INGEST_SECRET, CRAWLER_SECRET (crawler ↔ backend; see .env.example)

docker compose up -d --build
```

### Access

- **Web UI:** `http://<server-ip-or-domain>:<port>`
  - If you copied `.env.example` and keep `WEB_PORT=8080`, this is usually **`http://<host>:8080`**.
  - If there is no `.env` or `WEB_PORT`, Compose maps container port 80 to host **`80`** by default (`http://<host>/`).
- **HTTP API:** Nginx on the frontend proxies **`/api`** to the backend; the backend port is **not** exposed separately.

### Network and security

- Under default Compose, **`backend`** and **`crawler`** do **not** publish host ports; they talk on the internal network.
- MongoDB is published on **`MONGO_BIND_PORT`** (default **27017**). If the host is on the public internet, restrict source IPs in firewall/security groups; **avoid exposing the database port without protection**.

### Crawler service

It is **built and started by default** with `docker compose up`, fetching configured web sources and reporting to the main app. For manual runs, APIs, and schedules, see **[crawler/README.md](crawler/README.md)**.

If you only need the main app and database for now, adjust Compose (e.g. remove or disable the `crawler` service) according to your ops policy.

## Environment variables (summary)

Full keys and comments are in **`/.env.example`**; **`backend/.env.example`** and **`crawler/.env.example`** support local development.

| Category | Description |
|----------|-------------|
| Must change (production) | Mongo root password, `JWT_SECRET`, `ADMIN_PASSWORD`, crawler secrets such as `CRAWLER_INGEST_SECRET` / `CRAWLER_SECRET` |
| Optional | DeepSeek, embedding, RSS/hot API toggles and keys (see each `.env.example`) |
| Monitors and briefs | `MONITOR_*`, `MONITOR_BRIEF_*` (documented in `backend/.env.example`) |

## Local development

Each subproject installs and runs on its own. Provide MongoDB and connection settings.

```bash
# Backend (example)
cd backend
cp .env.example .env   # adjust for your machine
npm install
npm run start:dev

# Frontend (example)
cd frontend
npm install
npm run dev

# Crawler (example)
cd crawler
cp .env.example .env
npm install
npm run start:dev
```

For local integration, keep API URLs, proxies, and env vars consistent with Vite / Nest configs.

## Compliance and security

When using this software to crawl or access third-party sites, comply with applicable laws, each site’s terms, `robots.txt`, and reasonable use. Do not use it for unauthorized bulk crawling or rights violations; **you are responsible for compliance**.

If you find security issues in deployment (default secrets, exposure, etc.), contact maintainers privately when appropriate; fixes and documentation/PRs are welcome.

## License

This project is open source under the **[MIT License](LICENSE)**.

## Contributing

Issues and pull requests are welcome. Keep commit messages concise; internal workflows may use types such as `fix` and `feature`.
