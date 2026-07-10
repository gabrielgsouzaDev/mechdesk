// Decimais do Prisma chegam como string no JSON — Number() normaliza ambos os modos.
export const brl = (n: number | string) =>
  Number(n).toLocaleString("pt-BR", { style: "currency", currency: "BRL" });

export const horaCurta = (d: Date | string = new Date()) =>
  new Date(d).toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
