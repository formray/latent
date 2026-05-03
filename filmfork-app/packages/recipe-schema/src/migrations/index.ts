export function migrateRecipe(input: unknown): unknown {
  if (typeof input !== "object" || input === null || !("schemaVersion" in input)) {
    throw new Error("Recipe payload missing schemaVersion field");
  }
  const v = (input as { schemaVersion: unknown }).schemaVersion;
  if (v === 1) return input;
  // Future: chain v1→v2→v3 migrators here as schema evolves
  throw new Error(
    `Recipe schemaVersion ${String(v)} is newer than this FilmFork build supports. ` +
    `Please update FilmFork to read this recipe.`,
  );
}
