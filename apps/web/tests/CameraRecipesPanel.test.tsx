import { beforeEach, describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import type { ConnectionState, RawPreset } from "@latent/camera-connection";
import { CameraRecipesPanel } from "../src/components/camera/CameraRecipesPanel";
import { resetCameraManagerForTests, useCameraStore } from "../src/stores/camera";
import { useRecipesStore } from "../src/stores/recipes";

function connectedState(): ConnectionState {
  return {
    kind: "connected",
    port: {
      getDeviceInfo: async () => ({
        model: "X-M5",
        firmwareVersion: "1.00",
        supportedOps: [],
      }),
      getDevicePropValue: async () => ({ kind: "uint16", value: 0 }),
      setDevicePropValue: async () => undefined,
      getPreset: async (slot: number) => preset(slot),
      isOpen: () => true,
    },
    cameraModel: "X-M5",
    firmwareVersion: "1.00",
  };
}

type RawPresetOverrides = Omit<Partial<RawPreset>, "name"> & {
  name?: string | undefined;
};

function preset(slot: number, overrides: RawPresetOverrides = {}): RawPreset {
  const base: RawPreset = {
    slot,
    name: slot === 1 ? "ETERNAL BLACK" : "KODAK ULTRAMAX 400",
    properties: {
      "0xd190": {
        name: "P:DynamicRange%",
        value: slot === 1 ? 100 : -1,
        bytes: slot === 1 ? [100, 0] : [255, 255],
      },
      "0xd192": {
        name: "P:FilmSimulation",
        value: slot === 1 ? 14 : 11,
        bytes: [slot === 1 ? 14 : 11, 0],
      },
    },
    decoded: {
      filmSimulation:
        slot === 1 ? { value: 14, label: "Acros + Red" } : { value: 11, label: "Classic Chrome" },
      dynamicRange: slot === 1 ? { value: 1, label: "DR 100%" } : { value: -1, label: "DR Auto" },
      whiteBalance: { value: 2, label: "Auto" },
      wbShift: slot === 1 ? { r: -8, b: -8 } : { r: 1, b: -5 },
      highlightTone: 1,
      shadowTone: slot === 1 ? 3.5 : 1,
      color: slot === 1 ? 0 : 4,
      sharpness: slot === 1 ? 1 : 0,
      noiseReduction: -4,
      clarity: slot === 1 ? 0 : 3,
      grainEffect: {
        value: 259,
        label: "Strong Large",
        strength: "Strong",
        size: "Large",
      },
      colorChromeEffect: slot === 1 ? { value: 2, label: "Strong" } : { value: 1, label: "Weak" },
      colorChromeEffectBlue:
        slot === 1 ? { value: 2, label: "Strong" } : { value: 0, label: "Off" },
      smoothSkinEffect: { value: 0, label: "Off" },
    },
  };
  const { name, ...restOverrides } = overrides;
  const next: RawPreset = { ...base, ...restOverrides };
  if (name !== undefined) {
    next.name = name;
  } else if ("name" in overrides) {
    delete next.name;
  }
  return next;
}

describe("<CameraRecipesPanel />", () => {
  beforeEach(() => {
    if (typeof localStorage !== "undefined") localStorage.clear();
    resetCameraManagerForTests();
    useCameraStore.setState({
      state: { kind: "idle" },
      presets: [],
      macosBetaAcknowledged: false,
      macosSetupAcknowledged: false,
      macosPersistentDisableConfigured: false,
      macosWizardOpen: false,
      macosShowAdvanced: false,
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

  it("does not render before a camera is connected or presets are cached", () => {
    const { container } = render(<CameraRecipesPanel />);
    expect(container).toBeEmptyDOMElement();
  });

  it("renders camera preset cards and inspector from decoded presets", () => {
    useCameraStore.setState({
      state: connectedState(),
      presets: [preset(1), preset(2)],
    });
    render(<CameraRecipesPanel />);
    expect(screen.getByRole("region", { name: /camera recipes/i })).toHaveTextContent(
      "X-M5 · FW 1.00",
    );
    expect(screen.getByRole("button", { name: /ETERNAL BLACK/i })).toHaveTextContent("Acros + Red");
    expect(screen.getAllByText("DR 100%").length).toBeGreaterThan(0);
    expect(screen.getAllByText("Strong Large").length).toBeGreaterThan(0);
    expect(screen.getByRole("complementary")).toHaveTextContent("Raw properties");
    expect(screen.getByRole("complementary")).toHaveTextContent("0xd190");
    expect(screen.getByRole("complementary")).toHaveTextContent("P:DynamicRange%");
    expect(screen.getByRole("complementary")).toHaveTextContent("64 00");
  });

  it("shows missing raw properties in the inspector", () => {
    useCameraStore.setState({
      state: connectedState(),
      presets: [preset(1, { missing: ["0xd19c"] })],
    });
    render(<CameraRecipesPanel />);

    expect(screen.getByRole("complementary")).toHaveTextContent("0xd19c");
    expect(screen.getByRole("complementary")).toHaveTextContent("Missing");
  });

  it("switches the inspector when another slot is selected", () => {
    useCameraStore.setState({
      state: connectedState(),
      presets: [preset(1), preset(2)],
    });
    render(<CameraRecipesPanel />);
    fireEvent.click(screen.getByRole("button", { name: /KODAK ULTRAMAX 400/i }));
    expect(screen.getByRole("complementary")).toHaveTextContent("Classic Chrome");
    expect(screen.getByRole("complementary")).toHaveTextContent("DR Auto");
    expect(screen.getByRole("complementary")).toHaveTextContent("+4");
  });

  it("renders unnamed base slots as default custom slots", () => {
    useCameraStore.setState({
      state: connectedState(),
      presets: [
        preset(3, {
          name: undefined,
          decoded: {
            ...preset(3).decoded!,
            filmSimulation: { value: 1, label: "Provia (Standard)" },
            dynamicRange: { value: 1, label: "DR 100%" },
            wbShift: { r: 0, b: 0 },
            highlightTone: 0,
            shadowTone: 0,
            color: 0,
            sharpness: 0,
            noiseReduction: 0,
            clarity: 0,
            grainEffect: { value: 0, label: "Off", strength: "Off", size: "Small" },
            colorChromeEffect: { value: 0, label: "Off" },
            colorChromeEffectBlue: { value: 0, label: "Off" },
          },
        }),
      ],
    });
    render(<CameraRecipesPanel />);
    expect(screen.getByRole("button", { name: /Default C3/i })).toHaveTextContent("default");
  });

  it("imports the selected camera slot as a recipe", () => {
    useCameraStore.setState({
      state: connectedState(),
      presets: [preset(2)],
    });
    render(<CameraRecipesPanel />);

    fireEvent.click(screen.getByRole("button", { name: /import as recipe/i }));

    const imported = useRecipesStore.getState().recipes[0];
    expect(imported?.name).toBe("KODAK ULTRAMAX 400");
    expect(imported?.cameraModel).toBe("X-M5");
    expect(imported?.dynamicRange).toBe("DRAuto");
    expect(useRecipesStore.getState().selectedRecipeId).toBe(imported?.id);
    expect(screen.getByRole("button", { name: /imported/i })).toBeInTheDocument();
  });

  it("selects the existing imported recipe when the camera slot is already imported", () => {
    useCameraStore.setState({
      state: connectedState(),
      presets: [preset(2)],
    });
    useRecipesStore.getState().importRecipe({
      id: "99999999-9999-4999-8999-999999999999",
      schemaVersion: 1,
      name: "KODAK ULTRAMAX 400",
      description: "Imported from X-M5 custom slot C2.",
      author: "Camera import",
      tags: ["camera-import", "x-m5", "c2"],
      createdAt: "2026-05-04T17:00:00.000Z",
      capabilitySetId: "x-m5-fw1.00",
      cameraModel: "X-M5",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DRAuto",
      whiteBalance: { mode: "Auto", shiftR: 1, shiftB: -5 },
      highlightTone: 1,
      shadowTone: 1,
      color: 4,
      sharpness: 0,
      noiseReduction: -4,
      clarity: 3,
      grainEffect: { strength: "Strong", size: "Large" },
      colorChromeEffect: "Weak",
      colorChromeEffectBlue: "Off",
      smoothSkinEffect: "Off",
    });
    useRecipesStore.getState().selectRecipe(null);
    render(<CameraRecipesPanel />);

    fireEvent.click(screen.getByRole("button", { name: /imported/i }));

    const imported = useRecipesStore.getState().recipes;
    expect(imported).toHaveLength(1);
    expect(useRecipesStore.getState().selectedRecipeId).toBe(imported[0]?.id);
  });

  it("updates the existing import when the camera slot values have changed", () => {
    useCameraStore.setState({
      state: connectedState(),
      presets: [preset(2)],
    });
    useRecipesStore.getState().importRecipe({
      id: "99999999-9999-4999-8999-999999999999",
      schemaVersion: 1,
      name: "KODAK ULTRAMAX 400",
      description: "Imported from X-M5 custom slot C2.",
      author: "Camera import",
      tags: ["camera-import", "x-m5", "c2"],
      createdAt: "2026-05-04T17:00:00.000Z",
      capabilitySetId: "x-m5-fw1.00",
      cameraModel: "X-M5",
      filmSimulation: "ClassicChrome",
      dynamicRange: "DRAuto",
      whiteBalance: { mode: "Auto", shiftR: 1, shiftB: -5 },
      highlightTone: 1,
      shadowTone: 1,
      color: 3,
      sharpness: 0,
      noiseReduction: -4,
      clarity: 3,
      grainEffect: { strength: "Strong", size: "Large" },
      colorChromeEffect: "Weak",
      colorChromeEffectBlue: "Off",
      smoothSkinEffect: "Off",
    });
    render(<CameraRecipesPanel />);

    fireEvent.click(screen.getByRole("button", { name: /update recipe/i }));

    const imported = useRecipesStore.getState().recipes;
    expect(imported).toHaveLength(1);
    expect(imported[0]?.id).toBe("99999999-9999-4999-8999-999999999999");
    expect(imported[0]?.color).toBe(4);
    expect(screen.getByRole("button", { name: /imported/i })).toBeInTheDocument();
  });
});
