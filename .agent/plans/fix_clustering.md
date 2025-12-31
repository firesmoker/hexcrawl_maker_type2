# Fix Terrain Clustering Logic

## Goal Description
The current terrain generation "scatters" hexes even at 100% clustering. This is caused by a logic flaw in the "Growth Algorithm" in `js/grid.js`. When the algorithm picks a strictly random edge node that happens to be blocked (no empty neighbors), it **immediately** starts a new seed cluster elsewhere, instead of trying other available edge nodes in the existing cluster.

## User Review Required
> [!NOTE]
> This change alters the procedural generation algorithm. Maps generated with the same seed *might* look different after this change, but since we don't strictly support "seed-based reproduction" yet (we use `Math.random()`), this is acceptable.

## Proposed Changes

### Logic Components

#### [MODIFY] [js/grid.js](file:///c:/repos/hexcrawl_maker_type2/js/grid.js)
-   **Function**: `generateGrid` (inside the assignments loop)
-   **Change**: Modify the "Re-seed" condition.
    -   **Current**: `if (!expanded && budget[type] > 0)` -> Re-seed.
    -   **New**: `if (!expanded && budget[type] > 0 && q.length === 0)` -> Re-seed.
    -   If `!expanded` but `q.length > 0`, do nothing (just continue to next iteration, effectively trying again with a different random node next time this type is picked).

## Verification Plan

### Automated Tests
None available for this visual/procedural logic.

### Manual Verification
1.  **Setup**:
    -   Set **Hex Size**: 0.3 (small hexes to see patterns clearly).
    -   Set **Clustering**: 1.0 (Max).
    -   Set **Terrain Weights**: Even split (e.g., 20% each).
2.  **Action**: Click "Generate Grid".
3.  **Expected Result**:
    -   Each terrain type should form 1 large contiguous blob (or clearly separated large blobs if they get cut off).
    -   There should be **no** single-hex islands or small patches scattered inside other terrains (unless it's the very last remainder filling a hole).
4.  **Edge Case**:
    -   Set **Clustering**: 0.0.
    -   Result should be chaotic noise (random scatter).
