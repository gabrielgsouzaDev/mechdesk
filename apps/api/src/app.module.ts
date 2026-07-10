import { Module } from "@nestjs/common";
import { APP_GUARD } from "@nestjs/core";
import { ConfigModule } from "@nestjs/config";
import { ThrottlerGuard, ThrottlerModule } from "@nestjs/throttler";
import { PrismaModule } from "./prisma/prisma.module";
import { HealthController } from "./health/health.controller";
import { EstoqueModule } from "./estoque/estoque.module";
import { FuncionariosModule } from "./funcionarios/funcionarios.module";
import { ClientesModule } from "./clientes/clientes.module";
import { VeiculosModule } from "./veiculos/veiculos.module";
import { ProdutosModule } from "./produtos/produtos.module";
import { OrdensModule } from "./ordens/ordens.module";
import { AuthGuard } from "./auth/auth.guard";
import { MeController } from "./auth/me.controller";

@Module({
  imports: [
    // Carrega o .env da raiz do monorepo.
    ConfigModule.forRoot({ isGlobal: true, envFilePath: ["../../.env", ".env"] }),
    // Rate limiting global: 100 req/min por IP (anti abuso/brute-force).
    ThrottlerModule.forRoot([{ ttl: 60_000, limit: 100 }]),
    PrismaModule,
    // Fase 1 — cadastros
    FuncionariosModule,
    ClientesModule,
    VeiculosModule,
    ProdutosModule,
    // Operação — estoque (entrada/saída) + OS de apoio
    OrdensModule,
    EstoqueModule,
  ],
  controllers: [HealthController, MeController],
  providers: [
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Autenticação global: toda rota exige JWT do Supabase, exceto @Public.
    { provide: APP_GUARD, useClass: AuthGuard },
  ],
})
export class AppModule {}
