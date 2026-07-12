import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsEmail, IsEnum, IsOptional, IsString, Length } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import type { Usuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { CurrentUsuario, Permissao, Roles } from "../auth/decorators";

enum TipoPessoa {
  PF = "PF",
  PJ = "PJ",
}

class CreateClienteDto {
  @IsEnum(TipoPessoa) tipo!: TipoPessoa;
  @IsString() razaoSocial!: string;
  @IsString() @Length(11, 14) cnpjCpf!: string;
  @IsOptional() @IsString() nomeFantasia?: string;
  @IsOptional() @IsString() inscEstadual?: string;
  @IsOptional() @IsEmail() email?: string;
  @IsOptional() @IsString() telefone?: string;
  @IsOptional() @IsString() logradouro?: string;
  @IsOptional() @IsString() numero?: string;
  @IsOptional() @IsString() bairro?: string;
  @IsOptional() @IsString() municipio?: string;
  @IsOptional() @IsString() @Length(2, 2) uf?: string;
  @IsOptional() @IsString() cep?: string;
}
class UpdateClienteDto extends PartialType(CreateClienteDto) {}

@Injectable()
class ClientesService extends CrudService<unknown> {
  constructor(prisma: PrismaService) {
    super(prisma.cliente as never, { razaoSocial: "asc" });
  }
}

// Cadastro de apoio à operação: ADMIN e ALMOXARIFADO (Avaliação 02).
// Multi-tenant: o escopo é sempre u.tenantId (do JWT), nunca do cliente.
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("clientes")
class ClientesController {
  constructor(private readonly s: ClientesService) {}
  @Permissao("clientes", "VER") @Get() list(@CurrentUsuario() u: Usuario) { return this.s.list(u.tenantId); }
  @Permissao("clientes", "VER") @Get(":id") get(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.get(u.tenantId, id); }
  @Permissao("clientes", "CRIAR") @Post() create(@CurrentUsuario() u: Usuario, @Body() dto: CreateClienteDto) { return this.s.create(u.tenantId, dto); }
  @Permissao("clientes", "EDITAR") @Patch(":id") update(@CurrentUsuario() u: Usuario, @Param("id") id: string, @Body() dto: UpdateClienteDto) { return this.s.update(u.tenantId, id, dto); }
  @Permissao("clientes", "EXCLUIR") @Delete(":id") remove(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.remove(u.tenantId, id); }
}

@Module({ controllers: [ClientesController], providers: [ClientesService] })
export class ClientesModule {}
