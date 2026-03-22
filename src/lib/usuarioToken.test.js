import { describe, it, expect } from "vitest";
import {
  normalizarTokenAcceso,
  leerTokenDesdeUsuario,
  usuarioTieneTokenValido,
  TOKEN_FIELDS_FIRESTORE,
} from "./usuarioToken.js";

describe("normalizarTokenAcceso", () => {
  it("quita no alfanuméricos y limita a 3", () => {
    expect(normalizarTokenAcceso("a-b1")).toBe("ab1");
    expect(normalizarTokenAcceso("XYZ9")).toBe("XYZ");
  });
  it("acepta vacío", () => {
    expect(normalizarTokenAcceso("")).toBe("");
  });
});

describe("leerTokenDesdeUsuario", () => {
  it("prioriza tokenAcceso", () => {
    expect(
      leerTokenDesdeUsuario({ tokenAcceso: "ab1", password: "zzz" })
    ).toBe("ab1");
  });
  it("lee password si falta tokenAcceso", () => {
    expect(leerTokenDesdeUsuario({ password: "xY2" })).toBe("xY2");
  });
  it("lee token o codigoAcceso", () => {
    expect(leerTokenDesdeUsuario({ token: "mM9" })).toBe("mM9");
    expect(leerTokenDesdeUsuario({ codigoAcceso: "12a" })).toBe("12a");
  });
  it("lee codigo al final de la lista", () => {
    expect(leerTokenDesdeUsuario({ codigo: "Q1w" })).toBe("Q1w");
  });
  it("valor de 2 caracteres se devuelve sin rellenar (el panel exige 3 al guardar)", () => {
    expect(leerTokenDesdeUsuario({ password: "mm" })).toBe("mm");
  });
  it("documento vacío", () => {
    expect(leerTokenDesdeUsuario({})).toBe("");
    expect(leerTokenDesdeUsuario(null)).toBe("");
  });
});

describe("usuarioTieneTokenValido", () => {
  it("true solo con 3 caracteres normalizados", () => {
    expect(usuarioTieneTokenValido({ tokenAcceso: "abc" })).toBe(true);
    expect(usuarioTieneTokenValido({ password: "mm" })).toBe(false);
  });
});

describe("TOKEN_FIELDS_FIRESTORE", () => {
  it("tokenAcceso va primero", () => {
    expect(TOKEN_FIELDS_FIRESTORE[0]).toBe("tokenAcceso");
  });
});
