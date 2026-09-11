# ResearchBot

> Human-in-the-loop web research that turns a question into a structured, cited report.

ResearchBot generates a focused research plan, lets a person review it, searches the web, fetches relevant source pages, synthesizes the findings with Gemini, and saves the completed report in PostgreSQL.

## Demo

The project currently runs locally. No public demo or production deployment URL is configured in the repository.

```text
Ask a question -> Review the plan -> Approve research -> Read the report
```

## What Problem It Solves

Researching a complex question usually means manually creating search queries, opening many pages, comparing information, and writing a summary with citations. ResearchBot turns those repeated steps into one guided workflow while keeping a human decision point before web research begins.

The approval step is important: the model can propose the search direction, but the user decides whether that direction should be used.

## What Makes This Different

- **Human approval before searching** - Gemini proposes exactly three focused queries, and the user can approve or reject them before any web search occurs.
- **Resumable agent workflow** - LangGraph checkpoints the research thread in PostgreSQL so an approved session resumes from the approval interrupt.
- **Live progress streaming** - The backend sends planning, search, fetch, synthesis, and save events to the frontend through Server-Sent Events.
- **Source-aware synthesis** - The report is generated from fetched page content and additional search snippets, with source URLs preserved for review.
- **Structured reports** - Every generated report follows a predictable format: Introduction, Key Findings, Analysis, Limitations, Sources, and Conclusion.
- **Persistent research history** - Completed reports, planned queries, source metadata, and timestamps are stored for later access.

## Architecture

```text
                         React Frontend
  New Research | Plan Approval | Live Progress | Report History
                              |
                              | HTTP + Server-Sent Events
                              v
                         Express API
    /start  /approved  /reports  /report/:id  /health
                              |
              +---------------+----------------+
              |                                |
              v                                v
       LangGraph Workflow                PostgreSQL
       Plan -> Approval -> Search        Reports + Checkpoints
       Fetch -> Synthesize -> Save       JSONB sources and queries
              |
       +------+------+
       |             |
       v             v
   Gemini API     Tavily API
   Planning +    Web search
   Synthesis
```

### Backend responsibilities

- Express exposes the API and health check.
- The research controller starts and resumes SSE sessions.
- LangGraph manages state, conditional routing, human approval, and PostgreSQL checkpoints.
- Tavily returns search results for the generated queries.
- The fetch step retrieves the highest-ranked HTML result for each query and cleans its text.
- Gemini synthesizes the available source material into a Markdown report.
- PostgreSQL stores completed reports and graph state.

### Frontend responsibilities

- React Router provides New Research, History, and Report Detail views.
- The research page submits questions and consumes the two SSE streams.
- The approval panel displays the generated queries and collects the user decision.
- The progress view displays each completed workflow node.
- React Markdown renders the final report and linked sources.

## Research Pipeline

```text
User question
      |
      v
plan_node
Gemini generates exactly 3 focused queries
      |
      v
approval_node
Human reviews the proposed plan
      |
      +------------------------+
      | approved               | rejected
      v                        v
search_node                  END
Tavily searches one query
at a time; up to 3 results
per query
      |
      v
fetch_node
Fetch top HTML URL per query
clean and truncate page text
      |
      v
synthesize_node
Gemini writes a cited Markdown report
      |
      v
save_node
Persist report and source metadata
      |
      v
     END
```

### Source handling

1. Tavily results are filtered by score and minimum snippet length.
2. The highest-ranked result for each planned query is selected for fetching.
3. HTML tags, scripts, styles, and common entities are cleaned from each page.
4. Each fetched page is limited to 4,000 characters and requests time out after eight seconds.
5. Gemini receives fetched content as primary context and additional search snippets as secondary context.
6. The saved report includes unique source URLs and titles.

## Features

- Natural-language research questions up to 2,000 characters.
- Gemini-generated three-query research plans.
- Human approval and rejection checkpoint.
- Resumable research sessions using LangGraph thread IDs.
- Live SSE workflow updates.
- Tavily web search with result filtering.
- HTML source fetching and text cleanup.
- Gemini-generated Markdown reports.
- Inline `[Source N]` citations in key findings.
- Introduction, findings, analysis, limitations, sources, and conclusion sections.
- PostgreSQL persistence for reports and research metadata.
- Research history with the 20 most recent reports.
- Individual report detail pages.
- Health endpoint with database connectivity verification.
- Helmet, CORS, Morgan logging, validation middleware, and centralized error handling.

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19, Vite |
| Routing | React Router 7 |
| Styling | Tailwind CSS 4 |
| Markdown | React Markdown |
| Backend | Node.js, Express 5, ECMAScript modules |
| Agent orchestration | LangChain LangGraph |
| Checkpointing | LangGraph PostgreSQL Checkpointer |
| Generation | Google Gemini API |
| Web search | Tavily Search API |
| Database | PostgreSQL |
| Database client | `pg` |
| Streaming | Server-Sent Events (SSE) |
| Security and operations | Helmet, CORS, Morgan, dotenv |

## API Reference

All research routes use the `/api/v1/research` prefix except `/health`.

| Method | Endpoint | Auth | Description |
|---|---|---|---|
| `GET` | `/health` | None | Checks API and PostgreSQL connectivity. |
| `GET` | `/api/v1/research/start?q=<question>` | None | Starts a research session and streams events until approval is required. |
| `POST` | `/api/v1/research/approved` | None | Resumes a thread with `{ "threadId": "...", "approved": true }` or rejects it with `approved: false`. |
| `GET` | `/api/v1/research/reports` | None | Lists the 20 latest saved report summaries. |
| `GET` | `/api/v1/research/report/:id` | None | Returns one complete saved report. |

The `start` and `approved` endpoints return `text/event-stream` responses. Events include `session_started`, `approval_required`, `step`, `awaiting_approval`, `done`, and `error`.

## Database

The schema is defined in `backend/schema.sql`.

```text
research_reports
├── id              SERIAL PRIMARY KEY
├── question        TEXT
├── report_content  TEXT
├── sources         JSONB
├── search_queries  JSONB
└── created_at      TIMESTAMPTZ
```

The database also receives LangGraph checkpoint tables when `PostgresSaver.setup()` runs. An index supports recent-report queries, and a full-text index is created for research questions.

## Running Locally

### Prerequisites

- Node.js 18 or newer
- npm
- PostgreSQL
- Google Gemini API key
- Tavily API key

### Clone the repository

```bash
git clone <repository-url>
cd ResearchBot
```

### Create the database

Using the default local configuration:

```bash
createdb researchagent
psql -d researchagent -f backend/schema.sql
```

Or create the database through `psql` and apply the schema manually:

```sql
CREATE DATABASE researchagent;
```

### Backend setup

```bash
cd backend
npm install
```

Create `backend/.env` from `backend/.env.example`:

```env
GEMINI_API_KEY=your_gemini_api_key
TAVILY_API_KEY=your_tavily_api_key
DB_PASSWORD=your_postgres_password
DATABASE_URL=postgresql://postgres:your_postgres_password@localhost:5432/researchagent
CLIENT_URL=http://localhost:5173
PORT=3000
NODE_ENV=development
```

Start the API:

```bash
node index.js
```

Backend: `http://localhost:3000`

Verify the server and database:

```text
GET http://localhost:3000/health
```

### Frontend setup

Open a second terminal:

```bash
cd frontend
npm install
```

Create `frontend/.env`:

```env
VITE_API_URL=http://localhost:3000/api/v1/research
```

Start the frontend:

```bash
npm run dev
```

Open the local URL printed by Vite, normally `http://localhost:5173`.

### Useful commands

From `frontend/`:

```bash
npm run dev       # Start the development server
npm run build     # Build the production frontend
npm run lint      # Run ESLint
npm run preview   # Preview the production build
```

From `backend/`:

```bash
node index.js     # Start the API server
```

## Environment Variables

### Backend

| Variable | Description |
|---|---|
| `GEMINI_API_KEY` | Required Google Gemini API key. |
| `TAVILY_API_KEY` | Tavily web search API key. |
| `DB_PASSWORD` | Password for the default local PostgreSQL connection. |
| `DATABASE_URL` | PostgreSQL connection used by the LangGraph checkpointer. |
| `DB_URL` | Optional PostgreSQL connection used by report queries; if absent, local defaults are used. |
| `CLIENT_URL` | Frontend origin allowed by CORS. |
| `PORT` | Backend port; defaults to `3000`. |
| `NODE_ENV` | Runtime environment; defaults to `development`. |
| `APP_NAME` | Optional application name shown by the health endpoint. |
| `LANGSMITH_*` | Optional tracing configuration present in the example environment file. |

### Frontend

| Variable | Description |
|---|---|
| `VITE_API_URL` | Base URL for the ResearchBot API, normally `http://localhost:3000/api/v1/research`. |

Never commit `.env` files containing API keys, database passwords, or connection strings.

## Project Structure

```text
ResearchBot/
├── backend/
│   ├── controllers/
│   ├── db/
│   ├── middleware/
│   ├── routes/
│   ├── services/
│   ├── schema.sql
│   ├── config.js
│   ├── index.js
│   └── package.json
└── frontend/
    ├── src/
    │   ├── api/
    │   ├── components/
    │   ├── pages/
    │   └── utils/
    ├── vite.config.js
    └── package.json
```

## Current Limitations

- No authentication or per-user report ownership is implemented yet.
- Reports are available to any client that can access the API.
- Research depends on valid Gemini and Tavily credentials and external API availability.
- Only HTML pages are fetched; PDFs, images, and other content types are skipped.
- Only one top URL per generated query is fetched in full.
- Fetched page content is truncated to 4,000 characters per URL.
- The backend has no npm `start` script; it currently starts with `node index.js`.
- Automated backend tests have not been added yet.

## Security Notes

- Helmet adds common HTTP security headers.
- CORS restricts browser access to the configured `CLIENT_URL`, although the streaming handlers currently write permissive response headers.
- API keys and database credentials are loaded from environment variables.
- Source pages are external input and should be reviewed before treating generated reports as authoritative.
- ResearchBot is a research aid, not a replacement for expert review or independent fact-checking.

## Author

**Mitul Patil**

Portfolio: [Portfolio](https://portfolio-coral-three-66.vercel.app/)

LinkedIn: [LinkedIn](https://www.linkedin.com/in/mitul-patil-471456256)

GitHub: [@MitulPatil](https://github.com/MitulPatil)