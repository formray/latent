import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { RecipeLibrary } from "../src/components/RecipeLibrary";
import { useRecipesStore } from "../src/stores/recipes";
import type { RecipeType } from "@filmfork/recipe-schema/browser";

const recipe = (
  id: string,
  name: string,
  filmSim: RecipeType["filmSimulation"] = "ClassicChrome",
  tags: string[] = [],
): RecipeType => ({
  id,
  schemaVersion: 1,
  name,
  author: "FilmFork",
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

    const stored = localStorage.getItem("filmfork-favorites-v1");
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
});
