import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { RecipeCreator } from "../src/components/RecipeCreator";
import { useRecipesStore } from "../src/stores/recipes";

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
});
