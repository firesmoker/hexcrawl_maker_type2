import { dom } from './dom.js';
import { state } from './state.js';
import { allTerrains, allAddons } from './config.js';
import { getIconDataUri } from './utils.js';

let callbacks = {
    syncGhosts: null,
    saveHistory: null,
    onSelectCluster: null
};

export function setUICallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

export function updateValDisplay() {
    if (dom.hexSizeVal && dom.hexSizeInput) {
        dom.hexSizeVal.textContent = `${dom.hexSizeInput.value}"`;
    }
}

export function updateClusteringDisplay() {
    if (dom.clusteringVal && dom.clusteringInput) {
        dom.clusteringVal.textContent = `${Math.round(parseFloat(dom.clusteringInput.value) * 100)}%`;
    }
}

export function updateZoom() {
    closePopup();
    const scale = parseFloat(dom.zoomInput.value);
    dom.zoomVal.textContent = `${Math.round(scale * 100)}%`;
    dom.pageContainer.style.transform = `scale(${scale})`;

    // Update the wrapper footprint
    const baseWidth = dom.pageContainer.offsetWidth;
    const baseHeight = dom.pageContainer.offsetHeight;
    dom.pageWrapper.style.width = (baseWidth * scale) + 'px';
    dom.pageWrapper.style.height = (baseHeight * scale) + 'px';
}

export function updateAddonDisplay(hex, addonType, customLabel) {
    const row = hex.getAttribute('data-row');
    const col = hex.getAttribute('data-col');

    // Remove existing addon group if any
    const existingGroup = dom.addonLayer.querySelector(`g.addon-group[data-row="${row}"][data-col="${col}"]`);
    if (existingGroup) existingGroup.remove();

    // If no addonType provided, clear attributes and return
    if (!addonType || addonType === 'None') {
        hex.removeAttribute('data-addon');
        hex.removeAttribute('data-label');
        return;
    }

    hex.setAttribute('data-addon', addonType);

    const labelText = (customLabel === undefined) ? addonType : customLabel;
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
    img.setAttributeNS("http://www.w3.org/1999/xlink", "href", getIconDataUri(addonType));
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
    dom.addonLayer.appendChild(group);
}

export function closePopup() {
    if (dom.popup) dom.popup.classList.add('hidden');
    if (dom.addonPopup) dom.addonPopup.classList.add('hidden');
    if (dom.pathPopup) dom.pathPopup.classList.add('hidden');

    state.selectedHexes.forEach(h => {
        h.classList.remove('selected');
    });
    state.selectedHexes = [];

    if (state.selectedPath) {
        state.selectedPath.classList.remove('selected');
        state.selectedPath = null;
    }
}

export function openPopup(hex, x, y, overrideSelection = null) {
    if (!overrideSelection) {
        closePopup();
        state.selectedHexes = [hex];
        hex.classList.add('selected');
        // Bring to front
        hex.parentElement.appendChild(hex);
    } else {
        state.selectedHexes = overrideSelection;
    }

    dom.popupOptions.innerHTML = '';

    const currentClass = hex.getAttribute('class').replace('hex', '').replace('selected', '').trim();
    const currentAddon = hex.getAttribute('data-addon');
    const currentLabel = hex.getAttribute('data-label') || '';

    // Show/Hide Add/Remove based on addon
    if (currentAddon) {
        dom.addonLabelContainer.classList.add('visible');
        dom.hexLabelInput.value = currentLabel;
        dom.btnShowAddons.classList.add('hidden');
        dom.btnRemoveAddon.classList.remove('hidden');
    } else {
        dom.addonLabelContainer.classList.remove('visible');
        dom.hexLabelInput.value = '';
        dom.btnShowAddons.classList.remove('hidden');
        dom.btnRemoveAddon.classList.add('hidden');
    }

    // Hide "Select Cluster" if multi-select
    if (state.selectedHexes.length > 1) {
        dom.btnSelectCluster.classList.add('hidden');
    } else {
        dom.btnSelectCluster.classList.remove('hidden');
    }

    allTerrains.forEach(terrain => {
        const opt = document.createElement('div');
        opt.className = `popup-option ${currentClass.includes(terrain) ? 'active' : ''}`;
        opt.innerHTML = `<span class="color-dot ${terrain}"></span> ${terrain.charAt(0).toUpperCase() + terrain.slice(1)}`;

        opt.addEventListener('click', (e) => {
            e.stopPropagation();
            state.selectedHexes.forEach(h => {
                h.setAttribute('class', `hex ${terrain}`);
                if (callbacks.syncGhosts) {
                    callbacks.syncGhosts(h.getAttribute('data-row'), h.getAttribute('data-col'), terrain);
                }
            });
            if (callbacks.saveHistory) callbacks.saveHistory();
            closePopup();
        });

        dom.popupOptions.appendChild(opt);
    });

    // Initialize Addon List
    dom.addonList.innerHTML = '';
    allAddons.forEach(addon => {
        const item = document.createElement('div');
        item.className = 'addon-item';
        const iconPath = getIconDataUri(addon);
        item.innerHTML = `
            <img src="${iconPath}" class="addon-icon" alt="${addon}">
            <span>${addon}</span>
        `;
        item.addEventListener('click', (e) => {
            e.stopPropagation();
            const label = state.selectedHexes.length > 1 ? '' : undefined;
            state.selectedHexes.forEach(h => updateAddonDisplay(h, addon, label));
            if (callbacks.saveHistory) callbacks.saveHistory();
            closePopup();
        });
        dom.addonList.appendChild(item);
    });

    dom.popup.classList.remove('hidden');

    // Positioning
    const rect = hex.getBoundingClientRect();
    const popupWidth = dom.popup.offsetWidth;
    const popupHeight = dom.popup.offsetHeight;

    let popupLeft = rect.right + 10;
    let popupTop = rect.top;

    if (popupLeft + popupWidth > window.innerWidth) {
        popupLeft = rect.left - popupWidth - 10;
    }
    if (popupLeft < 10) popupLeft = 10;

    if (popupTop + popupHeight > window.innerHeight - 10) {
        popupTop = rect.top - popupHeight;
        if (popupTop < 10) {
            popupTop = window.innerHeight - popupHeight - 10;
        }
    }
    if (popupTop < 10) popupTop = 10;

    dom.popup.style.left = `${popupLeft}px`;
    dom.popup.style.top = `${popupTop}px`;
}

export function openPathPopup(path, mouseX, mouseY) {
    closePopup();
    state.selectedPath = path;
    state.selectedPath.classList.add('selected');

    dom.pathPopup.classList.remove('hidden');

    const popupWidth = dom.pathPopup.offsetWidth;
    const popupHeight = dom.pathPopup.offsetHeight;

    let popupLeft = mouseX + 15;
    let popupTop = mouseY - 15;

    if (popupLeft + popupWidth > window.innerWidth) {
        popupLeft = mouseX - popupWidth - 15;
    }
    if (popupLeft < 10) popupLeft = 10;

    if (popupTop + popupHeight > window.innerHeight) {
        popupTop = window.innerHeight - popupHeight - 10;
    }
    if (popupTop < 10) popupTop = 10;

    dom.pathPopup.style.left = `${popupLeft}px`;
    dom.pathPopup.style.top = `${popupTop}px`;
}

export function initPopupListeners() {
    if (dom.btnRemoveAddon) {
        dom.btnRemoveAddon.addEventListener('click', (e) => {
            e.stopPropagation();
            state.selectedHexes.forEach(h => updateAddonDisplay(h, null));
            if (callbacks.saveHistory) callbacks.saveHistory();
            closePopup();
        });
    }

    if (dom.btnShowAddons) {
        dom.btnShowAddons.addEventListener('click', (e) => {
            e.stopPropagation();
            const top = dom.popup.style.top;
            const left = dom.popup.style.left;
            dom.popup.classList.add('hidden');
            dom.addonPopup.style.top = top;
            dom.addonPopup.style.left = left;
            dom.addonPopup.classList.remove('hidden');
        });
    }

    // Cluster Selection Button
    if (dom.btnSelectCluster) {
        dom.btnSelectCluster.addEventListener('click', (e) => {
            e.stopPropagation();
            if (callbacks.onSelectCluster && state.selectedHexes.length > 0) {
                callbacks.onSelectCluster(state.selectedHexes[0]);
            }
        });
    }


    // Path Popup - Delete Button
    if (dom.btnDeletePath) {
        dom.btnDeletePath.addEventListener('click', () => {
            if (state.selectedPath) {
                state.selectedPath.remove();
                state.selectedPath = null;
                dom.pathPopup.classList.add('hidden');
                if (callbacks.saveHistory) callbacks.saveHistory();
            }
        });
    }
}

// Helper to get all active weight inputs (where checkbox is checked)
function getActiveWeights() {
    return Array.from(dom.terrainWeights).filter(input => {
        const row = input.closest('.terrain-row');
        const cb = row.querySelector('input[type="checkbox"]');
        return cb.checked;
    });
}

function normalizeWeights() {
    const active = getActiveWeights();
    if (active.length === 0) return;

    // Calculate current sum
    let sum = active.reduce((acc, input) => acc + parseInt(input.value || 0, 10), 0);

    // Validate sum to avoid divide by zero
    if (sum === 0) {
        // Edge case: all 0, distribute evenly
        const even = Math.floor(100 / active.length);
        active.forEach(input => input.value = even);
        // Fix remainder
        const remainder = 100 - (even * active.length);
        active[0].value = parseInt(active[0].value) + remainder;
        sum = 100;
    }

    // Scale to exactly 100
    let runningTotal = 0;
    active.forEach((input, i) => {
        if (i === active.length - 1) {
            // Last one takes the rest to ensure exact 100
            input.value = 100 - runningTotal;
        } else {
            const rawVal = parseInt(input.value, 10);
            const percent = (rawVal / sum) * 100;
            const newVal = Math.round(percent);
            input.value = newVal;
            runningTotal += newVal;
        }
    });

    // Update visuals
    updateAllValDisplays();
}

function updateAllValDisplays() {
    if (dom.terrainWeights) {
        dom.terrainWeights.forEach(input => {
            const valSpan = input.parentElement.querySelector('.weight-val');
            // If disabled (unchecked), show 0%
            const row = input.closest('.terrain-row');
            const cb = row.querySelector('input[type="checkbox"]');

            if (!cb.checked) {
                input.disabled = true;
                input.style.opacity = '0.5';
                if (valSpan) valSpan.textContent = "0%";
            } else {
                input.disabled = false;
                input.style.opacity = '1';
                if (valSpan) valSpan.textContent = `${input.value}%`;
            }
        });
    }
}

export function initTerrainWeightListeners() {
    if (!dom.terrainWeights) return;

    // 1. Initial Normalization
    // We need to wait for DOM elements to be ready if they aren't already, but initDOM called this.
    // However, the initial values in HTML sum to >100. We will normalize them.
    normalizeWeights();

    // 2. Slider Input Listeners
    dom.terrainWeights.forEach(input => {
        // Store previous value to calculate delta
        input.dataset.prevVal = input.value;

        input.addEventListener('input', (e) => {
            const el = e.target;
            const newVal = parseInt(el.value, 10);
            const prevVal = parseInt(el.dataset.prevVal || 0, 10);
            const delta = newVal - prevVal;

            if (delta === 0) return;

            const active = getActiveWeights();
            const others = active.filter(opt => opt !== el);

            if (others.length === 0) {
                // If only one is active, it must be 100%
                el.value = 100;
            } else {
                // We need to remove 'delta' from others
                // Calculate 'available' sum to take from
                // We want to distribute the NEGATIVE delta among others
                let remainingDelta = -delta;

                // If we are increasing the slider, we decrease others.
                // If we are decreasing, we increase others.

                // Distribution strategy: Proportional to current values
                const totalOthers = others.reduce((acc, o) => acc + parseInt(o.value || 0, 10), 0);

                if (totalOthers === 0) {
                    // If all others are 0, distribute evenly
                    const share = Math.floor(remainingDelta / others.length);
                    let distRem = remainingDelta - (share * others.length);

                    others.forEach(o => {
                        let val = parseInt(o.value || 0, 10);
                        val += share;
                        if (distRem !== 0) {
                            val += distRem > 0 ? 1 : -1;
                            distRem -= distRem > 0 ? 1 : -1;
                        }
                        // Clamp
                        if (val < 0) val = 0;
                        if (val > 100) val = 100;
                        o.value = val;
                    });

                } else {
                    // Proportional
                    // We need to be careful with integer rounding error not breaking the 100 sum
                    // So instead of just adding delta, we might be better off recalculating 'others' 
                    // to sum to (100 - newVal).

                    const targetOthersSum = 100 - newVal;

                    // Current ratio
                    // If totalOthers was 0, we handled it above.

                    let runningDistributed = 0;
                    others.forEach((o, i) => {
                        if (i === others.length - 1) {
                            // Last one checks the math
                            o.value = targetOthersSum - runningDistributed;
                        } else {
                            const val = parseInt(o.value || 0, 10);
                            const ratio = val / totalOthers;
                            const newOVal = Math.round(ratio * targetOthersSum);
                            o.value = newOVal;
                            runningDistributed += newOVal;
                        }
                    });
                }
            }

            // Update prevVal for all
            active.forEach(a => a.dataset.prevVal = a.value);
            updateAllValDisplays();
        });
    });

    // 3. Checkbox Listeners
    const rows = document.querySelectorAll('.terrain-row');
    rows.forEach(row => {
        const cb = row.querySelector('input[type="checkbox"]');
        const slider = row.querySelector('.terrain-weight');

        // Ensure initial state visual
        updateAllValDisplays();

        cb.addEventListener('change', (e) => {
            const isChecked = e.target.checked;

            if (!isChecked) {
                // Being disabled: Set to 0, distribute its value to others
                const valToDistribute = parseInt(slider.value || 0, 10);
                slider.value = 0;
                slider.dataset.prevVal = 0;

                const active = getActiveWeights(); // slider is strictly 'inactive' now based on logic ?? checks DOM?
                // Note: getActiveWeights checks the checkbox state. Since we just changed it, it should return the others.

                if (active.length > 0) {
                    // Distribute 'valToDistribute' to 'active'
                    // Simple verify: re-normalize? 
                    // Or just normalizeWeights() which sums to <100 and scales up?
                    // Yes, normalizeWeights scales whatever is there to 100.
                    normalizeWeights();
                }

            } else {
                // Being enabled. Need to take some value.
                // Let's give it a default share, e.g. 10%, or 100/N
                const active = getActiveWeights();
                // Currently it has 0 or whatever old value.
                // We want to force it to have *something* and then correct others.

                // Strategy: Give it 10 (or 100 if only one), normalize others.
                if (active.length === 1) {
                    slider.value = 100;
                } else {
                    // Take proportionally? 
                    // Easiest is: Set to 10 (or less if 100 available), then normalizWeights.
                    // But normalizeWeights preserves ratios. If we set this to 10, and others sum to 100, total is 110.
                    // Normalize will scale everyone down slightly. This matches "taking from others".

                    slider.value = 15; // Give it a nice chunk
                }
                normalizeWeights();
            }

            // Refine pointers
            const activeWeights = getActiveWeights();
            activeWeights.forEach(a => a.dataset.prevVal = a.value);
            updateAllValDisplays();
        });
    });
}

export function initColorPickers() {
    document.querySelectorAll('.terrain-color-picker').forEach(picker => {
        picker.addEventListener('input', (e) => {
            const terrain = e.target.getAttribute('data-terrain');
            document.documentElement.style.setProperty(`--col-${terrain}`, e.target.value);
        });
        picker.addEventListener('change', () => {
            if (callbacks.saveHistory) callbacks.saveHistory();
        });
    });
}
