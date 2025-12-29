import { dom } from './dom.js';
import { PPI } from './config.js'; // Needed for PNG sizing if we move PNG logic here
import { escapeCSVField, parseCSVLine } from './utils.js';

let callbacks = {
    generateGrid: null,
    restorePaths: null,
    saveHistory: null
};

export function setIOCallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

export function exportMapToCSV() {
    if (!dom.hexSizeInput) return;

    let csvContent = `metadata,hexSize,${dom.hexSizeInput.value}\n`;
    csvContent += `row,col,terrain,addon,label\n`;

    const hexes = dom.svgGrid.querySelectorAll('.hex:not(.hex-ghost)');
    hexes.forEach(hex => {
        const r = hex.getAttribute('data-row');
        const c = hex.getAttribute('data-col');
        const terrain = hex.getAttribute('class').replace('hex', '').replace('selected', '').trim();
        const addon = hex.getAttribute('data-addon') || '';
        const label = hex.getAttribute('data-label') || '';
        csvContent += `${r},${c},${escapeCSVField(terrain)},${escapeCSVField(addon)},${escapeCSVField(label)}\n`;
    });

    // Paths Section
    csvContent += `SECTION_PATHS\n`;
    const paths = dom.pathLayer.querySelectorAll('.map-path');
    paths.forEach(p => {
        const type = p.getAttribute('class').replace('map-path', '').trim();
        const nodes = p.getAttribute('data-hex-path') || '';
        csvContent += `path,${escapeCSVField(type)},${escapeCSVField(nodes)}\n`;
    });

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", "hex_map.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

export function handleCSVUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
        const content = event.target.result;
        const lines = content.split('\n');
        if (lines.length < 2) return;

        // Parse object to pass to generateGrid
        const meta = lines[0].split(',');
        let targetHexSize = dom.hexSizeInput.value;
        if (meta[0] === 'metadata' && meta[1] === 'hexSize') {
            targetHexSize = meta[2];
        }

        const loadedHexes = [];
        let loadedPaths = [];

        let inPathSection = false;

        for (let i = 2; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            if (line === 'SECTION_PATHS') {
                inPathSection = true;
                continue;
            }

            if (inPathSection) {
                // Path line
                // format: path,type,nodes
                const parts = parseCSVLine(line);
                if (parts.length >= 3 && parts[0] === 'path') {
                    loadedPaths.push({ type: parts[1], nodes: parts[2] });
                }
            } else {
                // Hex line
                // format: row,col,terrain,addon,label
                if (line.startsWith('path,')) {
                    // Safety catch if SECTION_PATHS was missing or malformed, but unlikely
                    continue;
                }
                const parts = parseCSVLine(line);
                if (parts.length < 3) continue;

                loadedHexes.push({
                    r: parseInt(parts[0]),
                    c: parseInt(parts[1]),
                    t: parts[2].trim(),
                    a: parts[3] ? parts[3].trim() : '',
                    l: parts[4] !== undefined ? parts[4].trim() : ''
                });
            }
        }

        // Apply
        if (dom.hexSizeInput) {
            dom.hexSizeInput.value = targetHexSize;
            // Trigger update event if needed, but we used generateGrid(data) usually
            // If we rely on main.js to update display:
            // dom.hexSizeVal.textContent ... 
        }

        if (callbacks.generateGrid) {
            callbacks.generateGrid(loadedHexes);
        }
        if (callbacks.restorePaths) {
            callbacks.restorePaths(loadedPaths, targetHexSize);
        }

        if (callbacks.saveHistory) {
            callbacks.saveHistory();
        }

        // Reset input
        e.target.value = '';
    };
    reader.readAsText(file);
}

export function downloadMapAsPNG() {
    if (!dom.svgGrid || !dom.pageContainer) return;

    const svgGrid = dom.svgGrid;
    const pageContainer = dom.pageContainer;

    const serializer = new XMLSerializer();
    let source = serializer.serializeToString(svgGrid);

    const width = pageContainer.clientWidth;
    const height = pageContainer.clientHeight;
    // High-res scale
    const scale = 2;

    if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
        source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
    }
    if (!source.match(/^<svg[^>]+xmlns:xlink/)) {
        source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
    }

    source = source.replace(/^<svg/, `<svg width="${width * scale}" height="${height * scale}" viewBox="0 0 ${width} ${height}"`);

    const styleRules = `
        .hex { fill: none; stroke: #e0e0e0; stroke-width: 1px; }
        .hex.sea { fill: #4fc3f7; }
        .hex.plains { fill: #c5e1a5; }
        .hex.swamp { fill: #6d4c41; }
        .hex.snow { fill: #f5f5f5; }
        .hex.desert { fill: #fff59d; }
        .hex.wasteland { fill: #78909c; }
        .map-path { fill: none; stroke-linecap: round; stroke-linejoin: round; }
        .path-road { stroke: #5d4037; stroke-width: 3px; filter: url(#rough-road); }
        .path-river { stroke: #4fc3f7; stroke-width: 4px; opacity: 0.8; filter: url(#rough-river); }
    `;

    source = source.replace('</svg>', `<style>${styleRules}</style></svg>`);

    const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);

    const img = new Image();
    img.onload = function () {
        const canvas = document.createElement('canvas');
        canvas.width = width * scale;
        canvas.height = height * scale;
        const ctx = canvas.getContext('2d');

        ctx.fillStyle = "#fffdf5";
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        ctx.drawImage(img, 0, 0);

        const a = document.createElement('a');
        a.download = 'hex_map_high_res.png';
        a.href = canvas.toDataURL('image/png');
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);

        URL.revokeObjectURL(url);
    };
    img.src = url;
}
