import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import type { Usuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { CurrentUsuario, Permissao, Roles } from "../auth/decorators";

class CreateVeiculoDto {
  @IsString() placa!: string;
  @IsString() modelo!: string;
  @IsUUID() clienteId!: string;
  @IsOptional() @IsString() marca?: string;
  @IsOptional() @IsInt() anoFab?: number;
  @IsOptional() @IsString() chassi?: string;
  @IsOptional() @IsString() renavam?: string;
  @IsOptional() @IsString() tipo?: string;
  @IsOptional() @IsInt() kmAtual?: number;
}
class UpdateVeiculoDto extends PartialType(CreateVeiculoDto) {}

@Injectable()
class VeiculosService extends CrudService<unknown> {
  constructor(prisma: PrismaService) {
    super(prisma.veiculo as never, { placa: "asc" }, { cliente: true });
  }
}

// Frota dos clientes: apoio à operação — ADMIN e ALMOXARIFADO (Avaliação 02).
// Multi-tenant: o escopo é sempre u.tenantId (do JWT), nunca do cliente.
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("veiculos")
class VeiculosController {
  constructor(private readonly s: VeiculosService) {}
  @Permissao("veiculos", "VER") @Get() list(@CurrentUsuario() u: Usuario) { return this.s.list(u.tenantId); }
  @Permissao("veiculos", "VER") @Get(":id") get(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.get(u.tenantId, id); }
  @Permissao("veiculos", "CRIAR") @Post() create(@CurrentUsuario() u: Usuario, @Body() dto: CreateVeiculoDto) { return this.s.create(u.tenantId, dto); }
  @Permissao("veiculos", "EDITAR") @Patch(":id") update(@CurrentUsuario() u: Usuario, @Param("id") id: string, @Body() dto: UpdateVeiculoDto) { return this.s.update(u.tenantId, id, dto); }
  @Permissao("veiculos", "EXCLUIR") @Delete(":id") remove(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.remove(u.tenantId, id); }
}

@Module({ controllers: [VeiculosController], providers: [VeiculosService] })
export class VeiculosModule {}
