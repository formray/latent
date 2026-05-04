import type { JSX } from "react";
import { useT } from "../../i18n";

export function DegradedBanner(): JSX.Element {
  const t = useT();
  return (
    <div role="status" className="text-right text-[11px] text-amber-300">
      {t("camera.degraded")}
    </div>
  );
}
