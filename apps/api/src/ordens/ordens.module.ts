import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Param, Body } from "@nestjs/common";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { Roles } from "../auth/decorators";

enum StatusOS {
  RECEBIDO = "RECEBIDO",
  DIAGNOSTICO = "DIAGNOSTICO",
  AGUARDANDO_PECA = "AGUARDANDO_PECA",
  EXECUCAO = "EXECUCAO",
  PRONTO = "PRONTO",
  FATURADO = "FATURADO",
}

class CreateOrdemDto {
  @IsUUID() clienteId!: string;
  @IsUUID() veiculoId!: string;
  @IsOptional() @IsUUID() mecanicoId?: string;
  @IsOptional() @IsInt() kmEntrada?: number;
  @IsOptional() @IsString() descricaoProblema?: string;
}
class UpdateOrdemDto extends PartialType(CreateOrdemDto) {
  @IsOptional() @IsEnum(StatusOS) status?: StatusOS;
}

@Injectable()
class OrdensService extends CrudService<unknown> {
  constructor(prisma: PrismaService) {
    super(
      prisma.ordemServico as never,
      { abertaEm: "desc" },
      { cliente: true, veiculo: true, mecanico: true },
    );
  }
}

// OS de apoio à movimentação: operação.
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("ordens")
class OrdensController {
  constructor(private readonly s: OrdensService) {}
  @Get() list() { return this.s.list(); }
  @Get(":id") get(@Param("id") id: string) { return this.s.get(id); }
  @Post() create(@Body() dto: CreateOrdemDto) { return this.s.create(dto); }
  @Patch(":id") update(@Param("id") id: string, @Body() dto: UpdateOrdemDto) { return this.s.update(id, dto); }
}

@Module({ controllers: [OrdensController], providers: [OrdensService] })
export class OrdensModule {}
