CREATE TABLE "public"."Topic" (
  "id" TEXT NOT NULL,
  "guildSnowflake" TEXT NOT NULL,
  "summary" TEXT NOT NULL,

  CONSTRAINT "Topic_pkey" PRIMARY KEY ("id")
);

SELECT ai.create_vectorizer(
  '"Topic"'::regclass,
  loading => ai.loading_column('summary'),
  embedding => ai.embedding_ollama('nomic-embed-text', 768),
  destination => ai.destination_table('topic_summary_embeddings')
);
