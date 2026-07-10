// Dados de demonstração — usados no modo "demo" (sem backend) para avaliar
// as telas. No modo "live" tudo vem da API. Tipos em ./types.
import type {
  Produto, OrdemServico, Cliente, Veiculo, Funcionario, Movimentacao, Emprestimo, Configuracao,
} from "./types";

// Operador logado (quem registra as movimentações).
export const OPERADOR = { id: "f-001", nome: "Marina (Almoxarifado)" };

export const PRODUTOS_MOCK: Produto[] = [
  { id: "p1", sku: "PAT-001", descricao: "Patinho de freio caminhão", localizacao: "A-12", precoVenda: 89.9, estoqueAtual: 24, estoqueMinimo: 10, controle: "RIGIDO", categoria: "PECA" },
  { id: "p2", sku: "LON-002", descricao: "Lona de freio dianteira", localizacao: "A-14", precoVenda: 120, estoqueAtual: 7, estoqueMinimo: 8, controle: "RIGIDO", categoria: "PECA" },
  { id: "p3", sku: "TAM-003", descricao: "Tambor de freio traseiro", localizacao: "B-03", precoVenda: 480, estoqueAtual: 5, estoqueMinimo: 4, controle: "RIGIDO", categoria: "PECA" },
  { id: "p4", sku: "CUI-004", descricao: "Cuíca de freio 24", localizacao: "B-07", precoVenda: 210, estoqueAtual: 12, estoqueMinimo: 6, controle: "RIGIDO", categoria: "PECA" },
  { id: "p5", sku: "FLU-005", descricao: "Fluido de freio DOT4 (L)", localizacao: "C-01", precoVenda: 39.9, estoqueAtual: 3, estoqueMinimo: 8, controle: "ESTOQUE_CHAO", categoria: "PECA" },
  { id: "p6", sku: "KIT-006", descricao: "Kit reparo pinça", localizacao: "C-05", precoVenda: 155, estoqueAtual: 18, estoqueMinimo: 5, controle: "RIGIDO", categoria: "PECA" },
  { id: "p7", sku: "MAN-007", descricao: "Mangueira de ar freio", localizacao: "D-02", precoVenda: 64.5, estoqueAtual: 9, estoqueMinimo: 6, controle: "RIGIDO", categoria: "PECA" },
  { id: "p8", sku: "VAL-008", descricao: "Válvula reguladora", localizacao: "D-09", precoVenda: 298, estoqueAtual: 6, estoqueMinimo: 4, controle: "RIGIDO", categoria: "PECA" },
  { id: "p9", sku: "FER-101", descricao: "Macaco hidráulico 20t", localizacao: "E-01", precoVenda: 890, estoqueAtual: 3, estoqueMinimo: 1, controle: "RIGIDO", categoria: "FERRAMENTA" },
  { id: "p10", sku: "FER-102", descricao: "Chave de impacto pneumática", localizacao: "E-02", precoVenda: 620, estoqueAtual: 2, estoqueMinimo: 1, controle: "RIGIDO", categoria: "FERRAMENTA" },
  { id: "p11", sku: "FER-103", descricao: "Torquímetro 1/2\"", localizacao: "E-03", precoVenda: 340, estoqueAtual: 2, estoqueMinimo: 1, controle: "RIGIDO", categoria: "FERRAMENTA" },
];

export const ORDENS_MOCK: OrdemServico[] = [
  { id: "os1", numero: 1042, veiculoPlaca: "RTA-7G21", veiculoModelo: "Scania R450", cliente: "Transportadora Andrade" },
  { id: "os2", numero: 1043, veiculoPlaca: "MWB-2D88", veiculoModelo: "Volvo FH 540", cliente: "Frota Bandeirantes" },
  { id: "os3", numero: 1044, veiculoPlaca: "QXP-9011", veiculoModelo: "Mercedes Axor", cliente: "Logística Sul" },
];

const agora = Date.now();
const min = (m: number) => new Date(agora - m * 60_000).toISOString();

export const MOVIMENTACOES_MOCK: Movimentacao[] = [
  { id: "m1", tipo: "SAIDA", quantidade: 2, saldoApos: 24, criadoEm: min(8), produto: { sku: "PAT-001", descricao: "Patinho de freio caminhão" }, usuario: { nome: "Marina" }, ordemServico: { numero: 1042, veiculo: { placa: "RTA-7G21" } } },
  { id: "m2", tipo: "ENTRADA", quantidade: 20, saldoApos: 26, criadoEm: min(45), motivo: "Recebimento fornecedor", produto: { sku: "PAT-001", descricao: "Patinho de freio caminhão" }, usuario: { nome: "Marina" }, ordemServico: null },
  { id: "m3", tipo: "SAIDA", quantidade: 1, saldoApos: 7, criadoEm: min(120), produto: { sku: "LON-002", descricao: "Lona de freio dianteira" }, usuario: { nome: "Marina" }, ordemServico: { numero: 1043, veiculo: { placa: "MWB-2D88" } } },
  { id: "m4", tipo: "AJUSTE", quantidade: 3, saldoApos: 3, criadoEm: min(200), motivo: "Contagem cíclica", produto: { sku: "FLU-005", descricao: "Fluido de freio DOT4 (L)" }, usuario: { nome: "Marina" }, ordemServico: null },
];

export const CLIENTES_MOCK: Cliente[] = [
  { id: "c1", tipo: "PJ", razaoSocial: "Transportadora Andrade Ltda", nomeFantasia: "Andrade Log", cnpjCpf: "12345678000190", telefone: "(11) 4002-8922", municipio: "Guarulhos", uf: "SP" },
  { id: "c2", tipo: "PJ", razaoSocial: "Frota Bandeirantes S.A.", nomeFantasia: "Bandeirantes", cnpjCpf: "98765432000110", telefone: "(11) 3030-1010", municipio: "Osasco", uf: "SP" },
  { id: "c3", tipo: "PF", razaoSocial: "José Carlos Pereira", cnpjCpf: "11122233344", telefone: "(11) 99888-7766", municipio: "São Paulo", uf: "SP" },
];

export const VEICULOS_MOCK: Veiculo[] = [
  { id: "v1", placa: "RTA-7G21", modelo: "Scania R450", marca: "Scania", tipo: "CAVALO", clienteId: "c1" },
  { id: "v2", placa: "MWB-2D88", modelo: "Volvo FH 540", marca: "Volvo", tipo: "CAVALO", clienteId: "c2" },
  { id: "v3", placa: "QXP-9011", modelo: "Mercedes Axor", marca: "Mercedes-Benz", tipo: "CAMINHAO", clienteId: "c3" },
];

export const FUNCIONARIOS_MOCK: Funcionario[] = [
  { id: "f-001", nome: "Marina Souza", cpf: "10020030040", cargo: "Almoxarife", email: "marina@lucianofreios.com", ativo: true },
  { id: "f-002", nome: "Roberto Lima", cpf: "20030040050", cargo: "Mecânico", ativo: true },
  { id: "f-003", nome: "Luciano (Dono)", cpf: "30040050060", cargo: "Proprietário", email: "luciano@lucianofreios.com", ativo: true },
  { id: "f-004", nome: "Patrícia Alves", cpf: "40050060070", cargo: "Secretária", ativo: true },
];

const horas = (h: number) => new Date(agora - h * 3_600_000).toISOString();

export const EMPRESTIMOS_MOCK: Emprestimo[] = [
  {
    id: "e1", produtoId: "p9", funcionarioId: "f-002", quantidade: 1, status: "ABERTO",
    retiradoEm: horas(30), prazoEm: horas(6), // 30h atrás, prazo de 24h já venceu há 6h
    produto: { sku: "FER-101", descricao: "Macaco hidráulico 20t" },
    funcionario: { nome: "Roberto Lima", cargo: "Mecânico" },
    usuarioRetirada: { nome: "Marina" },
  },
  {
    id: "e2", produtoId: "p10", funcionarioId: "f-002", quantidade: 1, status: "ABERTO",
    retiradoEm: horas(3), prazoEm: horas(-21), // dentro do prazo
    produto: { sku: "FER-102", descricao: "Chave de impacto pneumática" },
    funcionario: { nome: "Roberto Lima", cargo: "Mecânico" },
    usuarioRetirada: { nome: "Marina" },
  },
];

export const CONFIG_MOCK: Configuracao = { id: "default", prazoEmprestimoHoras: 24 };

