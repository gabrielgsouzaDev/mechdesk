import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Delete, Param, Body } from "@nestjs/common";
import { IsInt, IsOptional, IsString, IsUUID } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { Roles } from "../auth/decorators";

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
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("veiculos")
class VeiculosController {
  constructor(private readonly s: VeiculosService) {}
  @Get() list() { return this.s.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.s.get(id); }
  @Post() create(@Body() dto: CreateVeiculoDto) { return this.s.create(dto); }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: UpdateVeiculoDto) { return this.s.update(id, dto); }
  @Delete(":id") remove(@Param("id") id: string) { return this.s.remove(id); }
}

@Module({ controllers: [VeiculosController], providers: [VeiculosService] })
export class VeiculosModule {}
