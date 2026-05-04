import { useEffect, useState, type JSX } from "react";
import clsx from "clsx";
import { useRecipesStore } from "./stores/recipes";
import { RecipeLibrary } from "./components/RecipeLibrary";
import { RecipeDetail } from "./components/RecipeDetail";
import { CameraConnect } from "./components/CameraConnect";
import { CameraRecipesPanel } from "./components/camera/CameraRecipesPanel";
import { RawPreviewPanel } from "./components/camera/RawPreviewPanel";
import { useCameraStore } from "./stores/camera";
import { useT } from "./i18n";

export function App(): JSX.Element {
  const t = useT();
  const loadSeedRecipes = useRecipesStore((s) => s.loadSeedRecipes);
  const selectedId = useRecipesStore((s) => s.selectedRecipeId);
  const recipes = useRecipesStore((s) => s.recipes);
  const cameraState = useCameraStore((s) => s.state);
  const presets = useCameraStore((s) => s.presets);
  const rawPreviewStatus = useCameraStore((s) => s.rawPreviewStatus);
  const [theme, setTheme] = useState<"dark" | "light">(() => initialTheme());

  useEffect(() => {
    void loadSeedRecipes();
  }, [loadSeedRecipes]);

  useEffect(() => {
    localStorage.setItem("latent-theme-v1", theme);
  }, [theme]);

  const selected = recipes.find((r) => r.id === selectedId) ?? null;
  const themeLabel = theme === "dark" ? "Light" : "Dark";

  return (
    <div
      data-theme={theme}
      className={clsx(
        "latent-app min-h-screen bg-zinc-950 text-zinc-100",
        theme === "light" ? "theme-light" : "theme-dark",
      )}
    >
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <a href="#recipe-workspace" className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Latent</h1>
            <span className="hidden text-xs text-zinc-500 sm:inline">{t("app.tagline")}</span>
          </a>
          <nav
            aria-label="Workspace"
            className="order-3 flex w-full gap-1 overflow-x-auto font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 sm:order-none sm:w-auto"
          >
            <NavLink href="#camera-recipes-panel">Camera</NavLink>
            <NavLink href="#raw-preview-panel">RAF</NavLink>
            <NavLink href="#recipe-library">Library</NavLink>
            <NavLink href="#recipe-detail">Recipe</NavLink>
          </nav>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
              className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              aria-label={`Switch to ${themeLabel.toLowerCase()} theme`}
            >
              {themeLabel}
            </button>
            <CameraConnect />
          </div>
        </div>
      </header>

      <StudioOverview
        recipeCount={recipes.length}
        selectedRecipeName={selected?.name ?? null}
        cameraStatus={cameraStatusLabel(cameraState)}
        presetCount={presets.length}
        rawPreviewLabel={rawPreviewLabel(rawPreviewStatus)}
      />

      <div className="studio-stage">
        <CameraRecipesPanel />
        <RawPreviewPanel />
      </div>

      <main
        id="recipe-workspace"
        className="grid min-h-[70vh] flex-1 overflow-hidden border-t border-zinc-900 lg:grid-cols-[minmax(320px,440px)_minmax(0,1fr)]"
      >
        <section
          id="recipe-library"
          aria-label={t("library.title")}
          className="max-h-[72vh] border-b border-zinc-900 lg:max-h-none lg:overflow-y-auto lg:border-b-0 lg:border-r"
        >
          <RecipeLibrary />
        </section>
        <section
          id="recipe-detail"
          aria-label={t("detail.title")}
          className="min-h-[70vh] overflow-y-auto"
        >
          {selected ? (
            <RecipeDetail recipe={selected} />
          ) : (
            <EmptyDetail message={t("detail.empty")} />
          )}
        </section>
      </main>

      <footer className="border-t border-zinc-900 px-4 py-3 text-xs text-zinc-500 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{t("footer.license")}</span>
          <span className="font-mono text-zinc-600">v0.0.0 · phase 3-base</span>
        </div>
      </footer>
    </div>
  );
}

function StudioOverview({
  recipeCount,
  selectedRecipeName,
  cameraStatus,
  presetCount,
  rawPreviewLabel,
}: {
  recipeCount: number;
  selectedRecipeName: string | null;
  cameraStatus: string;
  presetCount: number;
  rawPreviewLabel: string;
}): JSX.Element {
  return (
    <section className="studio-overview border-b border-zinc-900 px-4 py-6 sm:px-6 lg:py-9">
      <div className="mx-auto grid max-w-[1800px] gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)] lg:items-end">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-emerald-400">
            open camera lab
          </p>
          <h2 className="mt-3 font-mono text-6xl font-semibold uppercase leading-[0.86] tracking-normal text-zinc-50 sm:text-8xl lg:text-9xl xl:text-[10rem] 2xl:text-[12rem]">
            Latent
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Camera-backed Fujifilm recipes, live RAF rendering, and custom-slot control in one
            focused workspace.
          </p>
          <div className="mt-6 flex flex-wrap gap-2">
            <OverviewLink href="#raw-preview-panel">Preview on RAF</OverviewLink>
            <OverviewLink href="#recipe-library">Browse recipes</OverviewLink>
            <OverviewLink href="#camera-recipes-panel">Read camera</OverviewLink>
          </div>
        </div>

        <div className="grid gap-px overflow-hidden rounded-lg border border-zinc-800 bg-zinc-900/80 sm:grid-cols-2">
          <OverviewMetric label="Camera" value={cameraStatus} />
          <OverviewMetric
            label="Slots read"
            value={presetCount ? String(presetCount) : "Standby"}
          />
          <OverviewMetric label="Library" value={`${recipeCount} recipes`} />
          <OverviewMetric label="RAF loop" value={rawPreviewLabel} />
          <div className="bg-zinc-950 p-4 sm:col-span-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">
              selected look
            </p>
            <p className="mt-2 truncate text-lg font-medium text-zinc-100">
              {selectedRecipeName ?? "Choose a recipe"}
            </p>
          </div>
        </div>
      </div>
    </section>
  );
}

function OverviewLink({ href, children }: { href: string; children: string }): JSX.Element {
  return (
    <a
      href={href}
      className="rounded-md border border-zinc-800 bg-zinc-950/50 px-4 py-2 text-xs font-medium text-zinc-300 transition-colors hover:border-emerald-500/50 hover:text-emerald-300"
    >
      {children}
    </a>
  );
}

function OverviewMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="bg-zinc-950 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{label}</p>
      <p className="mt-2 truncate text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: string }): JSX.Element {
  return (
    <a
      href={href}
      className="rounded-full border border-transparent px-3 py-1.5 transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200"
    >
      {children}
    </a>
  );
}

function EmptyDetail({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <p className="max-w-md text-center text-sm leading-relaxed text-zinc-500">{message}</p>
    </div>
  );
}

function initialTheme(): "dark" | "light" {
  if (typeof localStorage !== "undefined") {
    const stored = localStorage.getItem("latent-theme-v1");
    if (stored === "dark" || stored === "light") return stored;
  }
  if (
    typeof window !== "undefined" &&
    window.matchMedia?.("(prefers-color-scheme: light)").matches
  ) {
    return "light";
  }
  return "dark";
}

function cameraStatusLabel(state: ReturnType<typeof useCameraStore.getState>["state"]): string {
  if (state.kind === "connected" || state.kind === "degraded") {
    return `${state.cameraModel} · FW ${state.firmwareVersion}`;
  }
  if (state.kind === "connecting") return "Connecting";
  if (state.kind === "reconnecting") return "Reconnecting";
  if (state.kind === "error") return "Needs attention";
  return "Not connected";
}

function rawPreviewLabel(
  rawPreviewStatus: ReturnType<typeof useCameraStore.getState>["rawPreviewStatus"],
): string {
  if (rawPreviewStatus.kind === "rendering") return "Rendering";
  if (rawPreviewStatus.kind === "success") return rawPreviewStatus.recipeName ?? "Rendered";
  if (rawPreviewStatus.kind === "error") return "Check preview";
  return "Ready";
}
