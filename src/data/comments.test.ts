import { describe, it, expect } from "vitest";
import { mapActionComment } from "./comments";

describe("mapActionComment", () => {
  it("traduce una fila de Prisma a la ActionComment de dominio", () => {
    const row = {
      id: "cmt_1",
      actionId: "act_billing_refund",
      authorId: "usr_reviewer",
      body: "Confirmado con el cliente por email.",
      createdAt: new Date("2026-01-01T00:00:00.000Z"),
    };

    expect(mapActionComment(row)).toEqual({
      id: "cmt_1",
      actionId: "act_billing_refund",
      authorId: "usr_reviewer",
      body: "Confirmado con el cliente por email.",
      createdAt: "2026-01-01T00:00:00.000Z",
    });
  });
});
