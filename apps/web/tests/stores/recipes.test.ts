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
      hiddenDefaultIds: new Set(),
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

  it("drops persisted imports that are now bundled as seed recipes", async () => {
    const oldHtmlImport = sampleRecipe({
      id: "f802c137-99c2-4058-8174-c35396bcd79d",
      name: "Cinematic B&W",
      author: "Casey Herzawg",
      tags: ["fujifilm-recipes", "black-white", "acros-r-filter"],
      filmSimulation: "AcrosR",
    });
    localStorage.setItem("latent-imported-recipes-v1", JSON.stringify([oldHtmlImport]));

    await useRecipesStore.getState().loadSeedRecipes();

    expect(useRecipesStore.getState().recipes[0]?.name).toBe("Silver Screen Mono");
    expect(localStorage.getItem("latent-imported-recipes-v1")).toBe("[]");
  });

  it("ignores file imports that are already available as bundled defaults", async () => {
    await useRecipesStore.getState().loadSeedRecipes();
    const before = useRecipesStore.getState().recipes.length;
    const duplicateDefault = sampleRecipe({
      id: "f802c137-99c2-4058-8174-c35396bcd79d",
      name: "Cinematic B&W",
      author: "Casey Herzawg",
      tags: ["fujifilm-recipes", "black-white", "acros-r-filter"],
      filmSimulation: "AcrosR",
    });

    useRecipesStore.getState().importRecipe(duplicateDefault);

    expect(useRecipesStore.getState().recipes).toHaveLength(before);
    expect(useRecipesStore.getState().recipes[0]?.name).toBe("Silver Screen Mono");
    expect(localStorage.getItem("latent-imported-recipes-v1")).toBeNull();
  });

  it("deletes imported recipes from memory and localStorage", () => {
    const imported = sampleRecipe({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Camera C2",
      tags: ["camera-import", "x-m5", "c2"],
    });
    useRecipesStore.getState().setRecipes([imported, sampleRecipe()]);
    useRecipesStore.getState().importRecipe(imported);

    useRecipesStore.getState().deleteRecipe(imported.id);

    expect(useRecipesStore.getState().recipes.some((recipe) => recipe.id === imported.id)).toBe(false);
    expect(localStorage.getItem("latent-imported-recipes-v1")).toBe("[]");
  });

  it("hides bundled defaults without deleting them from the app bundle", async () => {
    await useRecipesStore.getState().loadSeedRecipes();
    const defaultRecipe = useRecipesStore.getState().recipes[0]!;

    useRecipesStore.getState().deleteRecipe(defaultRecipe.id);

    expect(useRecipesStore.getState().recipes.some((recipe) => recipe.id === defaultRecipe.id)).toBe(false);
    expect(JSON.parse(localStorage.getItem("latent-hidden-default-recipes-v1") ?? "[]")).toContain(
      defaultRecipe.id,
    );
  });

  it("factory reset clears imports and hidden defaults, then restores bundled defaults", async () => {
    await useRecipesStore.getState().loadSeedRecipes();
    const defaultRecipe = useRecipesStore.getState().recipes[0]!;
    const imported = sampleRecipe({
      id: "44444444-4444-4444-8444-444444444444",
      name: "Camera C2",
      tags: ["camera-import", "x-m5", "c2"],
    });
    useRecipesStore.getState().importRecipe(imported);
    useRecipesStore.getState().deleteRecipe(defaultRecipe.id);
    useRecipesStore.getState().toggleFavorite(imported.id);

    await useRecipesStore.getState().resetRecipeLibrary();

    expect(useRecipesStore.getState().recipes).toHaveLength(49);
    expect(useRecipesStore.getState().recipes[0]?.id).toBe(defaultRecipe.id);
    expect(useRecipesStore.getState().favorites).toHaveLength(0);
    expect(localStorage.getItem("latent-imported-recipes-v1")).toBe("[]");
    expect(localStorage.getItem("latent-hidden-default-recipes-v1")).toBe("[]");
    expect(localStorage.getItem("latent-favorites-v1")).toBe("[]");
  });
});
