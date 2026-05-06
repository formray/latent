import { useMemo, useRef, useState, type ChangeEvent, type FormEvent, type JSX } from "react";
import clsx from "clsx";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { useRecipesStore } from "../stores/recipes";
import { useCameraStore, type CameraWriteStatus, type RawPreviewStatus } from "../stores/camera";
import type { CameraSlotBackup } from "../lib/camera-slot-backups";
import { findCameraSlotBackups } from "../lib/camera-slot-backups";
import { detectLocale, useT } from "../i18n";
import {
  describeDynamicRange,
  describeDRangePriority,
  describeGrain,
  describeWhiteBalance,
  describeWhiteBalanceShift,
  formatDate,
  formatExposureCompensation,
  humanFilmSim,
  signedNumber,
} from "./format";
import { downloadRecipeJson, serializeRecipeJson } from "../lib/recipe-json";
import { recipeShareUrl } from "../lib/recipe-share";

export interface RecipeDetailProps {
  recipe: RecipeType;
}

export function RecipeDetail({ recipe }: RecipeDetailProps): JSX.Element {
  const t = useT();
  const locale = detectLocale();
  const rafInputRef = useRef<HTMLInputElement | null>(null);
  const rafPreviewModeRef = useRef<"single" | "diagnostic">("single");
  const isFavorite = useRecipesStore((s) => s.favorites.has(recipe.id));
  const toggleFavorite = useRecipesStore((s) => s.toggleFavorite);
  const deleteRecipe = useRecipesStore((s) => s.deleteRecipe);
  const renameRecipe = useRecipesStore((s) => s.renameRecipe);
  const recipes = useRecipesStore((s) => s.recipes);
  const cameraState = useCameraStore((s) => s.state);
  const cameraConnected = useCameraStore((s) => s.isConnected());
  const rawPreviewStatus = useCameraStore((s) => s.rawPreviewStatus);
  const renderRawPreview = useCameraStore((s) => s.renderRawPreview);
  const renderRawPreviewDiagnostics = useCameraStore((s) => s.renderRawPreviewDiagnostics);
  const writeStatus = useCameraStore((s) => s.writeStatus);
  const writeRecipeToSlot = useCameraStore((s) => s.writeRecipeToSlot);
  const [copied, setCopied] = useState(false);
  const [shared, setShared] = useState(false);
  const [showWalkthrough, setShowWalkthrough] = useState(false);
  const [editingName, setEditingName] = useState(false);
  const [draftName, setDraftName] = useState(recipe.name);
  const slotBackups = useMemo(
    () => findCameraSlotBackups(recipes, cameraState),
    [recipes, cameraState],
  );

  const handleCopy = async (): Promise<void> => {
    const json = serializeRecipeJson(recipe);
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

  const handleShare = async (): Promise<void> => {
    try {
      await navigator.clipboard?.writeText(recipeShareUrl(recipe));
      setShared(true);
      setTimeout(() => setShared(false), 1500);
    } catch {
      setShared(false);
    }
  };

  const handleDelete = (): void => {
    if (!window.confirm(t("detail.delete.confirm"))) return;
    deleteRecipe(recipe.id);
  };

  const startRename = (): void => {
    setDraftName(recipe.name);
    setEditingName(true);
  };

  const handleRename = (event: FormEvent<HTMLFormElement>): void => {
    event.preventDefault();
    const nextName = draftName.trim();
    if (!nextName) return;
    renameRecipe(recipe.id, nextName);
    setEditingName(false);
  };

  const handleWrite = (slot: number): void => {
    const backup = slotBackups.find((entry) => entry.slot === slot);
    const confirmKey = backup
      ? "detail.cameraWrite.confirmWithBackup"
      : "detail.cameraWrite.confirmWithoutBackup";
    if (
      !window.confirm(
        t(confirmKey, {
          slot,
          backup: backup?.recipe.name ?? "",
        }),
      )
    ) {
      return;
    }
    void writeRecipeToSlot(recipe, slot);
  };

  const handleRestore = (slot: number, backup: RecipeType): void => {
    if (!window.confirm(t("detail.cameraRestore.confirm", { slot, backup: backup.name }))) {
      return;
    }
    void writeRecipeToSlot(backup, slot);
  };

  const handlePreviewFile = (event: ChangeEvent<HTMLInputElement>): void => {
    const file = event.currentTarget.files?.[0];
    if (!file) return;
    document.getElementById("raw-preview-panel")?.scrollIntoView({
      block: "start",
      behavior: "smooth",
    });
    if (rafPreviewModeRef.current === "diagnostic") {
      void renderRawPreviewDiagnostics(file, recipe);
    } else {
      void renderRawPreview(file, recipe);
    }
    event.currentTarget.value = "";
  };

  const openRafPicker = (mode: "single" | "diagnostic"): void => {
    rafPreviewModeRef.current = mode;
    rafInputRef.current?.click();
  };

  const parentRecipe = recipe.parentRecipeId
    ? (recipes.find((candidate) => candidate.id === recipe.parentRecipeId) ?? null)
    : null;

  return (
    <article className="flex w-full max-w-none flex-col gap-7 px-4 py-5 sm:px-6 sm:py-8 lg:px-8">
      <header className="min-w-0 border-b border-zinc-900 pb-6">
        <p className="font-mono text-xs uppercase tracking-wider text-zinc-500">
          {humanFilmSim(recipe.filmSimulation)}
        </p>
        {editingName ? (
          <form
            onSubmit={handleRename}
            className="mt-2 flex max-w-3xl flex-col gap-2 sm:flex-row sm:items-center"
          >
            <input
              type="text"
              value={draftName}
              onChange={(event) => setDraftName(event.target.value)}
              aria-label={t("detail.rename.input")}
              className={clsx(
                "min-w-0 flex-1 rounded-md border border-zinc-800 bg-zinc-900 px-3 py-2",
                "text-2xl font-semibold tracking-tight text-zinc-50 focus:border-emerald-500/50 focus:outline-none",
              )}
              autoFocus
            />
            <div className="flex gap-2">
              <button
                type="submit"
                className="rounded-md border border-emerald-500/40 bg-emerald-500/10 px-3 py-2 text-xs font-medium text-emerald-300 transition-colors hover:bg-emerald-500/15"
              >
                {t("detail.rename.save")}
              </button>
              <button
                type="button"
                onClick={() => setEditingName(false)}
                className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
              >
                {t("detail.rename.cancel")}
              </button>
            </div>
          </form>
        ) : (
          <div className="mt-1 flex max-w-3xl flex-wrap items-start gap-3">
            <h2 className="min-w-0 text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
              {recipe.name}
            </h2>
            <button
              type="button"
              onClick={startRename}
              className="mt-1 rounded-full border border-zinc-800 px-3 py-1.5 text-xs text-zinc-400 transition-colors hover:border-zinc-700 hover:bg-zinc-900 hover:text-zinc-300"
            >
              {t("detail.rename")}
            </button>
          </div>
        )}
        {recipe.description && (
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
            {recipe.description}
          </p>
        )}
      </header>

      <div className="grid gap-7 xl:grid-cols-[minmax(0,1fr)_minmax(360px,420px)] xl:items-start">
        <div className="min-w-0 space-y-7">
          <section aria-labelledby="params-heading" className="flex flex-col gap-3">
            <h3
              id="params-heading"
              className="text-xs font-medium uppercase tracking-wider text-zinc-500"
            >
              {t("detail.parameters.section")}
            </h3>
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 border-t border-zinc-900 pt-4 md:grid-cols-2">
              <Param
                label={t("param.filmSimulation")}
                value={humanFilmSim(recipe.filmSimulation)}
              />
              <Param
                label={t("param.dynamicRange")}
                value={describeDynamicRange(recipe.dynamicRange)}
              />
              <Param
                label={t("param.exposureCompensation")}
                value={formatExposureCompensation(recipe.exposureCompensation ?? 0)}
              />
              <Param
                label={t("param.dRangePriority")}
                value={describeDRangePriority(recipe.dRangePriority)}
              />
              <Param
                label={t("param.whiteBalance")}
                value={describeWhiteBalance(recipe.whiteBalance)}
              />
              <Param
                label={t("param.whiteBalance.shift")}
                value={describeWhiteBalanceShift(recipe.whiteBalance)}
              />
              <Param label={t("param.highlightTone")} value={signedNumber(recipe.highlightTone)} />
              <Param label={t("param.shadowTone")} value={signedNumber(recipe.shadowTone)} />
              <Param label={t("param.color")} value={signedNumber(recipe.color)} />
              <Param label={t("param.sharpness")} value={signedNumber(recipe.sharpness)} />
              <Param
                label={t("param.noiseReduction")}
                value={signedNumber(recipe.noiseReduction)}
              />
              <Param label={t("param.clarity")} value={signedNumber(recipe.clarity)} />
              <Param label={t("param.grainEffect")} value={describeGrain(recipe.grainEffect)} />
              <Param label={t("param.colorChromeEffect")} value={recipe.colorChromeEffect} />
              <Param
                label={t("param.colorChromeEffectBlue")}
                value={recipe.colorChromeEffectBlue}
              />
              {recipe.smoothSkinEffect && (
                <Param label={t("param.smoothSkinEffect")} value={recipe.smoothSkinEffect} />
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
            <dl className="grid grid-cols-1 gap-x-8 gap-y-3 border-t border-zinc-900 pt-4 md:grid-cols-2">
              <Param label={t("detail.metadata.author")} value={recipe.author ?? "—"} />
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
              <Param
                label={t("detail.metadata.parent")}
                value={
                  parentRecipe ? parentRecipe.name : formatParentRecipeId(recipe.parentRecipeId)
                }
              />
            </dl>
          </section>

          <section className="flex flex-col gap-3">
            <button
              type="button"
              onClick={() => setShowWalkthrough((v) => !v)}
              aria-expanded={showWalkthrough}
              className="self-start rounded-full border border-zinc-800 bg-zinc-900 px-4 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700"
            >
              {t("detail.setupWalkthrough")}
            </button>
            {showWalkthrough && <Walkthrough recipe={recipe} />}
          </section>
        </div>

        <aside className="xl:sticky xl:top-[82px] xl:self-start">
          <input
            ref={rafInputRef}
            type="file"
            accept=".raf,.RAF,image/x-fuji-raf"
            aria-label={t("detail.previewRaf.file")}
            className="hidden"
            onChange={handlePreviewFile}
          />
          <RecipeCommandPanel
            recipe={recipe}
            copied={copied}
            cameraConnected={cameraConnected}
            rawPreviewStatus={rawPreviewStatus}
            writeStatus={writeStatus}
            isFavorite={isFavorite}
            onPreview={() => openRafPicker("single")}
            onDiagnose={() => openRafPicker("diagnostic")}
            onToggleFavorite={() => toggleFavorite(recipe.id)}
            onCopy={() => void handleCopy()}
            onShare={() => void handleShare()}
            onDownload={() => downloadRecipeJson(recipe)}
            onDelete={handleDelete}
            onWrite={handleWrite}
            onRestore={handleRestore}
            slotBackups={slotBackups}
            shared={shared}
          />
        </aside>
      </div>
    </article>
  );
}

function Param({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="flex items-baseline justify-between gap-3 border-b border-zinc-900/40 pb-2">
      <dt className="text-xs text-zinc-500">{label}</dt>
      <dd className="font-mono text-sm tabular-nums text-zinc-200">{value}</dd>
    </div>
  );
}

function formatParentRecipeId(parentRecipeId: string | undefined): string {
  return parentRecipeId ? `Parent ${parentRecipeId.slice(0, 8)}` : "—";
}

function RecipeCommandPanel({
  recipe,
  copied,
  shared,
  cameraConnected,
  rawPreviewStatus,
  writeStatus,
  isFavorite,
  onPreview,
  onDiagnose,
  onToggleFavorite,
  onCopy,
  onShare,
  onDownload,
  onDelete,
  onWrite,
  onRestore,
  slotBackups,
}: {
  recipe: RecipeType;
  copied: boolean;
  shared: boolean;
  cameraConnected: boolean;
  rawPreviewStatus: RawPreviewStatus;
  writeStatus: CameraWriteStatus;
  isFavorite: boolean;
  onPreview: () => void;
  onDiagnose: () => void;
  onToggleFavorite: () => void;
  onCopy: () => void;
  onShare: () => void;
  onDownload: () => void;
  onDelete: () => void;
  onWrite: (slot: number) => void;
  onRestore: (slot: number, backup: RecipeType) => void;
  slotBackups: CameraSlotBackup[];
}): JSX.Element {
  const t = useT();
  const [cameraActionMode, setCameraActionMode] = useState<"write" | "restore">("write");
  const previewDisabled = !cameraConnected || rawPreviewStatus.kind === "rendering";
  const writeDisabled = !cameraConnected || writeStatus.kind === "writing";
  const backedUpSlots = slotBackups.map((entry) => `C${entry.slot}`).join(", ");
  const activeWriteForCurrentRecipe =
    writeStatus.kind !== "idle" && writeStatus.recipeName === recipe.name;

  return (
    <div className="grid gap-px overflow-hidden rounded-lg border border-zinc-900 bg-zinc-900">
      <div className="bg-zinc-950 p-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-emerald-400">
              {t("detail.action.preview.section")}
            </p>
            <p className="mt-1 text-xs leading-5 text-zinc-500">
              {cameraConnected
                ? t("detail.action.preview.body")
                : t("detail.previewRaf.disconnected")}
            </p>
          </div>
          <span
            className={clsx(
              "rounded-md border px-2 py-1 font-mono text-[10px] uppercase tracking-wider",
              cameraConnected
                ? "border-emerald-500/30 text-emerald-300"
                : "border-zinc-800 text-zinc-600",
            )}
          >
            {cameraConnected ? "online" : "offline"}
          </span>
        </div>
        <div className="mt-4 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <button
            type="button"
            disabled={previewDisabled}
            onClick={onPreview}
            title={
              cameraConnected ? t("detail.previewRaf.title") : t("detail.previewRaf.disconnected")
            }
            className={clsx(
              "rounded-md border px-4 py-3 text-sm font-medium transition-colors",
              !previewDisabled
                ? "border-emerald-500/50 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                : "cursor-not-allowed border-zinc-900 text-zinc-700",
            )}
          >
            {rawPreviewStatus.kind === "rendering"
              ? t("detail.previewRaf.rendering")
              : t("detail.previewRaf")}
          </button>
          <button
            type="button"
            disabled={previewDisabled}
            onClick={onDiagnose}
            title={
              cameraConnected
                ? t("detail.previewRaf.diagnostic.title")
                : t("detail.previewRaf.disconnected")
            }
            className={clsx(
              "rounded-md border px-4 py-3 text-sm font-medium transition-colors",
              !previewDisabled
                ? "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                : "cursor-not-allowed border-zinc-900 text-zinc-700",
            )}
          >
            {rawPreviewStatus.kind === "rendering"
              ? t("detail.previewRaf.rendering")
              : t("detail.previewRaf.diagnostic")}
          </button>
        </div>
      </div>

      <div className="bg-zinc-950 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {t("detail.cameraAction.section")}
        </p>
        <div className="mt-3 grid grid-cols-2 gap-1 rounded-full border border-zinc-900 bg-zinc-900/40 p-1">
          <button
            type="button"
            onClick={() => setCameraActionMode("write")}
            aria-pressed={cameraActionMode === "write"}
            className={clsx(
              "rounded-full px-3 py-2 text-xs font-medium transition-colors",
              cameraActionMode === "write"
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t("detail.cameraAction.write")}
          </button>
          <button
            type="button"
            onClick={() => setCameraActionMode("restore")}
            aria-pressed={cameraActionMode === "restore"}
            className={clsx(
              "rounded-full px-3 py-2 text-xs font-medium transition-colors",
              cameraActionMode === "restore"
                ? "bg-emerald-500/15 text-emerald-300"
                : "text-zinc-500 hover:text-zinc-300",
            )}
          >
            {t("detail.cameraAction.restore")}
          </button>
        </div>
        <div className="mt-4 grid gap-2 rounded-md border border-zinc-900 bg-zinc-900/30 p-3 text-xs">
          <SafetyRow
            ok={cameraConnected}
            text={
              cameraConnected
                ? t("detail.cameraSafety.camera.ok")
                : t("detail.cameraSafety.camera.missing")
            }
          />
          <SafetyRow
            ok={slotBackups.length > 0}
            text={
              slotBackups.length > 0
                ? t("detail.cameraSafety.backup.ok", { slots: backedUpSlots })
                : t("detail.cameraSafety.backup.missing")
            }
          />
          <SafetyRow ok text={t("detail.cameraSafety.readBack")} />
        </div>

        {cameraActionMode === "write" ? (
          <div className="mt-4">
            <p className="text-xs leading-5 text-zinc-500">
              {cameraConnected
                ? t("detail.action.write.body")
                : t("detail.cameraWrite.disconnected")}
            </p>
            <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4">
              {[1, 2, 3, 4].map((slot) => {
                const writing =
                  writeStatus.kind === "writing" &&
                  writeStatus.slot === slot &&
                  writeStatus.recipeName === recipe.name;
                return (
                  <button
                    key={slot}
                    type="button"
                    disabled={writeDisabled}
                    onClick={() => onWrite(slot)}
                    className={clsx(
                      "rounded-md border px-2 py-3 font-mono text-xs transition-colors",
                      !writeDisabled
                        ? "border-emerald-900/80 text-emerald-300 hover:border-emerald-700 hover:bg-emerald-950/20"
                        : "cursor-not-allowed border-zinc-900 text-zinc-700",
                    )}
                  >
                    {writing
                      ? t("detail.cameraWrite.writing")
                      : t("detail.cameraWrite.slot", { slot })}
                  </button>
                );
              })}
            </div>
            <p className="mt-3 text-xs leading-5 text-zinc-500">
              {slotBackups.length > 0
                ? t("detail.cameraWrite.restoreAvailable", { slots: backedUpSlots })
                : t("detail.cameraWrite.restoreMissing")}
            </p>
          </div>
        ) : (
          <div className="mt-4">
            <p className="text-xs leading-5 text-zinc-500">
              {slotBackups.length > 0
                ? t("detail.cameraRestore.body")
                : t("detail.cameraRestore.empty")}
            </p>
            <div className="mt-3 grid gap-2">
              {slotBackups.map(({ slot, recipe: backup }) => (
                <button
                  key={slot}
                  type="button"
                  disabled={writeDisabled}
                  onClick={() => onRestore(slot, backup)}
                  className={clsx(
                    "rounded-md border px-3 py-2 text-xs transition-colors",
                    !writeDisabled
                      ? "border-zinc-800 text-zinc-300 hover:border-zinc-700 hover:bg-zinc-900"
                      : "cursor-not-allowed border-zinc-900 text-zinc-700",
                  )}
                >
                  <span className="block font-medium">
                    {t("detail.cameraRestore.slot", { slot, name: backup.name })}
                  </span>
                  <span className="mt-1 block text-[10px] text-zinc-500">
                    {t("detail.cameraRestore.slotHint", { slot })}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}
        {writeStatus.kind === "success" && activeWriteForCurrentRecipe && (
          <p className="mt-3 text-xs text-emerald-400">
            {t("detail.cameraWrite.success", {
              slot: writeStatus.slot,
              n: writeStatus.propertiesWritten,
            })}
          </p>
        )}
        {writeStatus.kind === "error" && activeWriteForCurrentRecipe && (
          <p className="mt-3 text-xs text-red-300">
            {t("detail.cameraWrite.error", { message: writeStatus.message })}
          </p>
        )}
        {writeStatus.kind === "success" && !activeWriteForCurrentRecipe && (
          <p className="mt-3 text-xs text-emerald-400">
            {t("detail.cameraWrite.lastSuccess", {
              slot: writeStatus.slot,
              recipe: writeStatus.recipeName,
            })}
          </p>
        )}
        {writeStatus.kind === "error" && !activeWriteForCurrentRecipe && (
          <p className="mt-3 text-xs text-red-300">
            {t("detail.cameraWrite.lastError", {
              slot: writeStatus.slot,
              message: writeStatus.message,
            })}
          </p>
        )}
      </div>

      <div className="bg-zinc-950 p-4">
        <p className="font-mono text-[10px] uppercase tracking-[0.24em] text-zinc-500">
          {t("detail.action.file.section")}
        </p>
        <div className="mt-4 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onToggleFavorite}
            aria-pressed={isFavorite}
            className={clsx(
              "rounded-md border px-3 py-2 text-xs transition-colors",
              isFavorite
                ? "border-amber-500/40 bg-amber-500/10 text-amber-300"
                : "border-zinc-800 text-zinc-400 hover:border-zinc-700",
            )}
          >
            {isFavorite ? t("detail.favourite.remove") : t("detail.favourite.add")}
          </button>
          <button
            type="button"
            onClick={onDelete}
            className="rounded-md border border-red-950/80 px-3 py-2 text-xs text-red-300 transition-colors hover:border-red-800 hover:bg-red-950/30"
          >
            {recipe.tags.includes("latent-default")
              ? t("detail.delete.hideDefault")
              : t("detail.delete")}
          </button>
          <button
            type="button"
            onClick={onCopy}
            className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
          >
            {copied ? t("detail.copyJson.copied") : t("detail.copyJson")}
          </button>
          <button
            type="button"
            onClick={onShare}
            className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
          >
            {shared ? t("detail.share.copied") : t("detail.share")}
          </button>
          <button
            type="button"
            onClick={onDownload}
            className="rounded-md border border-zinc-800 px-3 py-2 text-xs text-zinc-300 transition-colors hover:border-zinc-700 hover:bg-zinc-900"
          >
            {t("detail.downloadJson")}
          </button>
        </div>
      </div>
    </div>
  );
}

function SafetyRow({ ok, text }: { ok: boolean; text: string }): JSX.Element {
  return (
    <div className="flex items-center gap-2 text-zinc-400">
      <span
        className={clsx("size-1.5 rounded-full", ok ? "bg-emerald-400" : "bg-amber-400")}
        aria-hidden="true"
      />
      <span>{text}</span>
    </div>
  );
}

function Walkthrough({ recipe }: { recipe: RecipeType }): JSX.Element {
  const t = useT();
  const steps = [
    `Set film simulation to ${humanFilmSim(recipe.filmSimulation)}`,
    `Dynamic range: ${recipe.dynamicRange}`,
    `Exposure compensation ${formatExposureCompensation(recipe.exposureCompensation ?? 0)} · D Range Priority ${describeDRangePriority(recipe.dRangePriority)}`,
    `White balance: ${describeWhiteBalance(recipe.whiteBalance)} (shift R ${signedNumber(recipe.whiteBalance.shiftR)} / B ${signedNumber(recipe.whiteBalance.shiftB)})`,
    `Highlight tone ${signedNumber(recipe.highlightTone)} · Shadow tone ${signedNumber(recipe.shadowTone)}`,
    `Color ${signedNumber(recipe.color)} · Sharpness ${signedNumber(recipe.sharpness)} · Noise reduction ${signedNumber(recipe.noiseReduction)} · Clarity ${signedNumber(recipe.clarity)}`,
    `Grain ${describeGrain(recipe.grainEffect)} · Color chrome ${recipe.colorChromeEffect} · Color chrome blue ${recipe.colorChromeEffectBlue}`,
  ];
  return (
    <div className="flex flex-col gap-2 rounded-sm border border-zinc-900 bg-zinc-900/40 p-4">
      <p className="text-xs leading-relaxed text-zinc-400">{t("detail.setupWalkthrough.intro")}</p>
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
