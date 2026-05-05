import { beforeEach, describe, expect, it } from "vitest";
import { act, fireEvent, render, screen, within } from "@testing-library/react";
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
    expect(screen.getAllByRole("link", { name: "Camera" })[0]).toHaveAttribute("href", "#camera");
    expect(screen.getAllByRole("link", { name: "RAF" })[0]).toHaveAttribute("href", "#raf");
    expect(screen.getAllByRole("link", { name: "Create" })[0]).toHaveAttribute("href", "#create");
    expect(
      screen
        .getAllByRole("link", { name: "Library" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
    expect(container.firstElementChild).toHaveAttribute("data-theme", "dark");

    fireEvent.click(screen.getByRole("button", { name: /switch to light theme/i }));

    expect(container.firstElementChild).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem("latent-theme-v1")).toBe("light");
  });

  it("allows launch screenshots to force the initial theme from the URL", () => {
    window.history.replaceState(null, "", "/?theme=light#create");

    const { container } = render(<App />);

    expect(container.firstElementChild).toHaveAttribute("data-theme", "light");
    expect(screen.getByRole("heading", { name: "Build a recipe" })).toBeInTheDocument();
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
    expect(
      screen
        .getAllByRole("link", { name: "RAF" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);

    act(() => {
      window.location.hash = "#camera";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByText(/Read custom slots directly/i)).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Camera" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);

    act(() => {
      window.location.hash = "#create";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(screen.getByText(/Build a validated recipe/i)).toBeInTheDocument();
    expect(screen.getByRole("heading", { name: "Build a recipe" })).toBeInTheDocument();
    expect(
      screen
        .getAllByRole("link", { name: "Create" })
        .some((link) => link.getAttribute("aria-current") === "page"),
    ).toBe(true);
  });

  it("keeps a mobile workspace dock with expandable controls", () => {
    const { container } = render(<App />);

    const dock = screen.getByRole("navigation", { name: "Mobile workspace" });
    expect(dock).toBeInTheDocument();
    expect(within(dock).getByRole("link", { name: "RAF" })).toHaveAttribute("href", "#raf");
    expect(within(dock).getByRole("link", { name: "Create" })).toHaveAttribute("href", "#create");

    fireEvent.click(screen.getByRole("button", { name: /open mobile controls/i }));

    const panel = document.getElementById("mobile-workspace-menu");
    expect(panel).toBeInTheDocument();
    expect(within(panel!).getByText("camera")).toBeInTheDocument();

    fireEvent.click(within(panel!).getByRole("button", { name: /switch to light theme/i }));

    expect(container.firstElementChild).toHaveAttribute("data-theme", "light");

    act(() => {
      window.location.hash = "#raf";
      window.dispatchEvent(new HashChangeEvent("hashchange"));
    });

    expect(document.getElementById("mobile-workspace-menu")).not.toBeInTheDocument();
    expect(screen.getByText(/Choose a recipe, keep a RAF loaded/i)).toBeInTheDocument();
  });
});
