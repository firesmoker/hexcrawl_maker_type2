# Refactoring Plan and Architecture for `script.js`

**STATUS: PLANNING**

## 1. Goal & Reasoning
The primary goal is to decompose the monolithic `script.js` (~1300 lines) into a maintainable, modular **ES6 Module** architecture. 
- **Maintainability**: Smaller, focused files are easier to read and debug.
- **Scalability**: New features (like new tools or terrain types) can be added without navigating a massive file.
- **Safety**: Strict mode is enforced by default in modules, preventing global namespace pollution.

## 2. Target Architecture
The application will use native browser ES Modules (no build step required).

### Core Modules
| Module | Responsibility |
| :--- | :--- |
| `main.js` | **Entry Point**. Initializes DOM, sets up event listeners, and injects dependencies. |
| `config.js` | **Constants**. PPI, Terrain lists, Icon SVGs. |
| `state.js` | **State Store**. Holds mutable data (`undoStack`, `selectedHexes`, `currentTool`). |
| `dom.js` | **DOM Cache**. Centralized registry of all DOM elements to avoid `document.getElementById` scatter. |
| `utils.js` | **Helpers**. Pure functions (Math, CSV parsing, Path smoothing). |

### Feature Modules
| Module | Responsibility |
| :--- | :--- |
| `grid.js` | **Core Logic**. Generates the hex grid, manages culling, and renders SVG. |
| `interaction.js` | **Input**. Handles mouse events (click, drag, painting paths). |
| `ui_core.js` | **Display**. Manages Popups, Zoom scaling, and value displays. |
| `history.js` | **Undo/Redo**. Manages state snapshots. |
| `io.js` | **System**. Import (CSV), Export (CSV), Download (PNG). |

### 3. Strategy for Circular Dependencies
A key challenge is the relationship between `History` and `Grid`:
- `history.js` needs `generateGrid` to restore state.
- `grid.js` needs `saveHistory` to record changes.
**Solution**: **Dependency Injection**.
- `history.js` will export `undo` and `redo` but will *not* import `grid.js` directly.
- Instead, it will expose a `setCallbacks()` function.
- `main.js` will import both and "wire" them together at runtime.

---

# Implementation Checklist

This checklist follows a robust, iterative order. Each task can be verified independently.

## Phase 1: Foundation & "Leaf" Modules
These modules have zero or few dependencies. We will create them first.

- [x] **Task 1: Setup Directory & Config Module**
    - Create `js/` directory.
    - Create `js/config.js`: Extract `PPI`, `allTerrains`, `allAddons`, `iconSvgs`.
    - Create `js/main.js`: Empty entry point.
    - **Verify**: `import { PPI } from './js/config.js'` in `js/main.js` works (check console).

- [x] **Task 2: Utility Module**
    - Create `js/utils.js`: Extract `getSmoothPathD`, `getIconDataUri`, `escapeCSVField`, `parseCSVLine`.
    - **Verify**: Functions are importable.

- [x] **Task 3: State & DOM Modules**
    - Create `js/state.js`: Export mutable `state` object (undoStack, currentTool, etc.).
    - Create `js/dom.js`: Export `dom` object and `initDOM()` function.
    - **Verify**: Call `initDOM()` in `js/main.js` and log a captured element.

## Phase 2: Core Logic (The Grid)
This is the heart of the app. We verify it works *visually* before adding interactions.

- [x] **Task 4: UI Helper Module (Basic)**
    - Create `js/ui_core.js`: Extract `updateValDisplay`, `updateZoom`, `updateAddonDisplay`.
    - Move `popup` logic (`openPopup`, `closePopup`) here.
    - **critical**: Do NOT import `grid.js` or `history.js` here yet to avoid cycles.

- [x] **Task 5: Grid Structure & Helpers**
    - Create `js/grid.js` with `gridTerrains` variable and `setGridCallbacks`.
    - Move `getCluster` and `syncGhosts` to `js/grid.js`.
    - **Verify**: Import `js/grid.js` in console and check exports.

- [x] **Task 6: Grid Generation Logic**
    - Add `generateGrid` and `restorePaths` to `js/grid.js`.
    - Ensure strict usage of `dom` module for element access.
    - **Verify**: Check `js/grid.js` for syntax errors (no execution yet).

- [x] **Task 7: History Module Extraction**
    - Create `js/history.js`.
    - Extract `saveHistory`, `undo`, `redo`, `applyState`.
    - Implement `setHistoryCallbacks` for Grid dependency.
    - **Verify**: `js/history.js` syntax is valid.
    - **Expected App State**: **FULLY FUNCTIONAL** (Uses `script.js`). New file is offline.

- [x] **Task 8: IO Module Extraction**
    - Create `js/io.js`.
    - Extract Export/Import CSV, Download PNG logic.
    - Implement `setIOCallbacks`.
    - **Verify**: `js/io.js` syntax is valid.
    - **Expected App State**: **FULLY FUNCTIONAL** (Uses `script.js`). New file is offline.

## Phase 4: Interaction Logic Breakdown
breaking the complex interaction logic into manageable pieces.

- [x] **Task 9: Interaction - Selection & Popups**
    - Create `js/interaction.js` (Structure).
    - Extract `handleClick`, `handleDoubleClick`, `openPopup` integration.
    - Focus ONLY on "Clicking" and "Selecting".
    - **Verify**: Code review of logic transfer.
    - **Expected App State**: **FULLY FUNCTIONAL** (Uses `script.js`). New file is offline.

- [x] **Task 10: Interaction - Path Painting & Dragging**
    - Update `js/interaction.js`.
    - Extract `handleMouseDown`, `handleMouseMove`, `handleMouseUp`.
    - Move Path Smoothing logic (`getSmoothPathD` usage).
    - **Verify**: Code review of drag state logic.
    - **Expected App State**: **FULLY FUNCTIONAL** (Uses `script.js`). New file is offline.

- [x] **Task 11: Interaction - Global Inputs**
    - Update `js/interaction.js`.
    - Extract Keyboard Shortcuts (`Ctrl+Z`, `Ctrl+Y`, `+`, `-`).
    - Extract Zoom Keybinds.
    - Extract Global Click (close popup) listeners.
    - **Expected App State**: **FULLY FUNCTIONAL** (Uses `script.js`). New file is offline.

## Phase 5: Integration & Switchover
Putting it all together.

- [x] **Task 12: Main Assembler (Wiring)**
    - Update `js/main.js`.
    - Import ALL modules.
    - Perform all `setCallbacks` injections (Wiring).
    - Initialize `initInteraction()`, `initPopupListeners()`.
    - **Verify**: `js/main.js` has no reference errors.
    - **Expected App State**: **FULLY FUNCTIONAL** (Uses `script.js`). New file is offline.

- [x] **Task 13: Live Switchover**
    - Update `index.html`: Change `<script src="script.js">` to `<script type="module" src="js/main.js">`.
    - **Verify**: Load the page. Grid should render.
    - **Expected App State**: **CHANGED**. Logic swaps from `script.js` to `js/main.js`. If valid, it works identically. If invalid, map may fail to load (reversible).

- [x] **Task 14: Functional Verification**
    - **Verify**: Full app walkthrough (Generate, Paint, Popups, History, IO).
    - **Expected App State**: **FULLY FUNCTIONAL**.

- [x] **Task 15: Cleanup**
    - Delete `script.js`.
    - **Expected App State**: **CLEAN**. Only modular code remains.

## Verification Checklist after EACH Step
1.  **Console Check**: No red errors.
2.  **Visual Check**: Grid generates.
3.  **Functionality**: Test the specific feature moved (e.g., after Task 7, test CSV export).
