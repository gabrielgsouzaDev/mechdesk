// Tipos de domínio compartilhados pelo frontend (espelham a API).

// Papel = nível de ACESSO (quem loga). Funcionário não tem papel — tem cargo.
export type Papel = "ADMIN" | "ALMOXARIFADO";
export type TipoPessoa = "PF" | "PJ";
export type TipoControle = "RIGIDO" | "ESTOQUE_CHAO";
export type CategoriaProduto = "PECA" | "FERRAMENTA";
export type StatusEmprestimo = "ABERTO" | "DEVOLVIDO" | "PERDIDO";

export type Funcionario = {
  id: string;
  nome: string;
  cpf: string;
  cargo?: string | null;
  email?: string | null;
  ativo?: boolean;
};

export type Cliente = {
  id: string;
  tipo: TipoPessoa;
  razaoSocial: string;
  nomeFantasia?: string | null;
  cnpjCpf: string;
  telefone?: string | null;
  municipio?: string | null;
  uf?: string | null;
};

export type Veiculo = {
  id: string;
  placa: string;
  modelo: string;
  marca?: string | null;
  tipo?: string | null;
  clienteId: string;
  cliente?: Cliente;
};

export type Produto = {
  id: string;
  sku: string;
  descricao: string;
  localizacao?: string | null;
  precoCusto?: number | string;
  precoVenda: number | string;
  controle?: TipoControle;
  categoria?: CategoriaProduto;
  estoqueAtual: number;
  estoqueMinimo: number;
  ativo?: boolean;
};

export type OrdemServico = {
  id: string;
  numero: number;
  veiculoPlaca: string;
  veiculoModelo: string;
  cliente: string;
};

export type TipoMovimentacao = "ENTRADA" | "SAIDA" | "AJUSTE" | "EMPRESTIMO" | "DEVOLUCAO";

export type Movimentacao = {
  id: string;
  tipo: TipoMovimentacao;
  quantidade: number;
  saldoApos: number;
  motivo?: string | null;
  criadoEm: string; // ISO
  produto?: { sku: string; descricao: string };
  usuario?: { nome: string };
  ordemServico?: { numero: number; veiculo?: { placa: string } } | null;
  emprestimo?: { funcionario: { nome: string } } | null;
};

// Pendência de ferramenta: aberta na retirada, fechada por devolução ou perda.
export type Emprestimo = {
  id: string;
  produtoId: string;
  funcionarioId: string;
  quantidade: number;
  status: StatusEmprestimo;
  retiradoEm: string; // ISO
  prazoEm: string; // ISO
  devolvidoEm?: string | null;
  motivo?: string | null;
  motivoFechamento?: string | null;
  produto?: { sku: string; descricao: string };
  funcionario?: { nome: string; cargo?: string | null };
  usuarioRetirada?: { nome: string };
  usuarioFechamento?: { nome: string } | null;
};

export type Configuracao = {
  id: string;
  prazoEmprestimoHoras: number;
};
