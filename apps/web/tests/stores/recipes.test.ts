import { describe, it, expect, beforeEach } from "vitest";
import { useRecipesStore } from "../../src/stores/recipes";
import type { RecipeType } from "@latent/recipe-schema/browser";

const sampleRecipe = (overrides: Partial<RecipeType> = {}): RecipeType => ({
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 1,
  name: "Sample warm chrome",
  description: "Test recipe",
  author: "Latent",
  tags: ["test", "warm"],
  createdAt: "2026-05-04T10:00:00.000Z",
  capabilitySetId: "x-s20-fw1.10",
  cameraModel: "X-S20",
  filmSimulation: "ClassicChrome",
  dynamicRange: "DR200",
  whiteBalance: { mode: "Daylight", shiftR: 1, shiftB: 0 },
  highlightTone: 0,
  shadowTone: 0,
  color: 0,
  sharpness: 0,
  noiseReduction: -3,
  clarity: 0,
  grainEffect: { strength: "Off", size: "Small" },
  colorChromeEffect: "Weak",
  colorChromeEffectBlue: "Weak",
  ...overrides,
});

describe("useRecipesStore", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
    useRecipesStore.setState({
      recipes: [],
      loaded: false,
      loadError: null,
      favorites: new Set(),
      searchQuery: "",
      filmSimFilter: null,
      favoritesOnly: false,
      selectedRecipeId: null,
    });
  });

  it("filters recipes by search query in name and tags", () => {
    const a = sampleRecipe({
      id: "11111111-1111-4111-8111-111111111111",
      name: "Warm Chrome",
    });
    const b = sampleRecipe({
      id: "22222222-2222-4222-8222-222222222222",
      name: "Cool Chrome",
      tags: ["cool"],
    });
    useRecipesStore.getState().setRecipes([a, b]);
    useRecipesStore.getState().setSearchQuery("warm");
    expect(useRecipesStore.getState().getFilteredRecipes()).toHaveLength(1);
    expect(useRecipesStore.getState().getFilteredRecipes()[0]?.name).toBe(
      "Warm Chrome",
    );
  });

  it("filters by film simulation", () => {
    const a = sampleRecipe({
      id: "11111111-1111-4111-8111-111111111111",
      filmSimulation: "ClassicChrome",
    });
    const b = sampleRecipe({
      id: "22222222-2222-4222-8222-222222222222",
      filmSimulation: "VelviaVivid",
    });
    useRecipesStore.getState().setRecipes([a, b]);
    useRecipesStore.getState().setFilmSimFilter("VelviaVivid");
    const filtered = useRecipesStore.getState().getFilteredRecipes();
    expect(filtered).toHaveLength(1);
    expect(filtered[0]?.filmSimulation).toBe("VelviaVivid");
  });

  it("toggles favourites and persists them to localStorage", () => {
    const r = sampleRecipe();
    useRecipesStore.getState().setRecipes([r]);
    useRecipesStore.getState().toggleFavorite(r.id);
    expect(useRecipesStore.getState().favorites.has(r.id)).toBe(true);
    const stored = localStorage.getItem("latent-favorites-v1");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored ?? "[]")).toContain(r.id);

    useRecipesStore.getState().toggleFavorite(r.id);
    expect(useRecipesStore.getState().favorites.has(r.id)).toBe(false);
  });

  it("favouritesOnly filter narrows the list", () => {
    const a = sampleRecipe({ id: "11111111-1111-4111-8111-111111111111" });
    const b = sampleRecipe({ id: "22222222-2222-4222-8222-222222222222" });
    useRecipesStore.getState().setRecipes([a, b]);
    useRecipesStore.getState().toggleFavorite(a.id);
    useRecipesStore.getState().toggleFavoritesOnly();
    expect(useRecipesStore.getState().getFilteredRecipes()).toHaveLength(1);
    expect(useRecipesStore.getState().getFilteredRecipes()[0]?.id).toBe(a.id);
  });

  it("imports a camera recipe, selects it, and persists it separately from seed data", () => {
    const imported = sampleRecipe({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Camera C2",
      tags: ["camera-import", "x-m5", "c2"],
      dynamicRange: "DRAuto",
      cameraModel: "X-M5",
      capabilitySetId: "x-m5-fw1.20",
    });

    useRecipesStore.getState().setRecipes([sampleRecipe()]);
    useRecipesStore.getState().importRecipe(imported);

    expect(useRecipesStore.getState().recipes[0]?.name).toBe("Camera C2");
    expect(useRecipesStore.getState().selectedRecipeId).toBe(imported.id);
    const stored = localStorage.getItem("latent-imported-recipes-v1");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored ?? "[]")[0]?.name).toBe("Camera C2");
  });

  it("re-importing the same camera slot updates the existing imported recipe instead of duplicating it", () => {
    const first = sampleRecipe({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Camera C2",
      author: "Camera import",
      tags: ["camera-import", "x-m5", "c2"],
      dynamicRange: "DRAuto",
      cameraModel: "X-M5",
      capabilitySetId: "x-m5-fw1.20",
      color: 3,
    });
    const second = sampleRecipe({
      ...first,
      id: "55555555-5555-4555-8555-555555555555",
      color: 4,
    });

    useRecipesStore.getState().setRecipes([sampleRecipe()]);
    useRecipesStore.getState().importRecipe(first);
    useRecipesStore.getState().importRecipe(second);

    const imported = useRecipesStore
      .getState()
      .recipes.filter((recipe) => recipe.tags.includes("camera-import"));
    expect(imported).toHaveLength(1);
    expect(imported[0]?.id).toBe(first.id);
    expect(imported[0]?.color).toBe(4);
    expect(useRecipesStore.getState().selectedRecipeId).toBe(first.id);
  });

  it("deduplicates existing persisted camera imports on load", async () => {
    const first = sampleRecipe({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Camera C2",
      author: "Camera import",
      tags: ["camera-import", "x-m5", "c2"],
      dynamicRange: "DRAuto",
      cameraModel: "X-M5",
      capabilitySetId: "x-m5-fw1.20",
    });
    const duplicate = sampleRecipe({
      ...first,
      id: "55555555-5555-4555-8555-555555555555",
    });
    localStorage.setItem("latent-imported-recipes-v1", JSON.stringify([first, duplicate]));

    await useRecipesStore.getState().loadSeedRecipes();

    const imported = useRecipesStore
      .getState()
      .recipes.filter((recipe) => recipe.tags.includes("camera-import"));
    expect(imported).toHaveLength(1);
    expect(imported[0]?.id).toBe(first.id);
  });
});
