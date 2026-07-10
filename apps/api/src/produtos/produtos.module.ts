import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsBoolean, IsEnum, IsInt, IsNumber, IsOptional, IsString, Min } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { Roles } from "../auth/decorators";

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
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("produtos")
class ProdutosController {
  constructor(private readonly s: ProdutosService) {}
  @Get() list() { return this.s.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.s.get(id); }
  @Post() create(@Body() dto: CreateProdutoDto) { return this.s.create(dto); }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: UpdateProdutoDto) { return this.s.update(id, dto); }
  @Delete(":id") remove(@Param("id") id: string) { return this.s.remove(id); }
}

@Module({ controllers: [ProdutosController], providers: [ProdutosService] })
export class ProdutosModule {}
