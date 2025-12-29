import { initDOM, dom } from './dom.js';
import { setUICallbacks, initPopupListeners, openPopup, updateZoom, initColorPickers, updateValDisplay, updateClusteringDisplay, initTerrainWeightListeners } from './ui_core.js';
import { generateGrid, restorePaths, setGridCallbacks, getCluster } from './grid.js';
import { initInteraction, setInteractionCallbacks } from './interaction.js';
import { saveHistory, undo, redo, applyState, setHistoryCallbacks } from './history.js';
import { handleCSVUpload, exportMapToCSV, downloadMapAsPNG, setIOCallbacks } from './io.js';
import { state } from './state.js';

document.addEventListener('DOMContentLoaded', () => {
    console.log("Initializing Modular Hexcrawl App...");

    // 1. Initialize DOM Cache
    initDOM();

    // 2. Wire up Dependencies (Callbacks)

    // UI needs to save history when tools change or popups interact
    setUICallbacks({
        saveHistory,
        onSelectCluster: (hex) => {
            const cluster = getCluster(hex);
            // Select visually
            cluster.forEach(h => {
                h.classList.add('selected');
                h.parentElement.appendChild(h);
            });
            openPopup(hex, 0, 0, cluster);
        }
    });

    // Grid needs to save history after generation
    setGridCallbacks({ saveHistory });

    // Interaction needs history, undo/redo
    setInteractionCallbacks({ saveHistory, undo, redo });

    // History needs to be able to regenerate grid and restore paths
    setHistoryCallbacks({ generateGrid, restorePaths });

    // IO needs to regenerate grid/paths after import, and save history
    setIOCallbacks({ generateGrid, restorePaths, saveHistory });

    // 3. Initialize Event Listeners
    initInteraction();
    initPopupListeners();

    // 4. Initial Render
    if (dom.btnGenerate) {
        dom.btnGenerate.addEventListener('click', () => {
            generateGrid();
        });
    }

    if (dom.hexSizeInput) {
        dom.hexSizeInput.addEventListener('input', updateValDisplay);
        dom.hexSizeInput.addEventListener('change', () => {
            updateValDisplay();
            if (dom.autoApplyInput && dom.autoApplyInput.checked) {
                generateGrid();
            }
        });
    }

    if (dom.clusteringInput) {
        dom.clusteringInput.addEventListener('input', updateClusteringDisplay);
    }

    // Zoom listeners
    if (dom.zoomInput) {
        dom.zoomInput.addEventListener('input', updateZoom);
    }

    // IO Listeners
    if (dom.btnExport) dom.btnExport.addEventListener('click', exportMapToCSV);
    if (dom.btnImport) dom.btnImport.addEventListener('click', () => dom.csvUpload.click());
    if (dom.csvUpload) dom.csvUpload.addEventListener('change', handleCSVUpload);
    if (dom.btnDownload) dom.btnDownload.addEventListener('click', downloadMapAsPNG);

    // Initial Grid
    generateGrid();
    updateZoom();

    // Setup color pickers live update
    initColorPickers();
    initTerrainWeightListeners();

    console.log("App Initialized.");
});
