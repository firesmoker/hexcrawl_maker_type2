import { dom } from './dom.js';
import { PPI } from './config.js';
import { closePopup, updateAddonDisplay } from './ui.js';
import { getSmoothPathD } from './utils.js';

let callbacks = {
    saveHistory: null
};

export function setGridCallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

// gridTerrains maps "row,col" -> terrainType
export let gridTerrains = {};

export function syncGhosts(row, col, terrain) {
    const ghosts = dom.svgGrid.querySelectorAll(`.hex-ghost[data-parent="${row},${col}"]`);
    ghosts.forEach(g => {
        const t = terrain.includes('hex') ? terrain.replace('hex', '').replace('selected', '').trim() : terrain;
        g.setAttribute('class', `hex hex-ghost ${t}`);
    });
}

export function restorePaths(pathsData, hexSize) {
    dom.pathLayer.innerHTML = '';
    if (!pathsData) return;

    const sizeInInches = parseFloat(hexSize);
    const R = sizeInInches * PPI;
    const hexWidth = Math.sqrt(3) * R;
    const vertDist = 1.5 * R;

    pathsData.forEach(p => {
        if (!p.nodes) return;
        const points = [];
        const nodes = p.nodes.split(';');
        nodes.forEach(node => {
            const [r, c] = node.split(',').map(Number);
            let x = c * hexWidth;
            let y = r * vertDist;
            if (r % 2 !== 0) x += hexWidth / 2;
            points.push({ x: x, y: y });
        });

        const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
        pathEl.setAttribute("d", getSmoothPathD(points));
        pathEl.setAttribute("class", `map-path ${p.type}`);
        pathEl.setAttribute("data-hex-path", p.nodes);
        dom.pathLayer.appendChild(pathEl);
    });
}

export function generateGrid(preservedData = null) {
    if (!dom.svgGrid) {
        console.warn("DOM not ready for generateGrid");
        return;
    }

    closePopup();
    // Clear existing
    dom.hexLayer.innerHTML = '';
    dom.pathLayer.innerHTML = '';
    dom.addonLayer.innerHTML = '';

    // Get selected terrains and weights from DOM
    const checkboxes = document.querySelectorAll('input[name="terrain"]:checked');
    const weightedPool = [];

    checkboxes.forEach(cb => {
        const terrain = cb.value;
        const range = document.querySelector(`input.terrain-weight[data-terrain="${terrain}"]`);
        const weight = range ? parseInt(range.value, 10) : 50;
        for (let i = 0; i < weight; i++) {
            weightedPool.push(terrain);
        }
    });

    if (weightedPool.length === 0 && !preservedData) {
        alert("Please select at least one terrain type.");
        return;
    }

    const sizeInInches = parseFloat(dom.hexSizeInput.value);
    const R = sizeInInches * PPI;
    const hexWidth = Math.sqrt(3) * R;

    // Page dimensions
    const pageWidth = dom.pageContainer.clientWidth;
    const pageHeight = dom.pageContainer.clientHeight;

    const horizDist = hexWidth;
    const vertDist = 1.5 * R;

    const cols = Math.ceil(pageWidth / horizDist) + 2;
    const rows = Math.ceil(pageHeight / vertDist) + 2;

    const w2 = hexWidth / 2;
    const r2 = R / 2;
    const points = [`0,-${R}`, `${w2},-${r2}`, `${w2},${r2}`, `0,${R}`, `-${w2},${r2}`, `-${w2},-${r2}`].join(' ');

    gridTerrains = {};

    for (let row = 0; row < rows; row++) {
        let lastInteractiveCol = -1;
        for (let col = 0; col < cols; col++) {
            let x = col * horizDist;
            let y = row * vertDist;

            if (row % 2 !== 0) x += hexWidth / 2;

            // Culling + 15% Visibility
            const hexTotalHeight = 2 * R;
            const visibilityThreshold = 0.15;

            const left = x - w2;
            const right = x + w2;
            const top = y - R;
            const bottom = y + R;

            const visibleW = Math.max(0, Math.min(right, pageWidth) - Math.max(left, 0));
            const visibleH = Math.max(0, Math.min(bottom, pageHeight) - Math.max(top, 0));

            if (visibleW < hexWidth * visibilityThreshold || visibleH < hexTotalHeight * visibilityThreshold) {
                continue;
            }

            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            polygon.setAttribute("points", points);
            polygon.setAttribute("transform", `translate(${x}, ${y})`);
            polygon.setAttribute("data-row", row);
            polygon.setAttribute("data-col", col);

            let terrain, addon = '', label = '';

            if (preservedData) {
                const data = preservedData.find(d => d.r == row && d.c == col);
                if (data) {
                    terrain = data.t;
                    addon = data.a;
                    label = data.l;
                } else {
                    terrain = weightedPool[0] || 'plains';
                }
            } else {
                // Random terrain with Clustering
                const clusteringFactor = parseFloat(dom.clusteringInput.value);
                const neighbors = [];
                if (gridTerrains[`${row},${col - 1}`]) neighbors.push(gridTerrains[`${row},${col - 1}`]);
                if (row % 2 !== 0) {
                    if (gridTerrains[`${row - 1},${col}`]) neighbors.push(gridTerrains[`${row - 1},${col}`]);
                    if (gridTerrains[`${row - 1},${col + 1}`]) neighbors.push(gridTerrains[`${row - 1},${col + 1}`]);
                } else {
                    if (gridTerrains[`${row - 1},${col - 1}`]) neighbors.push(gridTerrains[`${row - 1},${col - 1}`]);
                    if (gridTerrains[`${row - 1},${col}`]) neighbors.push(gridTerrains[`${row - 1},${col}`]);
                }

                if (neighbors.length > 0 && Math.random() < clusteringFactor) {
                    terrain = neighbors[Math.floor(Math.random() * neighbors.length)];
                } else {
                    terrain = weightedPool[Math.floor(Math.random() * weightedPool.length)];
                }
            }

            gridTerrains[`${row},${col}`] = terrain;
            polygon.setAttribute("class", `hex ${terrain}`);

            dom.hexLayer.appendChild(polygon);
            if (addon) {
                updateAddonDisplay(polygon, addon, label);
            }
            lastInteractiveCol = col;
        }

        // ADD GHOST HEX
        if (lastInteractiveCol !== -1) {
            const ghostCol = lastInteractiveCol + 1;
            let gx = ghostCol * horizDist;
            let gy = row * vertDist;
            if (row % 2 !== 0) gx += hexWidth / 2;

            const ghost = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            ghost.setAttribute("points", points);
            ghost.setAttribute("transform", `translate(${gx}, ${gy})`);
            ghost.setAttribute("data-row", row);
            ghost.setAttribute("data-col", ghostCol);
            ghost.setAttribute("data-parent", `${row},${lastInteractiveCol}`);

            const parentTerrain = gridTerrains[`${row},${lastInteractiveCol}`];
            ghost.setAttribute("class", `hex hex-ghost ${parentTerrain}`);
            dom.hexLayer.appendChild(ghost);
        }
    }

    if (!preservedData && callbacks.saveHistory) {
        callbacks.saveHistory();
    }
}

export function getCluster(startHex) {
    const row = parseInt(startHex.getAttribute('data-row'));
    const col = parseInt(startHex.getAttribute('data-col'));
    const type = startHex.getAttribute('class').replace('hex', '').replace('selected', '').trim();

    const cluster = [];
    const visited = new Set();
    const queue = [[row, col]];
    visited.add(`${row},${col}`);

    while (queue.length > 0) {
        const [r, c] = queue.shift();
        const hexEl = dom.svgGrid.querySelector(`.hex[data-row="${r}"][data-col="${c}"]`);

        if (hexEl) {
            const hexType = hexEl.getAttribute('class').replace('hex', '').replace('selected', '').trim();
            if (hexType === type) {
                cluster.push(hexEl);

                const nCoords = (r % 2 === 0)
                    ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]
                    : [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];

                nCoords.forEach(([nr, nc]) => {
                    const key = `${nr},${nc}`;
                    if (!visited.has(key)) {
                        visited.add(key);
                        queue.push([nr, nc]);
                    }
                });
            }
        }
    }
    return cluster;
}
