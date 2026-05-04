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
    ? { ...recipe, id: existing.id, createdAt: existing.createdAt }
    : recipe;
  return [nextRecipe, ...imported.filter((candidate) => recipeCameraImportKey(candidate) !== key)];
}

function dropBundledImports(imported: RecipeType[], seeds: RecipeType[]): RecipeType[] {
  const seedIds = new Set(seeds.map((recipe) => recipe.id));
  return imported.filter((recipe) => !seedIds.has(recipe.id));
}

export type FilmSimulationValue = z.infer<typeof FilmSimulation>;

export interface RecipesState {
  recipes: RecipeType[];
  loaded: boolean;
  loadError: string | null;
  favorites: Set<string>;
  searchQuery: string;
  filmSimFilter: FilmSimulationValue | null;
  favoritesOnly: boolean;
  selectedRecipeId: string | null;

  loadSeedRecipes: () => Promise<void>;
  setRecipes: (recipes: RecipeType[]) => void;
  importRecipe: (recipe: RecipeType) => void;
  importRecipes: (recipes: RecipeType[]) => void;
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
      const imported = loadImportedRecipes();
      const userImports = dropBundledImports(imported, validated);
      if (userImports.length !== imported.length) persistImportedRecipes(userImports);
      set({ recipes: mergeRecipes(userImports, validated), loaded: true, loadError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loaded: true, loadError: message, recipes: [] });
    }
  },

  setRecipes(recipes) {
    set({ recipes, loaded: true, loadError: null });
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
