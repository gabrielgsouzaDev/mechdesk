import { Injectable, Module } from "@nestjs/common";
import { Controller, Get, Post, Patch, Param, Body } from "@nestjs/common";
import { IsEnum, IsInt, IsOptional, IsString, IsUUID } from "class-validator";
import { PartialType } from "@nestjs/mapped-types";
import type { Usuario } from "@lf/db";
import { PrismaService } from "../prisma/prisma.service";
import { CrudService } from "../common/crud.service";
import { CurrentUsuario, Permissao, Roles } from "../auth/decorators";

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
// Multi-tenant: o escopo é sempre u.tenantId (do JWT), nunca do cliente.
@Roles("ADMIN", "ALMOXARIFADO")
@Controller("ordens")
class OrdensController {
  constructor(private readonly s: OrdensService) {}
  // Recurso "movimentacao": as OS aqui são apoio ao console de saída.
  @Permissao("movimentacao", "VER") @Get() list(@CurrentUsuario() u: Usuario) { return this.s.list(u.tenantId); }
  @Permissao("movimentacao", "VER") @Get(":id") get(@CurrentUsuario() u: Usuario, @Param("id") id: string) { return this.s.get(u.tenantId, id); }
  @Permissao("movimentacao", "CRIAR") @Post() create(@CurrentUsuario() u: Usuario, @Body() dto: CreateOrdemDto) { return this.s.create(u.tenantId, dto); }
  @Permissao("movimentacao", "EDITAR") @Patch(":id") update(@CurrentUsuario() u: Usuario, @Param("id") id: string, @Body() dto: UpdateOrdemDto) { return this.s.update(u.tenantId, id, dto); }
}

@Module({ controllers: [OrdensController], providers: [OrdensService] })
export class OrdensModule {}
