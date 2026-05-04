import { beforeEach, describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import type { RecipeType } from "@latent/recipe-schema/browser";
import { RawPreviewPanel } from "../src/components/camera/RawPreviewPanel";
import { useCameraStore } from "../src/stores/camera";
import { useRecipesStore } from "../src/stores/recipes";

const renderRawPreview = vi.fn(async () => undefined);

const sample: RecipeType = {
  id: "44444444-4444-4444-8444-444444444444",
  schemaVersion: 1,
  name: "Neon Dreams",
  author: "Latent",
  tags: [],
  createdAt: "2026-05-04T08:00:00.000Z",
  capabilitySetId: "x-s20-fw3.30",
  cameraModel: "X-S20",
  filmSimulation: "ClassicNegative",
  dynamicRange: "DR400",
  whiteBalance: { mode: "ColorTemperature", colorTemperatureK: 5400, shiftR: -2, shiftB: -1 },
  highlightTone: -1.5,
  shadowTone: 1,
  color: 3,
  sharpness: -1,
  noiseReduction: -4,
  clarity: 0,
  grainEffect: { strength: "Strong", size: "Large" },
  colorChromeEffect: "Strong",
  colorChromeEffectBlue: "Strong",
  smoothSkinEffect: "Off",
};

describe("<RawPreviewPanel />", () => {
  beforeEach(() => {
    renderRawPreview.mockClear();
    useRecipesStore.setState({
      recipes: [sample],
      loaded: true,
      loadError: null,
      favorites: new Set(),
      hiddenDefaultIds: new Set(),
      searchQuery: "",
      filmSimFilter: null,
      favoritesOnly: false,
      selectedRecipeId: sample.id,
    });
    useCameraStore.setState({
      state: {
        kind: "connected",
        port: {} as never,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
      rawPreviewStatus: { kind: "idle" },
      renderRawPreview,
    });
  });

  it("renders a live RAF workspace and starts preview with the editable draft", async () => {
    render(<RawPreviewPanel />);

    expect(screen.getByText("RAF workspace")).toBeInTheDocument();
    expect(screen.getByLabelText("Film Simulation")).toHaveValue("ClassicNegative");

    fireEvent.change(screen.getByLabelText("Color"), { target: { value: "1" } });
    const file = new File([new Uint8Array([1, 2, 3])], "sample.raf", {
      type: "image/x-fuji-raf",
    });
    fireEvent.change(screen.getByLabelText("Open RAF file"), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(renderRawPreview).toHaveBeenCalled();
    });
    const lastCall = renderRawPreview.mock.calls.at(-1) as
      | [File, RecipeType | null | undefined]
      | undefined;
    expect(lastCall?.[0]).toBe(file);
    expect(lastCall?.[1]).toMatchObject({
      name: "Neon Dreams",
      color: 1,
    });
  });
});
