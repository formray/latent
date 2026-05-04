import clsx from "clsx";
import type { JSX } from "react";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { useRecipesStore } from "../stores/recipes";
import { useT } from "../i18n";
import { humanFilmSim } from "./format";

export interface RecipeCardProps {
  recipe: RecipeType;
  selected: boolean;
  onSelect: (id: string) => void;
}

export function RecipeCard({
  recipe,
  selected,
  onSelect,
}: RecipeCardProps): JSX.Element {
  const t = useT();
  const isFavorite = useRecipesStore((s) => s.favorites.has(recipe.id));
  const toggleFavorite = useRecipesStore((s) => s.toggleFavorite);

  return (
    <article
      className={clsx(
        "group relative flex flex-col gap-2 border border-zinc-900 bg-zinc-950 p-4 transition-colors",
        "hover:border-zinc-700 hover:bg-zinc-900/40",
        selected && "border-amber-500/40 bg-zinc-900/60",
      )}
    >
      <button
        type="button"
        onClick={() => onSelect(recipe.id)}
        className="flex flex-col gap-2 text-left"
        aria-label={recipe.name}
      >
        <header className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="truncate text-sm font-medium text-zinc-50">
              {recipe.name}
            </h3>
            <p className="mt-0.5 text-xs text-zinc-500">
              {humanFilmSim(recipe.filmSimulation)}
            </p>
          </div>
          <span className="font-mono text-[10px] uppercase tracking-wide text-zinc-600">
            {recipe.dynamicRange}
          </span>
        </header>

        {recipe.description && (
          <p className="line-clamp-2 text-xs leading-relaxed text-zinc-400">
            {recipe.description}
          </p>
        )}

        {recipe.tags && recipe.tags.length > 0 && (
          <ul className="flex flex-wrap gap-1.5 pt-1">
            {recipe.tags.slice(0, 4).map((tag) => (
              <li
                key={tag}
                className="rounded-sm bg-zinc-900 px-1.5 py-0.5 text-[10px] text-zinc-400"
              >
                {tag}
              </li>
            ))}
          </ul>
        )}
      </button>

      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(recipe.id);
        }}
        aria-pressed={isFavorite}
        aria-label={
          isFavorite ? t("detail.favourite.remove") : t("detail.favourite.add")
        }
        className={clsx(
          "absolute right-3 top-3 rounded-sm border px-1.5 py-0.5 text-[10px] uppercase tracking-wide transition-colors",
          isFavorite
            ? "border-amber-500/40 text-amber-400 hover:text-amber-300"
            : "border-zinc-800 text-zinc-600 hover:border-zinc-700 hover:text-zinc-400",
        )}
      >
        {isFavorite
          ? t("detail.favourite.short.saved")
          : t("detail.favourite.short.add")}
      </button>
    </article>
  );
}
