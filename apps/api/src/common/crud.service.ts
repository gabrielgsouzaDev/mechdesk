import { NotFoundException } from "@nestjs/common";

// Base CRUD genérica sobre um "delegate" do Prisma (prisma.cliente, prisma.produto…).
// Mantém os módulos de cadastro enxutos e consistentes.
//
// MULTI-TENANT: todo método exige o tenantId do CHAMADOR (resolvido do JWT
// pelo AuthGuard — nunca do body/query). O isolamento usa a forma mais
// estrita do Prisma:
//   - leitura via findFirst/findMany com { tenantId } no where;
//   - escrita via updateMany/deleteMany com { id, tenantId } — um id de
//     outro tenant resulta em count 0 → 404, indistinguível de inexistente.
type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<unknown>;
  findFirst: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  updateMany: (args: unknown) => Promise<{ count: number }>;
  deleteMany: (args: unknown) => Promise<{ count: number }>;
};

export class CrudService<T> {
  constructor(
    private readonly model: PrismaDelegate,
    private readonly orderBy?: Record<string, "asc" | "desc">,
    private readonly include?: Record<string, boolean>,
  ) {}

  list(tenantId: string): Promise<T[]> {
    return this.model.findMany({
      where: { tenantId },
      orderBy: this.orderBy,
      include: this.include,
    }) as Promise<T[]>;
  }

  get(tenantId: string, id: string): Promise<T | null> {
    return this.model.findFirst({
      where: { id, tenantId },
      include: this.include,
    }) as Promise<T | null>;
  }

  create(tenantId: string, data: unknown): Promise<T> {
    // tenantId por último: sobrescreve qualquer tentativa de forjar o dono no payload.
    return this.model.create({ data: { ...(data as object), tenantId } }) as Promise<T>;
  }

  async update(tenantId: string, id: string, data: unknown): Promise<T> {
    const { count } = await this.model.updateMany({ where: { id, tenantId }, data });
    if (count === 0) throw new NotFoundException("Registro não encontrado.");
    return this.get(tenantId, id) as Promise<T>;
  }

  async remove(tenantId: string, id: string): Promise<{ id: string }> {
    const { count } = await this.model.deleteMany({ where: { id, tenantId } });
    if (count === 0) throw new NotFoundException("Registro não encontrado.");
    return { id };
  }
}
