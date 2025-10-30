import { PrismaClient } from "@prisma/client";

export abstract class BaseService {
  constructor(protected readonly prisma: PrismaClient) { }
}
