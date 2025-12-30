import { initDOM, dom } from './dom.js';
import * as UI from './ui_core.js';
import * as Grid from './grid.js';
import * as Interaction from './interaction.js';
import * as History from './history.js';
import * as IO from './io.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Modular Hexcrawl App...");

    // 1. Initialize DOM Cache
    initDOM();

    // 2. Wire up Dependencies (Callbacks)

    // UI needs to save history when tools change or popups interact
    UI.setUICallbacks({
        saveHistory: History.saveHistory,
        syncGhosts: Grid.syncGhosts,
        onSelectCluster: (hex) => {
            const cluster = Grid.getCluster(hex);
            // Select visually
            cluster.forEach(h => {
                h.classList.add('selected');
                h.parentElement.appendChild(h);
            });
            UI.openPopup(hex, 0, 0, cluster);
        }
    });

    // Grid needs to save history after generation
    Grid.setGridCallbacks({ saveHistory: History.saveHistory });

    // Interaction needs history, undo/redo
    Interaction.setInteractionCallbacks({
        saveHistory: History.saveHistory,
        undo: History.undo,
        redo: History.redo
    });

    // History needs to be able to regenerate grid and restore paths
    History.setHistoryCallbacks({
        generateGrid: Grid.generateGrid,
        restorePaths: Grid.restorePaths
    });

    // IO needs to regenerate grid/paths after import, and save history
    IO.setIOCallbacks({
        generateGrid: Grid.generateGrid,
        restorePaths: Grid.restorePaths,
        saveHistory: History.saveHistory
    });

    // 3. Initialize Event Listeners
    Interaction.initInteraction();
    UI.initPopupListeners();

    // 4. Initial Render
    if (dom.btnGenerate) {
        dom.btnGenerate.addEventListener('click', () => {
            Grid.generateGrid();
        });
    }

    if (dom.hexSizeInput) {
        dom.hexSizeInput.addEventListener('input', UI.updateValDisplay);
        dom.hexSizeInput.addEventListener('change', () => {
            UI.updateValDisplay();
            if (dom.autoApplyInput && dom.autoApplyInput.checked) {
                Grid.generateGrid();
            }
        });
    }

    if (dom.clusteringInput) {
        dom.clusteringInput.addEventListener('input', UI.updateClusteringDisplay);
    }

    // Zoom listeners
    if (dom.zoomInput) {
        dom.zoomInput.addEventListener('input', UI.updateZoom);
    }

    // IO Listeners
    if (dom.btnExport) dom.btnExport.addEventListener('click', IO.exportMapToCSV);
    if (dom.btnImport) dom.btnImport.addEventListener('click', () => dom.csvUpload.click());
    if (dom.csvUpload) dom.csvUpload.addEventListener('change', IO.handleCSVUpload);
    if (dom.btnDownload) dom.btnDownload.addEventListener('click', IO.downloadMapAsPNG);

    // Initial Grid
    Grid.generateGrid();
    UI.updateZoom();

    // Setup color pickers live update
    UI.initColorPickers();
    UI.initTerrainWeightListeners();

    console.log("App Initialized.");
});
