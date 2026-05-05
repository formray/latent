import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ChangeEvent,
  type JSX,
} from "react";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { useCameraStore } from "../../stores/camera";
import { useRecipesStore } from "../../stores/recipes";
import {
  describeDynamicRange,
  describeDRangePriority,
  describeGrain,
  describeWhiteBalance,
  describeWhiteBalanceShift,
  formatExposureCompensation,
  humanFilmSim,
  signedNumber,
} from "../format";

const FILM_SIM_OPTIONS: RecipeType["filmSimulation"][] = [
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

const DYNAMIC_RANGE_OPTIONS: RecipeType["dynamicRange"][] = ["DRAuto", "DR100", "DR200", "DR400"];
const D_RANGE_PRIORITY_OPTIONS: Array<NonNullable<RecipeType["dRangePriority"]>> = [
  "Off",
  "Auto",
  "Weak",
  "Strong",
];

const WHITE_BALANCE_OPTIONS: RecipeType["whiteBalance"]["mode"][] = [
  "Auto",
  "AutoWhitePriority",
  "AutoAmbiencePriority",
  "Daylight",
  "Shade",
  "Fluorescent1",
  "Fluorescent2",
  "Fluorescent3",
  "Incandescent",
  "Underwater",
  "ColorTemperature",
];

const WHITE_BALANCE_OPTION_LABELS: Record<RecipeType["whiteBalance"]["mode"], string> = {
  Auto: "Auto",
  AutoWhitePriority: "White Priority",
  AutoAmbiencePriority: "Ambience Priority",
  Daylight: "Daylight",
  Shade: "Shade",
  Fluorescent1: "Fluorescent 1",
  Fluorescent2: "Fluorescent 2",
  Fluorescent3: "Fluorescent 3",
  Incandescent: "Incandescent",
  Underwater: "Underwater",
  ColorTemperature: "Color Temperature",
};

const TRI_OPTIONS: Array<NonNullable<RecipeType["smoothSkinEffect"]>> = ["Off", "Weak", "Strong"];

export function RawPreviewPanel(): JSX.Element | null {
  const inputRef = useRef<HTMLInputElement | null>(null);
  const renderChainRef = useRef<Promise<void>>(Promise.resolve());
  const requestSeqRef = useRef(0);
  const lastQueuedSignatureRef = useRef<string>("");
  const state = useCameraStore((s) => s.state);
  const preview = useCameraStore((s) => s.rawPreviewStatus);
  const loadedFile = useCameraStore((s) => s.rawPreviewFile);
  const setRawPreviewFile = useCameraStore((s) => s.setRawPreviewFile);
  const renderRawPreview = useCameraStore((s) => s.renderRawPreview);
  const clearRawPreview = useCameraStore((s) => s.clearRawPreview);
  const recipes = useRecipesStore((s) => s.recipes);
  const selectedRecipeId = useRecipesStore((s) => s.selectedRecipeId);
  const connected = state.kind === "connected" || state.kind === "degraded";
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  const [draftRecipe, setDraftRecipe] = useState<RecipeType | null>(selectedRecipe);
  const [autoRender, setAutoRender] = useState(true);

  useEffect(() => {
    setDraftRecipe(selectedRecipe ? cloneRecipe(selectedRecipe) : null);
    lastQueuedSignatureRef.current = "";
  }, [selectedRecipe]);

  const activeRecipe = draftRecipe ?? selectedRecipe;
  const draftSignature = useMemo(
    () => (draftRecipe ? JSON.stringify(recipePreviewSignature(draftRecipe)) : "base"),
    [draftRecipe],
  );

  const queueRender = useCallback(
    (file: File, recipe: RecipeType | null, signature: string): void => {
      lastQueuedSignatureRef.current = signature;
      const requestSeq = ++requestSeqRef.current;
      renderChainRef.current = renderChainRef.current
        .catch(() => undefined)
        .then(async () => {
          if (requestSeq !== requestSeqRef.current) return;
          await renderRawPreview(file, recipe);
        });
    },
    [renderRawPreview],
  );

  useEffect(() => {
    if (!autoRender || !loadedFile || !connected) return;
    const signature = makeRenderSignature(loadedFile, draftSignature);
    if (signature === lastQueuedSignatureRef.current) return;
    const timer = window.setTimeout(() => {
      queueRender(loadedFile, activeRecipe, signature);
    }, 700);
    return () => window.clearTimeout(timer);
  }, [activeRecipe, autoRender, connected, draftSignature, loadedFile, queueRender]);

  const onFileChange = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    setRawPreviewFile(file);
    const signature = makeRenderSignature(file, draftSignature);
    queueRender(file, activeRecipe, signature);
    event.currentTarget.value = "";
  };

  const renderNow = (): void => {
    if (!loadedFile) return;
    queueRender(
      loadedFile,
      activeRecipe,
      `${makeRenderSignature(loadedFile, draftSignature)}:manual`,
    );
  };

  const resetDraft = (): void => {
    setDraftRecipe(selectedRecipe ? cloneRecipe(selectedRecipe) : null);
    lastQueuedSignatureRef.current = "";
  };

  return (
    <section
      id="raw-preview-panel"
      aria-label="RAF camera preview"
      className="border-b border-zinc-900 bg-[#060606]"
    >
      <div className="grid min-h-[560px] xl:grid-cols-[260px_minmax(0,1fr)_360px]">
        <aside className="border-b border-zinc-900 px-5 py-5 xl:border-b-0 xl:border-r">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
            camera render loop
          </p>
          <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">RAF workspace</h2>
          <div className="mt-4 space-y-2 font-mono text-[11px] uppercase tracking-wider text-zinc-600">
            <p>{activeRecipe ? activeRecipe.name : "Base RAF profile"}</p>
            <p>{loadedFile ? loadedFile.name : "No RAF loaded"}</p>
          </div>

          <div className="mt-5 flex flex-col gap-2">
            <input
              ref={inputRef}
              type="file"
              aria-label="Open RAF file"
              accept=".raf,.RAF,image/x-fuji-raf"
              className="hidden"
              onChange={onFileChange}
            />
            <button
              type="button"
              disabled={!connected || preview.kind === "rendering"}
              onClick={() => inputRef.current?.click()}
              className="rounded-full border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15 disabled:border-zinc-800 disabled:bg-transparent disabled:text-zinc-600"
            >
              {preview.kind === "rendering" ? "Rendering" : loadedFile ? "Change RAF" : "Open RAF"}
            </button>
            <button
              type="button"
              disabled={!loadedFile || preview.kind === "rendering"}
              onClick={renderNow}
              className="rounded-full border border-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-300 transition-colors hover:border-zinc-700 hover:text-zinc-100 disabled:cursor-not-allowed disabled:text-zinc-700"
            >
              Render now
            </button>
            {preview.kind !== "idle" && (
              <button
                type="button"
                onClick={clearRawPreview}
                className="rounded-full border border-zinc-800 px-4 py-2.5 text-xs font-medium text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200"
              >
                Clear output
              </button>
            )}
          </div>

          <label className="mt-5 flex items-center gap-2 text-xs text-zinc-400">
            <input
              type="checkbox"
              checked={autoRender}
              onChange={(event) => setAutoRender(event.currentTarget.checked)}
              className="h-4 w-4 accent-emerald-500"
            />
            Auto-render edits
          </label>

          {preview.kind === "rendering" && (
            <p className="mt-4 font-mono text-xs text-zinc-500">
              Rendering {preview.fileName}
              {preview.recipeName ? ` with ${preview.recipeName}` : ""}...
              {preview.mode === "diagnostic" && preview.currentVariant
                ? ` ${preview.currentVariant}`
                : ""}
            </p>
          )}
          {preview.kind === "error" && (
            <p className="mt-4 max-w-xl font-mono text-xs leading-5 text-red-300">
              {preview.message}
            </p>
          )}
        </aside>

        <div className="min-h-96 bg-[#050505]">
          {preview.kind === "success" && preview.diagnostics?.length ? (
            <div className="grid min-h-full gap-px bg-zinc-900 sm:grid-cols-2 xl:grid-cols-3">
              {preview.diagnostics.map((variant) => (
                <PreviewFigure
                  key={variant.id}
                  label={variant.label}
                  objectUrl={variant.objectUrl}
                  fileName={preview.fileName}
                  jpegBytes={variant.jpegBytes}
                  baseProfileBytes={variant.baseProfileBytes}
                />
              ))}
            </div>
          ) : preview.kind === "success" && preview.objectUrl ? (
            <figure className="grid h-full min-h-[560px] grid-rows-[1fr_auto]">
              <div className="flex items-start justify-center p-2 sm:p-3">
                <img
                  src={preview.objectUrl}
                  alt={`Camera-rendered preview for ${preview.fileName}`}
                  className="max-h-[calc(100svh-190px)] w-full object-contain"
                />
              </div>
              <figcaption className="flex flex-wrap items-center justify-between gap-3 border-t border-zinc-900 bg-[#050505] px-4 py-3 font-mono text-[11px] uppercase tracking-wider text-zinc-500">
                <span>{preview.fileName}</span>
                <span>
                  {preview.recipeName ? `${preview.recipeName} · ` : ""}
                  JPEG {formatBytes(preview.jpegBytes)} · D185{" "}
                  {formatBytes(preview.baseProfileBytes)}
                </span>
              </figcaption>
            </figure>
          ) : (
            <div className="flex h-full min-h-[560px] items-center justify-center bg-[#050505] p-8">
              <p className="max-w-sm text-center text-sm leading-6 text-zinc-600">
                Open a RAF to keep it loaded, then edit the selected recipe and render through the
                camera processor.
              </p>
            </div>
          )}
        </div>

        <aside className="border-t border-zinc-900 px-5 py-5 xl:border-l xl:border-t-0">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
                recipe controls
              </p>
              <h3 className="mt-1 text-base font-semibold text-zinc-100">
                {draftRecipe ? draftRecipe.name : "No recipe selected"}
              </h3>
            </div>
            <button
              type="button"
              disabled={!selectedRecipe}
              onClick={resetDraft}
              className="rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:text-zinc-200 disabled:cursor-not-allowed disabled:text-zinc-700"
            >
              Reset
            </button>
          </div>

          {draftRecipe ? (
            <RecipeControls recipe={draftRecipe} onChange={setDraftRecipe} />
          ) : (
            <p className="mt-5 text-sm leading-6 text-zinc-600">
              Select a recipe from the library to edit its RAF preview parameters.
            </p>
          )}
        </aside>
      </div>
    </section>
  );
}

function PreviewFigure({
  label,
  objectUrl,
  fileName,
  jpegBytes,
  baseProfileBytes,
}: {
  label: string;
  objectUrl: string;
  fileName: string;
  jpegBytes: number;
  baseProfileBytes: number;
}): JSX.Element {
  return (
    <figure className="grid bg-[#050505]">
      <div className="flex min-h-64 items-start justify-center p-1">
        <img
          src={objectUrl}
          alt={`${label} RAF render for ${fileName}`}
          className="max-h-[420px] w-full object-contain"
        />
      </div>
      <figcaption className="border-t border-zinc-900 bg-[#050505] px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-zinc-500">
        <div className="text-zinc-300">{label}</div>
        <div className="mt-1">
          JPEG {formatBytes(jpegBytes)} · D185 {formatBytes(baseProfileBytes)}
        </div>
      </figcaption>
    </figure>
  );
}

function RecipeControls({
  recipe,
  onChange,
}: {
  recipe: RecipeType;
  onChange: (recipe: RecipeType) => void;
}): JSX.Element {
  const update = (patch: Partial<RecipeType>): void => onChange({ ...recipe, ...patch });
  const updateWhiteBalance = (patch: Partial<RecipeType["whiteBalance"]>): void => {
    onChange({ ...recipe, whiteBalance: { ...recipe.whiteBalance, ...patch } });
  };
  const updateWhiteBalanceMode = (mode: RecipeType["whiteBalance"]["mode"]): void => {
    onChange({
      ...recipe,
      whiteBalance: {
        ...recipe.whiteBalance,
        mode,
        ...(mode === "ColorTemperature" && typeof recipe.whiteBalance.colorTemperatureK !== "number"
          ? { colorTemperatureK: 6500 }
          : {}),
      },
    });
  };

  return (
    <div className="mt-5 space-y-5">
      <SelectControl
        label="Film Simulation"
        value={recipe.filmSimulation}
        options={FILM_SIM_OPTIONS.map((value) => ({ value, label: humanFilmSim(value) }))}
        onChange={(value) => update({ filmSimulation: value as RecipeType["filmSimulation"] })}
      />
      <SelectControl
        label="Dynamic Range"
        value={recipe.dynamicRange}
        options={DYNAMIC_RANGE_OPTIONS.map((value) => ({
          value,
          label: describeDynamicRange(value),
        }))}
        onChange={(value) => update({ dynamicRange: value as RecipeType["dynamicRange"] })}
      />
      <RangeControl
        label="Exposure Compensation"
        value={recipe.exposureCompensation ?? 0}
        min={-5}
        max={5}
        step={1 / 3}
        format={formatExposureCompensation}
        onChange={(value) => update({ exposureCompensation: roundThird(value) })}
      />
      <SelectControl
        label="D Range Priority"
        value={recipe.dRangePriority ?? "Off"}
        options={D_RANGE_PRIORITY_OPTIONS.map((value) => ({ value, label: value }))}
        onChange={(value) =>
          update({ dRangePriority: value as NonNullable<RecipeType["dRangePriority"]> })
        }
      />
      <SelectControl
        label="White Balance"
        value={recipe.whiteBalance.mode}
        options={WHITE_BALANCE_OPTIONS.map((value) => ({
          value,
          label: WHITE_BALANCE_OPTION_LABELS[value],
        }))}
        onChange={(value) => updateWhiteBalanceMode(value as RecipeType["whiteBalance"]["mode"])}
      />
      {recipe.whiteBalance.mode === "ColorTemperature" && (
        <div>
          <RangeControl
            label="Kelvin"
            value={recipe.whiteBalance.colorTemperatureK ?? 6500}
            min={2500}
            max={10000}
            step={100}
            format={(value) => `${value}K`}
            onChange={(value) => updateWhiteBalance({ colorTemperatureK: value })}
          />
          <p className="mt-2 rounded-md border border-zinc-800 bg-zinc-950/80 px-3 py-2 text-xs leading-5 text-zinc-400">
            Kelvin is saved when writing to camera. Some Fuji RAF renders may keep the RAF file's
            original Kelvin, so verify this control with Diagnose RAF before judging the look.
          </p>
        </div>
      )}
      <RangeControl
        label="WB Shift R"
        value={recipe.whiteBalance.shiftR}
        min={-9}
        max={9}
        step={1}
        format={signedNumber}
        onChange={(value) => updateWhiteBalance({ shiftR: value })}
      />
      <RangeControl
        label="WB Shift B"
        value={recipe.whiteBalance.shiftB}
        min={-9}
        max={9}
        step={1}
        format={signedNumber}
        onChange={(value) => updateWhiteBalance({ shiftB: value })}
      />
      <RangeControl
        label="Highlight Tone"
        value={recipe.highlightTone}
        min={-2}
        max={4}
        step={0.5}
        format={signedNumber}
        onChange={(value) => update({ highlightTone: value })}
      />
      <RangeControl
        label="Shadow Tone"
        value={recipe.shadowTone}
        min={-2}
        max={4}
        step={0.5}
        format={signedNumber}
        onChange={(value) => update({ shadowTone: value })}
      />
      <RangeControl
        label="Color"
        value={recipe.color}
        min={-4}
        max={4}
        step={1}
        format={signedNumber}
        onChange={(value) => update({ color: value })}
      />
      <RangeControl
        label="Sharpness"
        value={recipe.sharpness}
        min={-4}
        max={4}
        step={1}
        format={signedNumber}
        onChange={(value) => update({ sharpness: value })}
      />
      <RangeControl
        label="High ISO NR"
        value={recipe.noiseReduction}
        min={-4}
        max={4}
        step={1}
        format={signedNumber}
        onChange={(value) => update({ noiseReduction: value })}
      />
      <RangeControl
        label="Clarity"
        value={recipe.clarity}
        min={-5}
        max={5}
        step={1}
        format={signedNumber}
        onChange={(value) => update({ clarity: value })}
      />
      <SelectControl
        label="Grain Strength"
        value={recipe.grainEffect.strength}
        options={TRI_OPTIONS.map((value) => ({ value, label: value }))}
        onChange={(value) =>
          update({
            grainEffect: {
              ...recipe.grainEffect,
              strength: value as RecipeType["grainEffect"]["strength"],
            },
          })
        }
      />
      <SelectControl
        label="Grain Size"
        value={recipe.grainEffect.size}
        options={["Small", "Large"].map((value) => ({ value, label: value }))}
        onChange={(value) =>
          update({
            grainEffect: {
              ...recipe.grainEffect,
              size: value as RecipeType["grainEffect"]["size"],
            },
          })
        }
      />
      <SelectControl
        label="Color Chrome"
        value={recipe.colorChromeEffect}
        options={TRI_OPTIONS.map((value) => ({ value, label: value }))}
        onChange={(value) =>
          update({ colorChromeEffect: value as RecipeType["colorChromeEffect"] })
        }
      />
      <SelectControl
        label="CC FX Blue"
        value={recipe.colorChromeEffectBlue}
        options={TRI_OPTIONS.map((value) => ({ value, label: value }))}
        onChange={(value) =>
          update({
            colorChromeEffectBlue: value as RecipeType["colorChromeEffectBlue"],
          })
        }
      />
      {recipe.smoothSkinEffect && (
        <SelectControl
          label="Smooth Skin"
          value={recipe.smoothSkinEffect}
          options={TRI_OPTIONS.map((value) => ({ value, label: value }))}
          onChange={(value) =>
            update({
              smoothSkinEffect: value as NonNullable<RecipeType["smoothSkinEffect"]>,
            })
          }
        />
      )}
      <div className="border-t border-zinc-900 pt-4 font-mono text-[11px] uppercase tracking-wider text-zinc-600">
        {humanFilmSim(recipe.filmSimulation)} · {describeDynamicRange(recipe.dynamicRange)} ·{" "}
        {formatExposureCompensation(recipe.exposureCompensation ?? 0)} · DPR{" "}
        {describeDRangePriority(recipe.dRangePriority)} ·{" "}
        {describeWhiteBalance(recipe.whiteBalance)} ·{" "}
        {describeWhiteBalanceShift(recipe.whiteBalance)} · {describeGrain(recipe.grainEffect)}
      </div>
    </div>
  );
}

function SelectControl({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<{ value: string; label: string }>;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-2 block text-sm text-zinc-300">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={(event) => onChange(event.currentTarget.value)}
        className="w-full rounded-md border border-zinc-800 bg-zinc-950 px-3 py-2 font-mono text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-600"
      >
        {options.map((option) => (
          <option key={option.value} value={option.value}>
            {option.label}
          </option>
        ))}
      </select>
    </label>
  );
}

function RangeControl({
  label,
  value,
  min,
  max,
  step,
  format,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  format: (value: number) => string;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="mb-2 flex items-center justify-between gap-3 text-sm text-zinc-300">
        <span>{label}</span>
        <span className="font-mono text-zinc-400">{format(value)}</span>
      </span>
      <input
        type="range"
        aria-label={label}
        value={value}
        min={min}
        max={max}
        step={step}
        onChange={(event) => onChange(Number(event.currentTarget.value))}
        className="w-full accent-emerald-500"
      />
    </label>
  );
}

function cloneRecipe(recipe: RecipeType): RecipeType {
  return {
    ...recipe,
    tags: [...recipe.tags],
    whiteBalance: { ...recipe.whiteBalance },
    grainEffect: { ...recipe.grainEffect },
    ...(recipe.monochromaticColor ? { monochromaticColor: { ...recipe.monochromaticColor } } : {}),
    ...(recipe.reasoning ? { reasoning: recipe.reasoning.map((item) => ({ ...item })) } : {}),
  };
}

function recipePreviewSignature(recipe: RecipeType): unknown {
  return {
    filmSimulation: recipe.filmSimulation,
    exposureCompensation: recipe.exposureCompensation,
    dynamicRange: recipe.dynamicRange,
    dRangePriority: recipe.dRangePriority,
    whiteBalance: recipe.whiteBalance,
    highlightTone: recipe.highlightTone,
    shadowTone: recipe.shadowTone,
    color: recipe.color,
    sharpness: recipe.sharpness,
    noiseReduction: recipe.noiseReduction,
    clarity: recipe.clarity,
    grainEffect: recipe.grainEffect,
    colorChromeEffect: recipe.colorChromeEffect,
    colorChromeEffectBlue: recipe.colorChromeEffectBlue,
    smoothSkinEffect: recipe.smoothSkinEffect,
  };
}

function roundThird(value: number): number {
  return Math.round(value * 3) / 3;
}

function makeRenderSignature(file: File, draftSignature: string): string {
  return `${file.name}:${file.size}:${file.lastModified}:${draftSignature}`;
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
}
