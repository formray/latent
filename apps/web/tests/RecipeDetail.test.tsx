import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecipeDetail } from "../src/components/RecipeDetail";
import { useRecipesStore } from "../src/stores/recipes";
import { useCameraStore } from "../src/stores/camera";
import type { RecipeType } from "@latent/recipe-schema/browser";

const originalRenderRawPreview = useCameraStore.getState().renderRawPreview;
const originalRenderRawPreviewDiagnostics = useCameraStore.getState().renderRawPreviewDiagnostics;

const sample: RecipeType = {
  id: "44444444-4444-4444-8444-444444444444",
  schemaVersion: 1,
  name: "Editorial Negative",
  description: "A neutral classic-negative recipe used in tests.",
  author: "Latent",
  tags: ["editorial", "neutral"],
  createdAt: "2026-05-04T08:00:00.000Z",
  capabilitySetId: "x-s20-fw1.10",
  cameraModel: "X-S20",
  filmSimulation: "ClassicNegative",
  dynamicRange: "DR400",
  whiteBalance: { mode: "Daylight", shiftR: 1, shiftB: -2 },
  highlightTone: -0.5,
  shadowTone: 1,
  color: -1,
  sharpness: -2,
  noiseReduction: -3,
  clarity: 1,
  grainEffect: { strength: "Weak", size: "Large" },
  colorChromeEffect: "Strong",
  colorChromeEffectBlue: "Weak",
  smoothSkinEffect: "Weak",
};

const cameraBackup: RecipeType = {
  ...sample,
  id: "55555555-5555-4555-8555-555555555555",
  name: "Original Camera C3",
  description: "Imported from X-S20 custom slot C3.",
  author: "Camera import",
  tags: ["camera-import", "x-s20", "c3"],
  createdAt: "2026-05-04T07:00:00.000Z",
};

describe("<RecipeDetail />", () => {
  beforeEach(() => {
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
      state: { kind: "idle" },
      rawPreviewStatus: { kind: "idle" },
      renderRawPreview: originalRenderRawPreview,
      renderRawPreviewDiagnostics: originalRenderRawPreviewDiagnostics,
    });
  });

  it("renders the headline parameters from the recipe", () => {
    render(<RecipeDetail recipe={sample} />);
    expect(screen.getByText("Editorial Negative")).toBeInTheDocument();
    // "Classic Negative" appears in the header pill and as a dl value
    expect(screen.getAllByText("Classic Negative").length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText("DR 400%")).toBeInTheDocument();
    expect(screen.getByText("Daylight")).toBeInTheDocument();
    expect(screen.getByText("R +1 · B -2")).toBeInTheDocument();
    expect(screen.getByText("Weak Large")).toBeInTheDocument();
  });

  it("shows author and tag metadata", () => {
    render(<RecipeDetail recipe={sample} />);
    expect(screen.getByText("Latent")).toBeInTheDocument();
    expect(screen.getByText("editorial, neutral")).toBeInTheDocument();
  });

  it("shows the parent recipe name when genealogy metadata is available", () => {
    const child: RecipeType = {
      ...sample,
      id: "66666666-6666-4666-8666-666666666666",
      name: "Editorial Negative Copy",
      parentRecipeId: sample.id,
    };
    useRecipesStore.setState({
      recipes: [sample, child],
      selectedRecipeId: child.id,
    });

    render(<RecipeDetail recipe={child} />);

    expect(screen.getByText("Parent recipe")).toBeInTheDocument();
    expect(screen.getByText("Editorial Negative")).toBeInTheDocument();
  });

  it("renames the selected recipe from the detail header", () => {
    const renameRecipe = vi.spyOn(useRecipesStore.getState(), "renameRecipe");
    render(<RecipeDetail recipe={sample} />);

    fireEvent.click(screen.getByRole("button", { name: /rename/i }));
    fireEvent.change(screen.getByLabelText(/recipe name/i), {
      target: { value: "Midnight Negative" },
    });
    fireEvent.click(screen.getByRole("button", { name: /save name/i }));

    expect(renameRecipe).toHaveBeenCalledWith(sample.id, "Midnight Negative");
    renameRecipe.mockRestore();
  });

  it("copy-as-JSON button writes the recipe JSON to the clipboard", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });

    render(<RecipeDetail recipe={sample} />);
    fireEvent.click(screen.getByRole("button", { name: /copy as json/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const arg = writeText.mock.calls[0]![0] as string;
    const parsed = JSON.parse(arg) as RecipeType;
    expect(parsed.id).toBe(sample.id);
    expect(parsed.filmSimulation).toBe("ClassicNegative");
  });

  it("copies a self-contained recipe share URL", async () => {
    const writeText = vi.fn().mockResolvedValue(undefined);
    Object.assign(navigator, { clipboard: { writeText } });
    window.history.replaceState(null, "", "/?theme=dark#library");

    render(<RecipeDetail recipe={sample} />);
    fireEvent.click(screen.getByRole("button", { name: /copy share link/i }));

    await waitFor(() => {
      expect(writeText).toHaveBeenCalledTimes(1);
    });
    const copiedUrl = new URL(writeText.mock.calls[0]![0] as string);
    expect(copiedUrl.searchParams.get("theme")).toBe("dark");
    expect(copiedUrl.searchParams.get("share")).toBeTruthy();
    expect(copiedUrl.hash).toBe("#library");
  });

  it("download JSON creates a recipe file download", () => {
    const createObjectURL = vi.fn(() => "blob:recipe");
    const revokeObjectURL = vi.fn();
    Object.assign(URL, { createObjectURL, revokeObjectURL });
    const click = vi
      .spyOn(HTMLAnchorElement.prototype, "click")
      .mockImplementation(() => undefined);

    render(<RecipeDetail recipe={sample} />);
    fireEvent.click(screen.getByRole("button", { name: /download .json/i }));

    expect(createObjectURL).toHaveBeenCalledTimes(1);
    expect(click).toHaveBeenCalledTimes(1);
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:recipe");
    click.mockRestore();
  });

  it("toggles the camera setup walkthrough", () => {
    render(<RecipeDetail recipe={sample} />);
    const walkthroughBtn = screen.getByRole("button", {
      name: /set up on camera/i,
    });
    expect(screen.queryByText(/follow these steps/i)).not.toBeInTheDocument();
    fireEvent.click(walkthroughBtn);
    expect(screen.getByText(/follow these steps/i)).toBeInTheDocument();
  });

  it("starts a RAF preview for the current recipe from the detail action", () => {
    const renderRawPreview = vi.fn();
    useCameraStore.setState({
      state: {
        kind: "connected",
        port: {} as never,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
      renderRawPreview,
    });

    render(<RecipeDetail recipe={sample} />);
    const file = new File([new Uint8Array([1, 2, 3])], "sample.raf", {
      type: "image/x-fuji-raf",
    });

    fireEvent.change(screen.getByLabelText(/raf file for recipe preview/i), {
      target: { files: [file] },
    });

    expect(renderRawPreview).toHaveBeenCalledWith(file, sample);
  });

  it("starts a diagnostic RAF preview for the current recipe from the detail action", () => {
    const renderRawPreviewDiagnostics = vi.fn();
    useCameraStore.setState({
      state: {
        kind: "connected",
        port: {} as never,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
      renderRawPreviewDiagnostics,
    });

    render(<RecipeDetail recipe={sample} />);
    const file = new File([new Uint8Array([1, 2, 3])], "sample.raf", {
      type: "image/x-fuji-raf",
    });

    fireEvent.click(screen.getByRole("button", { name: /diagnose raf/i }));
    fireEvent.change(screen.getByLabelText(/raf file for recipe preview/i), {
      target: { files: [file] },
    });

    expect(renderRawPreviewDiagnostics).toHaveBeenCalledWith(file, sample);
  });

  it("shows write safety state and labels slots with available backups", () => {
    useRecipesStore.setState({
      recipes: [sample, cameraBackup],
    });
    useCameraStore.setState({
      state: {
        kind: "connected",
        port: {} as never,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
    });

    render(<RecipeDetail recipe={sample} />);

    expect(screen.getByText(/camera is online/i)).toBeInTheDocument();
    expect(screen.getByText(/restore points found for C3/i)).toBeInTheDocument();
    expect(screen.getByRole("button", { name: /send recipe/i })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
    expect(screen.getByRole("button", { name: /send to C3/i })).toBeInTheDocument();
    expect(screen.getByText(/one-click restore is available for C3/i)).toBeInTheDocument();
  });

  it("restores a camera slot from an imported backup recipe", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const writeRecipeToSlot = vi.fn().mockResolvedValue(undefined);
    useRecipesStore.setState({
      recipes: [sample, cameraBackup],
    });
    useCameraStore.setState({
      state: {
        kind: "connected",
        port: {} as never,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
      writeRecipeToSlot,
    });

    render(<RecipeDetail recipe={sample} />);
    fireEvent.click(screen.getByRole("button", { name: /restore backup/i }));
    fireEvent.click(screen.getByRole("button", { name: /restore C3: Original Camera C3/i }));

    expect(confirm).toHaveBeenCalledWith(
      'Restore camera slot C3 from backup "Original Camera C3"?',
    );
    expect(writeRecipeToSlot).toHaveBeenCalledWith(cameraBackup, 3);
    confirm.mockRestore();
  });

  it("warns before writing when the target slot has no imported backup", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(false);
    const writeRecipeToSlot = vi.fn().mockResolvedValue(undefined);
    useCameraStore.setState({
      state: {
        kind: "connected",
        port: {} as never,
        cameraModel: "X-S20",
        firmwareVersion: "3.30",
      },
      writeRecipeToSlot,
    });

    render(<RecipeDetail recipe={sample} />);
    fireEvent.click(screen.getByRole("button", { name: /send to C1/i }));

    expect(confirm.mock.calls[0]?.[0]).toContain("No imported backup was found");
    expect(writeRecipeToSlot).not.toHaveBeenCalled();
    confirm.mockRestore();
  });

  it("deletes the selected recipe after confirmation", () => {
    const confirm = vi.spyOn(window, "confirm").mockReturnValue(true);
    const deleteRecipe = vi.spyOn(useRecipesStore.getState(), "deleteRecipe");

    render(<RecipeDetail recipe={sample} />);
    fireEvent.click(screen.getByRole("button", { name: /delete/i }));

    expect(confirm).toHaveBeenCalledTimes(1);
    expect(deleteRecipe).toHaveBeenCalledWith(sample.id);
    confirm.mockRestore();
    deleteRecipe.mockRestore();
  });
});
