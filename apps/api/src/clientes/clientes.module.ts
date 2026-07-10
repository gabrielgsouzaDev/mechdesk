import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsEmail, IsEnum, IsOptional, IsString, Length } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { Roles } from "../auth/decorators";

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
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("clientes")
class ClientesController {
  constructor(private readonly s: ClientesService) {}
  @Get() list() { return this.s.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.s.get(id); }
  @Post() create(@Body() dto: CreateClienteDto) { return this.s.create(dto); }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: UpdateClienteDto) { return this.s.update(id, dto); }
  @Delete(":id") remove(@Param("id") id: string) { return this.s.remove(id); }
}

@Module({ controllers: [ClientesController], providers: [ClientesService] })
export class ClientesModule {}
