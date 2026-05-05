import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen } from "@testing-library/react";
import { App } from "../src/App";
import { useRecipesStore } from "../src/stores/recipes";
import { resetCameraManagerForTests, useCameraStore } from "../src/stores/camera";

describe("<App />", () => {
  beforeEach(() => {
    localStorage.clear();
    window.history.replaceState(null, "", "/");
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
    expect(screen.getByRole("link", { name: "Camera" })).toHaveAttribute("href", "#camera");
    expect(screen.getByRole("link", { name: "RAF" })).toHaveAttribute("href", "#raf");
    expect(screen.getByRole("link", { name: "Library" })).toHaveAttribute("aria-current", "page");
    expect(container.firstElementChild).toHaveAttribute("data-theme", "dark");

    fireEvent.click(screen.getByRole("button", { name: /switch to light theme/i }));

    expect(container.firstElementChild).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("latent-theme-v1")).toBe("light");
  });

  it("switches between first-class workspaces from the hash", () => {
    render(<App />);

    expect(screen.getByText(/Browse, edit, export, and write recipes/i)).toBeInTheDocument();

    act(() => {
      window.location.hash = "#raf";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByText(/Choose a recipe, keep a RAF loaded/i)).toBeInTheDocument();
    expect(screen.getByText("RAF workspace")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "RAF" })).toHaveAttribute("aria-current", "page");

    act(() => {
      window.location.hash = "#camera";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByText(/Read custom slots directly/i)).toBeInTheDocument();
    expect(screen.getByRole("link", { name: "Camera" })).toHaveAttribute("aria-current", "page");
  });

  it("opens a mobile workspace menu with navigation and theme controls", () => {
    const { container } = render(<App />);

    fireEvent.click(screen.getByRole("button", { name: "Menu" }));

    expect(screen.getByText("Read camera slots")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /RAF Lab/i })).toHaveAttribute("href", "#raf");

    fireEvent.click(screen.getByRole("button", { name: /Theme Switch to Light/i }));

    expect(container.firstElementChild).toHaveAttribute("data-theme", "light");

    act(() => {
      window.location.hash = "#raf";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.queryByText("Read camera slots")).not.toBeInTheDocument();
    expect(screen.getByText(/Choose a recipe, keep a RAF loaded/i)).toBeInTheDocument();
  });
});
