# Implement Minimum Cluster Size

## Goal Description
Enhance terrain generation by enforcing a "Minimum Cluster Size" for each terrain type. This ensures that even with high seed counts (low clustering factor), small "noise" clusters are avoided if they would result in clusters smaller than the defined minimum.

## User Review Required
> [!NOTE]
> This adds a new constraint that overrides the "Clustering" slider. If the slider asks for 100 seeds (random noise), but the minimum size requires at least 3 hexes per cluster, the system will force the number of seeds down to fit that requirement (e.g., max 33 seeds).

## Proposed Changes

### Configuration

#### [MODIFY] [js/config.js](file:///c:/repos/hexcrawl_maker_type2/js/config.js)
-   Add `export const minClusterSizes`.
-   Define hardcoded defaults:
    ```javascript
    export const minClusterSizes = {
        'sea': 5,
        'plains': 10,
        'swamp': 3,
        'snow': 3,
        'desert': 3,
        'wasteland': 3,
        'default': 3
    };
    ```

### Logic Components

#### [MODIFY] [js/grid.js](file:///c:/repos/hexcrawl_maker_type2/js/grid.js)
-   **Import**: `minClusterSizes` from `./config.js`.
-   **Function**: `generateGrid` (Replacing the Growth Algorithm).
-   **Strategy**: "Allocated Growth with Variance".
    1.  **Safety Cap**: Reduce `seedCount` if `seedCount * minSize > budget`.
    2.  **Allocation**:
        -   Reserve `minSize` hexes for *every* seed immediately.
        -   Calculate `Remainder = Budget - (Seeds * MinSize)`.
        -   Distribute `Remainder` randomly among the seeds to create size variance (some stay small, some get huge).
    3.  **Growth Loop**:
        -   Iterate through specific `Cluster` objects (not just general terrain types).
        -   Expand each cluster until it hits its specific `TargetSize`.
        -   **Panic Mode**: If all clusters are full but map isn't filled, force growth to fill holes.

## Verification Plan

### Manual Verification
1.  **Setup**:
    -   Set **Clustering** to **0%** (Max noise / Max seeds).
    -   Set **Swamp** weight to produce ~30 hexes (e.g., 10% on a 300 hex map).
    -   Hardcode `minClusterSizes['swamp'] = 10` (temporarily or verify against config).
2.  **Action**: Click "Generate Grid".
3.  **Expected Result**:
    -   Normally, 0% clustering would make ~30 tiny 1-hex swamps.
    -   **With Fix**: You should see at most 3 clusters of Swamp (30 / 10 = 3), and each should be roughly 10 hexes large.
