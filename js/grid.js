import { dom } from './dom.js';
import { PPI } from './config.js';
import { closePopup, updateAddonDisplay } from './ui_core.js';
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

    // 1. COORDINATE DISCOVERY
    // We first gather all valid "slots" for hexes.
    const slots = [];
    const pointsStr = points; // reuse

    for (let row = 0; row < rows; row++) {
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

            // Create placeholder object
            slots.push({ r: row, c: col, x, y, key: `${row},${col}`, terrain: null });
        }
    }

    // 2. BUDGETING (if not preserved)
    if (preservedData) {
        // Just map preserved data to slots
        slots.forEach(slot => {
            const saved = preservedData.find(d => d.r === slot.r && d.c === slot.c);
            if (saved) {
                slot.terrain = saved.t;
                // Addon handled later
                slot.addon = saved.a;
                slot.label = saved.l;
            } else {
                slot.terrain = 'plains'; // Fallback
            }
        });
    } else {
        // Collect Active Weights
        const checkboxes = document.querySelectorAll('input[name="terrain"]:checked');
        const specs = [];

        checkboxes.forEach(cb => {
            const t = cb.value;
            const range = document.querySelector(`input.terrain-weight[data-terrain="${t}"]`);
            const valStr = range ? range.value : "0";
            const pct = parseInt(valStr, 10);
            if (pct > 0) specs.push({ type: t, pct: pct });
        });

        if (specs.length === 0) {
            specs.push({ type: 'plains', pct: 100 });
        }

        // Calculate Counts
        const totalSlots = slots.length;
        let assignedCount = 0;

        // Give counts
        const budget = {};
        specs.forEach((s, idx) => {
            if (idx === specs.length - 1) {
                // Determine last by remainder to ensure sum equals Total
                budget[s.type] = Math.max(0, totalSlots - assignedCount);
            } else {
                const count = Math.round((s.pct / 100) * totalSlots);
                budget[s.type] = count;
                assignedCount += count;
            }
        });

        console.log("Generation Specs:", specs);
        console.log("Generation Budget:", budget);
        console.log("Clustering:", dom.clusteringInput.value);

        // 3. ASSIGNMENT (Growth Algorithm)
        const clusteringFactor = parseFloat(dom.clusteringInput.value); // 0.0 to 1.0

        // Initial Seeds
        // If clustering is 1.0, seedCount = 1 per type.
        // If clustering is 0.0, seedCount = budget[type] (Random).

        const openList = slots.filter(s => !s.terrain); // All empty initially
        const unassignedSlots = new Set(openList.map(s => s.key));

        // Queues for expansion
        const queues = {};

        // Initialize
        specs.forEach(s => {
            queues[s.type] = [];
            const count = budget[s.type];
            if (count <= 0) return;

            // Decide seed count
            // We scale exponentially or linearly? Linear is predictable.
            // 0 -> Count seeds
            // 1 -> 1 seed
            // Formula: seeds = 1 + (Count - 1) * (1 - clusteringFactor)
            let seedCount = Math.floor(1 + (count - 1) * (1 - clusteringFactor));
            // Just to be safe
            if (seedCount > count) seedCount = count;

            // Place Seeds
            // Randomly pick 'seedCount' empty slots
            for (let i = 0; i < seedCount; i++) {
                if (budget[s.type] > 0) {
                    const availableIds = Array.from(unassignedSlots);
                    if (availableIds.length === 0) break;

                    const randKey = availableIds[Math.floor(Math.random() * availableIds.length)];
                    const slot = slots.find(s => s.key === randKey);

                    slot.terrain = s.type;
                    budget[s.type]--;
                    unassignedSlots.delete(randKey);

                    queues[s.type].push(slot);
                }
            }
        });

        // Growth Loop
        // While there are empty slots and budget remains
        while (unassignedSlots.size > 0) {
            // Find which terrains still have budget
            const hungryTypes = specs.filter(s => budget[s.type] > 0);
            if (hungryTypes.length === 0) break; // Should not happen if math correct

            // Pick a random hungry type to expand
            const currentTypeObj = hungryTypes[Math.floor(Math.random() * hungryTypes.length)];
            const type = currentTypeObj.type;
            const q = queues[type];

            let expanded = false;

            // Try to expand from existing queue
            // We shuffle or pick random from queue to keep it 'blobby' but random?
            // A true BFS keeps it very circular. Random pick from queue is more irregular.
            if (q.length > 0) {
                // Pick a random frontier node
                const frontierIdx = Math.floor(Math.random() * q.length);
                const frontier = q[frontierIdx];

                // Get neighbors
                const r = frontier.r;
                const c = frontier.c;
                const nCoords = (r % 2 === 0)
                    ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, c], [r + 1, c - 1], [r + 1, c]]
                    : [[r, c - 1], [r, c + 1], [r - 1, c], [r - 1, c + 1], [r + 1, c], [r + 1, c + 1]];

                // Find empty neighbors
                const emptyNeighbors = [];
                nCoords.forEach(([nr, nc]) => {
                    const key = `${nr},${nc}`;
                    if (unassignedSlots.has(key)) { // It is unassigned
                        const s = slots.find(sl => sl.key === key);
                        if (s) emptyNeighbors.push(s);
                    }
                });

                if (emptyNeighbors.length > 0) {
                    // Pick one
                    const target = emptyNeighbors[Math.floor(Math.random() * emptyNeighbors.length)];
                    target.terrain = type;
                    budget[type]--;
                    unassignedSlots.delete(target.key);
                    q.push(target);
                    expanded = true;
                } else {
                    // Dead end, remove from queue
                    q.splice(frontierIdx, 1);
                }
            }

            if (!expanded && budget[type] > 0 && q.length === 0) {
                // Could not expand from current frontier (encircled or empty queue).
                // Re-seed: Pick a random empty spot anywhere.
                const availableIds = Array.from(unassignedSlots);
                if (availableIds.length > 0) {
                    const randKey = availableIds[Math.floor(Math.random() * availableIds.length)];
                    const slot = slots.find(s => s.key === randKey);

                    slot.terrain = type;
                    budget[type]--;
                    unassignedSlots.delete(randKey);
                    q.push(slot); // Add new seed to queue
                }
            }
        }
    }

    // 4. RENDERING & FINALIZATION
    let lastRow = -1;
    let lastInteractiveCol = -1;

    // To handle ghosts correctly, we need to know the 'last interactive col' for each row.
    // 'slots' is flat, but we processed it in order (r,c).
    // Let's iterate slots and draw.
    // NOTE: 'slots' might be missing 'skipped' ones, but those are invisible.

    // We need to group by row to find last col
    const rowsMap = {};
    slots.forEach(s => {
        if (!rowsMap[s.r]) rowsMap[s.r] = [];
        rowsMap[s.r].push(s);
    });

    Object.keys(rowsMap).sort((a, b) => a - b).forEach(rKey => {
        const r = parseInt(rKey, 10);
        const rowSlots = rowsMap[r];
        const lastSlot = rowSlots[rowSlots.length - 1]; // Assumption: sorted by col

        rowSlots.forEach(slot => {
            gridTerrains[slot.key] = slot.terrain;

            const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            polygon.setAttribute("points", pointsStr);
            polygon.setAttribute("transform", `translate(${slot.x}, ${slot.y})`);
            polygon.setAttribute("data-row", slot.r);
            polygon.setAttribute("data-col", slot.c);

            const t = slot.terrain || 'plains'; // Safety
            polygon.setAttribute("class", `hex ${t}`);

            dom.hexLayer.appendChild(polygon);

            if (slot.addon) {
                updateAddonDisplay(polygon, slot.addon, slot.label);
            }
        });

        // GHOST HEX
        if (lastSlot) {
            const ghostCol = lastSlot.c + 1;
            let gx = ghostCol * horizDist;
            let gy = r * vertDist;
            if (r % 2 !== 0) gx += hexWidth / 2;

            const ghost = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
            ghost.setAttribute("points", pointsStr);
            ghost.setAttribute("transform", `translate(${gx}, ${gy})`);
            ghost.setAttribute("data-row", r);
            ghost.setAttribute("data-col", ghostCol);
            ghost.setAttribute("data-parent", `${r},${lastSlot.c}`);

            const parentTerrain = lastSlot.terrain || 'plains';
            ghost.setAttribute("class", `hex hex-ghost ${parentTerrain}`);
            dom.hexLayer.appendChild(ghost);
        }
    });

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
