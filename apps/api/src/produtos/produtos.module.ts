import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import type { Usuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { CurrentUsuario, Permissao, Roles } from "../auth/decorators";

enum TipoControle {
  RIGIDO = "RIGIDO",
  ESTOQUE_CHAO = "ESTOQUE_CHAO",
}

enum Categoria {
  PECA = "PECA",
  FERRAMENTA = "FERRAMENTA",
}

class CreateProdutoDto {
  @IsString() sku!: string;
  @IsString() descricao!: string;
  @IsNumber() @Min(0) precoCusto!: number;
  @IsNumber() @Min(0) precoVenda!: number;
  @IsOptional() @IsString() ncm?: string;
  @IsOptional() @IsString() unidade?: string;
  @IsOptional() @IsEnum(TipoControle) controle?: TipoControle;
  @IsOptional() @IsEnum(Categoria) categoria?: Categoria;
  @IsOptional() @IsInt() @Min(0) estoqueAtual?: number;
  @IsOptional() @IsInt() @Min(0) estoqueMinimo?: number;
  @IsOptional() @IsString() localizacao?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
class UpdateProdutoDto extends PartialType(CreateProdutoDto) {}

@Injectable()
class ProdutosService extends CrudService<unknown> {
  constructor(prisma: PrismaService) {
    super(prisma.produto as never, { descricao: "asc" });
  }
}

// Catálogo de peças: dono e almoxarifado.
// Multi-tenant: o escopo é sempre u.tenantId (do JWT), nunca do cliente.
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("produtos")
class ProdutosController {
  constructor(private readonly s: ProdutosService) {}
  @Permissao("produtos", "VER") @Get() list(@CurrentUsuario() u: Usuario) { return this.s.list(u.tenantId); }
  @Permissao("produtos", "VER") @Get(":id") get(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.get(u.tenantId, id); }
  @Permissao("produtos", "CRIAR") @Post() create(@CurrentUsuario() u: Usuario, @Body() dto: CreateProdutoDto) { return this.s.create(u.tenantId, dto); }
  @Permissao("produtos", "EDITAR") @Patch(":id") update(@CurrentUsuario() u: Usuario, @Param("id") id: string, @Body() dto: UpdateProdutoDto) { return this.s.update(u.tenantId, id, dto); }
  @Permissao("produtos", "EXCLUIR") @Delete(":id") remove(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.remove(u.tenantId, id); }
}

@Module({ controllers: [ProdutosController], providers: [ProdutosService] })
export class ProdutosModule {}
