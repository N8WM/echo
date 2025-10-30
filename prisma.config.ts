import path from "node:path";
import "dotenv/config";
import type { PrismaConfig } from "prisma";

const prismaDir = path.join("src", "db", "prisma");

export default {
  schema: path.join(prismaDir, "schema"),
  migrations: { path: path.join(prismaDir, "migrations") },
  views: { path: path.join(prismaDir, "views") },
  typedSql: { path: path.join(prismaDir, "sql") }
} satisfies PrismaConfig;
