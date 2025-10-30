# Echo

Discord bot for recalling previously answered questions.

## Prerequisites

- Node.js 20+
- Docker Desktop (for the TimescaleDB + pgai stack)
- [Ollama](https://ollama.com/download) with the host reachable at `http://localhost:11434`
  - The bot pulls `gpt-oss:120b-cloud` on startup]
- The token for a Discord app with suitable permissions

## Getting Started

1. Install dependencies

   ```sh
   npm install
   ```

2. Create `.env` from `.env.example` and fill in:
   - `TOKEN`
   - `DEV_GUILD_IDS` (optional)
   - `DATABASE_URL` (defaults to `postgres://postgres:postgres@localhost:5432/postgres`)
3. Launch the database + vector stack

   ```sh
   npm run dc:up
   ```

4. Apply migrations and generate Prisma client/typed SQL

   ```sh
   npm run prisma:migrate
   ```

5. Start the bot

   ```sh
   npm run dev
   ```

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
