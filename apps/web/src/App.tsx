import { useEffect, type JSX } from "react";
import { useRecipesStore } from "./stores/recipes";
import { RecipeLibrary } from "./components/RecipeLibrary";
import { RecipeDetail } from "./components/RecipeDetail";
import { CameraConnect } from "./components/CameraConnect";
import { useT } from "./i18n";

export function App(): JSX.Element {
  const t = useT();
  const loadSeedRecipes = useRecipesStore((s) => s.loadSeedRecipes);
  const selectedId = useRecipesStore((s) => s.selectedRecipeId);
  const recipes = useRecipesStore((s) => s.recipes);

  useEffect(() => {
    void loadSeedRecipes();
  }, [loadSeedRecipes]);

  const selected = recipes.find((r) => r.id === selectedId) ?? null;

  return (
    <div className="flex min-h-screen flex-col bg-zinc-950 text-zinc-100">
      <header className="border-b border-zinc-900 bg-zinc-950/95 px-6 py-4 backdrop-blur">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <h1 className="font-semibold tracking-tight text-zinc-50 text-lg">
              FilmFork
            </h1>
            <span className="text-xs text-zinc-500">{t("app.tagline")}</span>
          </div>
          <CameraConnect />
        </div>
      </header>

      <main className="flex flex-1 overflow-hidden">
        <section
          aria-label={t("library.title")}
          className="w-full max-w-2xl flex-shrink-0 border-r border-zinc-900 overflow-y-auto"
        >
          <RecipeLibrary />
        </section>
        <section
          aria-label={t("detail.title")}
          className="flex-1 overflow-y-auto"
        >
          {selected ? (
            <RecipeDetail recipe={selected} />
          ) : (
            <EmptyDetail message={t("detail.empty")} />
          )}
        </section>
      </main>

      <footer className="border-t border-zinc-900 px-6 py-3 text-xs text-zinc-500">
        <div className="flex items-center justify-between">
          <span>{t("footer.license")}</span>
          <span className="font-mono text-zinc-600">v0.0.0 · phase 3-base</span>
        </div>
      </footer>
    </div>
  );
}

function EmptyDetail({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <p className="max-w-md text-center text-sm leading-relaxed text-zinc-500">
        {message}
      </p>
    </div>
  );
}
