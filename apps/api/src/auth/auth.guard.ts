import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { createRemoteJWKSet, jwtVerify } from "jose";
import type { Usuario, PapelUsuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import { PermissoesService } from "../permissoes/permissoes.service";
import { IS_PUBLIC, PERMISSAO, ROLES, type ExigenciaPermissao } from "./decorators";

/**
 * Guard global de autenticação + papéis (RBAC).
 *  1. Verifica o JWT do Supabase LOCALMENTE via JWKS (ES256) — sem segredo
 *     compartilhado e sem chamada de rede por request (JWKS é cacheado).
 *  2. Resolve o USUÁRIO pelo `sub` (authUserId), com cache em memória.
 *  3. Aplica @Roles quando presente; sem @Roles, basta estar autenticado.
 *  4. Aplica @Permissao (Etapa 5b): consulta a matriz papel × recurso × ação
 *     do TENANT do usuário (tabela `permissoes`, cache curto no serviço) —
 *     o @Roles é o teto estático, a matriz é o ajuste fino do Admin.
 * Escrita continua passando só pela API — o RLS bloqueia o browser.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  private jwks = createRemoteJWKSet(
    new URL(`${process.env.SUPABASE_URL}/auth/v1/.well-known/jwks.json`),
  );
  // Cache curto: evita 1 SELECT por request num time de meia dúzia de pessoas.
  private cache = new Map<string, { usuario: Usuario; ate: number }>();

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly permissoes: PermissoesService,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (isPublic) return true;

    const req = ctx.switchToHttp().getRequest();
    const token = (req.headers.authorization ?? "").replace(/^Bearer\s+/i, "");
    if (!token) throw new UnauthorizedException("Token ausente.");

    let sub: string;
    try {
      const { payload } = await jwtVerify(token, this.jwks, {
        issuer: `${process.env.SUPABASE_URL}/auth/v1`,
        audience: "authenticated",
      });
      sub = String(payload.sub);
    } catch {
      throw new UnauthorizedException("Token inválido ou expirado.");
    }

    const usuario = await this.resolverUsuario(sub);
    if (!usuario || usuario.ativo === false) {
      throw new ForbiddenException("Conta sem usuário ativo no sistema.");
    }
    req.usuario = usuario;

    const papeis = this.reflector.getAllAndOverride<PapelUsuario[]>(ROLES, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (papeis?.length && !papeis.includes(usuario.papel)) {
      throw new ForbiddenException("Seu papel não permite esta ação.");
    }

    const exigencia = this.reflector.getAllAndOverride<ExigenciaPermissao>(PERMISSAO, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (exigencia) {
      const permitido = await this.permissoes.pode(
        usuario.tenantId,
        usuario.papel,
        exigencia.recurso,
        exigencia.acao,
      );
      if (!permitido) {
        throw new ForbiddenException("Seu papel não tem permissão para esta ação.");
      }
    }
    return true;
  }

  private async resolverUsuario(authUserId: string): Promise<Usuario | null> {
    const agora = Date.now();
    const hit = this.cache.get(authUserId);
    if (hit && hit.ate > agora) return hit.usuario;

    const usuario = await this.prisma.usuario.findUnique({ where: { authUserId } });
    if (usuario) {
      this.cache.set(authUserId, { usuario, ate: agora + 60_000 });
    }
    return usuario;
  }
}
