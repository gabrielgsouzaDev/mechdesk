import { BadRequestException, Injectable } from "@nestjs/common";
import type { PapelUsuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import {
  ACOES,
  MATRIZ_PADRAO,
  RECURSOS,
  RECURSO_TRAVADO,
  type Acao,
  type MapaPermissoes,
  type Recurso,
} from "./permissoes.constants";

type LinhaPermissao = { recurso: string; acao: string; permitido: boolean };
export type AlteracaoPermissao = {
  papel: PapelUsuario;
  recurso: Recurso;
  acao: Acao;
  permitido: boolean;
};

const CACHE_TTL_MS = 30_000;

/**
 * Decisões de permissão papel × recurso × ação, POR TENANT.
 * Precedência: trava do recurso "admin" (anti-lockout, imutável)
 * → linha do banco (o que a tela Admin edita) → MATRIZ_PADRAO em código
 * (tenant sem seed nunca quebra; reproduz o RBAC hardcoded anterior).
 * Cache curto por tenant+papel: o guard consulta a cada request.
 */
@Injectable()
export class PermissoesService {
  private cache = new Map<string, { linhas: LinhaPermissao[]; ate: number }>();

  constructor(private readonly prisma: PrismaService) {}

  async pode(tenantId: string, papel: PapelUsuario, recurso: Recurso, acao: Acao): Promise<boolean> {
    if (recurso === RECURSO_TRAVADO) return papel === "ADMIN";
    // Papel fora do enum conhecido não pode nada (e não toca o banco).
    if (!(papel in MATRIZ_PADRAO)) return false;

    const linhas = await this.linhasDoPapel(tenantId, papel);
    const linha = linhas.find((l) => l.recurso === recurso && l.acao === acao);
    if (linha) return linha.permitido;
    return MATRIZ_PADRAO[papel][recurso]?.[acao] ?? false;
  }

  /** Mapa completo do papel — contrato do GET /me (menu e guard do front). */
  async mapaDoPapel(tenantId: string, papel: PapelUsuario): Promise<MapaPermissoes> {
    const base = {} as MapaPermissoes;
    for (const recurso of RECURSOS) {
      base[recurso] = {} as Record<Acao, boolean>;
      for (const acao of ACOES) {
        base[recurso][acao] = (papel in MATRIZ_PADRAO && MATRIZ_PADRAO[papel][recurso]?.[acao]) ?? false;
      }
    }
    if (papel in MATRIZ_PADRAO) {
      const linhas = await this.linhasDoPapel(tenantId, papel);
      for (const l of linhas) {
        if (l.recurso === RECURSO_TRAVADO) continue; // trava: banco não manda aqui
        const recurso = l.recurso as Recurso;
        if (base[recurso]) base[recurso][l.acao as Acao] = l.permitido;
      }
    }
    // Anti-lockout: "admin" é derivado só do papel, nunca do banco.
    for (const acao of ACOES) base[RECURSO_TRAVADO][acao] = papel === "ADMIN";
    return base;
  }

  /** Matriz achatada dos dois papéis (alimenta a tela Admin). */
  async listar(tenantId: string): Promise<AlteracaoPermissao[]> {
    const papeis = Object.keys(MATRIZ_PADRAO) as PapelUsuario[];
    const saida: AlteracaoPermissao[] = [];
    for (const papel of papeis) {
      const mapa = await this.mapaDoPapel(tenantId, papel);
      for (const recurso of RECURSOS) {
        if (recurso === RECURSO_TRAVADO) continue; // não configurável
        for (const acao of ACOES) {
          saida.push({ papel, recurso, acao, permitido: mapa[recurso][acao] });
        }
      }
    }
    return saida;
  }

  /**
   * Aplica alterações da tela Admin: upsert do estado vigente + linha de
   * auditoria INSERT-ONLY por mudança, tudo na MESMA transação.
   */
  async atualizar(
    tenantId: string,
    usuarioId: string,
    alteracoes: AlteracaoPermissao[],
  ): Promise<{ alteradas: number }> {
    for (const a of alteracoes) {
      if (a.recurso === RECURSO_TRAVADO) {
        throw new BadRequestException("O recurso 'admin' não é configurável (proteção anti-lockout).");
      }
      if (!(a.papel in MATRIZ_PADRAO) || !RECURSOS.includes(a.recurso) || !ACOES.includes(a.acao)) {
        throw new BadRequestException("Papel, recurso ou ação fora do vocabulário de permissões.");
      }
    }

    await this.prisma.$transaction(async (tx) => {
      for (const a of alteracoes) {
        await tx.permissao.upsert({
          where: {
            tenantId_papel_recurso_acao: {
              tenantId,
              papel: a.papel,
              recurso: a.recurso,
              acao: a.acao,
            },
          },
          update: { permitido: a.permitido },
          create: { tenantId, papel: a.papel, recurso: a.recurso, acao: a.acao, permitido: a.permitido },
        });
      }
      await tx.permissaoLog.createMany({
        data: alteracoes.map((a) => ({
          tenantId,
          papel: a.papel,
          recurso: a.recurso,
          acao: a.acao,
          permitido: a.permitido,
          usuarioId,
        })),
      });
    });

    this.invalidar(tenantId);
    return { alteradas: alteracoes.length };
  }

  /** Auditoria (mais recentes primeiro; take blinda contra crescimento). */
  listarLog(tenantId: string) {
    return this.prisma.permissaoLog.findMany({
      where: { tenantId },
      orderBy: { criadoEm: "desc" },
      take: 200,
      include: { usuario: { select: { nome: true } } },
    });
  }

  /** Derruba o cache do tenant (chamado após qualquer gravação). */
  invalidar(tenantId: string) {
    for (const chave of this.cache.keys()) {
      if (chave.startsWith(`${tenantId}|`)) this.cache.delete(chave);
    }
  }

  private async linhasDoPapel(tenantId: string, papel: PapelUsuario): Promise<LinhaPermissao[]> {
    const chave = `${tenantId}|${papel}`;
    const agora = Date.now();
    const hit = this.cache.get(chave);
    if (hit && hit.ate > agora) return hit.linhas;

    const linhas = await this.prisma.permissao.findMany({
      where: { tenantId, papel },
      select: { recurso: true, acao: true, permitido: true },
    });
    this.cache.set(chave, { linhas, ate: agora + CACHE_TTL_MS });
    return linhas;
  }
}
