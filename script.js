document.addEventListener('DOMContentLoaded', () => {
    const hexSizeInput = document.getElementById('hex-size');
    const hexSizeVal = document.getElementById('hex-size-val');
    const btnGenerate = document.getElementById('btn-generate');
    const svgGrid = document.getElementById('hex-grid');
    const pageContainer = document.getElementById('page-container');
    const pageWrapper = document.getElementById('page-wrapper');
    const autoApplyInput = document.getElementById('auto-apply-hex');
    const btnSelectCluster = document.getElementById('btn-select-cluster');
    const btnExport = document.getElementById('btn-export');
    const btnImport = document.getElementById('btn-import');
    const csvUpload = document.getElementById('csv-upload');
    const btnShowAddons = document.getElementById('btn-show-addons');
    const addonList = document.getElementById('addon-list');

    // Hex Selection Logic - Defined early to avoid ReferenceErrors during initial generation
    const popup = document.getElementById('hex-popup');
    const addonPopup = document.getElementById('addon-popup');
    const popupTitle = document.getElementById('popup-title');
    const popupOptions = document.getElementById('popup-options');
    const hexLabelInput = document.getElementById('hex-label-input');
    const addonLabelContainer = document.getElementById('addon-label-container');
    let selectedHexes = [];
    const allTerrains = ['sea', 'plains', 'swamp', 'snow', 'desert', 'wasteland'];
    const allAddons = ['Town', 'City', 'Dungeon', 'Tower', 'Mountain', 'Encampment'];

    function closePopup() {
        if (popup) popup.classList.add('hidden');
        if (addonPopup) addonPopup.classList.add('hidden');
        selectedHexes.forEach(h => {
            h.classList.remove('selected');
        });
        selectedHexes = [];
    }

    // Helper to add/update addon (icon + text) on a hex
    function updateAddonDisplay(hex, addonType, customLabel) {
        const row = hex.getAttribute('data-row');
        const col = hex.getAttribute('data-col');

        // Remove existing addon group if any
        const existingGroup = svgGrid.querySelector(`g.addon-group[data-row="${row}"][data-col="${col}"]`);
        if (existingGroup) existingGroup.remove();

        // If no addonType provided, clear attributes and return
        if (!addonType || addonType === 'None') {
            hex.removeAttribute('data-addon');
            hex.removeAttribute('data-label');
            return;
        }

        hex.setAttribute('data-addon', addonType);

        // Use customLabel if provided, otherwise default to addonType
        const labelText = customLabel !== undefined ? customLabel : addonType;
        hex.setAttribute('data-label', labelText);

        const transform = hex.getAttribute('transform');
        const group = document.createElementNS("http://www.w3.org/2000/svg", "g");
        group.setAttribute("class", "addon-group");
        group.setAttribute("transform", transform);
        group.setAttribute("data-row", row);
        group.setAttribute("data-col", col);
        group.setAttribute("pointer-events", "none");

        // Icon
        const iconSize = 50;
        const img = document.createElementNS("http://www.w3.org/2000/svg", "image");
        img.setAttributeNS("http://www.w3.org/1999/xlink", "href", `icons/${addonType.toLowerCase()}.svg`);
        img.setAttribute("width", iconSize);
        img.setAttribute("height", iconSize);
        img.setAttribute("x", -iconSize / 2);
        img.setAttribute("y", -iconSize / 2 - 5);

        // Label
        const textNode = document.createElementNS("http://www.w3.org/2000/svg", "text");
        textNode.setAttribute("x", 0);
        textNode.setAttribute("y", iconSize / 2 - 2);
        textNode.setAttribute("text-anchor", "middle");
        textNode.setAttribute("dominant-baseline", "hanging");
        textNode.setAttribute("fill", "black");
        textNode.setAttribute("style", "font-weight: 700; font-family: 'Outfit', sans-serif; font-size: 14px; text-shadow: 0 0 2px white;");
        textNode.textContent = labelText;

        group.appendChild(img);
        group.appendChild(textNode);
        svgGrid.appendChild(group);
    }

    // Constants for A4 at 96 DPI (Web standard for "inch")
    // 210mm approx 793.7px, 297mm approx 1122.5px
    const PPI = 96;

    function updateValDisplay() {
        hexSizeVal.textContent = `${hexSizeInput.value}"`;
    }

    // Zoom Logic
    const zoomInput = document.getElementById('zoom-level');
    const zoomVal = document.getElementById('zoom-level-val');

    function updateZoom() {
        closePopup();
        const scale = parseFloat(zoomInput.value);
        zoomVal.textContent = `${Math.round(scale * 100)}%`;
        pageContainer.style.transform = `scale(${scale})`;

        // Update the wrapper footprint to correctly recalculate scrollbars
        // A4: 210mm x 297mm
        const baseWidth = pageContainer.offsetWidth;
        const baseHeight = pageContainer.offsetHeight;
        pageWrapper.style.width = (baseWidth * scale) + 'px';
        pageWrapper.style.height = (baseHeight * scale) + 'px';
    }

    zoomInput.addEventListener('input', updateZoom);

    // Mousewheel Zoom (Only with Shift)
    document.querySelector('.main-content').addEventListener('wheel', (e) => {
        if (!e.shiftKey) return; // Allow normal scroll if shift isn't held

        const direction = e.deltaY < 0 ? 1 : -1;
        const step = parseFloat(zoomInput.step) || 0.1;
        let newVal = parseFloat(zoomInput.value) + (direction * step);
        newVal = Math.max(parseFloat(zoomInput.min), Math.min(parseFloat(zoomInput.max), newVal));
        zoomInput.value = newVal;
        updateZoom();
        e.preventDefault();
    }, { passive: false });

    // Clustering Logic
    const clusteringInput = document.getElementById('clustering');
    const clusteringVal = document.getElementById('clustering-val');

    clusteringInput.addEventListener('input', () => {
        clusteringVal.textContent = `${Math.round(clusteringInput.value * 100)}%`;
    });

    const terrainWeights = document.querySelectorAll('.terrain-weight');
    terrainWeights.forEach(input => {
        // Initialize with %
        const span = input.nextElementSibling;
        if (span && span.classList.contains('weight-val')) {
            span.textContent = `${input.value}%`;
        }

        input.addEventListener('input', (e) => {
            const span = e.target.nextElementSibling;
            if (span && span.classList.contains('weight-val')) {
                span.textContent = `${e.target.value}%`;
            }
        });
    });

    function generateGrid() {
        closePopup();
        // Clear existing
        svgGrid.innerHTML = '';

        // Get selected terrains and weights
        const checkboxes = document.querySelectorAll('input[name="terrain"]:checked');
        const weightedPool = [];

        checkboxes.forEach(cb => {
            const terrain = cb.value;
            // Find associated slider
            // We can find it by finding the parent .terrain-row then the input
            // Or selection by data-terrain attribute
            const range = document.querySelector(`input.terrain-weight[data-terrain="${terrain}"]`);
            const weight = range ? parseInt(range.value, 10) : 50; // default 50

            // Add to pool 'weight' times? Or better use CDF. 
            // For simple implementation (weight 1-100), adding to array is fine (max 600 items), very fast lookup.
            for (let i = 0; i < weight; i++) {
                weightedPool.push(terrain);
            }
        });

        if (weightedPool.length === 0) {
            alert("Please select at least one terrain type.");
            return;
        }

        const sizeInInches = parseFloat(hexSizeInput.value);
        const R = sizeInInches * PPI; // Radius (center to vertex)
        /*
            For pointy topped hex:
            Width = sqrt(3) * R
            Height = 2 * R
            
            Horizontal distance between hex centers = Width
            Vertical distance between hex centers = 3/4 * Height = 1.5 * R
        */

        const hexWidth = Math.sqrt(3) * R;
        const hexHeight = 2 * R;

        const pageWidth = pageContainer.clientWidth;
        const pageHeight = pageContainer.clientHeight;

        const horizDist = hexWidth;
        const vertDist = 1.5 * R;

        const cols = Math.ceil(pageWidth / horizDist) + 1;
        const rows = Math.ceil(pageHeight / vertDist) + 1;

        // Create hex points string
        // Pointy top vertices: (0, -R), (w/2, -R/2), (w/2, R/2), (0, R), (-w/2, R/2), (-w/2, -R/2)
        const w2 = hexWidth / 2;
        const r2 = R / 2;
        const points = [
            `0,-${R}`,
            `${w2},-${r2}`,
            `${w2},${r2}`,
            `0,${R}`,
            `-${w2},${r2}`,
            `-${w2},-${r2}`
        ].join(' ');

        // Offset to center/align nicely (optional, start slightly off to cover edges)

        // Store terrain types grid for clustering
        const gridTerrains = {}; // key: "r,c"

        for (let row = 0; row < rows; row++) {
            for (let col = 0; col < cols; col++) {
                let x = col * horizDist;
                let y = row * vertDist;

                // Offset every odd row
                if (row % 2 !== 0) {
                    x += hexWidth / 2;
                }

                // Check boundary roughly to avoid rendering too many outside
                // Allow some overlap for partial hexes
                if (x < -hexWidth || x > pageWidth + hexWidth || y < -hexHeight || y > pageHeight + hexHeight) {
                    continue;
                }

                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("points", points);
                polygon.setAttribute("transform", `translate(${x}, ${y})`);

                // Random terrain with Clustering
                let terrain;
                const clusteringFactor = parseFloat(clusteringInput.value);
                const neighbors = [];

                // Check neighbors based on row parity (offset logic)
                // Left neighbor: (row, col-1)
                if (gridTerrains[`${row},${col - 1}`]) neighbors.push(gridTerrains[`${row},${col - 1}`]);

                // Top neighbors depend on parity
                if (row % 2 !== 0) {
                    // Odd Row (shifted right): Neighbors are Top-Left (row-1, col) and Top-Right (row-1, col+1)
                    if (gridTerrains[`${row - 1},${col}`]) neighbors.push(gridTerrains[`${row - 1},${col}`]);
                    if (gridTerrains[`${row - 1},${col + 1}`]) neighbors.push(gridTerrains[`${row - 1},${col + 1}`]);
                } else {
                    // Even Row: Neighbors are Top-Left (row-1, col-1) and Top-Right (row-1, col)
                    if (gridTerrains[`${row - 1},${col - 1}`]) neighbors.push(gridTerrains[`${row - 1},${col - 1}`]);
                    if (gridTerrains[`${row - 1},${col}`]) neighbors.push(gridTerrains[`${row - 1},${col}`]);
                }

                if (neighbors.length > 0 && Math.random() < clusteringFactor) {
                    // Pick a random neighbor
                    terrain = neighbors[Math.floor(Math.random() * neighbors.length)];
                } else {
                    // Weighted random
                    terrain = weightedPool[Math.floor(Math.random() * weightedPool.length)];
                }

                gridTerrains[`${row},${col}`] = terrain;
                polygon.setAttribute("class", `hex ${terrain}`);
                polygon.setAttribute("data-row", row);
                polygon.setAttribute("data-col", col);

                svgGrid.appendChild(polygon);
            }
        }
    }

    // Event Listeners
    hexSizeInput.addEventListener('input', updateValDisplay);

    // Auto-generate on change if auto-apply is enabled. 
    hexSizeInput.addEventListener('change', () => {
        if (autoApplyInput && autoApplyInput.checked) {
            generateGrid();
        }
    });

    btnGenerate.addEventListener('click', () => {
        // Add a small rotation or animation class just for feel?
        generateGrid();
    });

    const btnDownload = document.getElementById('btn-download');

    btnDownload.addEventListener('click', () => {
        // We need to render SVG to Canvas.
        // Simplest way without external libraries (like html2canvas) is tricky with external CSS.
        // However, since we have inline SVG, we can serialize it.

        // 1. Get the SVG content
        const serializer = new XMLSerializer();
        let source = serializer.serializeToString(svgGrid);

        // 2. Add namespaces
        if (!source.match(/^<svg[^>]+xmlns="http\:\/\/www\.w3\.org\/2000\/svg"/)) {
            source = source.replace(/^<svg/, '<svg xmlns="http://www.w3.org/2000/svg"');
        }
        if (!source.match(/^<svg[^>]+xmlns:xlink/)) {
            source = source.replace(/^<svg/, '<svg xmlns:xlink="http://www.w3.org/1999/xlink"');
        }

        // 3. Inline Critical Styles (Fill colors) for the export to work
        // Since we use classes, we need to inject the CSS into the SVG or inline styles.
        // Let's grab specific styles we care about.
        const styleRules = `
            .hex { fill: none; stroke: #e0e0e0; stroke-width: 1px; }
            .hex.sea { fill: #4fc3f7; }
            .hex.plains { fill: #c5e1a5; }
            .hex.swamp { fill: #6d4c41; }
            .hex.snow { fill: #f5f5f5; }
            .hex.desert { fill: #fff59d; }
            .hex.wasteland { fill: #78909c; }
        `;

        // Inject style element
        source = source.replace('</svg>', `<style>${styleRules}</style></svg>`);

        // 4. Create Object URL
        const svgBlob = new Blob([source], { type: "image/svg+xml;charset=utf-8" });
        const url = URL.createObjectURL(svgBlob);

        // 5. Draw to Canvas
        const img = new Image();
        img.onload = function () {
            const canvas = document.createElement('canvas');
            // Use A4 pixel dimensions (roughly)
            canvas.width = pageContainer.clientWidth;
            canvas.height = pageContainer.clientHeight;
            const ctx = canvas.getContext('2d');

            // White background for PNG
            ctx.fillStyle = "#fffdf5";
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            ctx.drawImage(img, 0, 0);

            // 6. Download
            const a = document.createElement('a');
            a.download = 'hex_map.png';
            a.href = canvas.toDataURL('image/png');
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);

            URL.revokeObjectURL(url);
        };
        img.src = url;
    });

    // Initial Generation
    generateGrid();
    updateZoom();

    // Hex Selection Logic section moved to top.


    function openPopup(hex, x, y) {
        closePopup();
        selectedHexes = [hex];


        popupOptions.innerHTML = '';
        hex.classList.add('selected');

        const currentClass = hex.getAttribute('class').replace('hex', '').replace('selected', '').trim();
        const currentAddon = hex.getAttribute('data-addon');
        const currentLabel = hex.getAttribute('data-label') || '';

        // Show/Hide Label input based on addon presence
        if (currentAddon) {
            addonLabelContainer.classList.add('visible');
            hexLabelInput.value = currentLabel;
        } else {
            addonLabelContainer.classList.remove('visible');
            hexLabelInput.value = '';
        }

        allTerrains.forEach(terrain => {
            const opt = document.createElement('div');
            opt.className = `popup-option ${currentClass.includes(terrain) ? 'active' : ''}`;
            opt.innerHTML = `<span class="color-dot ${terrain}"></span> ${terrain.charAt(0).toUpperCase() + terrain.slice(1)}`;

            opt.addEventListener('click', (e) => {
                e.stopPropagation(); // Prevent re-triggering grid click
                selectedHexes.forEach(h => {
                    h.setAttribute('class', `hex ${terrain}`);
                });
                closePopup();
            });

            popupOptions.appendChild(opt);
        });

        // Initialize Addon List
        addonList.innerHTML = '';
        allAddons.forEach(addon => {
            const item = document.createElement('div');
            item.className = 'addon-item';
            const iconPath = `icons/${addon.toLowerCase()}.svg`;
            item.innerHTML = `
                <img src="${iconPath}" class="addon-icon" alt="${addon}">
                <span>${addon}</span>
            `;
            item.addEventListener('click', (e) => {
                e.stopPropagation();
                selectedHexes.forEach(h => updateAddonDisplay(h, addon));
                closePopup();
            });
            addonList.appendChild(item);
        });

        const clearItem = document.createElement('div');
        clearItem.className = 'addon-item clear';
        clearItem.textContent = 'None / Clear';
        clearItem.addEventListener('click', (e) => {
            e.stopPropagation();
            selectedHexes.forEach(h => updateAddonDisplay(h, null));
            closePopup();
        });
        addonList.appendChild(clearItem);

        popup.classList.remove('hidden');

        // Positioning logic - using viewport coordinates (fixed positioning)
        const rect = hex.getBoundingClientRect();
        const popupWidth = popup.offsetWidth;
        const popupHeight = popup.offsetHeight;

        // Default position: to the right of the hex
        let popupLeft = rect.right + 10;
        let popupTop = rect.top;

        // Boundary check: If it goes off the right edge, move to the left of the hex
        if (popupLeft + popupWidth > window.innerWidth) {
            popupLeft = rect.left - popupWidth - 10;
        }

        // Boundary check: If it still goes off the left edge (very small screen), pin to left
        if (popupLeft < 10) popupLeft = 10;

        // Boundary check: Bottom edge - if it would crop, flip upwards
        if (popupTop + popupHeight > window.innerHeight) {
            // Align the bottom of the popup with the bottom of the hex
            popupTop = rect.bottom - popupHeight;
        }

        // Boundary check: Top edge safety
        if (popupTop < 10) popupTop = 10;

        popup.style.left = `${popupLeft}px`;
        popup.style.top = `${popupTop}px`;
    }

    btnShowAddons.addEventListener('click', (e) => {
        e.stopPropagation();

        // Capture position of current popup before hiding
        const top = popup.style.top;
        const left = popup.style.left;

        popup.classList.add('hidden');

        addonPopup.style.top = top;
        addonPopup.style.left = left;
        addonPopup.classList.remove('hidden');
    });

    function getCluster(startHex) {
        const row = parseInt(startHex.getAttribute('data-row'));
        const col = parseInt(startHex.getAttribute('data-col'));
        const type = startHex.getAttribute('class').replace('hex', '').replace('selected', '').trim();

        const cluster = [];
        const visited = new Set();
        const queue = [[row, col]];
        visited.add(`${row},${col}`);

        while (queue.length > 0) {
            const [r, c] = queue.shift();
            // Select by both class type and coordinates to be very specific
            const hexEl = document.querySelector(`.hex[data-row="${r}"][data-col="${c}"]`);

            if (hexEl) {
                const hexType = hexEl.getAttribute('class').replace('hex', '').replace('selected', '').trim();
                if (hexType === type) {
                    cluster.push(hexEl);

                    // Neighbors logic
                    const nCoords = (r % 2 === 0)
                        ? [[r, c - 1], [r, c + 1], [r - 1, c - 1], [r - 1, r], [r + 1, c - 1], [r + 1, c]]
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

    btnSelectCluster.addEventListener('click', (e) => {
        e.stopPropagation();
        if (selectedHexes.length > 0) {
            const cluster = getCluster(selectedHexes[0]);
            selectedHexes = cluster;
            selectedHexes.forEach(h => h.classList.add('selected'));
        }
    });

    svgGrid.addEventListener('click', (e) => {
        const target = e.target;
        if (target.classList.contains('hex')) {
            // Get transform to extract X,Y
            // transform="translate(123.4, 567.8)"
            const transform = target.getAttribute('transform');
            const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(transform);

            if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                openPopup(target, x, y);
            }
        }
    });

    // Close on click-away (anywhere that isn't a hex or the popup itself)
    document.addEventListener('click', (e) => {
        const isHex = e.target.classList.contains('hex');
        const isInsidePopup = popup.contains(e.target) || addonPopup.contains(e.target);

        if (!isHex && !isInsidePopup) {
            closePopup();
        }
    });

    // Close on scroll
    document.querySelector('.main-content').addEventListener('scroll', closePopup);

    // Live label binding
    hexLabelInput.addEventListener('input', () => {
        const text = hexLabelInput.value;
        selectedHexes.forEach(h => {
            const addon = h.getAttribute('data-addon');
            if (addon) {
                updateAddonDisplay(h, addon, text);
            }
        });
    });

    // CSV Export
    btnExport.addEventListener('click', () => {
        let csvContent = `metadata,hexSize,${hexSizeInput.value}\n`;
        csvContent += `row,col,terrain,addon,label\n`;

        const hexes = svgGrid.querySelectorAll('.hex');
        hexes.forEach(hex => {
            const r = hex.getAttribute('data-row');
            const c = hex.getAttribute('data-col');
            const terrain = hex.getAttribute('class').replace('hex', '').replace('selected', '').trim();
            const addon = hex.getAttribute('data-addon') || '';
            const label = hex.getAttribute('data-label') || '';
            csvContent += `${r},${c},${terrain},${addon},${label}\n`;
        });

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.setAttribute("href", url);
        link.setAttribute("download", "hex_map.csv");
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    });

    // CSV Import
    btnImport.addEventListener('click', () => {
        csvUpload.click();
    });

    csvUpload.addEventListener('change', (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const content = event.target.result;
            const lines = content.split('\n');
            if (lines.length < 2) return;

            // Clear current grid
            closePopup();
            svgGrid.innerHTML = '';

            // Parse metadata
            const meta = lines[0].split(',');
            if (meta[0] === 'metadata' && meta[1] === 'hexSize') {
                hexSizeInput.value = meta[2];
                updateValDisplay();
            }

            // Constants based on new hexSize
            const sizeInInches = parseFloat(hexSizeInput.value);
            const R = sizeInInches * PPI;
            const hexWidth = Math.sqrt(3) * R;
            const vertDist = 1.5 * R;
            const w2 = hexWidth / 2;
            const r2 = R / 2;
            const points = [`0,-${R}`, `${w2},-${r2}`, `${w2},${r2}`, `0,${R}`, `-${w2},${r2}`, `-${w2},-${r2}`].join(' ');

            // Parse hexes
            for (let i = 2; i < lines.length; i++) {
                const parts = lines[i].split(',');
                if (parts.length < 3) continue;

                const r = parseInt(parts[0]);
                const c = parseInt(parts[1]);
                const terrain = parts[2].trim();
                const addon = parts[3] ? parts[3].trim() : '';
                const label = parts[4] ? parts[4].trim() : '';

                let x = c * hexWidth;
                let y = r * vertDist;
                if (r % 2 !== 0) x += hexWidth / 2;

                const polygon = document.createElementNS("http://www.w3.org/2000/svg", "polygon");
                polygon.setAttribute("points", points);
                polygon.setAttribute("transform", `translate(${x}, ${y})`);
                polygon.setAttribute("class", `hex ${terrain}`);
                polygon.setAttribute("data-row", r);
                polygon.setAttribute("data-col", c);
                if (addon) polygon.setAttribute("data-addon", addon);
                if (label) polygon.setAttribute("data-label", label);

                svgGrid.appendChild(polygon);
                if (addon) updateAddonDisplay(polygon, addon, label || undefined);
            }

            // Sync visual zoom/footprint
            updateZoom();
            csvUpload.value = ''; // Reset input
        };
        reader.readAsText(file);
    });

});
