import { Body, Controller, Get, Param, Patch, Post, Query } from "@nestjs/common";
import type { Usuario } from "@lf/db";
import { EstoqueService } from "./estoque.service";
import { MovimentacaoDto } from "./dto/movimentacao.dto";
import {
  ConfiguracaoDto,
  DevolucaoDto,
  EmprestimoDto,
  ListarEmprestimosQueryDto,
  PerdaDto,
} from "./dto/emprestimo.dto";
import { CurrentUsuario, Roles } from "../auth/decorators";

// Estoque é operado por almoxarifado e admin (papéis atuais: só os dois).
// MULTI-TENANT: o tenant NUNCA vem do cliente — é sempre u.tenantId, o
// tenant do usuário resolvido do JWT pelo AuthGuard.
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("estoque")
export class EstoqueController {
  constructor(private readonly estoque: EstoqueService) {}

  @Get("produtos")
  listarProdutos(@CurrentUsuario() u: Usuario) {
    return this.estoque.listarProdutos(u.tenantId);
  }

  @Get("movimentacoes")
  listarMovimentacoes(@CurrentUsuario() u: Usuario, @Query("produtoId") produtoId?: string) {
    return this.estoque.listarMovimentacoes(u.tenantId, produtoId);
  }

  @Post("movimentacao")
  registrar(@Body() dto: MovimentacaoDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrar(u.tenantId, dto, u.id);
  }

  // Status validado pelo DTO: valor fora do enum → 400 antes de tocar o banco.
  @Get("emprestimos")
  listarEmprestimos(@CurrentUsuario() u: Usuario, @Query() query: ListarEmprestimosQueryDto) {
    return this.estoque.listarEmprestimos(u.tenantId, query.status);
  }

  @Post("emprestimo")
  emprestar(@Body() dto: EmprestimoDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrarEmprestimo(u.tenantId, dto, u.id);
  }

  @Post("emprestimo/:id/devolucao")
  devolver(@Param("id") id: string, @Body() dto: DevolucaoDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrarDevolucao(u.tenantId, id, dto, u.id);
  }

  @Post("emprestimo/:id/perda")
  perder(@Param("id") id: string, @Body() dto: PerdaDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrarPerda(u.tenantId, id, dto, u.id);
  }

  @Get("config")
  getConfig(@CurrentUsuario() u: Usuario) {
    return this.estoque.getConfig(u.tenantId);
  }

  // Prazo padrão de empréstimo é decisão do dono.
  @Roles("ADMIN")
  @Patch("config")
  updateConfig(@Body() dto: ConfiguracaoDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.updateConfig(u.tenantId, dto);
  }
}
