import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Usuario, PapelUsuario } from "@lf/db";

export const IS_PUBLIC = "isPublic";
/** Marca a rota como pública (sem JWT). Uso: health-check e, futuramente, o portal do cliente. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = "roles";
/** Restringe a rota a papéis específicos. Sem @Roles, basta estar autenticado. */
export const Roles = (...papeis: PapelUsuario[]) => SetMetadata(ROLES, papeis);

/** Injeta o usuário resolvido do token. Uso: @CurrentUsuario() u: Usuario */
export const CurrentUsuario = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Usuario => {
    return ctx.switchToHttp().getRequest().usuario;
  },
);
