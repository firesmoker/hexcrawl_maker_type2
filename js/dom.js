export const dom = {
    // Main UI
    hexSizeInput: null,
    hexSizeVal: null,
    btnGenerate: null,
    svgGrid: null,
    hexLayer: null,
    addonLayer: null,
    pathLayer: null,
    pageContainer: null,
    pageWrapper: null,

    // Controls
    autoApplyInput: null,
    btnSelectCluster: null,
    btnExport: null,
    btnImport: null,
    csvUpload: null,
    btnShowAddons: null,
    btnRemoveAddon: null,
    addonList: null,
    btnUndo: null,
    btnRedo: null,

    // Tools
    toolSelect: null,
    toolRoad: null,
    toolRiver: null,

    // Popups
    popup: null,
    addonPopup: null,
    popupTitle: null,
    popupOptions: null,
    hexLabelInput: null,
    addonLabelContainer: null,

    // Path Popup
    pathPopup: null,
    btnDeletePath: null,

    // Zoom & Misc
    zoomInput: null,
    zoomVal: null,
    clusteringInput: null,
    clusteringVal: null,
    layerToggles: null, // If any
    terrainWeights: null,

    // Download
    btnDownload: null
};

export function initDOM() {
    dom.hexSizeInput = document.getElementById('hex-size');
    dom.hexSizeVal = document.getElementById('hex-size-val');
    dom.btnGenerate = document.getElementById('btn-generate');
    dom.svgGrid = document.getElementById('hex-grid');
    dom.hexLayer = document.getElementById('hex-layer');
    dom.addonLayer = document.getElementById('addon-layer');
    dom.pathLayer = document.getElementById('path-layer');
    dom.pageContainer = document.getElementById('page-container');
    dom.pageWrapper = document.getElementById('page-wrapper');

    dom.autoApplyInput = document.getElementById('auto-apply-hex');
    dom.btnSelectCluster = document.getElementById('btn-select-cluster');
    dom.btnExport = document.getElementById('btn-export');
    dom.btnImport = document.getElementById('btn-import');
    dom.csvUpload = document.getElementById('csv-upload');
    dom.btnShowAddons = document.getElementById('btn-show-addons');
    dom.btnRemoveAddon = document.getElementById('btn-remove-addon');
    dom.addonList = document.getElementById('addon-list');
    dom.btnUndo = document.getElementById('btn-undo');
    dom.btnRedo = document.getElementById('btn-redo');

    dom.toolSelect = document.getElementById('tool-select');
    dom.toolRoad = document.getElementById('tool-road');
    dom.toolRiver = document.getElementById('tool-river');

    dom.popup = document.getElementById('hex-popup');
    dom.addonPopup = document.getElementById('addon-popup');
    dom.popupTitle = document.getElementById('popup-title');
    dom.popupOptions = document.getElementById('popup-options');
    dom.hexLabelInput = document.getElementById('hex-label-input');
    dom.addonLabelContainer = document.getElementById('addon-label-container');

    dom.pathPopup = document.getElementById('path-popup');
    dom.btnDeletePath = document.getElementById('btn-delete-path');

    dom.zoomInput = document.getElementById('zoom-level');
    dom.zoomVal = document.getElementById('zoom-level-val');
    dom.clusteringInput = document.getElementById('clustering');
    dom.clusteringVal = document.getElementById('clustering-val');

    dom.terrainWeights = document.querySelectorAll('.terrain-weight');
    dom.btnDownload = document.getElementById('btn-download');

    console.log("DOM Initialized", dom);
}
