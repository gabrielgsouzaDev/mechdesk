import { IsInt, IsOptional, IsPositive, IsString, IsUUID } from "class-validator";

export class EmprestimoDto {
  @IsUUID()
  produtoId!: string;

  @IsUUID()
  funcionarioId!: string;

  @IsInt()
  @IsPositive()
  quantidade!: number;

  // O prazo NÃO é aceito do cliente: a RPC usa sempre o padrão configurado
  // pelo Admin (decisão da Avaliação 02 — a responsabilidade do prazo é dele).
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class DevolucaoDto {
  @IsOptional()
  @IsString()
  motivo?: string;
}

export class PerdaDto {
  @IsString()
  motivo!: string;
}

export class ConfiguracaoDto {
  @IsInt()
  @IsPositive()
  prazoEmprestimoHoras!: number;
}
