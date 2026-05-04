import clsx from "clsx";
import { useMemo, useRef, useState, type ChangeEvent, type JSX } from "react";
import { useRecipesStore, type FilmSimulationValue } from "../stores/recipes";
import { useT } from "../i18n";
import { RecipeCard } from "./RecipeCard";
import { humanFilmSim } from "./format";
import { parseRecipeImportText } from "../lib/recipe-json";

const FILM_SIM_OPTIONS: FilmSimulationValue[] = [
  "ProviaStandard",
  "VelviaVivid",
  "AstiaSoft",
  "ClassicChrome",
  "ProNegHi",
  "ProNegStd",
  "ClassicNegative",
  "EternaCinema",
  "EternaBleachBypass",
  "AcrosStd",
  "AcrosYe",
  "AcrosR",
  "AcrosG",
  "Monochrome",
  "MonochromeYe",
  "MonochromeR",
  "MonochromeG",
  "Sepia",
  "NostalgicNeg",
  "RealaAce",
];

export function RecipeLibrary(): JSX.Element {
  const t = useT();
  const searchQuery = useRecipesStore((s) => s.searchQuery);
  const filmSim = useRecipesStore((s) => s.filmSimFilter);
  const favoritesOnly = useRecipesStore((s) => s.favoritesOnly);
  const setSearchQuery = useRecipesStore((s) => s.setSearchQuery);
  const setFilmSimFilter = useRecipesStore((s) => s.setFilmSimFilter);
  const toggleFavoritesOnly = useRecipesStore((s) => s.toggleFavoritesOnly);
  const importRecipes = useRecipesStore((s) => s.importRecipes);
  const resetRecipeLibrary = useRecipesStore((s) => s.resetRecipeLibrary);
  const selected = useRecipesStore((s) => s.selectedRecipeId);
  const selectRecipe = useRecipesStore((s) => s.selectRecipe);
  const recipes = useRecipesStore((s) => s.recipes);
  const favorites = useRecipesStore((s) => s.favorites);
  const loaded = useRecipesStore((s) => s.loaded);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importStatus, setImportStatus] = useState<string | null>(null);

  // Compute filtered recipes from primitive selectors so the array reference
  // is stable across re-renders that don't change inputs.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      if (favoritesOnly && !favorites.has(r.id)) return false;
      if (filmSim && r.filmSimulation !== filmSim) return false;
      if (q) {
        const haystack = [r.name, r.description ?? "", r.filmSimulation, ...(r.tags ?? [])]
          .join(" ")
          .toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [recipes, searchQuery, filmSim, favoritesOnly, favorites]);

  const handleFilm = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    setFilmSimFilter(value === "" ? null : (value as FilmSimulationValue));
  };

  const handleImportFile = async (e: ChangeEvent<HTMLInputElement>): Promise<void> => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const imported = parseRecipeImportText(await file.text());
      importRecipes(imported);
      setImportStatus(t("library.import.success", { n: imported.length }));
    } catch {
      setImportStatus(t("library.import.error"));
    }
  };

  const handleResetLibrary = async (): Promise<void> => {
    if (!window.confirm(t("library.reset.confirm"))) return;
    await resetRecipeLibrary();
    setImportStatus(t("library.reset.done"));
  };

  const count = filtered.length;
  const countLabel = count === 1 ? t("library.count.one") : t("library.count.other", { n: count });

  return (
    <div className="flex h-full flex-col">
      <div className="sticky top-0 z-20 flex flex-col gap-4 border-b border-zinc-900 bg-zinc-950/95 px-4 py-4 backdrop-blur sm:px-5">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400">
              look library
            </p>
            <h2 className="mt-1 text-lg font-semibold tracking-tight text-zinc-50">
              {t("library.title")}
            </h2>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {countLabel}
          </span>
        </div>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("library.search.placeholder")}
          aria-label={t("library.search.placeholder")}
          className={clsx(
            "w-full rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2.5 text-sm",
            "placeholder:text-zinc-600 focus:border-emerald-500/50 focus:outline-none",
          )}
        />
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2">
          <select
            value={filmSim ?? ""}
            onChange={handleFilm}
            aria-label={t("library.filter.allFilms")}
            className={clsx(
              "min-w-0 rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs",
              "text-zinc-300 focus:border-emerald-500/50 focus:outline-none",
            )}
          >
            <option value="">{t("library.filter.allFilms")}</option>
            {FILM_SIM_OPTIONS.map((sim) => (
              <option key={sim} value={sim}>
                {humanFilmSim(sim)}
              </option>
            ))}
          </select>
          <button
            type="button"
            onClick={toggleFavoritesOnly}
            aria-pressed={favoritesOnly}
            className={clsx(
              "rounded-full border px-3 py-2 text-xs transition-colors",
              favoritesOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
            )}
          >
            {t("library.filter.favoritesOnly")}
          </button>
        </div>
        <div className="flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700"
          >
            {t("library.importJson")}
          </button>
          <input
            ref={fileInputRef}
            type="file"
            accept="application/json,text/html,.json,.html"
            className="hidden"
            onChange={(e) => void handleImportFile(e)}
            aria-label={t("library.importJson")}
          />
          <button
            type="button"
            onClick={() => void handleResetLibrary()}
            className="rounded-full border border-zinc-800 bg-zinc-900 px-3 py-2 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
          >
            {t("library.reset")}
          </button>
          {importStatus && (
            <span className="min-w-0 truncate text-right text-xs text-zinc-500">
              {importStatus}
            </span>
          )}
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!loaded && <p className="px-5 py-8 text-sm text-zinc-500">{t("library.empty.loading")}</p>}
        {loaded && filtered.length === 0 && (
          <p className="px-5 py-8 text-sm text-zinc-500">{t("library.empty.noResults")}</p>
        )}
        {filtered.length > 0 && (
          <ul className="grid grid-cols-1 gap-px bg-zinc-900">
            {filtered.map((r) => (
              <li key={r.id}>
                <RecipeCard recipe={r} selected={r.id === selected} onSelect={selectRecipe} />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
