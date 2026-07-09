# 🚀 GrowEasy AI CSV Lead Importer

A production-grade, AI-powered CSV lead importer that intelligently maps arbitrary CSV column names onto a fixed CRM schema using LLM-based extraction. Built as a monorepo with a Next.js frontend and Express backend.

![Node.js](https://img.shields.io/badge/Node.js-20+-green)
![TypeScript](https://img.shields.io/badge/TypeScript-5.7-blue)
![Next.js](https://img.shields.io/badge/Next.js-14+-black)
![Docker](https://img.shields.io/badge/Docker-Ready-blue)

## 📖 Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [How the AI Extraction Works](#how-the-ai-extraction-works)
- [Tech Stack](#tech-stack)
- [Getting Started](#getting-started)
- [Running with Docker](#running-with-docker)
- [API Documentation](#api-documentation)
- [Testing](#testing)
- [Deployment](#deployment)
- [Known Limitations](#known-limitations)

## Overview

Users upload CSV exports from arbitrary sources — Facebook Lead Ads, Google Ads, Excel sheets, real-estate CRMs, sales reports, or hand-made spreadsheets — with unpredictable column names and layouts. The app uses an LLM to **intelligently map whatever columns exist** onto a fixed CRM schema, rather than relying on hardcoded column-name matching.

### Key Features

- **Drag & drop CSV upload** with file validation
- **Raw data preview** before any AI processing
- **AI-powered column mapping** using Groq (primary) and OpenRouter (fallback)
- **Batch processing** with real-time progress via Server-Sent Events
- **Post-LLM validation** — enums, dates, and business rules enforced in code
- **Virtualized tables** for large CSV files (thousands of rows)
- **Dark mode** with smooth transitions
- **CSV export** of normalized CRM records
- **Skipped record tracking** with reasons
- **Docker-ready** with docker-compose

## Architecture

```
groweasy-csv-importer/
├── apps/
│   ├── web/          # Next.js 14+ (App Router, TypeScript, Tailwind)
│   └── api/          # Express (TypeScript, layered architecture)
├── packages/
│   └── shared/       # Shared TypeScript types (CRM schema, API contracts)
├── docker-compose.yml
├── .env.example
└── README.md
```

### Architecture Diagram

```
┌─────────────────────────────────────────────┐
│              Frontend (Next.js)              │
│                                              │
│  Step 1: Upload ──► Step 2: Preview          │
│       │                                      │
│       ▼                                      │
│  Step 3: Confirm ──► Step 4: Results         │
│       │                    ▲                 │
│       │         SSE Stream │                 │
└───────┼────────────────────┼─────────────────┘
        │ POST /upload       │ GET /stream
        │ POST /extract      │
        ▼                    │
┌───────┴────────────────────┴─────────────────┐
│              Backend (Express)                │
│                                              │
│  Routes → Controllers → Services             │
│                    │                          │
│        ┌───────────┼───────────┐              │
│        ▼           ▼           ▼              │
│   CSV Parser  Batching    LLM Provider        │
│                Service     ┌──────────┐       │
│                    │       │   Groq   │       │
│              Validation    │ (primary)│       │
│               Service      ├──────────┤       │
│                            │OpenRouter│       │
│                            │(fallback)│       │
│                            └──────────┘       │
└───────────────────────────────────────────────┘
```

### Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| **State storage** | In-memory Map | Simplicity for the assignment scope; avoids database setup complexity. For production, swap to Redis or PostgreSQL. |
| **Package manager** | npm workspaces | Zero additional tooling needed; universally supported. |
| **Progress tracking** | SSE (Server-Sent Events) | Real-time push is better UX than polling; falls back to polling if SSE fails. |
| **LLM response format** | `json_object` mode | Guarantees parseable JSON without markdown fences or prose. |
| **Backend deploy** | Render | Free tier with Docker support, simple CI/CD from GitHub. |

## How the AI Extraction Works

### Why This Approach?

CSV files from different sources have wildly different column naming conventions. A rule-based mapper would need hundreds of regex patterns and still fail on unexpected column names. Using an LLM allows us to understand **semantic intent** — mapping "Contact Person Name", "lead_name", or "Full Name" all to the `name` CRM field without any hardcoded rules.

### The Pipeline

1. **Upload & Parse** — CSV is parsed server-side with PapaParse, handling BOM, encoding, duplicate headers, and malformed rows.

2. **Batching** — Rows are chunked into batches (default 25 rows each). Sending the entire file in one prompt would:
   - Hit token limits on large files
   - Produce worse extraction quality (models lose accuracy on very long contexts)
   - Make the system fragile (one error = entire file fails)

3. **LLM Extraction** — Each batch is sent to the LLM with a carefully engineered system prompt that:
   - Describes the exact CRM schema
   - Lists all enum constraints (crm_status, data_source)
   - Specifies rules for multi-email/multi-phone handling
   - Requires structured JSON output
   - Instructs the model to skip rows without contact info

4. **Retry & Fallback** — Per batch:
   - Try Groq up to 3 times (initial + 2 retries) with exponential backoff (500ms, 1500ms)
   - If Groq exhausts retries, fall back to OpenRouter with the same retry policy
   - If both fail, mark all rows in that batch as skipped — never crash the entire job

5. **Post-LLM Validation** — The model's output is validated in code:
   - Invalid `crm_status` values are blanked out
   - Invalid `data_source` values are blanked out
   - Dates are validated with `new Date()` plus DD/MM/YYYY fallback parsing
   - The "must have email or mobile" rule is re-enforced server-side
   - Raw newlines in field values are escaped for CSV safety

6. **Progress Streaming** — SSE events push batch progress to the frontend in real time.

### Prompt Design

The system prompt is deliberately:
- **Liberal on recognition** — accepts many different column naming conventions
- **Conservative on enums** — only fills `crm_status` and `data_source` when confident
- **Explicit about edge cases** — multi-email, multi-phone, missing contact info
- **Structured output only** — `json_object` mode ensures no prose or markdown

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Next.js 14+, App Router, TypeScript, Tailwind CSS |
| Backend | Express, TypeScript, Pino logging |
| CSV Parsing | PapaParse (client + server) |
| Tables | TanStack Table + TanStack Virtual |
| Upload UX | react-dropzone |
| AI (Primary) | Groq — `openai/gpt-oss-120b` |
| AI (Fallback) | OpenRouter — `nvidia/nemotron-3-super-120b-a12b:free` |
| Testing | Jest, React Testing Library |
| Containerization | Docker + docker-compose |
| Deployment | Vercel (frontend) + Render (backend) |

## Getting Started

### Prerequisites

- Node.js 20+ (see `.nvmrc`)
- npm 9+
- API keys for [Groq](https://console.groq.com/) and [OpenRouter](https://openrouter.ai/)

### Setup

```bash
# Clone the repo
git clone https://github.com/your-username/groweasy-csv-importer.git
cd groweasy-csv-importer

# Install dependencies
npm install

# Copy env template and fill in your API keys
cp .env.example .env
# Edit .env with your GROQ_API_KEY and OPENROUTER_API_KEY

# Build shared types
npm run build -w packages/shared

# Run both services in development
npm run dev
```

The frontend will be available at **http://localhost:3000** and the API at **http://localhost:4000**.

### Individual Service Commands

```bash
# Frontend only
npm run dev -w apps/web

# Backend only
npm run dev -w apps/api

# Build all
npm run build
```

## Running with Docker

```bash
# Copy env template
cp .env.example .env
# Fill in your API keys in .env

# Build and run both services
docker-compose up --build

# Frontend: http://localhost:3000
# Backend:  http://localhost:4000
```

## API Documentation

### Health Check

```
GET /api/health
Response: { "status": "ok", "timestamp": "..." }
```

### Upload CSV

```
POST /api/import/upload
Content-Type: multipart/form-data
Body: file (CSV file)

Response 200:
{
  "jobId": "uuid",
  "headers": ["Name", "Email", ...],
  "rowCount": 150,
  "fileName": "leads.csv",
  "fileSize": 12345
}
```

### Trigger Extraction

```
POST /api/import/:jobId/extract

Response 202:
{
  "jobId": "uuid",
  "message": "Extraction started...",
  "statusEndpoint": "/api/import/:jobId/stream"
}
```

### Stream Progress (SSE)

```
GET /api/import/:jobId/stream
Content-Type: text/event-stream

Events:
  event: progress
  data: { "type": "batch_complete", "batchesCompleted": 3, "totalBatches": 6, ... }

  event: progress
  data: { "type": "job_complete", "batchesCompleted": 6, "totalBatches": 6 }
```

### Poll Status (Fallback)

```
GET /api/import/:jobId/status

Response 200:
{
  "jobId": "uuid",
  "status": "processing",
  "batchesCompleted": 3,
  "totalBatches": 6,
  "totalRows": 150
}
```

### Get Results

```
GET /api/import/:jobId/results

Response 200:
{
  "records": [...],
  "skipped": [...],
  "totalRows": 150,
  "totalImported": 142,
  "totalSkipped": 8
}
```

### Error Responses

All errors follow a consistent shape:
```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable message",
  "statusCode": 400
}
```

## Testing

```bash
# Run all tests
npm test

# Run backend tests only
npm run test -w apps/api

# Run with watch mode
npm run test:watch -w apps/api

# Run with coverage
npx jest --coverage -w apps/api
```

### Test Coverage

- **CSV Parser**: BOM handling, empty CSVs, duplicate headers, inconsistent rows, quoted fields
- **Batching**: Row chunking, concurrency limits, edge cases
- **Validation**: Enum enforcement, date parsing, email/phone rules, newline escaping, invalid JSON
- **Extraction Prompt**: Field completeness, enum values, output format

## Deployment

### Frontend — Vercel

1. Connect your GitHub repo to Vercel
2. Set the root directory to `apps/web`
3. Set the build command: `cd ../.. && npm run build -w packages/shared && npm run build -w apps/web`
4. Set the output directory: `apps/web/.next`
5. Add environment variable: `NEXT_PUBLIC_API_URL=https://your-api.onrender.com`

### Backend — Render

1. Create a new Web Service on Render
2. Connect your GitHub repo
3. Set the root directory to the repo root
4. Build command: `npm install && npm run build -w packages/shared && npm run build -w apps/api`
5. Start command: `node apps/api/dist/index.js`
6. Add all environment variables from `.env.example`

## Known Limitations

1. **In-memory state** — Job state is stored in a Map and is lost on server restart. For production, use Redis or a database.
2. **File size** — Very large CSVs (100MB+) may hit memory limits since the file is buffered in memory. Streaming parsing would be needed for those.
3. **LLM rate limits** — Groq and OpenRouter have rate limits. The concurrency limiter helps, but very large imports may trigger rate limiting.
4. **No authentication** — The API is open. In production, add auth middleware.
5. **No persistent storage** — Imported records are returned but not stored in a database. Integration with an actual CRM database would be the next step.
6. **Model accuracy** — LLM extraction quality depends on the model and prompt. Edge cases with highly ambiguous column names may produce suboptimal mappings.

## License

MIT
