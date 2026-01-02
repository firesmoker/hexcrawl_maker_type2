# Plan: Fix Undo/Redo Bug

## Status
- [ ] Reproduce the bug
- [x] Analyze `history.js` (Done)
- [x] Analyze `grid.js` (Done)
- [x] Investigate `generateGrid` and `restorePaths` (Done)
    - **Confirmed Issue**: `generateGrid` compared number (loop index) with string (history data).
- [x] Implement Fix (Done: history.js parseInt, grid.js loose equality backup)
- [ ] Verify Fix (Manual - User Action)

## Context
Fixed a critical bug where Undo would clear the map because `generateGrid(savedState)` failed to match saved hexes (strings) with new grid slots (integers).
Added `parseInt` to `getExportHexes` in `history.js` to ensure clean state.
Added `==` loose equality in `grid.js` as a safety net.

## Context
User reports Undo clears the map.
Visual analysis of `history.js`:
- `saveHistory()` calls `getExportHexes()`.
- `undo()` pops state and calls `applyState()`.
- `applyState()` calls `callbacks.generateGrid(savedState.hexes)`.

Visual analysis of `grid.js`:
- `generateGrid(preservedData)` clears `dom.hexLayer`.
- If `preservedData` is present, it iterates slots and attempts to match `preservedData`.
- **CRITICAL**: `generateGrid` calculates `rows` and `cols` based on *current window size*.
- `preservedData` contains `r` and `c`.
- Logic: `const saved = preservedData.find(d => d.r === slot.r && d.c === slot.c);`

Potential Issue:
When `generateGrid` runs with `preservedData`, it relies on the loop `for (let row...; col...)` to match slots.
If the hexes in `preservedData` do not match the *newly calculated* slots (e.g. due to rounding, window resize, or just mismatch in logic), they won't be rendered.

However, the user says it "clears the map". This suggests `saved` is never found, or `preservedData` is empty.

Let's check `getExportHexes` in `history.js`.
It queries `.hex:not(.hex-ghost)`.

I need to check if `saveHistory` is called *after* a clear event but *before* a paint event?
Or if `preservedData` is structured correctly.

`getExportHexes` returns objects with `{r, c, t, a, l}` (strings).
`generateGrid` compares `d.r === slot.r`. `slot.r` is integer (loop index).
`d.r` comes from `getAttribute`, so it is a **STRING**.
`slot.r` is a **NUMBER**.

**Found it:** `d.r === slot.r` will be false if one is string and other is number!
`generateGrid` line 123: `const saved = preservedData.find(d => d.r === slot.r && d.c === slot.c);`
`slot.r` is from `let row = 0`.
`preservedData` comes from `getExportHexes` -> `getAttribute`.

Fix: Ensure strict type conversion or loose comparison.
