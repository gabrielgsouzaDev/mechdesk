import { Body, Controller, Get, Patch } from "@nestjs/common";
import { Type } from "class-transformer";
import {
  ArrayMaxSize,
  ArrayMinSize,
  IsArray,
  IsBoolean,
  IsIn,
  ValidateNested,
} from "class-validator";
import type { Usuario, PapelUsuario } from "@lf/db";
import { CurrentUsuario, Permissao, Roles } from "../auth/decorators";
import { PermissoesService } from "./permissoes.service";
import { ACOES, RECURSOS, type Acao, type Recurso } from "./permissoes.constants";

const PAPEIS = ["ADMIN", "ALMOXARIFADO"] as const;

export class AlteracaoPermissaoDto {
  @IsIn(PAPEIS)
  papel!: PapelUsuario;

  @IsIn(RECURSOS)
  recurso!: Recurso;

  @IsIn(ACOES)
  acao!: Acao;

  @IsBoolean()
  permitido!: boolean;
}

export class AtualizarPermissoesDto {
  @IsArray()
  @ArrayMinSize(1)
  @ArrayMaxSize(64) // teto: a matriz inteira tem 2 papéis × 7 recursos × 4 ações
  @ValidateNested({ each: true })
  @Type(() => AlteracaoPermissaoDto)
  alteracoes!: AlteracaoPermissaoDto[];
}

// Gestão da matriz de permissões — exclusiva do dono. O @Roles é o teto
// estático; o @Permissao("admin", …) passa pela trava anti-lockout do
// serviço (sempre e somente ADMIN, o banco não muda isso).
@Roles("ADMIN")
@Controller("permissoes")
export class PermissoesController {
  constructor(private readonly permissoes: PermissoesService) {}

  @Get()
  @Permissao("admin", "VER")
  listar(@CurrentUsuario() u: Usuario) {
    return this.permissoes.listar(u.tenantId);
  }

  @Patch()
  @Permissao("admin", "EDITAR")
  atualizar(@Body() dto: AtualizarPermissoesDto, @CurrentUsuario() u: Usuario) {
    return this.permissoes.atualizar(u.tenantId, u.id, dto.alteracoes);
  }

  @Get("log")
  @Permissao("admin", "VER")
  log(@CurrentUsuario() u: Usuario) {
    return this.permissoes.listarLog(u.tenantId);
  }
}
