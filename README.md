# Boardview Lab — initial architecture

A browser-only PCB boardview starter. No server or external library is required.

## Run
Because this project uses JavaScript ES modules and IndexedDB, serve the folder from localhost (do not open `index.html` as a `file://` URL).

Examples:
- `python -m http.server 8000`
- Open `http://localhost:8000`

## Current prototype
- PCB visual background upload: PNG, JPG, WebP, SVG.
- Add arbitrary coordinate pinpoints to the active setup.
- Place simple SVG-template components: SOIC-8, SOT-23, 2-pin resistor, QFN-16.
- Switch between independent pinpoint setups.
- Inspect/edit pinpoint name, net, measurement type, expected value and unit.
- Local persistence with IndexedDB for project JSON and uploaded binary assets.
- Export/import project JSON.
- Store Gerber files in IndexedDB as project assets.

## Important prototype limitations
- Gerber files are stored, but not yet parsed or rendered. Add a Gerber renderer/import adapter in a later phase.
- PCB visual scaling currently uses a fixed 1000 × 700 logical canvas. A calibration workflow is required before using coordinates for metrology or manufacturing.
- Component templates are illustrative package outlines. Verify pin numbering and pin coordinates against each component datasheet/footprint before diagnostic use.
- Pin click selection is implemented. Component-pin-to-board-coordinate transform and “create pinpoint from selected component pin” should be added before relying on component pin points.
- No netlist parser, schematic cross-probing, electrical connectivity inference, or measurement instrument integration yet.
- Browser-local data is device/browser specific. Export backups; clearing browser data can remove the local database.

## Architecture
- `js/schema.js`: project schema and normalization.
- `js/storage.js`: IndexedDB project and binary asset persistence.
- `js/board.js`: board visual asset handling and pointer-to-board coordinate conversion.
- `js/svg-library.js`: reusable package templates and local pin coordinate definitions.
- `js/render.js`: SVG overlay rendering for components and pinpoints.
- `js/app.js`: UI orchestration and event wiring.
- `css/styles.css`: responsive interface.

## Data model
Project
- `board`: logical dimensions, visual asset ID/type, Gerber asset IDs.
- `components[]`: stable ID, reference designator, template ID, board x/y, rotation.
- `setups[]`: independent diagnostic configurations.
- `setups[].pinpoints[]`: test point ID, coordinate, optional component/pin reference, net and measurement definition.
- `assets[]`: metadata for binary assets held in IndexedDB.

## Recommended next implementation increments
1. Add calibration: define two known points or board dimensions, derive logical coordinate scale.
2. Add transformed pin geometry: compute pin positions from component origin, rotation and template coordinates.
3. Add “Create pinpoint at component pin” action and allow one physical point to be referenced by multiple setups.
4. Add layer controls and Gerber parser/renderer adapter (copper, solder mask, silkscreen, outline, drill).
5. Add component-template editor with SVG preview, pin numbering, pin coordinates, polarity and package metadata.
6. Add measurement records as history entries (timestamp, instrument, measured value, operator, conditions) separate from expected limits.
7. Add autosave debounce, project list/open/delete, schema migrations and IndexedDB quota/error handling.

## Coordinate and measurement rules
- All board coordinates are logical SVG coordinates, not screen pixels.
- Component template pins are local coordinates relative to the template origin.
- Store expected values/limits separately from measured observations.
- A diagnostic setup is a view/configuration over the same board and components; do not duplicate the board or component records per setup.
- Prefer stable IDs over array indices. Reference designators are labels, not primary keys.
