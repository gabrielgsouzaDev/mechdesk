import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsBoolean, IsEmail, IsOptional, IsString, Length } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import type { Usuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { CurrentUsuario, Permissao, Roles } from "../auth/decorators";

// Funcionário = pessoa da equipe (sem login). Cargo é texto livre.
class CreateFuncionarioDto {
  @IsString() nome!: string;
  @IsString() @Length(11, 14) cpf!: string;
  @IsOptional() @IsString() cargo?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsBoolean() ativo?: boolean;
}
class UpdateFuncionarioDto extends PartialType(CreateFuncionarioDto) {}

@Injectable()
class FuncionariosService extends CrudService<unknown> {
  constructor(prisma: PrismaService) {
    super(prisma.funcionario as never, { nome: "asc" });
  }
}

// Dados pessoais da equipe: só o dono gerencia (cria/edita/exclui).
// A listagem também é liberada pro almoxarifado — precisa saber pra quem
// está emprestando a ferramenta (Etapa 3 — ferramentaria).
// Multi-tenant: o escopo é sempre u.tenantId (do JWT), nunca do cliente.
@Roles("ADMIN")
@Controller("funcionarios")
class FuncionariosController {
  constructor(private readonly s: FuncionariosService) {}
  // A listagem NÃO passa pela matriz dinâmica de propósito: é lookup de
  // apoio da operação (pra quem se empresta ferramenta), não a tela de RH.
  @Roles("ADMIN", "ALMOXARIFADO")
  @Get() list(@CurrentUsuario() u: Usuario) { return this.s.list(u.tenantId); }
  @Permissao("funcionarios", "VER") @Get(":id") get(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.get(u.tenantId, id); }
  @Permissao("funcionarios", "CRIAR") @Post() create(@CurrentUsuario() u: Usuario, @Body() dto: CreateFuncionarioDto) { return this.s.create(u.tenantId, dto); }
  @Permissao("funcionarios", "EDITAR") @Patch(":id") update(@CurrentUsuario() u: Usuario, @Param("id") id: string, @Body() dto: UpdateFuncionarioDto) { return this.s.update(u.tenantId, id, dto); }
  @Permissao("funcionarios", "EXCLUIR") @Delete(":id") remove(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.remove(u.tenantId, id); }
}

@Module({ controllers: [FuncionariosController], providers: [FuncionariosService] })
export class FuncionariosModule {}
