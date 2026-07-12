import { SetMetadata, createParamDecorator, type ExecutionContext } from "@nestjs/common";
import type { Usuario, PapelUsuario } from "@lf/db";
import type { Acao, Recurso } from "../permissoes/permissoes.constants";

export const IS_PUBLIC = "isPublic";
/** Marca a rota como pública (sem JWT). Uso: health-check e, futuramente, o portal do cliente. */
export const Public = () => SetMetadata(IS_PUBLIC, true);

export const ROLES = "roles";
/** Restringe a rota a papéis específicos. Sem @Roles, basta estar autenticado. */
export const Roles = (...papeis: PapelUsuario[]) => SetMetadata(ROLES, papeis);

export const PERMISSAO = "permissao";
export type ExigenciaPermissao = { recurso: Recurso; acao: Acao };
/**
 * RBAC dinâmico (Etapa 5b): exige permissão da matriz do banco
 * (tabela `permissoes`, por tenant) além do @Roles estático — o @Roles é o
 * teto (defesa em profundidade), a matriz é o ajuste fino editável pelo Admin.
 */
export const Permissao = (recurso: Recurso, acao: Acao) => SetMetadata(PERMISSAO, { recurso, acao });

/** Injeta o usuário resolvido do token. Uso: @CurrentUsuario() u: Usuario */
export const CurrentUsuario = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): Usuario => {
    return ctx.switchToHttp().getRequest().usuario;
  },
);
