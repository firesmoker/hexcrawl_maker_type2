# App Color Configuration Guide

This guide explains where and how colors are defined in the Hexcrawl Map Maker application. The color system is divided into two main parts: the UI theme and the Terrain/Hex colors.

## 1. UI Theme & Global Colors

The main user interface colors (backgrounds, text, accents) are defined as **CSS Variables** in `style.css`.

**File:** `style.css`
**Location:** `:root` selector (lines 1-13)

```css
:root {
    --bg-app: #f4e4bc;          /* Main App Background */
    --bg-panel: rgba(...);      /* Sidebar Panel Background */
    --text-primary: #3e2723;    /* Primary Text Color */
    --text-secondary: #5d4037;  /* Secondary/Label Text */
    --accent-color: #8d6e63;    /* Main Accent (Buttons, Highlights) */
    --accent-hover: #a1887f;    /* Hover State for Accent */
    --border-color: ...         /* Borders */
}
```

To change the look of the sidebar or buttons, update these variables.

## 2. Terrain Hex Colors

The colors for the map hexes (Sea, Plains, Swamp, etc.) are defined using standard CSS classes. These classes apply to both the SVG hexes on the map and the little color dots in the selection UI.

**File:** `style.css`
**Location:** Approx line 312 onwards.

Each terrain type has two associated definitions you might need to update:
1. `.hex.<type>`: Defines the fill color of the hexagon on the map.
2. `.color-dot.<type>`: Defines the color of the dot in the UI labels.

**Example:**
```css
/* Map Hex */
.hex.sea {
    fill: #4fc3f7;
}

/* UI Indicator */
.color-dot.sea {
    background: #4fc3f7;
}
```

## 3. ⚠️ IMPORTANT: Export/Download Colors

There is **one special location** where colors are duplicated. Because the "Download Map" feature converts the SVG to an image by serializing it, it cannot always read external CSS files. Therefore, the terrain colors are **hardcoded** in the JavaScript file to ensure the downloaded image looks correct.

**If you change a terrain color in `style.css`, you MUST also update it in `script.js`.**

**File:** `script.js`
**Location:** function `btnDownload` event listener (Search for `const styleRules`, approx line 229).

```javascript
const styleRules = `
    .hex { fill: none; stroke: #e0e0e0; stroke-width: 1px; }
    .hex.sea { fill: #4fc3f7; }      <-- UPDATE HERE TOO
    .hex.plains { fill: #c5e1a5; }   <-- UPDATE HERE TOO
    ...
`;
```

## Summary Checklist
If you want to change a color:
- [ ] **UI Color**: Update `:root` variables in `style.css`.
- [ ] **Terrain Color (Visual)**: Update `.hex.<name>` and `.color-dot.<name>` in `style.css`.
- [ ] **Terrain Color (Export)**: Update `styleRules` string in `script.js`.
