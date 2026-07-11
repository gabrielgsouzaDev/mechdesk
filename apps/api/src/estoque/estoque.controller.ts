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
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("estoque")
export class EstoqueController {
  constructor(private readonly estoque: EstoqueService) {}

  @Get("produtos")
  listarProdutos() {
    return this.estoque.listarProdutos();
  }

  @Get("movimentacoes")
  listarMovimentacoes(@Query("produtoId") produtoId?: string) {
    return this.estoque.listarMovimentacoes(produtoId);
  }

  @Post("movimentacao")
  registrar(@Body() dto: MovimentacaoDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrar(dto, u.id);
  }

  // Status validado pelo DTO: valor fora do enum → 400 antes de tocar o banco.
  @Get("emprestimos")
  listarEmprestimos(@Query() query: ListarEmprestimosQueryDto) {
    return this.estoque.listarEmprestimos(query.status);
  }

  @Post("emprestimo")
  emprestar(@Body() dto: EmprestimoDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrarEmprestimo(dto, u.id);
  }

  @Post("emprestimo/:id/devolucao")
  devolver(@Param("id") id: string, @Body() dto: DevolucaoDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrarDevolucao(id, dto, u.id);
  }

  @Post("emprestimo/:id/perda")
  perder(@Param("id") id: string, @Body() dto: PerdaDto, @CurrentUsuario() u: Usuario) {
    return this.estoque.registrarPerda(id, dto, u.id);
  }

  @Get("config")
  getConfig() {
    return this.estoque.getConfig();
  }

  // Prazo padrão de empréstimo é decisão do dono.
  @Roles("ADMIN")
  @Patch("config")
  updateConfig(@Body() dto: ConfiguracaoDto) {
    return this.estoque.updateConfig(dto);
  }
}
