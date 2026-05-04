import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { App } from "../src/App";
import { useRecipesStore } from "../src/stores/recipes";
import { resetCameraManagerForTests, useCameraStore } from "../src/stores/camera";

describe("<App />", () => {
  beforeEach(() => {
    localStorage.clear();
    resetCameraManagerForTests();
    useCameraStore.setState({
      state: { kind: "idle" },
      presets: [],
      rawPreviewStatus: { kind: "idle" },
    });
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

  it("renders the workspace navigation and persists the theme toggle", () => {
    const { container } = render(<App />);

    expect(screen.getByText(/Camera-backed Fujifilm recipes/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Camera" })).toHaveAttribute(
      "href",
      "#camera-recipes-panel",
    );
    expect(screen.getByRole("link", { name: "RAF" })).toHaveAttribute("href", "#raw-preview-panel");
    expect(container.firstElementChild).toHaveAttribute("data-theme", "dark");

    fireEvent.click(screen.getByRole("button", { name: /switch to light theme/i }));

    expect(container.firstElementChild).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("latent-theme-v1")).toBe("light");
  });
});
