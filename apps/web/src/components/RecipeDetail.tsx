import { useState, type JSX } from "react";
import clsx from "clsx";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { useRecipesStore } from "../stores/recipes";
import { detectLocale, useT } from "../i18n";
import {
  describeGrain,
  describeWhiteBalance,
  formatDate,
  humanFilmSim,
  signedNumber,
} from "./format";

export interface RecipeDetailProps {
  recipe: RecipeType;
}

export function RecipeDetail({ recipe }: RecipeDetailProps): JSX.Element {
  const t = useT();
  const locale = detectLocale();
  const isFavorite = useRecipesStore((s) => s.favorites.has(recipe.id));
  const toggleFavorite = useRecipesStore((s) => s.toggleFavorite);
  const [copied, setCopied] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);

  const handleCopy = async (): Promise<void> => {
    const json = JSON.stringify(recipe, null, 2);
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(json);
      }
    } catch {
      // best effort — fall back to no-op; the user sees no feedback change
      return;
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  return (
    <article className="flex flex-col gap-6 px-8 py-8">
      <header className="flex flex-col gap-2 border-b border-zinc-900 pb-6">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
              {humanFilmSim(recipe.filmSimulation)}
            </p>
            <h2 className="mt-1 text-2xl font-semibold tracking-tight text-zinc-50">
              {recipe.name}
            </h2>
          </div>
          <div className="flex flex-shrink-0 items-center gap-2">
            <button
              type="button"
              onClick={() => toggleFavorite(recipe.id)}
              aria-pressed={isFavorite}
              className={clsx(
                "rounded-sm border px-3 py-1.5 text-xs transition-colors",
                isFavorite
                  ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                  : "border-zinc-800 text-zinc-400 hover:border-zinc-700",
              )}
            >
              {isFavorite
                ? t("detail.favourite.remove")
                : t("detail.favourite.add")}
            </button>
            <button
              type="button"
              onClick={() => void handleCopy()}
              className="rounded-sm border border-zinc-800 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
            >
              {copied ? t("detail.copyJson.copied") : t("detail.copyJson")}
            </button>
          </div>
        </div>
        {recipe.description && (
          <p className="max-w-2xl text-sm leading-relaxed text-zinc-400">
            {recipe.description}
          </p>
        )}
      </header>

      <section aria-labelledby="params-heading" className="flex flex-col gap-3">
        <h3
          id="params-heading"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          {t("detail.parameters.section")}
        </h3>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 border-t border-zinc-900 pt-4 sm:grid-cols-2">
          <Param label={t("param.filmSimulation")} value={humanFilmSim(recipe.filmSimulation)} />
          <Param label={t("param.dynamicRange")} value={recipe.dynamicRange} />
          <Param
            label={t("param.whiteBalance")}
            value={describeWhiteBalance(recipe.whiteBalance)}
          />
          <Param
            label={t("param.whiteBalance.shift")}
            value={`R ${signedNumber(recipe.whiteBalance.shiftR)} · B ${signedNumber(
              recipe.whiteBalance.shiftB,
            )}`}
          />
          <Param
            label={t("param.highlightTone")}
            value={signedNumber(recipe.highlightTone)}
          />
          <Param
            label={t("param.shadowTone")}
            value={signedNumber(recipe.shadowTone)}
          />
          <Param label={t("param.color")} value={signedNumber(recipe.color)} />
          <Param
            label={t("param.sharpness")}
            value={signedNumber(recipe.sharpness)}
          />
          <Param
            label={t("param.noiseReduction")}
            value={signedNumber(recipe.noiseReduction)}
          />
          <Param label={t("param.clarity")} value={signedNumber(recipe.clarity)} />
          <Param
            label={t("param.grainEffect")}
            value={describeGrain(recipe.grainEffect)}
          />
          <Param
            label={t("param.colorChromeEffect")}
            value={recipe.colorChromeEffect}
          />
          <Param
            label={t("param.colorChromeEffectBlue")}
            value={recipe.colorChromeEffectBlue}
          />
          {recipe.smoothSkinEffect && (
            <Param
              label={t("param.smoothSkinEffect")}
              value={recipe.smoothSkinEffect}
            />
          )}
          {recipe.monochromaticColor && (
            <Param
              label={t("param.monochromaticColor")}
              value={`WC ${signedNumber(
                recipe.monochromaticColor.warmCool,
              )} · MG ${signedNumber(recipe.monochromaticColor.greenMagenta)}`}
            />
          )}
        </dl>
      </section>

      <section aria-labelledby="meta-heading" className="flex flex-col gap-3">
        <h3
          id="meta-heading"
          className="text-xs font-medium uppercase tracking-wider text-zinc-500"
        >
          {t("detail.metadata.section")}
        </h3>
        <dl className="grid grid-cols-1 gap-x-8 gap-y-3 border-t border-zinc-900 pt-4 sm:grid-cols-2">
          <Param
            label={t("detail.metadata.author")}
            value={recipe.author ?? "—"}
          />
          <Param
            label={t("detail.metadata.camera")}
            value={`${recipe.cameraModel} (${recipe.capabilitySetId})`}
          />
          <Param
            label={t("detail.metadata.created")}
            value={formatDate(recipe.createdAt, locale)}
          />
          <Param
            label={t("detail.metadata.tags")}
            value={recipe.tags?.length ? recipe.tags.join(", ") : "—"}
          />
        </dl>
      </section>

      <section className="flex flex-col gap-3">
        <button
          type="button"
          onClick={() => setShowWalkthrough((v) => !v)}
          aria-expanded={showWalkthrough}
          className="self-start rounded-sm border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300 transition-colors hover:border-zinc-700"
        >
          {t("detail.setupWalkthrough")}
        </button>
        {showWalkthrough && <Walkthrough recipe={recipe} />}
      </section>
    </article>
  );
}

function Param({
  label,
  value,
}: {
  label: string;
  value: string;
}): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-900/40 pb-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-zinc-200">{value}</dd>
    </div>
  );
}

function Walkthrough({ recipe }: { recipe: RecipeType }): JSX.Element {
  const t = useT();
  const steps = [
    `Set film simulation to ${humanFilmSim(recipe.filmSimulation)}`,
    `Dynamic range: ${recipe.dynamicRange}`,
    `White balance: ${describeWhiteBalance(recipe.whiteBalance)} (shift R ${signedNumber(recipe.whiteBalance.shiftR)} / B ${signedNumber(recipe.whiteBalance.shiftB)})`,
    `Highlight tone ${signedNumber(recipe.highlightTone)} · Shadow tone ${signedNumber(recipe.shadowTone)}`,
    `Color ${signedNumber(recipe.color)} · Sharpness ${signedNumber(recipe.sharpness)} · Noise reduction ${signedNumber(recipe.noiseReduction)} · Clarity ${signedNumber(recipe.clarity)}`,
    `Grain ${describeGrain(recipe.grainEffect)} · Color chrome ${recipe.colorChromeEffect} · Color chrome blue ${recipe.colorChromeEffectBlue}`,
  ];
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-zinc-900 bg-zinc-900/40 p-4">
      <p className="text-xs leading-relaxed text-zinc-400">
        {t("detail.setupWalkthrough.intro")}
      </p>
      <ol className="flex list-decimal flex-col gap-1.5 pl-5 text-sm text-zinc-300">
        {steps.map((s, i) => (
          <li key={i} className="leading-relaxed">
            {s}
          </li>
        ))}
      </ol>
    </div>
  );
}
