import type { JSX } from "react";
import { useT } from "../../i18n";

export function ConnectingIndicator({ attempt }: { attempt: number }): JSX.Element {
  const t = useT();
  return (
    <div
      aria-busy="true"
      className="rounded-sm border border-zinc-800 bg-zinc-900 px-3 py-1.5 text-xs text-zinc-300"
    >
      {t("camera.connecting")} · {attempt}
    </div>
  );
}
