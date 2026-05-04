import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { RecipeLibrary } from "../src/components/RecipeLibrary";
import { useRecipesStore } from "../src/stores/recipes";
import type { RecipeType } from "@latent/recipe-schema/browser";

const recipe = (
  id: string,
  name: string,
  filmSim: RecipeType["filmSimulation"] = "ClassicChrome",
  tags: string[] = [],
): RecipeType => ({
  id,
  schemaVersion: 1,
  name,
  author: "Latent",
  tags,
  createdAt: "2026-05-04T08:00:00.000Z",
  capabilitySetId: "x-s20-fw1.10",
  cameraModel: "X-S20",
  filmSimulation: filmSim,
  dynamicRange: "DR200",
  whiteBalance: { mode: "Auto", shiftR: 0, shiftB: 0 },
  highlightTone: 0,
  shadowTone: 0,
  color: 0,
  sharpness: 0,
  noiseReduction: -3,
  clarity: 0,
  grainEffect: { strength: "Off", size: "Small" },
  colorChromeEffect: "Weak",
  colorChromeEffectBlue: "Weak",
});

describe("<RecipeLibrary />", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
    useRecipesStore.setState({
      recipes: [
        recipe(
          "11111111-1111-4111-8111-111111111111",
          "Warm Chrome",
          "ClassicChrome",
          ["warm"],
        ),
        recipe(
          "22222222-2222-4222-8222-222222222222",
          "Coastal Velvia",
          "VelviaVivid",
          ["landscape"],
        ),
        recipe(
          "33333333-3333-4333-8333-333333333333",
          "Acros Quiet",
          "AcrosStd",
          ["mono"],
        ),
      ],
      loaded: true,
      loadError: null,
      favorites: new Set(),
      hiddenDefaultIds: new Set(),
      searchQuery: "",
      filmSimFilter: null,
      favoritesOnly: false,
      selectedRecipeId: null,
    });
  });

  it("renders all recipes when there are no filters", () => {
    render(<RecipeLibrary />);
    expect(screen.getByText("Warm Chrome")).toBeInTheDocument();
    expect(screen.getByText("Coastal Velvia")).toBeInTheDocument();
    expect(screen.getByText("Acros Quiet")).toBeInTheDocument();
  });

  it("filters recipes by search query", () => {
    render(<RecipeLibrary />);
    const search = screen.getByPlaceholderText(/search recipes/i);
    fireEvent.change(search, { target: { value: "velvia" } });
    expect(screen.queryByText("Warm Chrome")).not.toBeInTheDocument();
    expect(screen.getByText("Coastal Velvia")).toBeInTheDocument();
  });

  it("narrows by film simulation filter", () => {
    render(<RecipeLibrary />);
    const select = screen.getByLabelText(/all film simulations/i);
    fireEvent.change(select, { target: { value: "AcrosStd" } });
    expect(screen.queryByText("Warm Chrome")).not.toBeInTheDocument();
    expect(screen.getByText("Acros Quiet")).toBeInTheDocument();
  });

  it("favourite toggle persists across re-renders via localStorage", () => {
    const { rerender } = render(<RecipeLibrary />);
    const saveButtons = screen.getAllByRole("button", { name: /add to favourites/i });
    expect(saveButtons.length).toBeGreaterThan(0);
    fireEvent.click(saveButtons[0]!);

    const stored = localStorage.getItem("latent-favorites-v1");
    expect(stored).toBeTruthy();
    expect(JSON.parse(stored ?? "[]")).toContain(
      "11111111-1111-4111-8111-111111111111",
    );

    rerender(<RecipeLibrary />);
    const removeButton = screen.getByRole("button", {
      name: /remove from favourites/i,
    });
    expect(removeButton).toBeInTheDocument();
  });

  it("imports recipes from a JSON file", async () => {
    const imported = recipe(
      "44444444-4444-4444-8444-444444444444",
      "Imported Chrome",
      "ClassicChrome",
      ["camera-import"],
    );
    const file = new File([JSON.stringify(imported)], "recipe.json", {
      type: "application/json",
    });
    Object.defineProperty(file, "text", {
      value: async () => JSON.stringify(imported),
    });

    render(<RecipeLibrary />);
    fireEvent.change(screen.getByLabelText(/import file/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText("Imported Chrome")).toBeInTheDocument();
    });
    expect(screen.getByText("1 imported")).toBeInTheDocument();
    expect(useRecipesStore.getState().selectedRecipeId).toBe(imported.id);
  });

  it("imports recipes from a Fujifilm Recipes HTML file", async () => {
    const html = `<!DOCTYPE html><script>const RECIPES = [
      {pack:"Film",name:"Kodachrome",sim:"Classic Chrome",settings:{
        "Film Simulation":"Classic Chrome","Dynamic Range":"DR400","White Balance":"Auto",
        "WB Shift":"R:+2  B:-5","Highlight Tone":"+1","Shadow Tone":"+2","Color":"0",
        "Sharpness":"+2","Noise Reduction":"-4","Clarity":"0","Grain Effect":"Weak",
        "Color Chrome Effect":"Strong","Color Chrome FX Blue":"Weak"
      }}
    ];</script>`;
    const file = new File([html], "Fujifilm-Recipes.html", {
      type: "text/html",
    });
    Object.defineProperty(file, "text", {
      value: async () => html,
    });

    render(<RecipeLibrary />);
    fireEvent.change(screen.getByLabelText(/import file/i), {
      target: { files: [file] },
    });

    await waitFor(() => {
      expect(screen.getByText("Kodachrome")).toBeInTheDocument();
    });
    expect(useRecipesStore.getState().recipes[0]?.tags).toContain("fujifilm-recipes");
  });
});
