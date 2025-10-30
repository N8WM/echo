-- @param {String} $1:query
-- @param {String} $2:guildSnowflake

WITH q AS (
  SELECT ai.ollama_embed(
    'nomic-embed-text',
    COALESCE($1::text, 'placeholder'),
    host => current_setting('app.ollama_host', true)
  ) AS v
)
SELECT
  tse.id AS id,
  tse.chunk AS summary,
  tse.embedding <=> q.v AS distance
FROM "topic_summary_embeddings" AS tse
JOIN "Topic" AS t ON t.id = tse.id
CROSS JOIN q
WHERE t."guildSnowflake" = $2::text
ORDER BY distance
LIMIT 10
