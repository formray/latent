import { useRef, type ChangeEvent, type JSX } from "react";
import { useCameraStore } from "../../stores/camera";
import { useRecipesStore } from "../../stores/recipes";

export function RawPreviewPanel(): JSX.Element | null {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const state = useCameraStore((s) => s.state);
  const preview = useCameraStore((s) => s.rawPreviewStatus);
  const renderRawPreview = useCameraStore((s) => s.renderRawPreview);
  const clearRawPreview = useCameraStore((s) => s.clearRawPreview);
  const recipes = useRecipesStore((s) => s.recipes);
  const selectedRecipeId = useRecipesStore((s) => s.selectedRecipeId);
  const connected = state.kind === "connected" || state.kind === "degraded";
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;

  if (!connected && preview.kind === "idle") return null;

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    void renderRawPreview(file, selectedRecipe);
    event.currentTarget.value = "";
  };

  return (
    <section
      aria-label="RAF camera preview"
      className="border-b border-zinc-900 bg-[#060606] px-6 py-5"
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(280px,0.45fr)_minmax(0,1fr)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
            camera render loop
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">
            RAF preview
          </h2>
          <p className="mt-2 max-w-xl text-sm leading-6 text-zinc-500">
            Load a local RAF file, apply the selected recipe if one is active, and display the JPEG
            rendered by the camera processor.
          </p>
          <p className="mt-2 font-mono text-[11px] uppercase tracking-wider text-zinc-600">
            {selectedRecipe ? `Recipe ${selectedRecipe.name}` : "Base RAF profile"}
          </p>
          <div className="mt-4 flex flex-wrap gap-2">
            <input
              ref={inputRef}
              type="file"
              accept=".raf,.RAF,image/x-fuji-raf"
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              disabled={!connected || preview.kind === "rendering"}
              onClick={() => inputRef.current?.click()}
              className="rounded-sm border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-600"
            >
              {preview.kind === "rendering" ? "Rendering" : "Choose RAF"}
            </button>
            {preview.kind !== "idle" && (
              <button
                type="button"
                onClick={clearRawPreview}
                className="rounded-sm border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              >
                Clear
              </button>
            )}
          </div>
          {preview.kind === "rendering" && (
            <p className="mt-3 font-mono text-xs text-zinc-500">
              Rendering {preview.fileName}
              {selectedRecipe ? ` with ${selectedRecipe.name}` : ""} on camera...
            </p>
          )}
          {preview.kind === "error" && (
            <p className="mt-3 max-w-xl font-mono text-xs leading-5 text-red-300">
              {preview.message}
            </p>
          )}
        </div>

        <div className="min-h-72 overflow-hidden border border-zinc-900 bg-zinc-950">
          {preview.kind === "success" && preview.objectUrl ? (
            <figure className="grid h-full min-h-72 grid-rows-[1fr_auto]">
              <img
                src={preview.objectUrl}
                alt={`Camera-rendered preview for ${preview.fileName}`}
                className="h-full max-h-[520px] w-full object-contain"
              />
              <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                <span>{preview.fileName}</span>
                <span>
                  {preview.recipeName ? `${preview.recipeName} · ` : ""}
                  JPEG {formatBytes(preview.jpegBytes)} · D185 {formatBytes(preview.baseProfileBytes)}
                </span>
              </figcaption>
            </figure>
          ) : (
            <div className="flex h-full min-h-72 items-center justify-center p-8">
              <p className="max-w-sm text-center text-sm leading-6 text-zinc-600">
                Choose a RAF to validate the camera-side preview round trip.
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
