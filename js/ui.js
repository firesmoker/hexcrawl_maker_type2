import { dom } from './dom.js';
import { state } from './state.js';
import { allTerrains, allAddons } from './config.js';
import { getIconDataUri } from './utils.js';

let callbacks = {
    syncGhosts: null,
    saveHistory: null
};

export function setUICallbacks(cbs) {
    callbacks = { ...callbacks, ...cbs };
}

export function updateValDisplay() {
    if (dom.hexSizeVal && dom.hexSizeInput) {
        dom.hexSizeVal.textContent = `${dom.hexSizeInput.value}"`;
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
