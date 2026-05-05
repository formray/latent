import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RecipeCreator } from "../src/components/RecipeCreator";
import { useRecipesStore } from "../src/stores/recipes";
import type { RecipeType } from "@latent/recipe-schema/browser";

const sampleRecipe = (overrides: Partial<RecipeType> = {}): RecipeType => ({
  id: "11111111-1111-4111-8111-111111111111",
  schemaVersion: 1,
  name: "Selected Chrome",
  description: "Existing look",
  author: "Latent",
  tags: ["street"],
  createdAt: "2026-05-05T10:00:00.000Z",
  capabilitySetId: "x-s20-fw1.10",
  cameraModel: "X-S20",
  filmSimulation: "ClassicChrome",
  dynamicRange: "DR200",
  whiteBalance: { mode: "Daylight", shiftR: 1, shiftB: -2 },
  highlightTone: 0,
  shadowTone: 1,
  color: 1,
  sharpness: 0,
  noiseReduction: -3,
  clarity: 0,
  grainEffect: { strength: "Weak", size: "Small" },
  colorChromeEffect: "Weak",
  colorChromeEffectBlue: "Weak",
  ...overrides,
});

describe("<RecipeCreator />", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
    useRecipesStore.setState({
      recipes: [],
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

  it("renders a generated settings preview", () => {
    render(<RecipeCreator />);

    expect(screen.getByRole("heading", { name: "Build a recipe" })).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Warm City Chrome" })).toBeInTheDocument();
    expect(screen.getByText("Generated settings")).toBeInTheDocument();
    expect(screen.getByText("White Balance Shift")).toBeInTheDocument();
  });

  it("imports the generated recipe and selects it", () => {
    render(<RecipeCreator />);

    fireEvent.change(screen.getByLabelText(/recipe name/i), {
      target: { value: "Paris Rooftop Chrome" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

    const state = useRecipesStore.getState();
    expect(state.recipes[0]?.name).toBe("Paris Rooftop Chrome");
    expect(state.recipes[0]?.tags).toContain("latent-created");
    expect(state.selectedRecipeId).toBe(state.recipes[0]?.id);
    expect(screen.getByText(/Created “Paris Rooftop Chrome”/)).toBeInTheDocument();
  });

  it("can create a recipe and navigate to the RAF workspace", () => {
    render(<RecipeCreator />);

    fireEvent.click(screen.getByRole("button", { name: "Preview in RAF" }));

    expect(useRecipesStore.getState().recipes[0]?.name).toBe("Warm City Chrome");
    expect(window.location.hash).toBe("#raf");
  });

  it("duplicates the selected recipe and preserves manual schema-backed edits", () => {
    const selected = sampleRecipe();
    useRecipesStore.setState({
      recipes: [selected],
      selectedRecipeId: selected.id,
    });

    render(<RecipeCreator />);
    fireEvent.click(screen.getByRole("button", { name: /duplicate selected/i }));
    fireEvent.change(screen.getByLabelText(/film simulation/i), {
      target: { value: "AcrosR" },
    });
    fireEvent.change(screen.getByLabelText(/mono warm\/cool/i), {
      target: { value: "3" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Create recipe" }));

    const created = useRecipesStore.getState().recipes[0];
    expect(created?.name).toBe("Selected Chrome Copy");
    expect(created?.parentRecipeId).toBe(selected.id);
    expect(created?.filmSimulation).toBe("AcrosR");
    expect(created?.color).toBe(0);
    expect(created?.colorChromeEffect).toBe("Off");
    expect(created?.monochromaticColor?.warmCool).toBe(3);
  });
});
