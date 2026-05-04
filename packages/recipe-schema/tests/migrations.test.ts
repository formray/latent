import { describe, expect, it } from "vitest";
import { migrateRecipe } from "../src/migrations";

describe("Schema migrations", () => {
  it("returns a v1 recipe unchanged", () => {
    const input = { schemaVersion: 1, foo: "bar" };
    expect(migrateRecipe(input)).toEqual(input);
  });

  it("rejects an unknown future schema version", () => {
    const input = { schemaVersion: 99 };
    expect(() => migrateRecipe(input)).toThrow(/update Latent/i);
  });

  it("rejects payload with no schemaVersion", () => {
    expect(() => migrateRecipe({})).toThrow();
  });
});
