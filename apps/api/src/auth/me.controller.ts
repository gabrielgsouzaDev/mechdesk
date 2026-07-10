import { Controller, Get } from "@nestjs/common";
import type { Usuario } from "@lf/db";
import { CurrentUsuario } from "./decorators";

@Controller("me")
export class MeController {
  /** Identidade do usuário logado (resolvida do JWT pelo AuthGuard). */
  @Get()
  me(@CurrentUsuario() u: Usuario) {
    return { id: u.id, nome: u.nome, papel: u.papel, email: u.email };
  }
}
