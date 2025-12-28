export const state = {
    // History
    undoStack: [],
    redoStack: [],
    historyLimit: 50,

    // Tools
    currentTool: 'select', // 'select', 'road', 'river'

    // Path Painting
    isPaintingPath: false,
    currentPathElement: null,
    currentPathHexes: [],
    currentPixelPoints: [], // {x, y} for smoothing

    // Selection
    selectedHexes: [],
    selectedPath: null,

    // Mouse Interaction State
    isMouseDown: false,
    isDragging: false,
    ignoreNextClick: false
};
