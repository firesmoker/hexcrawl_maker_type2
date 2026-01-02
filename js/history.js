import { state } from './state.js';
import { dom } from './dom.js';
import { updateValDisplay, closePopup, updateAddonDisplay } from './ui_core.js';
import { PPI, allTerrains } from './config.js';
import { getSmoothPathD, getIconDataUri } from './utils.js';

let undoStack = [];
let redoStack = [];
const historyLimit = 50;

let callbacks = {
    generateGrid: null,
    restorePaths: null
};

export function setHistoryCallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

function updateHistoryUI() {
    if (dom.btnUndo) dom.btnUndo.disabled = undoStack.length <= 1;
    if (dom.btnRedo) dom.btnRedo.disabled = redoStack.length === 0;
}

// Internal helper to capture current Path Data from DOM
// We need this because state.js might not always have the latest heavy DOM state until we fully migrate.
// For now, mirroring script.js behavior: read from DOM.
function getExportPaths() {
    return Array.from(dom.pathLayer.querySelectorAll('.map-path')).map(p => ({
        type: p.getAttribute('class').replace('map-path', '').trim(),
        nodes: p.getAttribute('data-hex-path')
    }));
}

function getExportHexes() {
    const hexes = dom.svgGrid.querySelectorAll('.hex:not(.hex-ghost)');
    return Array.from(hexes).map(h => ({
        r: parseInt(h.getAttribute('data-row')),
        c: parseInt(h.getAttribute('data-col')),
        t: h.getAttribute('class').replace('hex', '').replace('selected', '').trim(),
        a: h.getAttribute('data-addon') || '',
        l: h.getAttribute('data-label') || ''
    }));
}

export function saveHistory() {
    // Only save interactive hexes, ignore ghosts
    const hexData = getExportHexes();
    const pathData = getExportPaths();

    // Capture current colors
    const colors = {};
    if (allTerrains) {
        allTerrains.forEach(t => {
            colors[t] = getComputedStyle(document.documentElement).getPropertyValue(`--col-${t}`).trim();
        });
    }

    const currentSize = dom.hexSizeInput ? dom.hexSizeInput.value : "0.5";

    undoStack.push({
        hexSize: currentSize,
        hexes: hexData,
        paths: pathData,
        colors: colors
    });

    if (undoStack.length > historyLimit) {
        undoStack.shift();
    }

    redoStack = [];
    updateHistoryUI();
}

export function applyState(savedState) {
    if (!savedState) return;

    // Restore colors if present in history
    if (savedState.colors) {
        Object.keys(savedState.colors).forEach(t => {
            document.documentElement.style.setProperty(`--col-${t}`, savedState.colors[t]);
            const picker = document.querySelector(`.terrain-color-picker[data-terrain="${t}"]`);
            if (picker) picker.value = savedState.colors[t];
        });
    }

    const currentSize = dom.hexSizeInput ? dom.hexSizeInput.value : "0.5";
    if (savedState.hexSize !== currentSize && dom.hexSizeInput) {
        dom.hexSizeInput.value = savedState.hexSize;
        updateValDisplay();
    }

    // Full re-render ensures ghosts and terrain are perfectly synced with state
    if (callbacks.generateGrid) {
        callbacks.generateGrid(savedState.hexes);
    }

    if (callbacks.restorePaths) {
        callbacks.restorePaths(savedState.paths, dom.hexSizeInput.value);
    }

    updateHistoryUI();
}

export function undo() {
    if (undoStack.length <= 1) return;

    closePopup();

    const current = undoStack.pop();
    redoStack.push(current);

    const prevState = undoStack[undoStack.length - 1];
    applyState(prevState);
}

export function redo() {
    if (redoStack.length === 0) return;

    closePopup();

    const nextState = redoStack.pop();
    undoStack.push(nextState);
    applyState(nextState);
}
