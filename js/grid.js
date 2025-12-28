import { dom } from './dom.js';

let callbacks = {
    saveHistory: null
};

export function setGridCallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

// gridTerrains maps "row,col" -> terrainType
export let gridTerrains = {};

export function syncGhosts(row, col, terrain) {
    // Ghosts have data-parent="row,col"
    const ghosts = dom.svgGrid.querySelectorAll(`.hex-ghost[data-parent="${row},${col}"]`);
    ghosts.forEach(g => {
        const t = terrain.includes('hex') ? terrain.replace('hex', '').replace('selected', '').trim() : terrain;
        g.setAttribute('class', `hex hex-ghost ${t}`);
    });
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

                // Neighbors logic
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
