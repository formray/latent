# Latent Use Cases

These are the product flows the repo optimizes for. They double as a sanity
check when reviewing UI, protocol, and schema changes.

## 1. Back Up Camera Custom Slots

**User:** A photographer with important C1-C4 looks on a Fujifilm camera.

**Goal:** Save the current camera recipes before experimenting.

**Flow:**

1. Connect the camera over WebUSB.
2. Read the custom slots.
3. Select each slot and import it into the local recipe library.
4. Export JSON copies for off-browser backup if desired.

**Success criteria:**

- The app shows camera model and firmware.
- Each imported recipe includes slot metadata and all decoded fields.
- Missing fields are visible, not silently ignored.
- The user can restore a slot by writing the imported backup back to camera.

## 2. Preview A Recipe On A Known RAF

**User:** A photographer who wants to know whether a recipe works on their
own image before writing it to a camera slot.

**Goal:** Render a local RAF through the connected camera with the selected
recipe.

**Flow:**

1. Open the RAF workspace.
2. Select a recipe from the library.
3. Load a local RAF file.
4. Render through the camera.
5. Adjust preview controls such as exposure compensation or D Range Priority.
6. Use diagnostics if the image diverges from expectation.

**Success criteria:**

- Rendering uses the camera processor, not a browser color approximation.
- The selected recipe name is visible throughout the flow.
- Auto-render is optional and controllable.
- Diagnostic variants isolate film simulation, dynamic range, tone, color,
  chrome, texture, exposure, and D Range Priority groups.

## 3. Write A Recipe To Camera

**User:** A photographer who has selected or imported a recipe and wants to
try it in-camera.

**Goal:** Write verified custom-slot fields to a chosen C slot.

**Flow:**

1. Select the target recipe.
2. Confirm the slot to overwrite.
3. Write the recipe.
4. Read the camera slots again.
5. Compare the read-back values with the recipe.

**Success criteria:**

- The app never writes without an explicit slot click.
- The user can see which slot is being overwritten.
- Unsupported or preview-only fields are not written silently.
- A failed write surfaces the PTP response code and keeps the connection
  recoverable.

## 4. Recover From A Bad Experiment

**User:** A photographer wrote a recipe that does not match the desired look.

**Goal:** Restore the previous camera state without guessing values by hand.

**Flow:**

1. Select the backup recipe imported from the camera before the experiment.
2. Write it back to the same slot.
3. Read the slot again.
4. Verify the restored values.

**Success criteria:**

- Backups are regular library recipes, not hidden state.
- Restore uses the same write/read-back path as any other recipe.
- The UI makes it clear which slot was restored.

## 5. Import A Recipe Pack

**User:** A photographer has a purchased, collaborated, or self-authored HTML
or JSON recipe pack.

**Goal:** Bring recipes into Latent while preserving structured parameters.

**Flow:**

1. Use the library import action.
2. Choose an HTML or JSON file.
3. Review imported names and parameters.
4. Delete duplicates if necessary.
5. Use factory reset to restore bundled defaults if the local library gets
   messy.

**Success criteria:**

- Imports normalize Fujifilm naming.
- Duplicate recipes are not repeatedly added by accident.
- The local library remains usable offline.
- Factory reset is available and understandable.

## 6. Debug A New Camera Model

**User:** A contributor with a Fujifilm model not yet verified by Latent.

**Goal:** Capture enough evidence to add or adjust capability data.

**Flow:**

1. Connect the camera and record model/firmware.
2. Read custom slots and inspect raw properties.
3. Compare decoded values with the camera UI.
4. Try RAF diagnostics with a known recipe.
5. Open an issue with logs, property IDs, and screenshots.

**Success criteria:**

- Unknown fields are visible as raw IDs and bytes.
- No unverified writable field is added without a round-trip test.
- The report can be reproduced by a maintainer or another camera owner.
