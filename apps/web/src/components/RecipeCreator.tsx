import { useMemo, useState, type ChangeEvent, type JSX } from "react";
import clsx from "clsx";
import type { RecipeType } from "@latent/recipe-schema/browser";
import {
  CREATOR_FILM_SIMULATIONS,
  CREATOR_PRESETS,
  createRecipeFromCreatorInput,
  presetInput,
  type CreatorGrainStrength,
  type CreatorPresetId,
  type RecipeCreatorInput,
} from "../lib/recipe-creator";
import { useRecipesStore } from "../stores/recipes";
import {
  describeDynamicRange,
  describeGrain,
  describeWhiteBalance,
  describeWhiteBalanceShift,
  humanFilmSim,
  signedNumber,
} from "./format";

export function RecipeCreator(): JSX.Element {
  const importRecipe = useRecipesStore((state) => state.importRecipe);
  const [input, setInput] = useState<RecipeCreatorInput>(() => presetInput("warm-city"));
  const [lastCreated, setLastCreated] = useState<string | null>(null);
  const draftRecipe = useMemo(
    () =>
      createRecipeFromCreatorInput(input, {
        id: "00000000-0000-4000-8000-000000000001",
        createdAt: "2026-05-05T00:00:00.000Z",
      }),
    [input],
  );

  const updateInput = (patch: Partial<RecipeCreatorInput>): void => {
    setLastCreated(null);
    setInput((current) => ({ ...current, ...patch }));
  };

  const applyPreset = (presetId: CreatorPresetId): void => {
    setLastCreated(null);
    setInput(presetInput(presetId));
  };

  const createRecipe = (destination?: "#raf" | "#library"): void => {
    const recipe = createRecipeFromCreatorInput(input);
    importRecipe(recipe);
    setLastCreated(recipe.name);
    if (destination) window.location.hash = destination;
  };

  return (
    <div className="grid min-h-[72vh] gap-px bg-zinc-900 lg:grid-cols-[minmax(300px,390px)_minmax(0,1fr)]">
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
          Start from a photographic intent, then tune the writable settings that are useful in RAF
          preview and camera slots.
        </p>

        <div className="mt-6 space-y-6">
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
                  aria-pressed={input.presetId === preset.id}
                  className={clsx(
                    "rounded-md border px-3 py-3 text-left transition-colors",
                    input.presetId === preset.id
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
          </fieldset>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Recipe name
            </span>
            <input
              type="text"
              value={input.name}
              maxLength={80}
              onChange={(event) => updateInput({ name: event.target.value })}
              className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors placeholder:text-zinc-600 focus:border-emerald-500/50"
            />
          </label>

          <label className="block">
            <span className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Film simulation
            </span>
            <select
              value={input.filmSimulation}
              onChange={(event: ChangeEvent<HTMLSelectElement>) =>
                updateInput({
                  filmSimulation: event.target.value as RecipeType["filmSimulation"],
                })
              }
              className="mt-2 w-full rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2.5 text-sm text-zinc-100 outline-none transition-colors focus:border-emerald-500/50"
            >
              {CREATOR_FILM_SIMULATIONS.map((filmSimulation) => (
                <option key={filmSimulation} value={filmSimulation}>
                  {humanFilmSim(filmSimulation)}
                </option>
              ))}
            </select>
          </label>

          <CreatorSlider
            label="Warmth"
            value={input.warmth}
            min={-2}
            max={2}
            left="Cool"
            right="Warm"
            onChange={(warmth) => updateInput({ warmth })}
          />
          <CreatorSlider
            label="Contrast"
            value={input.contrast}
            min={-2}
            max={2}
            left="Soft"
            right="Hard"
            onChange={(contrast) => updateInput({ contrast })}
          />

          <fieldset>
            <legend className="text-xs font-medium uppercase tracking-wider text-zinc-500">
              Grain
            </legend>
            <div className="mt-2 grid grid-cols-3 gap-2">
              {(["Off", "Weak", "Strong"] as CreatorGrainStrength[]).map((grainStrength) => (
                <button
                  key={grainStrength}
                  type="button"
                  onClick={() => updateInput({ grainStrength })}
                  aria-pressed={input.grainStrength === grainStrength}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-xs transition-colors",
                    input.grainStrength === grainStrength
                      ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300"
                      : "border-zinc-800 bg-zinc-900 text-zinc-400 hover:border-zinc-700",
                  )}
                >
                  {grainStrength}
                </button>
              ))}
            </div>
          </fieldset>
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
          </div>
        </div>

        {lastCreated && (
          <p className="mt-4 rounded-md border border-emerald-500/30 bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            Created “{lastCreated}” and selected it in the library.
          </p>
        )}

        <div className="mt-7 grid gap-8 xl:grid-cols-[minmax(0,1fr)_minmax(320px,0.62fr)]">
          <section aria-labelledby="creator-params-heading">
            <h4
              id="creator-params-heading"
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
            >
              Generated settings
            </h4>
            <dl className="mt-4 grid grid-cols-1 gap-x-8 gap-y-3 border-t border-zinc-900 pt-4 sm:grid-cols-2">
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
        </div>
      </section>
    </div>
  );
}

function CreatorSlider({
  label,
  value,
  min,
  max,
  left,
  right,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  left: string;
  right: string;
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
        step={1}
        value={value}
        onChange={(event) => onChange(Number(event.target.value))}
        className="mt-3 w-full accent-emerald-400"
      />
      <span className="mt-1 flex items-center justify-between text-[11px] text-zinc-600">
        <span>{left}</span>
        <span>{right}</span>
      </span>
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
