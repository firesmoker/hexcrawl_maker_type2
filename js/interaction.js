import { dom } from './dom.js';
import { state } from './state.js';
import { getCluster, syncGhosts } from './grid.js';
import { openPopup, closePopup, openPathPopup, updateAddonDisplay } from './ui_core.js';

import { getSmoothPathD } from './utils.js';

let callbacks = {
    saveHistory: null,
    undo: null,
    redo: null
};

export function setInteractionCallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

export function initInteraction() {
    // Mouse Event Listeners for Hex Layer
    dom.hexLayer.addEventListener('mousedown', handleMouseDown);
    dom.hexLayer.addEventListener('mousemove', handleMouseMove);
    dom.hexLayer.addEventListener('mouseout', handleMouseOut);
    document.addEventListener('mouseup', handleMouseUp);
    dom.svgGrid.addEventListener('click', handleClick);
    dom.svgGrid.addEventListener('dblclick', handleDoubleClick);

    // Global Document Listeners
    document.addEventListener('click', handleDocumentClick);
    if (document.querySelector('.main-content')) {
        document.querySelector('.main-content').addEventListener('scroll', closePopup);
    }

    // Label Input Live Update
    if (dom.hexLabelInput) {
        dom.hexLabelInput.addEventListener('input', () => {
            const text = dom.hexLabelInput.value;
            state.selectedHexes.forEach(h => {
                const addon = h.getAttribute('data-addon');
                if (addon) {
                    updateAddonDisplay(h, addon, text);
                }
            });
        });
        dom.hexLabelInput.addEventListener('blur', () => {
            if (callbacks.saveHistory) callbacks.saveHistory();
        });
    }

    // Keyboard Listeners
    document.addEventListener('keydown', handleKeyDown);

    // Tool Switching
    if (dom.toolSelect) dom.toolSelect.addEventListener('click', () => setTool('select'));
    if (dom.toolRoad) dom.toolRoad.addEventListener('click', () => setTool('road'));
    if (dom.toolRiver) dom.toolRiver.addEventListener('click', () => setTool('river'));
}

function setTool(tool) {
    state.currentTool = tool;

    // Update UI classes
    if (dom.toolSelect) dom.toolSelect.classList.toggle('active', tool === 'select');
    if (dom.toolRoad) dom.toolRoad.classList.toggle('active', tool === 'road');
    if (dom.toolRiver) dom.toolRiver.classList.toggle('active', tool === 'river');

    // Clear selection
    closePopup();
}

function handleKeyDown(e) {
    // Undo: Ctrl+Z
    if (e.ctrlKey && e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (callbacks.undo) callbacks.undo();
    }

    // Redo: Ctrl+Y
    if (e.ctrlKey && e.key.toLowerCase() === 'y') {
        e.preventDefault();
        if (callbacks.redo) callbacks.redo();
    }

    // Zoom in/out with + and -
    if ((e.key === '=' || e.key === '+') && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
        // Zoom In
        e.preventDefault();
        if (dom.zoomInput) {
            const current = parseFloat(dom.zoomInput.value);
            const step = parseFloat(dom.zoomInput.step) || 0.1;
            const max = parseFloat(dom.zoomInput.max) || 2.0;
            const newVal = Math.min(max, current + step);
            if (newVal !== current) {
                dom.zoomInput.value = newVal;
                // Manually fire input event so listener picks it up
                dom.zoomInput.dispatchEvent(new Event('input'));
            }
        }
    }

    if ((e.key === '-' || e.key === '_') && !e.ctrlKey && !e.metaKey && document.activeElement.tagName !== 'INPUT') {
        // Zoom Out
        e.preventDefault();
        if (dom.zoomInput) {
            const current = parseFloat(dom.zoomInput.value);
            const step = parseFloat(dom.zoomInput.step) || 0.1;
            const min = parseFloat(dom.zoomInput.min) || 0.5;
            const newVal = Math.max(min, current - step);
            if (newVal !== current) {
                dom.zoomInput.value = newVal;
                // Manually fire input event so listener picks it up
                dom.zoomInput.dispatchEvent(new Event('input'));
            }
        }
    }
}


function handleMouseDown(e) {
    if (state.currentTool !== 'select') {
        const target = e.target;
        if (target.classList.contains('hex')) {
            state.isPaintingPath = true;
            state.isMouseDown = true;
            state.currentPathHexes = [];
            state.currentPixelPoints = [];

            const r = target.getAttribute('data-row');
            const c = target.getAttribute('data-col');
            state.currentPathHexes.push(`${r},${c}`);

            const transform = target.getAttribute('transform');
            const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(transform);
            if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                state.currentPixelPoints.push({ x, y });

                const pathEl = document.createElementNS("http://www.w3.org/2000/svg", "path");
                pathEl.setAttribute("d", `M ${x},${y}`);
                pathEl.setAttribute("class", `map-path path-${state.currentTool}`);
                dom.pathLayer.appendChild(pathEl);
                state.currentPathElement = pathEl;
            }
        }
        return;
    }

    if (e.target.classList.contains('hex')) {
        state.isMouseDown = true;
    }
}

function handleMouseMove(e) {
    if (!state.isMouseDown) return;

    if (state.currentTool !== 'select') {
        if (state.isPaintingPath && e.target.classList.contains('hex')) {
            const r = e.target.getAttribute('data-row');
            const c = e.target.getAttribute('data-col');
            const last = state.currentPathHexes[state.currentPathHexes.length - 1];
            if (last !== `${r},${c}`) {
                state.currentPathHexes.push(`${r},${c}`);

                const transform = e.target.getAttribute('transform');
                const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(transform);
                if (match && state.currentPathElement) {
                    const x = parseFloat(match[1]);
                    const y = parseFloat(match[2]);

                    state.currentPixelPoints.push({ x, y });

                    const newD = getSmoothPathD(state.currentPixelPoints);
                    state.currentPathElement.setAttribute('d', newD);
                }
            }
        }
        return;
    }

    const target = e.target;
    if (target.classList.contains('hex')) {
        if (!state.isDragging) {
            state.isDragging = true;
            closePopup();
            state.selectedHexes = [target];
            target.classList.add('selected');
            target.parentElement.appendChild(target);
        } else {
            if (!state.selectedHexes.includes(target)) {
                state.selectedHexes.push(target);
                target.classList.add('selected');
                target.parentElement.appendChild(target);
            }
        }
    }
}

function handleMouseOut(e) {
    if (e.target.classList.contains('hex')) {
        if (state.selectedHexes.length > 0) {
            state.selectedHexes.forEach(h => {
                h.parentElement.appendChild(h);
            });
        }
    }
}

function handleMouseUp(e) {
    state.isMouseDown = false;

    if (state.isPaintingPath) {
        state.isPaintingPath = false;
        if (state.currentPathElement) {
            state.currentPathElement.setAttribute('data-hex-path', state.currentPathHexes.join(';'));
            if (callbacks.saveHistory) callbacks.saveHistory();
        }
        state.currentPathElement = null;
        return;
    }

    if (state.isDragging) {
        state.isDragging = false;
        state.ignoreNextClick = true;

        if (state.selectedHexes.length > 0) {
            const lastHex = state.selectedHexes[state.selectedHexes.length - 1];
            const transform = lastHex.getAttribute('transform');
            const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(transform);

            if (match) {
                const x = parseFloat(match[1]);
                const y = parseFloat(match[2]);
                openPopup(lastHex, x, y, state.selectedHexes);
            }
        }

        setTimeout(() => { state.ignoreNextClick = false; }, 100);
    }
}

function handleClick(e) {
    if (state.ignoreNextClick) {
        state.ignoreNextClick = false;
        return;
    }

    const target = e.target;

    // Handle path click
    if (target.classList.contains('map-path') && state.currentTool === 'select') {
        openPathPopup(target, e.clientX, e.clientY);
        e.stopPropagation();
        return;
    }

    if (target.classList.contains('hex')) {
        const transform = target.getAttribute('transform');
        const match = /translate\(([^,]+),\s*([^)]+)\)/.exec(transform);

        if (match) {
            const x = parseFloat(match[1]);
            const y = parseFloat(match[2]);
            openPopup(target, x, y);
        }
    }
}

function handleDoubleClick(e) {
    const target = e.target;
    if (target.classList.contains('hex') && state.currentTool === 'select') {
        const cluster = getCluster(target);

        closePopup();

        cluster.forEach(h => {
            h.classList.add('selected');
            h.parentElement.appendChild(h);
        });

        openPopup(target, 0, 0, cluster);
    }
}

function handleDocumentClick(e) {
    const isHex = e.target.classList.contains('hex');
    const isPath = e.target.classList.contains('map-path');
    const isInsidePopup = (dom.popup && dom.popup.contains(e.target)) ||
        (dom.addonPopup && dom.addonPopup.contains(e.target)) ||
        (dom.pathPopup && dom.pathPopup.contains(e.target));

    if (!isHex && !isPath && !isInsidePopup) {
        closePopup();
    }
}
