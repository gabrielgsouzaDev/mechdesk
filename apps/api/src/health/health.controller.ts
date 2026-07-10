import { Controller, Get } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { Public } from "../auth/decorators";

@Public()
@Controller("health")
export class HealthController {
  constructor(private readonly prisma: PrismaService) {}

  @Get()
  async check() {
    // Ping no banco para confirmar a conexão.
    await this.prisma.$queryRaw`SELECT 1`;
    return { status: "ok", db: "up", at: new Date().toISOString() };
  }
}
