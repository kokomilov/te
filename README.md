[README.md](https://github.com/user-attachments/files/35498571/README.md)
# Electric Diagnostic — PCB Workbench v2

Browser-only HTML/CSS/JavaScript project. No framework or server-side database is required.

## Run
Because this project uses JavaScript ES modules and IndexedDB, serve the folder from localhost:

```bash
python -m http.server 8000
```

Open `http://localhost:8000`.

## Included in this increment
- Two independent PCB visual assets: TOP and BOTTOM.
- Each side has its own image/SVG background and its own testpoint coordinates.
- Switch sides without duplicating electrical connectivity.
- Add testpoints by selecting **Add testpoint** and clicking the active board.
- Search and filter testpoints by text, PCB side and last measurement result.
- Toggleable functional block diagram.
- Pin-to-pin connection groups. A connection is a set of endpoint labels such as `U1.3`, `J2.1`, or `TP002`.
- Selecting a connection highlights matching endpoints/testpoints. This does not render copper rails or infer physical routing.
- Manual measurements with timestamp, technician, notes and PASS/FAIL evaluation.
- Local IndexedDB persistence and JSON project export/import.
- Migration helper for the original schema v1 `setups[].pinpoints[]` records.

## Important scope notes
1. This version stores TOP and BOTTOM board images separately. It does not mirror or flip the image automatically; upload each side in the orientation you want to work with.
2. Pin connection groups are logical relationships only. The application does not parse Gerber files, infer continuity, calculate copper paths, or render full rail traces.
3. Component-pin coordinates are placeholders in this increment. Pin endpoint labels can be entered in the connection editor, but precise transformed footprint-pin placement and cross-probing should be the next enhancement.
4. The sample diagram nodes are illustrative. Replace or extend them with your board's functional blocks.
5. PASS/FAIL is calculated from the configured minimum and maximum limits. If neither limit is set, a configured expected value is compared exactly; define tolerances for practical measurements.
6. Data is stored in the current browser/device. Export JSON regularly for backup. Uploaded image blobs are stored in IndexedDB and are not embedded in the JSON export in this prototype.

## Next recommended increment
Add a pin/connector editor with component reference, pin number, pin name, side and board coordinates. This will let the diagram, connection groups, PCB markers and testpoint table use one canonical endpoint ID.
