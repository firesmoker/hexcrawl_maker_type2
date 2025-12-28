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
| `ui.js` | **Display**. Manages Popups, Zoom scaling, and value displays. |
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

- [ ] **Task 4: UI Helper Module (Basic)**
    - Create `js/ui.js`: Extract `updateValDisplay`, `updateZoom`, `updateAddonDisplay`.
    - Move `popup` logic (`openPopup`, `closePopup`) here.
    - **critical**: Do NOT import `grid.js` or `history.js` here yet to avoid cycles.

- [ ] **Task 5: Grid Generation Module**
    - Create `js/grid.js`: Extract `generateGrid`, `restorePaths`, `syncGhosts`.
    - Import `dom`, `config`, `state`, `ui`.
    - **Action**: In `js/main.js`, call `generateGrid()` on load.
    - **Verify**: The map renders correctly on page load (static).

## Phase 3: Systems & Logic
Connecting the static grid to the rest of the application.

- [ ] **Task 6: History System (with Dependency Injection)**
    - Create `js/history.js`: Extract `saveHistory`, `undo`, `redo`, `applyState`.
    - **Architecture Fix**: `history.js` needs to call `generateGrid`. To avoid circular imports (`grid` imports `history` to save, `history` imports `grid` to restore), use a setter:
        - Export `setCallbacks({ generateGrid, restorePaths })`.
        - In `js/main.js`, inject these functions into `history.js`.
    - **Verify**: Manually calling `saveHistory()` works (check console/memory).

- [ ] **Task 7: IO Module**
    - Create `js/io.js`: Extract Export CSV, Import CSV, Download PNG logic.
    - **Verify**: Buttons trigger file downloads/inputs.

## Phase 4: Interaction & Wiring
Making the map interactive.

- [ ] **Task 8: Interaction Module**
    - Create `js/interaction.js`: Extract mouse event listeners (`mousedown`, `mousemove`, `click`).
    - Move `getCluster` here or to `grid.js` (keep logical).
    - **Verify**: Clicking hexes, painting paths, and tool switching works.

- [ ] **Task 9: Final Wiring & Cleanup**
    - Update `js/main.js`:
        - Initialize listeners (IO, Interaction, Tools).
        - Hook up Undo/Redo buttons.
    - Switch `index.html` to `<script type="module" src="js/main.js"></script>`.
    - **Delete**: `script.js`.

## Verification Checklist after EACH Step
1.  **Console Check**: No red errors.
2.  **Visual Check**: Grid generates.
3.  **Functionality**: Test the specific feature moved (e.g., after Task 7, test CSV export).
