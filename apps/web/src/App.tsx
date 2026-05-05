import { useEffect, useState, type JSX } from "react";
import clsx from "clsx";
import { useRecipesStore } from "./stores/recipes";
import { RecipeLibrary } from "./components/RecipeLibrary";
import { RecipeDetail } from "./components/RecipeDetail";
import { RecipeCreator } from "./components/RecipeCreator";
import { CameraConnect } from "./components/CameraConnect";
import { CameraRecipesPanel } from "./components/camera/CameraRecipesPanel";
import { RawPreviewPanel } from "./components/camera/RawPreviewPanel";
import { useCameraStore } from "./stores/camera";
import { useT } from "./i18n";

type Workspace = "camera" | "raf" | "library" | "create";

export function App(): JSX.Element {
  const t = useT();
  const loadSeedRecipes = useRecipesStore((s) => s.loadSeedRecipes);
  const selectedId = useRecipesStore((s) => s.selectedRecipeId);
  const recipes = useRecipesStore((s) => s.recipes);
  const cameraState = useCameraStore((s) => s.state);
  const presets = useCameraStore((s) => s.presets);
  const rawPreviewStatus = useCameraStore((s) => s.rawPreviewStatus);
  const [theme, setTheme] = useState<"dark" | "light">(() => initialTheme());
  const [workspace, setWorkspace] = useState<Workspace>(() => initialWorkspace());
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  useEffect(() => {
    void loadSeedRecipes();
  }, [loadSeedRecipes]);

  useEffect(() => {
    localStorage.setItem("latent-theme-v1", theme);
  }, [theme]);

  useEffect(() => {
    const syncWorkspace = (): void => {
      setWorkspace(workspaceFromHash(window.location.hash));
      setMobileMenuOpen(false);
    };
    syncWorkspace();
    window.addEventListener("hashchange", syncWorkspace);
    return () => window.removeEventListener("hashchange", syncWorkspace);
  }, []);

  const selected = recipes.find((r) => r.id === selectedId) ?? null;
  const themeLabel = theme === "dark" ? "Light" : "Dark";

  return (
    <div
      data-theme={theme}
      className={clsx(
        "latent-app min-h-screen overflow-x-hidden bg-zinc-950 text-zinc-100",
        "pb-28 md:pb-0",
        theme === "light" ? "theme-light" : "theme-dark",
      )}
    >
      <header className="sticky top-0 z-40 border-b border-zinc-900 bg-zinc-950/90 px-4 py-3 backdrop-blur-xl sm:px-6">
        <div className="flex items-center justify-between gap-3">
          <a href="#library" className="flex min-w-0 items-baseline gap-3">
            <h1 className="text-lg font-semibold tracking-tight text-zinc-50">Latent</h1>
            <span className="hidden text-xs text-zinc-500 sm:inline">{t("app.tagline")}</span>
          </a>
          <nav
            aria-label="Workspace"
            className="hidden gap-1 font-mono text-[10px] uppercase tracking-[0.18em] text-zinc-500 md:flex"
          >
            <NavLink href="#camera" active={workspace === "camera"}>
              Camera
            </NavLink>
            <NavLink href="#raf" active={workspace === "raf"}>
              RAF
            </NavLink>
            <NavLink href="#library" active={workspace === "library"}>
              Library
            </NavLink>
            <NavLink href="#create" active={workspace === "create"}>
              Create
            </NavLink>
          </nav>
          <div className="hidden items-center gap-2 md:flex">
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
          <div className="hidden items-center gap-2 sm:flex md:hidden">
            <span className="max-w-[9rem] truncate font-mono text-[10px] uppercase tracking-wider text-emerald-400">
              {cameraStatusLabel(cameraState)}
            </span>
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

      <WorkspaceIntro workspace={workspace} />

      {workspace === "camera" && (
        <main id="camera-workspace" className="workspace-shell">
          <CameraRecipesPanel />
        </main>
      )}

      {workspace === "raf" && (
        <main
          id="raf-workspace"
          className="workspace-shell grid min-h-[72vh] overflow-hidden border-t border-zinc-900 xl:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]"
        >
          <section
            id="raf-recipe-library"
            aria-label={t("library.title")}
            className="max-h-[42vh] border-b border-zinc-900 xl:sticky xl:top-[57px] xl:h-[calc(100svh-57px)] xl:max-h-none xl:overflow-hidden xl:border-b-0 xl:border-r"
          >
            <RecipeLibrary />
          </section>
          <RawPreviewPanel />
        </main>
      )}

      {workspace === "library" && (
        <main
          id="recipe-workspace"
          className="workspace-shell grid min-h-[72vh] flex-1 overflow-hidden border-t border-zinc-900 lg:grid-cols-[minmax(320px,440px)_minmax(0,1fr)]"
        >
          <section
            id="recipe-library"
            aria-label={t("library.title")}
            className="max-h-[72vh] border-b border-zinc-900 lg:sticky lg:top-[57px] lg:h-[calc(100svh-57px)] lg:max-h-none lg:overflow-hidden lg:border-b-0 lg:border-r"
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
      )}

      {workspace === "create" && (
        <main id="create-workspace" className="workspace-shell border-t border-zinc-900">
          <RecipeCreator />
        </main>
      )}

      <footer className="border-t border-zinc-900 px-4 py-3 text-xs text-zinc-500 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span>{t("footer.license")}</span>
          <span className="font-mono text-zinc-600">v0.1.0 · hardware alpha</span>
        </div>
      </footer>

      <MobileDock
        workspace={workspace}
        expanded={mobileMenuOpen}
        cameraStatus={cameraStatusLabel(cameraState)}
        themeLabel={themeLabel}
        onToggleExpanded={() => setMobileMenuOpen((value) => !value)}
        onToggleTheme={() => setTheme((value) => (value === "dark" ? "light" : "dark"))}
      />
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
    <section className="studio-overview hidden border-b border-zinc-900 px-4 py-5 sm:px-6 md:block lg:py-6">
      <div className="grid w-full gap-8 lg:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)] lg:items-end">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.34em] text-emerald-400">
            open camera lab
          </p>
          <h2 className="mt-3 font-mono text-5xl font-semibold uppercase leading-[0.86] tracking-normal text-zinc-50 sm:text-6xl lg:text-7xl xl:text-8xl">
            Latent
          </h2>
          <p className="mt-4 max-w-2xl text-base leading-7 text-zinc-400 sm:text-lg">
            Camera-backed Fujifilm recipes, live RAF rendering, and custom-slot control in one
            focused workspace.
          </p>
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

function OverviewMetric({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="bg-zinc-950 p-4">
      <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-600">{label}</p>
      <p className="mt-2 truncate text-sm font-medium text-zinc-100">{value}</p>
    </div>
  );
}

function WorkspaceIntro({ workspace }: { workspace: Workspace }): JSX.Element {
  const content = {
    camera: {
      label: "camera",
      title: "Read custom slots directly from the body.",
      body: "Use this workspace when the camera is the source of truth: connect, read C1-C4, inspect raw properties, and import verified recipes.",
    },
    raf: {
      label: "raf lab",
      title: "Choose a recipe, keep a RAF loaded, iterate fast.",
      body: "The library stays beside the renderer. WB shift is preview-safe; Kelvin is tracked as a current RAF limitation.",
    },
    library: {
      label: "library",
      title: "Browse, edit, export, and write recipes.",
      body: "This is the archive view: inspect parameters, manage JSON files, and send a selected recipe to a camera slot.",
    },
    create: {
      label: "creator",
      title: "Build a validated recipe.",
      body: "Start with an intent or duplicate a selected look, tune schema-backed Fuji controls, and save straight into the library.",
    },
  } satisfies Record<Workspace, { label: string; title: string; body: string }>;
  const selected = content[workspace];

  return (
    <section className="border-b border-zinc-900 px-4 py-4 sm:px-6">
      <div className="flex w-full flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
            {selected.label}
          </p>
          <h2 className="mt-1 break-words text-xl font-semibold tracking-tight text-zinc-50">
            {selected.title}
          </h2>
        </div>
        <p className="min-w-0 w-full max-w-2xl break-words text-sm leading-6 text-zinc-500">
          {selected.body}
        </p>
      </div>
    </section>
  );
}

function MobileDock({
  workspace,
  expanded,
  cameraStatus,
  themeLabel,
  onToggleExpanded,
  onToggleTheme,
}: {
  workspace: Workspace;
  expanded: boolean;
  cameraStatus: string;
  themeLabel: string;
  onToggleExpanded: () => void;
  onToggleTheme: () => void;
}): JSX.Element {
  return (
    <div className="fixed inset-x-0 bottom-3 z-50 px-3 pb-[env(safe-area-inset-bottom)] md:hidden">
      {expanded && (
        <div
          id="mobile-workspace-menu"
          className="mb-2 grid gap-3 rounded-[28px] border border-zinc-800/80 bg-zinc-950/85 p-3 shadow-2xl shadow-black/35 backdrop-blur-2xl"
        >
          <div className="flex items-center justify-between gap-3 px-1">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400">
                camera
              </p>
              <p className="mt-1 truncate text-sm font-medium text-zinc-100">{cameraStatus}</p>
            </div>
            <button
              type="button"
              onClick={onToggleTheme}
              className="rounded-full border border-zinc-800 bg-zinc-900/80 px-3 py-2 text-xs text-zinc-200"
              aria-label={`Switch to ${themeLabel.toLowerCase()} theme`}
            >
              {themeLabel}
            </button>
          </div>
          <div className="rounded-2xl border border-zinc-800 bg-zinc-950/80 p-3">
            <CameraConnect />
          </div>
        </div>
      )}

      <nav
        aria-label="Mobile workspace"
        className="grid grid-cols-5 items-center gap-0.5 rounded-full border border-zinc-800/80 bg-zinc-950/80 p-1 shadow-2xl shadow-black/30 backdrop-blur-2xl"
      >
        <MobileDockLink href="#camera" active={workspace === "camera"} label="Camera" />
        <MobileDockLink href="#raf" active={workspace === "raf"} label="RAF" />
        <MobileDockLink href="#library" active={workspace === "library"} label="Library" />
        <MobileDockLink href="#create" active={workspace === "create"} label="Create" />
        <button
          type="button"
          onClick={onToggleExpanded}
          aria-expanded={expanded}
          aria-controls="mobile-workspace-menu"
          className={clsx(
            "grid h-11 w-full min-w-0 place-items-center rounded-full border font-mono text-lg leading-none transition-colors",
            expanded
              ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
              : "border-zinc-800 bg-zinc-900/80 text-zinc-300",
          )}
          aria-label={expanded ? "Close mobile controls" : "Open mobile controls"}
        >
          {expanded ? "-" : "+"}
        </button>
      </nav>
    </div>
  );
}

function MobileDockLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}): JSX.Element {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "min-w-0 rounded-full px-2 py-3 text-center text-[11px] font-medium transition-colors min-[380px]:px-3 min-[380px]:text-xs",
        active
          ? "bg-emerald-500/15 text-emerald-300"
          : "text-zinc-300 hover:bg-zinc-900/80 hover:text-zinc-100",
      )}
    >
      {label}
    </a>
  );
}

function NavLink({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: string;
}): JSX.Element {
  return (
    <a
      href={href}
      aria-current={active ? "page" : undefined}
      className={clsx(
        "rounded-md border px-3 py-1.5 transition-colors hover:border-zinc-800 hover:bg-zinc-900 hover:text-zinc-200",
        active ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300" : "border-transparent",
      )}
    >
      {children}
    </a>
  );
}

function initialWorkspace(): Workspace {
  if (typeof window === "undefined") return "library";
  return workspaceFromHash(window.location.hash);
}

function workspaceFromHash(hash: string): Workspace {
  if (hash === "#camera" || hash === "#camera-recipes-panel" || hash === "#camera-workspace") {
    return "camera";
  }
  if (hash === "#raf" || hash === "#raw-preview-panel" || hash === "#raf-workspace") {
    return "raf";
  }
  if (hash === "#create" || hash === "#creator" || hash === "#create-workspace") {
    return "create";
  }
  return "library";
}

function EmptyDetail({ message }: { message: string }): JSX.Element {
  return (
    <div className="flex h-full items-center justify-center p-12">
      <p className="max-w-md text-center text-sm leading-relaxed text-zinc-500">{message}</p>
    </div>
  );
}

function initialTheme(): "dark" | "light" {
  if (typeof window !== "undefined") {
    const themeParam = new URLSearchParams(window.location.search).get("theme");
    if (themeParam === "dark" || themeParam === "light") return themeParam;
  }
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
