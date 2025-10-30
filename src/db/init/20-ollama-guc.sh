#!/usr/bin/env bash
set -euo pipefail

HOST="${OLLAMA_HOST}"
echo "Initializing app.ollama_host -> ${HOST}"

psql --username=postgres --dbname=postgres -v ON_ERROR_STOP=1 \
  -c "ALTER SYSTEM SET app.ollama_host TO '${HOST}';"

psql --username=postgres --dbname=postgres -v ON_ERROR_STOP=1 \
  -c "SELECT pg_reload_conf();"

psql --username=postgres --dbname=postgres -v ON_ERROR_STOP=1 \
  -c "ALTER DATABASE postgres  SET app.ollama_host TO '${HOST}';"

psql --username=postgres --dbname=postgres -v ON_ERROR_STOP=1 \
  -c "ALTER DATABASE template1 SET app.ollama_host TO '${HOST}';"

psql --username=postgres --dbname=postgres -v ON_ERROR_STOP=1 \
  -c "ALTER ROLE postgres       SET app.ollama_host TO '${HOST}';"
