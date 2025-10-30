# Echo

Discord bot infrastructure shared across the `kevin-bot` and legacy `cs-bot-v3` projects.  
Echo now includes the cs-bot conversational tooling (topic recording, FAQ recall, server registration) while keeping the newer registry, error-handling, and scheduling framework.

## Features
- **Slash & context commands**
  - `/ping` – latency panel using components v2
  - `/registration` – manage server contact information
  - `/ask` – LLM-backed FAQ recall
  - `Apps → Remember Topic` – record a discussion thread
  - `Apps → Answer Question` – build an answer exchange for a message
- **LLM pipeline** backed by Ollama + pgai vector search (TimescaleDB)
- **Auto registration** of commands/events/components/tasks/error handlers
- **Postgres schema** for guilds, topics, and message history with typed SQL helpers
- **Health checks & task scheduler** from the Echo framework layer

## Prerequisites
- Node.js 20+
- Docker Desktop (for the TimescaleDB + pgai stack)
- [Ollama](https://ollama.com/download) with the host reachable at `http://localhost:11434`
  - The bot pulls `gpt-oss:120b-cloud` on startup

## Getting Started
1. Install dependencies
   ```sh
   npm install
   ```
2. Create `.env` from `.env.example` and fill in:
   - `TOKEN`, `DEV_GUILD_IDS`
   - `DATABASE_URL` (defaults to `postgres://postgres:postgres@localhost:5432/postgres`)
   - Optionally set `OLLAMA_HOST` if Docker must reach Ollama through a different hostname
3. Launch the database + vector stack
   ```sh
   OLLAMA_HOST=http://host.docker.internal:11434 npm run dc:up
   ```
4. Apply migrations and generate Prisma client/typed SQL
   ```sh
   npm run prisma:migrate
   ```
5. Start the bot
   ```sh
   npm run dev
   ```

When connecting the bot to new guilds, run `/registration register` to populate contact information. The topic recording flow requires Ollama to be running locally so the bot can pull embeddings and run chat completions.

## Helpful Commands
- `npm run dev` – tsx watch mode for development
- `npm run build` – type-check and emit JS to `dist/`
- `npm start` – run the compiled build
- `npm run dc:up` / `npm run dc:down` – manage the Docker compose stack
- `npm run prisma:generate` – regenerate Prisma client and typed SQL helpers

## Repository Structure
- `src/app` – commands, events, components, tasks
- `src/core` – configuration, logging, registry, error handling
- `src/lib` – reusable libraries (scheduler, health checks, LLM stack, Result helpers)
- `src/services` – Prisma-backed domain services (guild & topic management)
- `src/db/prisma` – Prisma schema, migrations, typed SQL
- `src/db/init` – database bootstrap scripts (pgai / Ollama integration)

## Notes
- Verification/email flows from cs-bot-v3 are intentionally omitted; if needed later they can be reintroduced.
- The vectorizer worker requires Ollama to expose the model at the configured `OLLAMA_HOST`.
