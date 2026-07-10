// Base CRUD genérica sobre um "delegate" do Prisma (prisma.cliente, prisma.produto…).
// Mantém os módulos de cadastro enxutos e consistentes.
type PrismaDelegate = {
  findMany: (args?: unknown) => Promise<unknown>;
  findUnique: (args: unknown) => Promise<unknown>;
  create: (args: unknown) => Promise<unknown>;
  update: (args: unknown) => Promise<unknown>;
  delete: (args: unknown) => Promise<unknown>;
};

export class CrudService<T> {
  constructor(
    private readonly model: PrismaDelegate,
    private readonly orderBy?: Record<string, "asc" | "desc">,
    private readonly include?: Record<string, boolean>,
  ) {}

  list(): Promise<T[]> {
    return this.model.findMany({ orderBy: this.orderBy, include: this.include }) as Promise<T[]>;
  }

  get(id: string): Promise<T | null> {
    return this.model.findUnique({ where: { id }, include: this.include }) as Promise<T | null>;
  }

  create(data: unknown): Promise<T> {
    return this.model.create({ data }) as Promise<T>;
  }

  update(id: string, data: unknown): Promise<T> {
    return this.model.update({ where: { id }, data }) as Promise<T>;
  }

  remove(id: string): Promise<T> {
    return this.model.delete({ where: { id } }) as Promise<T>;
  }
}
