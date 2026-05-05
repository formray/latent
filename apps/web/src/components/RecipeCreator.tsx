import { useMemo, useState, type JSX } from "react";
import clsx from "clsx";
import type { RecipeType } from "@latent/recipe-schema/browser";
import {
  CREATOR_D_RANGE_PRIORITIES,
  CREATOR_DYNAMIC_RANGES,
  CREATOR_FILM_SIMULATIONS,
  CREATOR_GRAIN_SIZES,
  CREATOR_PRESETS,
  CREATOR_TRI_STATES,
  CREATOR_WHITE_BALANCE_MODES,
  createRecipeFromCreatorInput,
  isMonochromeFilmSimulation,
  presetInput,
  recipeToCreatorInput,
  type CreatorDRangePriority,
  type CreatorGrainSize,
  type CreatorGrainStrength,
  type CreatorPresetId,
  type CreatorTriState,
  type CreatorWhiteBalanceMode,
  type RecipeCreatorInput,
} from "../lib/recipe-creator";
import { downloadRecipeJson, serializeRecipeJson } from "../lib/recipe-json";
import { useRecipesStore } from "../stores/recipes";
import {
  describeDRangePriority,
  describeDynamicRange,
  describeGrain,
  describeWhiteBalance,
  describeWhiteBalanceShift,
  humanFilmSim,
  signedNumber,
} from "./format";

type CreatorStatus = { kind: "created" | "copied"; message: string } | null;

export function RecipeCreator(): JSX.Element {
  const importRecipe = useRecipesStore((state) => state.importRecipe);
  const recipes = useRecipesStore((state) => state.recipes);
  const selectedRecipeId = useRecipesStore((state) => state.selectedRecipeId);
  const selectedRecipe = recipes.find((recipe) => recipe.id === selectedRecipeId) ?? null;
  const [input, setInput] = useState<RecipeCreatorInput>(() => presetInput("warm-city"));
  const [status, setStatus] = useState<CreatorStatus>(null);
  const draftRecipe = useMemo(
    () =>
      createRecipeFromCreatorInput(input, {
        id: "00000000-0000-4000-8000-000000000001",
        createdAt: "2026-05-05T00:00:00.000Z",
      }),
    [input],
  );
  const isMono = isMonochromeFilmSimulation(input.filmSimulation);

  const updateInput = (patch: Partial<RecipeCreatorInput>): void => {
    setStatus(null);
    setInput((current) => ({ ...current, ...patch }));
  };

  const applyPreset = (presetId: CreatorPresetId): void => {
    setStatus(null);
    setInput(presetInput(presetId));
  };

  const loadSelectedRecipe = (): void => {
    if (!selectedRecipe) return;
    setStatus(null);
    setInput(recipeToCreatorInput(selectedRecipe));
  };

  const createRecipe = (destination?: "#raf" | "#library"): void => {
    const recipe = createRecipeFromCreatorInput(input);
    importRecipe(recipe);
    setStatus({ kind: "created", message: `Created “${recipe.name}” and selected it.` });
    if (destination) window.location.hash = destination;
  };

  const copyJson = async (): Promise<void> => {
    try {
      await navigator.clipboard?.writeText(serializeRecipeJson(draftRecipe));
      setStatus({ kind: "copied", message: "Recipe JSON copied." });
    } catch {
      setStatus({ kind: "copied", message: "Clipboard is unavailable in this browser." });
    }
  };

  return (
    <div className="grid min-h-[72vh] gap-px bg-zinc-900 lg:grid-cols-[minmax(340px,430px)_minmax(0,1fr)]">
      <section className="bg-zinc-950 px-4 py-5 sm:px-6 lg:py-7" aria-labelledby="creator-heading">
        <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
          creator
        </p>
        <h2
          id="creator-heading"
          className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50"
        >
          Build a recipe
        </h2>
        <p className="mt-3 text-sm leading-6 text-zinc-500">
          Start from an intent or duplicate the selected look, then edit every schema-backed Fuji
          setting before saving it to the library.
        </p>

        <div className="mt-6 space-y-7">
          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Intent
            </legend>
            <div className="mt-3 grid gap-2">
              {CREATOR_PRESETS.map((preset) => (
                <button
                  key={preset.id}
                  type="button"
                  onClick={() => applyPreset(preset.id)}
                  aria-pressed={input.presetId === preset.id && !input.parentRecipeId}
                  className={clsx(
                    "rounded-md border px-3 py-3 text-left transition-colors",
                    input.presetId === preset.id && !input.parentRecipeId
                      ? "border-emerald-500/50 bg-emerald-500/10"
                      : "border-zinc-800 bg-zinc-900/50 hover:border-zinc-700",
                  )}
                >
                  <span className="block text-sm font-medium text-zinc-100">{preset.label}</span>
                  <span className="mt-1 block text-xs leading-5 text-zinc-500">
                    {preset.description}
                  </span>
                </button>
              ))}
            </div>
            <button
              type="button"
              onClick={loadSelectedRecipe}
              disabled={!selectedRecipe}
              className={clsx(
                "mt-3 w-full rounded-md border px-3 py-2 text-left text-xs transition-colors",
                selectedRecipe
                  ? "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                  : "cursor-not-allowed border-zinc-900 text-zinc-700",
              )}
            >
              Duplicate selected{selectedRecipe ? `: ${selectedRecipe.name}` : ""}
            </button>
          </fieldset>

          <EditorSection title="Identity">
            <InputField
              label="Recipe name"
              value={input.name}
              maxLength={80}
              onChange={(name) => updateInput({ name })}
            />
            <TextareaField
              label="Description"
              value={input.description}
              maxLength={500}
              onChange={(description) => updateInput({ description })}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Author"
                value={input.author}
                maxLength={80}
                onChange={(author) => updateInput({ author })}
              />
              <InputField
                label="Tags"
                value={input.tags}
                onChange={(tags) => updateInput({ tags })}
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <InputField
                label="Camera model"
                value={input.cameraModel}
                maxLength={80}
                onChange={(cameraModel) => updateInput({ cameraModel })}
              />
              <InputField
                label="Capability set"
                value={input.capabilitySetId}
                maxLength={80}
                onChange={(capabilitySetId) => updateInput({ capabilitySetId })}
              />
            </div>
          </EditorSection>
        </div>
      </section>

      <section className="min-w-0 bg-zinc-950 px-4 py-5 sm:px-6 lg:px-8 lg:py-7">
        <div className="flex flex-col gap-5 border-b border-zinc-900 pb-6 md:flex-row md:items-start md:justify-between">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              {humanFilmSim(draftRecipe.filmSimulation)}
            </p>
            <h3 className="mt-1 text-3xl font-semibold tracking-tight text-zinc-50">
              {draftRecipe.name}
            </h3>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-zinc-500">
              {draftRecipe.description}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => createRecipe()}
              className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-4 py-2 text-sm font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15"
            >
              Create recipe
            </button>
            <button
              type="button"
              onClick={() => createRecipe("#raf")}
              className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              Preview in RAF
            </button>
            <button
              type="button"
              onClick={() => createRecipe("#library")}
              className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              Open in library
            </button>
            <button
              type="button"
              onClick={() => void copyJson()}
              className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              Copy JSON
            </button>
            <button
              type="button"
              onClick={() => downloadRecipeJson(draftRecipe)}
              className="rounded-md border border-zinc-800 px-4 py-2 text-sm text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              Download JSON
            </button>
          </div>
        </div>

        {status && (
          <p
            className={clsx(
              "mt-4 rounded-md border px-3 py-2 text-sm",
              status.kind === "created"
                ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
                : "border-zinc-800 bg-zinc-900/50 text-zinc-300",
            )}
          >
            {status.message}
          </p>
        )}

        <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,0.96fr)_minmax(320px,0.64fr)]">
          <div className="space-y-8">
            <EditorSection title="Film and exposure">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Film simulation"
                  value={input.filmSimulation}
                  options={CREATOR_FILM_SIMULATIONS}
                  format={humanFilmSim}
                  onChange={(filmSimulation) =>
                    updateInput({
                      filmSimulation: filmSimulation as RecipeType["filmSimulation"],
                    })
                  }
                />
                <SelectField
                  label="Dynamic range"
                  value={input.dynamicRange}
                  options={CREATOR_DYNAMIC_RANGES}
                  format={describeDynamicRange}
                  onChange={(dynamicRange) =>
                    updateInput({ dynamicRange: dynamicRange as RecipeType["dynamicRange"] })
                  }
                />
                <SelectField
                  label="D-range priority"
                  value={input.dRangePriority}
                  options={CREATOR_D_RANGE_PRIORITIES}
                  format={describeDRangePriority}
                  onChange={(dRangePriority) =>
                    updateInput({ dRangePriority: dRangePriority as CreatorDRangePriority })
                  }
                />
                <NumberField
                  label="Exposure compensation"
                  value={input.exposureCompensation}
                  min={-5}
                  max={5}
                  step={0.1}
                  onChange={(exposureCompensation) => updateInput({ exposureCompensation })}
                />
              </div>
            </EditorSection>

            <EditorSection title="White balance">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="White balance mode"
                  value={input.whiteBalanceMode}
                  options={CREATOR_WHITE_BALANCE_MODES}
                  format={formatWhiteBalanceMode}
                  onChange={(whiteBalanceMode) =>
                    updateInput({ whiteBalanceMode: whiteBalanceMode as CreatorWhiteBalanceMode })
                  }
                />
                <NumberField
                  label="Kelvin"
                  value={input.colorTemperatureK}
                  min={2500}
                  max={10000}
                  step={100}
                  disabled={input.whiteBalanceMode !== "ColorTemperature"}
                  onChange={(colorTemperatureK) => updateInput({ colorTemperatureK })}
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <RangeField
                  label="WB shift R"
                  value={input.shiftR}
                  min={-9}
                  max={9}
                  step={1}
                  onChange={(shiftR) => updateInput({ shiftR })}
                />
                <RangeField
                  label="WB shift B"
                  value={input.shiftB}
                  min={-9}
                  max={9}
                  step={1}
                  onChange={(shiftB) => updateInput({ shiftB })}
                />
              </div>
            </EditorSection>

            <EditorSection title="Tone and texture">
              <div className="grid gap-4 sm:grid-cols-2">
                <RangeField
                  label="Highlight tone"
                  value={input.highlightTone}
                  min={-2}
                  max={4}
                  step={0.5}
                  onChange={(highlightTone) => updateInput({ highlightTone })}
                />
                <RangeField
                  label="Shadow tone"
                  value={input.shadowTone}
                  min={-2}
                  max={4}
                  step={0.5}
                  onChange={(shadowTone) => updateInput({ shadowTone })}
                />
                <RangeField
                  label="Color"
                  value={input.color}
                  min={-4}
                  max={4}
                  step={1}
                  disabled={isMono}
                  onChange={(color) => updateInput({ color })}
                />
                <RangeField
                  label="Sharpness"
                  value={input.sharpness}
                  min={-4}
                  max={4}
                  step={1}
                  onChange={(sharpness) => updateInput({ sharpness })}
                />
                <RangeField
                  label="Noise reduction"
                  value={input.noiseReduction}
                  min={-4}
                  max={4}
                  step={1}
                  onChange={(noiseReduction) => updateInput({ noiseReduction })}
                />
                <RangeField
                  label="Clarity"
                  value={input.clarity}
                  min={-5}
                  max={5}
                  step={1}
                  onChange={(clarity) => updateInput({ clarity })}
                />
              </div>
            </EditorSection>

            <EditorSection title="Effects">
              <div className="grid gap-3 sm:grid-cols-2">
                <SelectField
                  label="Grain strength"
                  value={input.grainStrength}
                  options={CREATOR_TRI_STATES}
                  onChange={(grainStrength) =>
                    updateInput({ grainStrength: grainStrength as CreatorGrainStrength })
                  }
                />
                <SelectField
                  label="Grain size"
                  value={input.grainSize}
                  options={CREATOR_GRAIN_SIZES}
                  disabled={input.grainStrength === "Off"}
                  onChange={(grainSize) =>
                    updateInput({ grainSize: grainSize as CreatorGrainSize })
                  }
                />
                <SelectField
                  label="Color chrome"
                  value={input.colorChromeEffect}
                  options={CREATOR_TRI_STATES}
                  disabled={isMono}
                  onChange={(colorChromeEffect) =>
                    updateInput({ colorChromeEffect: colorChromeEffect as CreatorTriState })
                  }
                />
                <SelectField
                  label="Color chrome blue"
                  value={input.colorChromeEffectBlue}
                  options={CREATOR_TRI_STATES}
                  disabled={isMono}
                  onChange={(colorChromeEffectBlue) =>
                    updateInput({ colorChromeEffectBlue: colorChromeEffectBlue as CreatorTriState })
                  }
                />
                <SelectField
                  label="Smooth skin"
                  value={input.smoothSkinEffect}
                  options={CREATOR_TRI_STATES}
                  onChange={(smoothSkinEffect) =>
                    updateInput({ smoothSkinEffect: smoothSkinEffect as CreatorTriState })
                  }
                />
              </div>
              {isMono && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <RangeField
                    label="Mono warm/cool"
                    value={input.monochromaticWarmCool}
                    min={-9}
                    max={9}
                    step={1}
                    onChange={(monochromaticWarmCool) => updateInput({ monochromaticWarmCool })}
                  />
                  <RangeField
                    label="Mono green/magenta"
                    value={input.monochromaticGreenMagenta}
                    min={-9}
                    max={9}
                    step={1}
                    onChange={(monochromaticGreenMagenta) =>
                      updateInput({ monochromaticGreenMagenta })
                    }
                  />
                </div>
              )}
            </EditorSection>
          </div>

          <aside className="space-y-8">
            <section aria-labelledby="creator-params-heading">
              <h4
                id="creator-params-heading"
                className="text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Generated settings
              </h4>
              <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-zinc-900 pt-4 sm:grid-cols-2 xl:grid-cols-1">
                <CreatorParam
                  label="Dynamic Range"
                  value={describeDynamicRange(draftRecipe.dynamicRange)}
                />
                <CreatorParam
                  label="White Balance"
                  value={describeWhiteBalance(draftRecipe.whiteBalance)}
                />
                <CreatorParam
                  label="WB Shift"
                  value={describeWhiteBalanceShift(draftRecipe.whiteBalance)}
                />
                <CreatorParam label="Highlight" value={signedNumber(draftRecipe.highlightTone)} />
                <CreatorParam label="Shadow" value={signedNumber(draftRecipe.shadowTone)} />
                <CreatorParam label="Color" value={signedNumber(draftRecipe.color)} />
                <CreatorParam label="Sharpness" value={signedNumber(draftRecipe.sharpness)} />
                <CreatorParam
                  label="Noise Reduction"
                  value={signedNumber(draftRecipe.noiseReduction)}
                />
                <CreatorParam label="Clarity" value={signedNumber(draftRecipe.clarity)} />
                <CreatorParam label="Grain" value={describeGrain(draftRecipe.grainEffect)} />
                <CreatorParam label="Color Chrome" value={draftRecipe.colorChromeEffect} />
                <CreatorParam label="Chrome Blue" value={draftRecipe.colorChromeEffectBlue} />
                {draftRecipe.monochromaticColor && (
                  <CreatorParam
                    label="Mono Color"
                    value={`WC ${signedNumber(
                      draftRecipe.monochromaticColor.warmCool,
                    )} · MG ${signedNumber(draftRecipe.monochromaticColor.greenMagenta)}`}
                  />
                )}
              </dl>
            </section>

            <section aria-labelledby="creator-reasoning-heading">
              <h4
                id="creator-reasoning-heading"
                className="text-xs font-medium uppercase tracking-wider text-zinc-500"
              >
                Rationale
              </h4>
              <ol className="mt-4 divide-y divide-zinc-900 border-t border-zinc-900">
                {(draftRecipe.reasoning ?? []).map((reason) => (
                  <li key={reason.parameter} className="py-4">
                    <p className="text-sm font-medium text-zinc-100">{reason.parameter}</p>
                    <p className="mt-1 text-sm leading-6 text-zinc-500">{reason.reason}</p>
                  </li>
                ))}
              </ol>
            </section>
          </aside>
        </div>
      </section>
    </div>
  );
}

function EditorSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}): JSX.Element {
  return (
    <section className="space-y-4">
      <h4 className="text-xs font-medium uppercase tracking-wider text-zinc-500">{title}</h4>
      <div className="space-y-4 border-t border-zinc-900 pt-4">{children}</div>
    </section>
  );
}

function InputField({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        type="text"
        value={value}
        maxLength={maxLength}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/50"
      />
    </label>
  );
}

function TextareaField({
  label,
  value,
  maxLength,
  onChange,
}: {
  label: string;
  value: string;
  maxLength?: number;
  onChange: (value: string) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <textarea
        value={value}
        maxLength={maxLength}
        rows={3}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full resize-none rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm leading-6 text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/50"
      />
    </label>
  );
}

function SelectField<T extends string>({
  label,
  value,
  options,
  disabled = false,
  format = (option) => option,
  onChange,
}: {
  label: string;
  value: T;
  options: readonly T[];
  disabled?: boolean;
  format?: (option: T) => string;
  onChange: (value: T) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <select
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(event.target.value as T)}
        className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500/50 disabled:cursor-not-allowed disabled:text-zinc-600"
      >
        {options.map((option) => (
          <option key={option} value={option}>
            {format(option)}
          </option>
        ))}
      </select>
    </label>
  );
}

function NumberField({
  label,
  value,
  min,
  max,
  step,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
      <input
        type="number"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500/50 disabled:cursor-not-allowed disabled:text-zinc-600"
      />
    </label>
  );
}

function RangeField({
  label,
  value,
  min,
  max,
  step,
  disabled = false,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step: number;
  disabled?: boolean;
  onChange: (value: number) => void;
}): JSX.Element {
  return (
    <label className="block">
      <span className="flex items-center justify-between gap-3">
        <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">{label}</span>
        <span className="font-mono text-xs text-zinc-400">{signedNumber(value)}</span>
      </span>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        disabled={disabled}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-emerald-400 disabled:opacity-40"
      />
    </label>
  );
}

function CreatorParam({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div>
      <dt className="font-mono text-[10px] uppercase tracking-[0.2em] text-zinc-600">{label}</dt>
      <dd className="mt-1 text-sm font-medium text-zinc-100">{value}</dd>
    </div>
  );
}

function formatWhiteBalanceMode(mode: CreatorWhiteBalanceMode): string {
  const recipe: RecipeType["whiteBalance"] = { mode, shiftR: 0, shiftB: 0 };
  return describeWhiteBalance(recipe);
}
