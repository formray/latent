import { describe, expect, it } from "vitest";
import { TasteProfile } from "../src/taste-profile";

describe("TasteProfile schema (R5)", () => {
  const minimal = {
    schemaVersion: 1,
    enabled: false,
    createdAt: "2026-05-04T10:00:00Z",
    updatedAt: "2026-05-04T10:00:00Z",
    lastTouchedAt: "2026-05-04T10:00:00Z",
    preferredFilmSimulations: [],
    avoidedFilmSimulations: [],
    shootingContexts: [],
  };

  it("accepts an empty disabled profile", () => {
    expect(() => TasteProfile.parse(minimal)).not.toThrow();
  });

  it("defaults enabled to false (opt-in gate)", () => {
    const { enabled, ...withoutEnabled } = minimal;
    const parsed = TasteProfile.parse(withoutEnabled);
    expect(parsed.enabled).toBe(false);
  });

  it("rejects more than 10 preferred film simulations", () => {
    const bad = {
      ...minimal,
      preferredFilmSimulations: Array(11).fill("ClassicChrome"),
    };
    expect(() => TasteProfile.parse(bad)).toThrow();
  });

  it("rejects notes longer than 500 chars", () => {
    const bad = { ...minimal, notes: "x".repeat(501) };
    expect(() => TasteProfile.parse(bad)).toThrow();
  });

  it("rejects more than 8 shooting contexts", () => {
    const bad = {
      ...minimal,
      shootingContexts: Array(9).fill("portraits"),
    };
    expect(() => TasteProfile.parse(bad)).toThrow();
  });

  it("accepts all valid tonePreference enums", () => {
    for (const tone of ["warm", "neutral", "cool"] as const) {
      expect(() => TasteProfile.parse({ ...minimal, tonePreference: tone })).not.toThrow();
    }
  });
});
