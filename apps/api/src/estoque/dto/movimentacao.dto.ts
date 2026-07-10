import { IsEnum, IsInt, IsOptional, IsString, IsUUID, Min } from "class-validator";

export enum TipoMovimentacao {
  ENTRADA = "ENTRADA",
  SAIDA = "SAIDA",
  AJUSTE = "AJUSTE",
}

export class MovimentacaoDto {
  @IsUUID()
  produtoId!: string;

  @IsInt()
  @Min(0)
  quantidade!: number;

  @IsEnum(TipoMovimentacao)
  tipo!: TipoMovimentacao;

  // funcionarioId NÃO vem do cliente: o AuthGuard resolve do JWT (Zero Trust).

  @IsOptional()
  @IsUUID()
  ordemServicoId?: string;

  @IsOptional()
  @IsString()
  motivo?: string;
}
