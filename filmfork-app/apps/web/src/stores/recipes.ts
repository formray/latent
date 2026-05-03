import { create } from "zustand";
import {
  Recipe,
  type RecipeType,
  type FilmSimulation,
} from "@filmfork/recipe-schema/browser";
import { z } from "zod";

const FAVORITES_KEY = "filmfork-favorites-v1";

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
  setSearchQuery: (q: string) => void;
  setFilmSimFilter: (sim: FilmSimulationValue | null) => void;
  toggleFavoritesOnly: () => void;
  toggleFavorite: (id: string) => void;
  selectRecipe: (id: string | null) => void;
  getFilteredRecipes: () => RecipeType[];
}

const SeedFile = z.array(Recipe);

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
      set({ recipes: validated, loaded: true, loadError: null });
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      set({ loaded: true, loadError: message, recipes: [] });
    }
  },

  setRecipes(recipes) {
    set({ recipes, loaded: true, loadError: null });
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
