/*
  Warnings:

  - Added the required column `updatedAt` to the `Topic` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "Topic" ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL;

-- CreateTable
CREATE TABLE "Guild" (
    "snowflake" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Guild_pkey" PRIMARY KEY ("snowflake")
);

-- CreateTable
CREATE TABLE "Message" (
    "messageSnowflake" TEXT NOT NULL,
    "guildSnowflake" TEXT NOT NULL,
    "channelSnowflake" TEXT NOT NULL,
    "topicId" TEXT NOT NULL,
    "content" TEXT NOT NULL,
    "authorSnowflake" TEXT NOT NULL,
    "timestamp" TIMESTAMP(3) NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "Message_pkey" PRIMARY KEY ("messageSnowflake","topicId")
);

-- AddForeignKey
ALTER TABLE "Topic" ADD CONSTRAINT "Topic_guildSnowflake_fkey" FOREIGN KEY ("guildSnowflake") REFERENCES "Guild"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_guildSnowflake_fkey" FOREIGN KEY ("guildSnowflake") REFERENCES "Guild"("snowflake") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Message" ADD CONSTRAINT "Message_topicId_fkey" FOREIGN KEY ("topicId") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "topic_summary_embeddings_store" ADD CONSTRAINT "topic_summary_embeddings_store_id_fkey" FOREIGN KEY ("id") REFERENCES "Topic"("id") ON DELETE CASCADE ON UPDATE CASCADE;
