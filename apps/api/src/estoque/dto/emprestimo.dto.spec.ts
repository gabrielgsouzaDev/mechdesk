import { describe, expect, test } from "vitest";
import { plainToInstance } from "class-transformer";
import { validate } from "class-validator";
import { ListarEmprestimosQueryDto } from "./emprestimo.dto";

// O parâmetro ?status= vem da URL: sem validação estrita, qualquer string
// chegaria ao Prisma (hoje mascarada com `as never`). O DTO garante que só
// os valores do enum StatusEmprestimo passam do ValidationPipe global.
async function validar(query: Record<string, unknown>) {
  const dto = plainToInstance(ListarEmprestimosQueryDto, query);
  return validate(dto);
}

describe("ListarEmprestimosQueryDto", () => {
  test("sem status é válido (lista tudo)", async () => {
    expect(await validar({})).toHaveLength(0);
  });

  test.each(["ABERTO", "DEVOLVIDO", "PERDIDO"])("status %s é válido", async (status) => {
    expect(await validar({ status })).toHaveLength(0);
  });

  test("status fora do enum é rejeitado", async () => {
    const erros = await validar({ status: "XYZ" });
    expect(erros).toHaveLength(1);
    expect(erros[0].property).toBe("status");
  });

  test("status minúsculo é rejeitado (enum é estrito)", async () => {
    expect(await validar({ status: "aberto" })).toHaveLength(1);
  });
});
