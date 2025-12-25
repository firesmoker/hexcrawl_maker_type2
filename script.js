document.addEventListener('DOMContentLoaded', () => {
    const hexSizeInput = document.getElementById('hex-size');
    const hexSizeVal = document.getElementById('hex-size-val');
    const btnGenerate = document.getElementById('btn-generate');
    const svgGrid = document.getElementById('hex-grid');
    const pageContainer = document.getElementById('page-container');

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
        const scale = parseFloat(zoomInput.value);
        zoomVal.textContent = `${Math.round(scale * 100)}%`;
        pageContainer.style.transform = `scale(${scale})`;
    }

    zoomInput.addEventListener('input', updateZoom);

    function generateGrid() {
        // Clear existing
        svgGrid.innerHTML = '';

        // Get selected terrains
        const checkboxes = document.querySelectorAll('input[name="terrain"]:checked');
        const selectedTerrains = Array.from(checkboxes).map(cb => cb.value);

        if (selectedTerrains.length === 0) {
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

                // Random terrain
                const terrain = selectedTerrains[Math.floor(Math.random() * selectedTerrains.length)];
                polygon.setAttribute("class", `hex ${terrain}`);

                svgGrid.appendChild(polygon);
            }
        }
    }

    // Event Listeners
    hexSizeInput.addEventListener('input', updateValDisplay);

    // Auto-generate on drag? Might be too heavy for many DOM elements. 
    // Let's do it on 'change' (when mouseup) or click Generate.
    hexSizeInput.addEventListener('change', generateGrid);

    btnGenerate.addEventListener('click', () => {
        // Add a small rotation or animation class just for feel?
        generateGrid();
    });

    // Initial Generation
    generateGrid();
    updateZoom();
});
