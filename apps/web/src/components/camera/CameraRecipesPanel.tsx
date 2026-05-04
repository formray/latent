import clsx from "clsx";
import { useEffect, useMemo, useState, type JSX, type ReactNode } from "react";
import type { RawPreset } from "@latent/camera-connection";
import { useCameraStore } from "../../stores/camera";
import { useT } from "../../i18n";

const PARAMETER_COLUMNS = [
  ["H", "highlightTone"],
  ["S", "shadowTone"],
  ["Color", "color"],
  ["Sharp", "sharpness"],
  ["NR", "noiseReduction"],
  ["Clarity", "clarity"],
] as const;

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
      aria-label={t("camera.recipes.title")}
      className="border-b border-zinc-900 bg-[#070707]"
    >
      <div className="grid gap-px bg-zinc-900 xl:grid-cols-[minmax(0,1.1fr)_minmax(420px,0.9fr)]">
        <div className="bg-zinc-950">
          <header className="flex flex-wrap items-start justify-between gap-4 px-6 py-5">
            <div>
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
            <div className="text-right font-mono text-[11px] uppercase tracking-wider text-zinc-500">
              <div>{t("camera.recipes.slotsRead", { n: presets.length })}</div>
              <div className="mt-1 text-emerald-400">{t("camera.recipes.readOnly")}</div>
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
  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group flex h-full min-h-40 w-full flex-col justify-between bg-zinc-950 p-4 text-left transition-colors",
        "hover:bg-zinc-900/70 focus:outline-none focus:ring-2 focus:ring-emerald-400/70 focus:ring-inset",
        selected && "bg-zinc-900",
      )}
      aria-pressed={selected}
    >
      <div>
        <div className="flex items-center justify-between gap-3">
          <span
            className={clsx(
              "font-mono text-xs uppercase tracking-[0.25em]",
              selected ? "text-emerald-300" : "text-zinc-500",
            )}
          >
            C{preset.slot}
          </span>
          <span className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">
            {preset.missing?.length ? `${preset.missing.length} missing` : "verified"}
          </span>
        </div>
        <h3 className="mt-4 truncate text-base font-semibold tracking-tight text-zinc-50">
          {preset.name || `Custom ${preset.slot}`}
        </h3>
        <p className="mt-1 truncate text-sm text-emerald-300">
          {d?.filmSimulation.label ?? "Reading"}
        </p>
      </div>

      <div className="mt-5 flex flex-wrap gap-1.5 font-mono text-[10px] uppercase tracking-wide">
        <Chip>{d?.dynamicRange.label ?? "--"}</Chip>
        <Chip>{d?.whiteBalance.label ?? "--"}</Chip>
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
  const d = preset?.decoded;
  if (!preset || !d) {
    return (
      <aside className="flex min-h-72 items-center justify-center bg-zinc-950 p-8">
        <p className="text-sm text-zinc-500">{t("camera.recipes.empty")}</p>
      </aside>
    );
  }

  return (
    <aside className="bg-zinc-950 p-6">
      <div className="flex items-start justify-between gap-6">
        <div className="min-w-0">
          <p className="font-mono text-[10px] uppercase tracking-[0.28em] text-zinc-500">
            C{preset.slot} · {t("camera.recipes.inspector")}
          </p>
          <h3 className="mt-2 truncate text-2xl font-semibold tracking-tight text-zinc-50">
            {preset.name || `Custom ${preset.slot}`}
          </h3>
          <p className="mt-1 text-lg text-emerald-300">{d.filmSimulation.label}</p>
        </div>
        <button
          type="button"
          disabled
          className="rounded-sm border border-zinc-800 px-3 py-2 text-xs font-medium text-zinc-500"
          title={t("camera.recipes.importDisabled")}
        >
          {t("camera.recipes.import")}
        </button>
      </div>

      <div className="mt-6 grid grid-cols-3 gap-px bg-zinc-900 font-mono text-xs sm:grid-cols-4">
        <QTile label="DR" value={d.dynamicRange.label} strong />
        <QTile label="WB" value={d.whiteBalance.label} />
        <QTile label="R" value={signed(d.wbShift.r)} />
        <QTile label="B" value={signed(d.wbShift.b)} />
        {PARAMETER_COLUMNS.map(([label, key]) => (
          <QTile key={key} label={label} value={formatNumber(d[key])} />
        ))}
        <QTile label="Grain" value={d.grainEffect.label} strong />
        <QTile label="CCR" value={d.colorChromeEffect.label} />
        <QTile label="CCB" value={d.colorChromeEffectBlue.label} />
        <QTile label="Skin" value={d.smoothSkinEffect.label} />
      </div>

      <dl className="mt-5 grid grid-cols-3 gap-px bg-zinc-900 text-xs">
        <Meta label={t("camera.recipes.properties")} value={String(propertyCount(preset))} />
        <Meta label={t("camera.recipes.missing")} value={String(preset.missing?.length ?? 0)} />
        <Meta label={t("camera.recipes.mode")} value={t("camera.recipes.readOnly")} />
      </dl>
    </aside>
  );
}

function Chip({ children }: { children: ReactNode }): JSX.Element {
  return (
    <span className="bg-zinc-900 px-2 py-1 text-zinc-300 group-hover:bg-zinc-800">{children}</span>
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

function Meta({ label, value }: { label: string; value: string }): JSX.Element {
  return (
    <div className="bg-zinc-950 p-3">
      <dt className="font-mono text-[10px] uppercase tracking-wider text-zinc-600">{label}</dt>
      <dd className="mt-1 text-sm text-zinc-300">{value}</dd>
    </div>
  );
}

function isCameraAlive(kind: string): boolean {
  return kind === "connected" || kind === "degraded";
}

function propertyCount(preset: RawPreset): number {
  return Object.keys(preset.properties).filter((key) => key !== "_missing").length;
}

function signed(value: number | undefined): string {
  if (value === undefined) return "--";
  if (value === 0) return "0";
  return value > 0 ? `+${value}` : String(value);
}

function formatNumber(value: number): string {
  return value === 0 ? "0" : signed(value);
}
