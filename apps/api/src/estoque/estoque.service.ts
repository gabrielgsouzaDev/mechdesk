import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import { MovimentacaoDto } from "./dto/movimentacao.dto";
import {
  ConfiguracaoDto,
  DevolucaoDto,
  EmprestimoDto,
  PerdaDto,
  type StatusEmprestimoQuery,
} from "./dto/emprestimo.dto";

type ResultadoMov = { movimentacaoId: string; saldoApos: number };
type ResultadoEmprestimo = { emprestimoId: string; movimentacaoId: string; saldoApos: number };

// Traduz os códigos de erro de domínio (raise exception no Postgres) em HTTP.
// Exportada para teste unitário: é a fronteira que impede texto bruto do
// banco de vazar para o cliente.
export function traduzirErroRpc(err: unknown): never {
  const msg = err instanceof Error ? err.message : String(err);
  if (msg.includes("ESTOQUE_INSUFICIENTE")) throw new ConflictException("Estoque insuficiente para esta saída.");
  if (msg.includes("FERRAMENTA_INDISPONIVEL")) throw new ConflictException("Não há unidades disponíveis desta ferramenta.");
  if (msg.includes("FERRAMENTA_EMPRESTADA")) throw new ConflictException("Há unidades emprestadas: registre a devolução (ou perda) antes de dar saída.");
  if (msg.includes("AJUSTE_ABAIXO_EMPRESTADO")) throw new ConflictException("O ajuste ficaria abaixo das unidades emprestadas. Feche as pendências antes.");
  if (msg.includes("PRODUTO_NAO_ENCONTRADO")) throw new NotFoundException("Produto não encontrado.");
  if (msg.includes("EMPRESTIMO_NAO_ENCONTRADO")) throw new NotFoundException("Empréstimo não encontrado ou já fechado.");
  if (msg.includes("CATEGORIA_INVALIDA")) throw new BadRequestException("Este produto não é uma ferramenta.");
  if (msg.includes("MOTIVO_OBRIGATORIO")) throw new BadRequestException("Informe o motivo da perda.");
  if (msg.includes("QUANTIDADE_INVALIDA") || msg.includes("TIPO_INVALIDO")) {
    throw new BadRequestException("Dados de movimentação inválidos.");
  }
  throw err instanceof Error ? err : new Error(msg);
}

// MULTI-TENANT: todo método recebe o tenantId do CHAMADOR como primeiro
// parâmetro (o controller extrai do usuário autenticado — nunca do body ou
// da query). O isolamento de escrita mora nas RPCs (filtro por tenant sob
// FOR UPDATE); aqui a responsabilidade é repassar o tenant certo e escopar
// todas as leituras.
@Injectable()
export class EstoqueService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Registra ENTRADA, SAÍDA ou AJUSTE chamando a RPC atômica
   * `registrar_movimentacao_estoque`. A atomicidade (ajuste do saldo +
   * gravação no ledger numa transação) mora no Postgres — a API só
   * traduz os erros de domínio em respostas HTTP.
   */
  async registrar(tenantId: string, dto: MovimentacaoDto, usuarioId: string): Promise<ResultadoMov> {
    try {
      const [row] = await this.prisma.$queryRaw<{ registrar_movimentacao_estoque: ResultadoMov }[]>`
        SELECT registrar_movimentacao_estoque(
          ${dto.produtoId}::text,
          ${dto.quantidade}::int,
          ${dto.tipo}::text,
          ${usuarioId}::text,
          ${dto.ordemServicoId ?? null}::text,
          ${dto.motivo ?? null}::text,
          ${tenantId}::text
        ) AS registrar_movimentacao_estoque
      `;
      return row.registrar_movimentacao_estoque;
    } catch (err) {
      traduzirErroRpc(err);
    }
  }

  /** Empréstimo de ferramenta (retirada): não altera o cache de estoque. */
  async registrarEmprestimo(tenantId: string, dto: EmprestimoDto, usuarioId: string): Promise<ResultadoEmprestimo> {
    try {
      const [row] = await this.prisma.$queryRaw<{ registrar_emprestimo: ResultadoEmprestimo }[]>`
        SELECT registrar_emprestimo(
          ${dto.produtoId}::text,
          ${dto.quantidade}::int,
          ${dto.funcionarioId}::text,
          ${usuarioId}::text,
          ${null}::int,
          ${dto.motivo ?? null}::text,
          ${tenantId}::text
        ) AS registrar_emprestimo
      `;
      return row.registrar_emprestimo;
    } catch (err) {
      traduzirErroRpc(err);
    }
  }

  /** Devolução de ferramenta: fecha a pendência. */
  async registrarDevolucao(tenantId: string, emprestimoId: string, dto: DevolucaoDto, usuarioId: string): Promise<ResultadoMov> {
    try {
      const [row] = await this.prisma.$queryRaw<{ registrar_devolucao: ResultadoMov }[]>`
        SELECT registrar_devolucao(
          ${emprestimoId}::text,
          ${usuarioId}::text,
          ${dto.motivo ?? null}::text,
          ${tenantId}::text
        ) AS registrar_devolucao
      `;
      return row.registrar_devolucao;
    } catch (err) {
      traduzirErroRpc(err);
    }
  }

  /** Perda de ferramenta emprestada: baixa definitiva (SAIDA) + fecha a pendência. */
  async registrarPerda(tenantId: string, emprestimoId: string, dto: PerdaDto, usuarioId: string): Promise<ResultadoMov> {
    try {
      const [row] = await this.prisma.$queryRaw<{ registrar_perda: ResultadoMov }[]>`
        SELECT registrar_perda(
          ${emprestimoId}::text,
          ${usuarioId}::text,
          ${dto.motivo}::text,
          ${tenantId}::text
        ) AS registrar_perda
      `;
      return row.registrar_perda;
    } catch (err) {
      traduzirErroRpc(err);
    }
  }

  /**
   * Pendências de ferramenta. Sem filtro de status, traz tudo DO TENANT
   * (Pendências mostra por status no front). `status` já chegou validado
   * pelo DTO de query; o `take` blinda o banco contra crescimento sem
   * limite do histórico.
   */
  listarEmprestimos(tenantId: string, status?: StatusEmprestimoQuery) {
    return this.prisma.emprestimo.findMany({
      where: { tenantId, ...(status ? { status } : {}) },
      orderBy: { retiradoEm: "desc" },
      take: 500,
      include: {
        produto: { select: { sku: true, descricao: true } },
        funcionario: { select: { nome: true, cargo: true } },
        usuarioRetirada: { select: { nome: true } },
        usuarioFechamento: { select: { nome: true } },
      },
    });
  }

  /**
   * Configuração operacional do tenant. Tenant sem a linha (seed não rodou
   * ou oficina recém-criada) não pode virar 500: devolve o padrão de 24h —
   * o mesmo fallback que a RPC `registrar_emprestimo` aplica via coalesce.
   */
  async getConfig(tenantId: string) {
    const config = await this.prisma.configuracao.findUnique({ where: { tenantId } });
    return config ?? { tenantId, prazoEmprestimoHoras: 24 };
  }

  /** Upsert: oficina sem linha de configuração ganha a sua na primeira gravação. */
  updateConfig(tenantId: string, dto: ConfiguracaoDto) {
    return this.prisma.configuracao.upsert({
      where: { tenantId },
      update: { prazoEmprestimoHoras: dto.prazoEmprestimoHoras },
      create: { tenantId, prazoEmprestimoHoras: dto.prazoEmprestimoHoras },
    });
  }

  /** Produtos com saldo (alimenta o console de movimentação). */
  listarProdutos(tenantId: string) {
    return this.prisma.produto.findMany({
      where: { tenantId, ativo: true },
      orderBy: { descricao: "asc" },
    });
  }

  /** Histórico/log de movimentações (o ledger), mais recentes primeiro. */
  listarMovimentacoes(tenantId: string, produtoId?: string) {
    return this.prisma.movimentacaoEstoque.findMany({
      where: { tenantId, ...(produtoId ? { produtoId } : {}) },
      orderBy: { criadoEm: "desc" },
      take: 200,
      include: {
        produto: { select: { sku: true, descricao: true } },
        usuario: { select: { nome: true } },
        ordemServico: { select: { numero: true, veiculo: { select: { placa: true } } } },
        emprestimo: { select: { funcionario: { select: { nome: true } } } },
      },
    });
  }
}
