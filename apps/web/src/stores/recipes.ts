import { create } from "zustand";
import {
  Recipe,
  type RecipeType,
  type FilmSimulation,
} from "@latent/recipe-schema/browser";
import { z } from "zod";
import { recipeCameraImportKey } from "../lib/camera-preset-to-recipe";

const FAVORITES_KEY = "latent-favorites-v1";
const IMPORTED_RECIPES_KEY = "latent-imported-recipes-v1";
const HIDDEN_DEFAULT_RECIPES_KEY = "latent-hidden-default-recipes-v1";
const RECIPE_NAME_OVERRIDES_KEY = "latent-recipe-name-overrides-v1";

function loadNameOverrides(): Record<string, string> {
  try {
    if (typeof localStorage === "undefined") return {};
    const raw = localStorage.getItem(RECIPE_NAME_OVERRIDES_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) return {};
    return Object.fromEntries(
      Object.entries(parsed).filter(
        (entry): entry is [string, string] =>
          typeof entry[0] === "string" &&
          typeof entry[1] === "string" &&
          entry[1].trim().length > 0,
      ),
    );
  } catch {
    return {};
  }
}

function persistNameOverrides(overrides: Record<string, string>): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(RECIPE_NAME_OVERRIDES_KEY, JSON.stringify(overrides));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

function loadFavorites(): Set<string> {
  try {
    if (typeof localStorage === "undefined") return new Set();
    const raw = localStorage.getItem(FAVORITES_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistFavorites(favorites: Set<string>): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(FAVORITES_KEY, JSON.stringify(Array.from(favorites)));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

const RecipeFile = z.array(Recipe);

function loadImportedRecipes(): RecipeType[] {
  try {
    if (typeof localStorage === "undefined") return [];
    const raw = localStorage.getItem(IMPORTED_RECIPES_KEY);
    if (!raw) return [];
    const recipes = RecipeFile.parse(JSON.parse(raw));
    return dedupeImportedRecipes(recipes);
  } catch {
    return [];
  }
}

function persistImportedRecipes(recipes: RecipeType[]): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(IMPORTED_RECIPES_KEY, JSON.stringify(recipes));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

function loadHiddenDefaultIds(): Set<string> {
  try {
    if (typeof localStorage === "undefined") return new Set();
    const raw = localStorage.getItem(HIDDEN_DEFAULT_RECIPES_KEY);
    if (!raw) return new Set();
    const parsed: unknown = JSON.parse(raw);
    if (!Array.isArray(parsed)) return new Set();
    return new Set(parsed.filter((x): x is string => typeof x === "string"));
  } catch {
    return new Set();
  }
}

function persistHiddenDefaultIds(ids: Set<string>): void {
  try {
    if (typeof localStorage === "undefined") return;
    localStorage.setItem(HIDDEN_DEFAULT_RECIPES_KEY, JSON.stringify(Array.from(ids)));
  } catch {
    // ignore quota / privacy-mode failures
  }
}

function mergeRecipes(primary: RecipeType[], secondary: RecipeType[]): RecipeType[] {
  const seen = new Set<string>();
  const merged: RecipeType[] = [];
  for (const recipe of [...primary, ...secondary]) {
    if (seen.has(recipe.id)) continue;
    seen.add(recipe.id);
    merged.push(recipe);
  }
  return merged;
}

function dedupeImportedRecipes(recipes: RecipeType[]): RecipeType[] {
  const keyed = new Set<string>();
  const result: RecipeType[] = [];
  for (const recipe of recipes) {
    const key = recipeCameraImportKey(recipe) ?? `id:${recipe.id}`;
    if (keyed.has(key)) continue;
    keyed.add(key);
    result.push(recipe);
  }
  return result;
}

function upsertImportedRecipe(recipe: RecipeType, imported: RecipeType[]): RecipeType[] {
  const key = recipeCameraImportKey(recipe);
  if (!key) return mergeRecipes([recipe], imported);
  const existing = imported.find((candidate) => recipeCameraImportKey(candidate) === key);
  const nextRecipe = existing
    ? { ...recipe, id: existing.id, name: existing.name, createdAt: existing.createdAt }
    : recipe;
  return [nextRecipe, ...imported.filter((candidate) => recipeCameraImportKey(candidate) !== key)];
}

function dropBundledImports(imported: RecipeType[], seeds: RecipeType[]): RecipeType[] {
  const seedIds = new Set(seeds.map((recipe) => recipe.id));
  return imported.filter((recipe) => !seedIds.has(recipe.id));
}

function applyNameOverrides(recipes: RecipeType[]): RecipeType[] {
  const overrides = loadNameOverrides();
  return recipes.map((recipe) => {
    const name = overrides[recipe.id]?.trim();
    return name ? Recipe.parse({ ...recipe, name }) : recipe;
  });
}

export type FilmSimulationValue = z.infer<typeof FilmSimulation>;

export interface RecipesState {
  recipes: RecipeType[];
  loaded: boolean;
  loadError: string | null;
  favorites: Set<string>;
  hiddenDefaultIds: Set<string>;
  searchQuery: string;
  filmSimFilter: FilmSimulationValue | null;
  favoritesOnly: boolean;
  selectedRecipeId: string | null;

  loadSeedRecipes: () => Promise<void>;
  setRecipes: (recipes: RecipeType[]) => void;
  importRecipe: (recipe: RecipeType) => void;
  importRecipes: (recipes: RecipeType[]) => void;
  renameRecipe: (id: string, name: string) => void;
  deleteRecipe: (id: string) => void;
  resetRecipeLibrary: () => Promise<void>;
  setSearchQuery: (q: string) => void;
  setFilmSimFilter: (sim: FilmSimulationValue | null) => void;
  toggleFavoritesOnly: () => void;
  toggleFavorite: (id: string) => void;
  selectRecipe: (id: string | null) => void;
  getFilteredRecipes: () => RecipeType[];
}

const SeedFile = RecipeFile;

export const useRecipesStore = create<RecipesState>((set, get) => ({
  recipes: [],
  loaded: false,
  loadError: null,
  favorites: loadFavorites(),
  hiddenDefaultIds: loadHiddenDefaultIds(),
  searchQuery: "",
  filmSimFilter: null,
  favoritesOnly: false,
  selectedRecipeId: null,

  async loadSeedRecipes() {
    if (get().loaded) return;
    try {
      const mod = (await import("../../../../data/seed-recipes.json")) as {
        default: unknown;
      };
      const validated = SeedFile.parse(mod.default);
      const hiddenDefaultIds = loadHiddenDefaultIds();
      const imported = loadImportedRecipes();
      const userImports = dropBundledImports(imported, validated);
      if (userImports.length !== imported.length) persistImportedRecipes(userImports);
      const visibleSeeds = applyNameOverrides(
        validated.filter((recipe) => !hiddenDefaultIds.has(recipe.id)),
      );
      set({
        recipes: mergeRecipes(applyNameOverrides(userImports), visibleSeeds),
        loaded: true,
        loadError: null,
        hiddenDefaultIds,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loaded: true, loadError: message, recipes: [] });
    }
  },

  setRecipes(recipes) {
    set({ recipes: applyNameOverrides(recipes), loaded: true, loadError: null });
  },

  importRecipe(recipe) {
    get().importRecipes([recipe]);
  },

  importRecipes(recipes) {
    const bundledSeedIds = new Set(
      get()
        .recipes.filter((recipe) => recipe.tags.includes("latent-default"))
        .map((recipe) => recipe.id),
    );
    const parsedRecipes = recipes
      .map((recipe) => Recipe.parse(recipe))
      .filter((recipe) => !bundledSeedIds.has(recipe.id));
    if (parsedRecipes.length === 0) return;
    const inMemoryImports = get().recipes.filter((candidate) => recipeCameraImportKey(candidate));
    const imported = parsedRecipes.reduce(
      (acc, recipe) => upsertImportedRecipe(recipe, acc),
      mergeRecipes(inMemoryImports, loadImportedRecipes()),
    );
    const selected = imported[0]!;
    persistImportedRecipes(imported);
    set({
      recipes: mergeRecipes(
        imported,
        get().recipes.filter((candidate) => !recipeCameraImportKey(candidate)),
      ),
      loaded: true,
      loadError: null,
      selectedRecipeId: selected.id,
    });
  },

  renameRecipe(id, name) {
    const trimmed = name.trim();
    if (!trimmed) return;
    const recipe = get().recipes.find((candidate) => candidate.id === id);
    if (!recipe || recipe.name === trimmed) return;
    const renamed = Recipe.parse({ ...recipe, name: trimmed });

    if (recipe.tags.includes("latent-default")) {
      const overrides = loadNameOverrides();
      persistNameOverrides({ ...overrides, [id]: trimmed });
    } else {
      const imported = mergeRecipes(
        [renamed],
        loadImportedRecipes().filter((candidate) => candidate.id !== id),
      );
      persistImportedRecipes(imported);
    }

    set({
      recipes: get().recipes.map((candidate) => (candidate.id === id ? renamed : candidate)),
    });
  },

  deleteRecipe(id) {
    const recipe = get().recipes.find((candidate) => candidate.id === id);
    if (!recipe) return;

    const nextFavorites = new Set(get().favorites);
    nextFavorites.delete(id);
    persistFavorites(nextFavorites);

    if (recipe.tags.includes("latent-default")) {
      const hiddenDefaultIds = new Set(get().hiddenDefaultIds);
      hiddenDefaultIds.add(id);
      persistHiddenDefaultIds(hiddenDefaultIds);
      const recipes = get().recipes.filter((candidate) => candidate.id !== id);
      set({
        recipes,
        hiddenDefaultIds,
        favorites: nextFavorites,
        selectedRecipeId: get().selectedRecipeId === id ? (recipes[0]?.id ?? null) : get().selectedRecipeId,
      });
      return;
    }

    const imported = loadImportedRecipes().filter((candidate) => candidate.id !== id);
    persistImportedRecipes(imported);
    const recipes = get().recipes.filter((candidate) => candidate.id !== id);
    set({
      recipes,
      favorites: nextFavorites,
      selectedRecipeId: get().selectedRecipeId === id ? (recipes[0]?.id ?? null) : get().selectedRecipeId,
    });
  },

  async resetRecipeLibrary() {
    try {
      const mod = (await import("../../../../data/seed-recipes.json")) as {
        default: unknown;
      };
      const validated = SeedFile.parse(mod.default);
      persistImportedRecipes([]);
      persistHiddenDefaultIds(new Set());
      persistFavorites(new Set());
      persistNameOverrides({});
      set({
        recipes: validated,
        loaded: true,
        loadError: null,
        favorites: new Set(),
        hiddenDefaultIds: new Set(),
        selectedRecipeId: validated[0]?.id ?? null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loaded: true, loadError: message });
    }
  },

  setSearchQuery(q) {
    set({ searchQuery: q });
  },

  setFilmSimFilter(sim) {
    set({ filmSimFilter: sim });
  },

  toggleFavoritesOnly() {
    set({ favoritesOnly: !get().favoritesOnly });
  },

  toggleFavorite(id) {
    const next = new Set(get().favorites);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    persistFavorites(next);
    set({ favorites: next });
  },

  selectRecipe(id) {
    set({ selectedRecipeId: id });
  },

  getFilteredRecipes() {
    const { recipes, searchQuery, filmSimFilter, favoritesOnly, favorites } =
      get();
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      if (favoritesOnly && !favorites.has(r.id)) return false;
      if (filmSimFilter && r.filmSimulation !== filmSimFilter) return false;
      if (q) {
        const haystack = [
          r.name,
          r.description ?? "",
          r.filmSimulation,
          ...(r.tags ?? []),
        ]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  },
}));
