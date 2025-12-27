# Implementation Plan: Undo/Redo Functionality

This plan outlines the implementation of a robust, state-based Undo/Redo system for the HexGen RPG Map Maker.

## 1. Core Architecture: State Snapshots
Instead of tracking individual actions, the system will use **Full State Snapshots**. This approach is more reliable for complex operations like map generation and batch selection.

- **State Payload**: A JSON-compatible object containing:
  - `hexSize`: Current size value of the hexes.
  - `hexes`: An optimized array of objects representing every hex: `{ r, c, t, a, l }` (row, col, terrain, addon, label).

## 2. History Manager Logic
The system will maintain two internal stacks: `undoStack` and `redoStack`.

- **saveState()**: 
  - Captures the current map state.
  - Pushes it to the `undoStack`.
  - Clears the `redoStack` (to handle branching history).
  - Enforces a history limit (e.g., 50 steps) to manage memory.
- **undo()**: 
  - Pops the last state from `undoStack`.
  - Pushes the *current* state to the `redoStack`.
  - Applies the popped state to the map.
- **redo()**: 
  - Pops the last state from `redoStack`.
  - Pushes the *current* state to the `undoStack`.
  - Applies the popped state to the map.

## 3. Trigger Points (When to Save)
A snapshot is saved immediately **after** a successful mutation is completed:
- **Map Generation**: After the `generateGrid` function finishes filling the map.
- **Hex Size Adjustment**: On the slider's `change` event (when the user releases the mouse).
- **Terrain/Addon Selection**: As soon as a terrain type or addon is applied to a selection.
- **Label Editing**: Triggered when the label input loses focus (`blur`) or when "Enter" is pressed.

## 4. Smart Application (`applyState`)
To ensure high performance, the restoration process will be intelligent:
1. **Compare Hex Size**: If the snapshot's `hexSize` differs from the current live value:
   - Clear the SVG.
   - Re-run the full grid generation logic to reset coordinate systems and geometry.
2. **Apply Data**: Iterate through the saved hex data and apply values to the SVG elements.
3. **Optimized Update**: If `hexSize` is identical, the system will only update class attributes and label text/icons, avoiding an expensive re-render of the SVG geometry.

## 5. User Interface & Shortcuts
### Keyboard Shortcuts
| Action | Windows/Linux | macOS |
| :--- | :--- | :--- |
| **Undo** | `Ctrl + Z` | `Cmd + Z` |
| **Redo** | `Ctrl + Y` or `Ctrl + Shift + Z` | `Cmd + Shift + Z` |

### Visual Feedback
- **Sidebar Buttons**: Two small, sleek icons (Undo/Redo) added to the action bar in the sidebar.
- **Visual State**: Buttons will be dimmed and unclickable if their respective stack is empty.

## 6. Implementation Steps
1. **Initialize State**: Create the global history stacks and `saveState` helper.
2. **Integration**: Hook `saveState` into the existing event listeners in `script.js`.
3. **Shortcut Listener**: Add the global document `keydown` listener.
4. **UI Update**: Add the buttons to `index.html` and style them in `style.css`.
5. **Testing**: Verify that "Generate" actions are fully reversible and that "Auto-Apply" resizes only create one history step per slider interaction.
