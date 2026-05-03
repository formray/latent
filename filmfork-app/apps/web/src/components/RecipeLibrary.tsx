import clsx from "clsx";
import { useMemo, type ChangeEvent, type JSX } from "react";
import { useRecipesStore, type FilmSimulationValue } from "../stores/recipes";
import { useT } from "../i18n";
import { RecipeCard } from "./RecipeCard";
import { humanFilmSim } from "./format";

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
  const selected = useRecipesStore((s) => s.selectedRecipeId);
  const selectRecipe = useRecipesStore((s) => s.selectRecipe);
  const recipes = useRecipesStore((s) => s.recipes);
  const favorites = useRecipesStore((s) => s.favorites);
  const loaded = useRecipesStore((s) => s.loaded);

  // Compute filtered recipes from primitive selectors so the array reference
  // is stable across re-renders that don't change inputs.
  const filtered = useMemo(() => {
    const q = searchQuery.trim().toLowerCase();
    return recipes.filter((r) => {
      if (favoritesOnly && !favorites.has(r.id)) return false;
      if (filmSim && r.filmSimulation !== filmSim) return false;
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
  }, [recipes, searchQuery, filmSim, favoritesOnly, favorites]);

  const handleFilm = (e: ChangeEvent<HTMLSelectElement>): void => {
    const value = e.target.value;
    setFilmSimFilter(value === "" ? null : (value as FilmSimulationValue));
  };

  const count = filtered.length;
  const countLabel =
    count === 1
      ? t("library.count.one")
      : t("library.count.other", { n: count });

  return (
    <div className="flex h-full flex-col">
      <div className="flex flex-col gap-3 border-b border-zinc-900 bg-zinc-950 px-5 py-4">
        <h2 className="text-xs font-medium uppercase tracking-wider text-zinc-500">
          {t("library.title")}
        </h2>
        <input
          type="search"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder={t("library.search.placeholder")}
          aria-label={t("library.search.placeholder")}
          className={clsx(
            "w-full rounded-sm border border-zinc-800 bg-zinc-900 px-3 py-2 text-sm",
            "placeholder:text-zinc-600 focus:border-zinc-600 focus:outline-none",
          )}
        />
        <div className="flex flex-wrap items-center gap-2">
          <select
            value={filmSim ?? ""}
            onChange={handleFilm}
            aria-label={t("library.filter.allFilms")}
            className={clsx(
              "rounded-sm border border-zinc-800 bg-zinc-900 px-2 py-1.5 text-xs",
              "text-zinc-300 focus:border-zinc-600 focus:outline-none",
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
              "rounded-sm border px-2.5 py-1.5 text-xs transition-colors",
              favoritesOnly
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
            )}
          >
            {t("library.filter.favoritesOnly")}
          </button>
          <span className="ml-auto font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {countLabel}
          </span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto">
        {!loaded && (
          <p className="px-5 py-8 text-sm text-zinc-500">
            {t("library.empty.loading")}
          </p>
        )}
        {loaded && filtered.length === 0 && (
          <p className="px-5 py-8 text-sm text-zinc-500">
            {t("library.empty.noResults")}
          </p>
        )}
        {filtered.length > 0 && (
          <ul className="grid grid-cols-1 gap-px bg-zinc-900 sm:grid-cols-2">
            {filtered.map((r) => (
              <li key={r.id}>
                <RecipeCard
                  recipe={r}
                  selected={r.id === selected}
                  onSelect={selectRecipe}
                />
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
