import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsBoolean, IsEmail, IsOptional, IsString, Length } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { Roles } from "../auth/decorators";

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
@Roles("ADMIN")
@Controller("funcionarios")
class FuncionariosController {
  constructor(private readonly s: FuncionariosService) {}
  @Roles("ADMIN", "ALMOXARIFADO")
  @Get() list() { return this.s.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.s.get(id); }
  @Post() create(@Body() dto: CreateFuncionarioDto) { return this.s.create(dto); }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: UpdateFuncionarioDto) { return this.s.update(id, dto); }
  @Delete(":id") remove(@Param("id") id: string) { return this.s.remove(id); }
}

@Module({ controllers: [FuncionariosController], providers: [FuncionariosService] })
export class FuncionariosModule {}
