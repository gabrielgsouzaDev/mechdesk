import { Controller, Get } from "@nestjs/common";
import type { Usuario } from "@lf/db";
import { CurrentUsuario } from "./decorators";
import { PermissoesService } from "../permissoes/permissoes.service";

@Controller("me")
export class MeController {
  constructor(private readonly permissoes: PermissoesService) {}

  /**
   * Identidade do usuário logado (resolvida do JWT pelo AuthGuard) + mapa de
   * permissões do papel no tenant (Etapa 5b): menu e guard de rota do front
   * leem deste mapa — a matriz hardcoded vira fallback do modo demo.
   */
  @Get()
  async me(@CurrentUsuario() u: Usuario) {
    return {
      id: u.id,
      nome: u.nome,
      papel: u.papel,
      email: u.email,
      tenantId: u.tenantId,
      permissoes: await this.permissoes.mapaDoPapel(u.tenantId, u.papel),
    };
  }
}
