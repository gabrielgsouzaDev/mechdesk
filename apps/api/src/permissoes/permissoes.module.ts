import { Global, Module } from "@nestjs/common";
import { PermissoesService } from "./permissoes.service";
import { PermissoesController } from "./permissoes.controller";

// @Global: o AuthGuard (registrado como APP_GUARD no AppModule) consulta o
// PermissoesService em toda rota anotada com @Permissao — o serviço precisa
// estar visível em qualquer contexto de injeção.
@Global()
@Module({
  controllers: [PermissoesController],
  providers: [PermissoesService],
  exports: [PermissoesService],
})
export class PermissoesModule {}
