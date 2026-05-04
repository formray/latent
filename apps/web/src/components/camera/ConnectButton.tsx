import type { JSX } from "react";
import { useT } from "../../i18n";

export function ConnectButton({ onConnect }: { onConnect: () => void }): JSX.Element {
  const t = useT();
  return (
    <button
      type="button"
      onClick={onConnect}
      className="rounded-sm border border-zinc-700 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-200 transition-colors hover:border-zinc-500 hover:bg-zinc-800"
    >
      {t("camera.connect")}
    </button>
  );
}
