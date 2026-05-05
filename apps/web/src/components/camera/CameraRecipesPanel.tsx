import clsx from "clsx";
import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import type { ConnectionState, DecodedPresetValues, RawPreset } from "@latent/camera-connection";
import { useCameraStore } from "../../stores/camera";
import { useRecipesStore } from "../../stores/recipes";
import {
  cameraPresetImportKey,
  cameraPresetMatchesRecipe,
  cameraPresetToRecipe,
  canImportCameraPreset,
  recipeCameraImportKey,
} from "../../lib/camera-preset-to-recipe";
import { createCameraBackupBundle, downloadCameraBackupBundle } from "../../lib/camera-backup";
import { useT, type MessageKey } from "../../i18n";

const PARAMETER_COLUMNS = [
  ["param.highlightTone", "highlightTone"],
  ["param.shadowTone", "shadowTone"],
  ["param.color", "color"],
  ["param.sharpness", "sharpness"],
  ["param.noiseReduction", "noiseReduction"],
  ["param.clarity", "clarity"],
] as const satisfies ReadonlyArray<readonly [MessageKey, keyof DecodedPresetValues]>;

export function CameraRecipesPanel(): JSX.Element | null {
  const t = useT();
  const state = useCameraStore((s) => s.state);
  const presets = useCameraStore((s) => s.presets);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const visible = isCameraAlive(state.kind) || presets.length > 0;
  const cameraLabel =
    state.kind === "connected" || state.kind === "degraded"
      ? `${state.cameraModel} · FW ${state.firmwareVersion}`
      : t("camera.recipes.awaiting");
  const cameraMetadata = cameraRecipeMetadata(state);

  const selected = useMemo(() => {
    if (presets.length === 0) return null;
    return presets.find((preset) => preset.slot === selectedSlot) ?? presets[0] ?? null;
  }, [presets, selectedSlot]);

  useEffect(() => {
    if (selectedSlot === null && presets[0]) {
      setSelectedSlot(presets[0].slot);
    }
  }, [presets, selectedSlot]);

  if (!visible) return null;

  return (
    <section
      id="camera-recipes-panel"
      aria-label={t("camera.recipes.title")}
      className="border-b border-zinc-900 bg-[#070707]"
    >
      <div className="grid gap-px bg-zinc-900 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <div className="bg-zinc-950">
          <header className="flex min-w-0 flex-col items-start justify-between gap-4 px-4 py-5 sm:flex-row sm:px-6">
            <div className="min-w-0">
              <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-emerald-400">
                {isCameraAlive(state.kind)
                  ? t("camera.recipes.verified")
                  : t("camera.recipes.cached")}
              </p>
              <h2 className="mt-2 text-xl font-semibold tracking-tight text-zinc-50">
                {t("camera.recipes.title")}
              </h2>
              <p className="mt-1 text-sm text-zinc-500">{cameraLabel}</p>
            </div>
            <div className="flex w-full min-w-0 flex-col items-start gap-3 text-left sm:w-auto sm:items-end sm:text-right">
              <div className="flex max-w-full flex-wrap gap-x-3 gap-y-1 font-mono text-[11px] uppercase tracking-wider text-zinc-500 sm:block">
                <div>{t("camera.recipes.slotsRead", { n: presets.length })}</div>
                <div className="text-emerald-400 sm:mt-1">{t("camera.recipes.readOnly")}</div>
              </div>
              <button
                type="button"
                disabled={presets.length === 0}
                onClick={() =>
                  downloadCameraBackupBundle(createCameraBackupBundle(presets, cameraMetadata))
                }
                className={clsx(
                  "rounded-full border px-3 py-1.5 text-xs transition-colors",
                  presets.length > 0
                    ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
                    : "cursor-not-allowed border-zinc-900 text-zinc-700",
                )}
              >
                {t("camera.recipes.exportBackup")}
              </button>
            </div>
          </header>

          {presets.length === 0 ? (
            <div className="px-6 pb-6">
              <div className="h-1 overflow-hidden rounded-full bg-zinc-900">
                <div className="h-full w-1/3 animate-pulse bg-emerald-400" />
              </div>
              <p className="mt-3 text-sm text-zinc-500">{t("camera.recipes.scanning")}</p>
            </div>
          ) : (
            <ol className="grid grid-cols-1 gap-px bg-zinc-900 md:grid-cols-2 xl:grid-cols-4">
              {presets.map((preset) => (
                <li key={preset.slot}>
                  <CameraSlotCard
                    preset={preset}
                    selected={preset.slot === selected?.slot}
                    onSelect={() => setSelectedSlot(preset.slot)}
                  />
                </li>
              ))}
            </ol>
          )}
        </div>

        <CameraRecipeInspector preset={selected} />
      </div>
    </section>
  );
}

function CameraSlotCard({
  preset,
  selected,
  onSelect,
}: {
  preset: RawPreset;
  selected: boolean;
  onSelect: () => void;
}): JSX.Element {
  const d = preset.decoded;
  const defaultSlot = isDefaultPreset(preset);
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group flex h-full min-h-40 w-full min-w-0 flex-col justify-between bg-zinc-950 p-4 text-left transition-colors",
        "hover:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-inset",
        selected && "bg-zinc-900",
        defaultSlot && !selected && "opacity-60",
      )}
      aria-pressed={selected}
    >
      <div>
        <div className="flex min-w-0 items-center justify-between gap-3">
          <span
            className={clsx(
              "min-w-0 font-mono text-xs uppercase tracking-[0.25em]",
              selected ? "text-emerald-300" : "text-zinc-500",
            )}
          >
            C{preset.slot}
          </span>
          <span className="shrink-0 font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {preset.missing?.length
              ? `${preset.missing.length} missing`
              : defaultSlot
                ? "default"
                : "verified"}
          </span>
        </div>
        <h3 className="mt-4 truncate text-base font-semibold tracking-tight text-zinc-50">
          {presetDisplayName(preset)}
        </h3>
        <p
          className={clsx(
            "mt-1 truncate text-sm",
            defaultSlot ? "text-zinc-500" : "text-emerald-300",
          )}
        >
          {d?.filmSimulation.label ?? "Reading"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-wide">
        <Chip>{d?.dynamicRange.label ?? "--"}</Chip>
        <Chip>{cameraWhiteBalanceLabel(d)}</Chip>
        <Chip>
          R {signed(d?.wbShift.r)} / B {signed(d?.wbShift.b)}
        </Chip>
        <Chip>{d?.grainEffect.label ?? "--"}</Chip>
      </div>
    </button>
  );
}

function CameraRecipeInspector({ preset }: { preset: RawPreset | null }): JSX.Element {
  const t = useT();
  const importRecipe = useRecipesStore((s) => s.importRecipe);
  const selectRecipe = useRecipesStore((s) => s.selectRecipe);
  const recipes = useRecipesStore((s) => s.recipes);
  const state = useCameraStore((s) => s.state);
  const d = preset?.decoded;
  if (!preset || !d) {
    return (
      <aside className="flex min-h-72 items-center justify-center bg-zinc-950 p-8">
        <p className="text-sm text-zinc-500">{t("camera.recipes.empty")}</p>
      </aside>
    );
  }

  const importMetadata = cameraRecipeMetadata(state);
  const importCheck = canImportCameraPreset(preset);
  const importDisabledReason = importCheck.reason ?? t("camera.recipes.importDisabled");
  const existingImportKey = cameraPresetImportKey(preset, importMetadata);
  const existingImport = recipes.find(
    (recipe) => recipeCameraImportKey(recipe) === existingImportKey,
  );
  const existingImportMatches =
    existingImport !== undefined &&
    cameraPresetMatchesRecipe(preset, importMetadata, existingImport);
  const handleImport = (): void => {
    if (!importCheck.ok) return;
    if (existingImport && existingImportMatches) {
      selectRecipe(existingImport.id);
      return;
    }
    importRecipe(cameraPresetToRecipe(preset, importMetadata));
  };

  return (
    <aside className="bg-zinc-950 p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            C{preset.slot} · {t("camera.recipes.inspector")}
          </p>
          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-zinc-50">
            {presetDisplayName(preset)}
          </h3>
          <p className="mt-1 text-lg text-emerald-300">{d.filmSimulation.label}</p>
        </div>
        <button
          type="button"
          disabled={!importCheck.ok}
          onClick={handleImport}
          className={clsx(
            "rounded-sm border px-3 py-2 text-xs font-medium transition-colors",
            importCheck.ok
              ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-300 hover:bg-emerald-500/15"
              : "border-zinc-800 text-zinc-500",
          )}
          title={importCheck.ok ? undefined : importDisabledReason}
        >
          {existingImport
            ? existingImportMatches
              ? t("camera.recipes.imported")
              : t("camera.recipes.updateImport")
            : t("camera.recipes.import")}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-px bg-zinc-900 font-mono text-xs sm:grid-cols-4">
        <QTile label={t("param.dynamicRange")} value={d.dynamicRange.label} strong />
        <QTile label={t("param.whiteBalance")} value={cameraWhiteBalanceLabel(d)} />
        <QTile
          label={t("param.whiteBalance.shift")}
          value={`R ${signed(d.wbShift.r)} · B ${signed(d.wbShift.b)}`}
        />
        {PARAMETER_COLUMNS.map(([labelKey, key]) => (
          <QTile key={key} label={t(labelKey)} value={formatNumber(d[key])} />
        ))}
        <QTile label={t("param.grainEffect")} value={d.grainEffect.label} strong />
        <QTile label={t("param.colorChromeEffect")} value={d.colorChromeEffect.label} />
        <QTile label={t("param.colorChromeEffectBlue")} value={d.colorChromeEffectBlue.label} />
        <QTile label={t("param.smoothSkinEffect")} value={d.smoothSkinEffect.label} />
        <QTile label={t("camera.recipes.properties")} value={String(propertyCount(preset))} />
        <QTile label={t("camera.recipes.missing")} value={String(preset.missing?.length ?? 0)} />
      </div>

      <RawPropertiesTable preset={preset} />
    </aside>
  );
}

function cameraRecipeMetadata(state: ConnectionState): {
  cameraModel: string;
  firmwareVersion?: string;
} {
  if (state.kind !== "connected" && state.kind !== "degraded") {
    return { cameraModel: "Fujifilm Camera" };
  }
  return {
    cameraModel: state.cameraModel,
    firmwareVersion: state.firmwareVersion,
  };
}

function Chip({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="max-w-full break-words bg-zinc-900 px-2 py-1 text-zinc-300 group-hover:bg-zinc-800">
      {children}
    </span>
  );
}

function QTile({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}): JSX.Element {
  return (
    <div className="min-h-16 bg-zinc-950 p-3">
      <div className="text-[10px] uppercase tracking-wider text-zinc-600">{label}</div>
      <div className={clsx("mt-2 truncate text-sm", strong ? "text-emerald-300" : "text-zinc-100")}>
        {value}
      </div>
    </div>
  );
}

function RawPropertiesTable({ preset }: { preset: RawPreset }): JSX.Element {
  const t = useT();
  const rows = rawPropertyRows(preset);
  const missing = preset.missing ?? [];
  return (
    <section className="mt-6 border-t border-zinc-900 pt-5">
      <div className="flex items-center justify-between gap-3">
        <h4 className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
          {t("camera.recipes.rawProperties")}
        </h4>
        <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
          {rows.length} / {rows.length + missing.length}
        </span>
      </div>
      <div className="mt-3 max-h-72 overflow-auto border border-zinc-900">
        <table className="w-full border-collapse font-mono text-[11px]">
          <thead className="sticky top-0 bg-zinc-950 text-zinc-600">
            <tr className="border-b border-zinc-900">
              <Th>{t("camera.recipes.raw.code")}</Th>
              <Th>{t("camera.recipes.raw.name")}</Th>
              <Th>{t("camera.recipes.raw.value")}</Th>
              <Th>{t("camera.recipes.raw.bytes")}</Th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.code} className="border-b border-zinc-900/70 text-zinc-300">
                <Td className="text-emerald-300">{row.code}</Td>
                <Td>{row.name}</Td>
                <Td>{row.value}</Td>
                <Td className="text-zinc-500">{row.bytes}</Td>
              </tr>
            ))}
            {missing.map((code) => (
              <tr key={code} className="border-b border-zinc-900/70 text-red-300">
                <Td>{code}</Td>
                <Td>{t("camera.recipes.raw.missing")}</Td>
                <Td>--</Td>
                <Td>--</Td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}

function Th({ children }: { children: ReactNode }): JSX.Element {
  return <th className="px-3 py-2 text-left font-medium">{children}</th>;
}

function Td({ children, className }: { children: ReactNode; className?: string }): JSX.Element {
  return <td className={clsx("max-w-56 truncate px-3 py-2 align-top", className)}>{children}</td>;
}

function isCameraAlive(kind: string): boolean {
  return kind === "connected" || kind === "degraded";
}

function presetDisplayName(preset: RawPreset): string {
  return preset.name || `Default C${preset.slot}`;
}

function isDefaultPreset(preset: RawPreset): boolean {
  const d = preset.decoded;
  if (!d || preset.name) return false;
  return (
    d.filmSimulation.label.startsWith("Provia") &&
    d.dynamicRange.label === "DR 100%" &&
    d.wbShift.r === 0 &&
    d.wbShift.b === 0 &&
    d.highlightTone === 0 &&
    d.shadowTone === 0 &&
    d.color === 0 &&
    d.sharpness === 0 &&
    d.noiseReduction === 0 &&
    d.clarity === 0 &&
    d.grainEffect.label === "Off" &&
    d.colorChromeEffect.label === "Off" &&
    d.colorChromeEffectBlue.label === "Off"
  );
}

function propertyCount(preset: RawPreset): number {
  return Object.keys(preset.properties).filter((key) => key !== "_missing").length;
}

interface RawPropertyRow {
  code: string;
  name: string;
  value: string;
  bytes: string;
}

function rawPropertyRows(preset: RawPreset): RawPropertyRow[] {
  return Object.entries(preset.properties)
    .filter(([key]) => key !== "_missing")
    .map(([code, value]) => ({
      code,
      name: rawPropertyName(value),
      value: rawPropertyValue(value),
      bytes: rawPropertyBytes(value),
    }))
    .sort((a, b) => Number.parseInt(a.code, 16) - Number.parseInt(b.code, 16));
}

function rawPropertyName(value: unknown): string {
  if (isRawProperty(value) && typeof value.name === "string") return value.name;
  return "--";
}

function rawPropertyValue(value: unknown): string {
  if (!isRawProperty(value)) return String(value);
  if (typeof value.value === "number" || typeof value.value === "string")
    return String(value.value);
  return "--";
}

function rawPropertyBytes(value: unknown): string {
  if (!isRawProperty(value) || !Array.isArray(value.bytes)) return "--";
  return value.bytes.map((byte) => byteToHex(byte)).join(" ");
}

function isRawProperty(value: unknown): value is {
  name?: unknown;
  value?: unknown;
  bytes?: unknown[];
} {
  return typeof value === "object" && value !== null;
}

function byteToHex(value: unknown): string {
  if (!Number.isInteger(value)) return "??";
  return (value as number).toString(16).padStart(2, "0");
}

function signed(value: number | undefined): string {
  if (value === undefined) return "--";
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

function formatNumber(value: number): string {
  return value === 0 ? "0" : signed(value);
}

function cameraWhiteBalanceLabel(decoded: DecodedPresetValues | undefined): string {
  if (!decoded) return "--";
  if (decoded.whiteBalance.label !== "Color Temperature") return decoded.whiteBalance.label;
  if (typeof decoded.whiteBalance.colorTemperatureK === "number") {
    return `Color Temperature ${decoded.whiteBalance.colorTemperatureK}K`;
  }
  return "Color Temperature (K missing)";
}
