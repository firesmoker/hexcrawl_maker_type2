# Agent Workflow Protocols

This document outlines the specific protocols and workflows that agents must follow when working on this project. These rules are derived from successful interactions and user preferences established during the "Refactor Era".

## Core Philosophy: "Verification Over Assumption"

The user values:
1.  **Granularity**: Breaking big tasks into small, non-destructive steps.
2.  **Explicit Verification**: Proving a step worked before moving to the next.
3.  **App Stability**: The "main branch" (or main entry point) must *never* be broken during a process.


## Planning Guidelines
When constructing a plan, ensure it is:
1.  **Minimal**: Make minimum changes to the codebase. Seek elegant solutions.
2.  **Functional**: Completely adheres to task requirements. Works completely. Does not break or change unrelated parts. Decoupled as much as possible.
3.  **Iterative**: Made out of chronological, ordered tasks. Each task should be small, focused, and easy to verify.
4.  **Written & Tracked**: The plan must be written to a file, preferably `.agent/current_plan.md` or `.agent/plans/[task_name].md`. It should be a "checklist". You must update the status of tasks in this file as you complete them.
5.  **Single-threaded**: Never execute more than one task at once, unless SPECIFICALLY told by the user.
6.  **Dynamic**: If you learn new things while executing the plan and need to change course, you must update the plan file accordingly.

## 1. Task Execution Workflows

### A. New Feature Implementation
1.  **Context Gathering**:
    *   Read relevant files first. Don't guess how `state.js` or `grid.js` works.
    *   Check `config.js` for existing constants or patterns.
2.  **Plan & Verify**:
    *   Create a mini-plan. "I will add a new Tool X."
    *   **UI First**: Add the button to `index.html` and update `dom.js`. Verify it appears.
    *   **Logic Second**: Implement the handler in `interaction.js` or a new module.
    *   **Wiring Third**: Connect the UI event to the Logic handler.
3.  **Integration**:
    *   Does this need to be saved in History? (Update `history.js` or callbacks).
    *   Does this need a new visual icon? (Check `config.js`).

### B. Refactoring (Safe Migration)
1.  **The "Strangler Fig" Pattern**:
    *   Create new files alongside old ones.
    *   **NEVER** break the live application while building the new structure.
    *   Verify the new modules work in isolation (console imports) before switching.
2.  **The Switchover**:
    *   The only "dangerous" step should be the final wiring change (e.g., swapping `<script>` tags).
    *   If it fails, **REVERT IMMEDIATELY** and debug offline.

### C. Bug Fixing
1.  **Reproduce First**: Do not fix what you cannot see. Use the browser tool to confirm the bug exists.
2.  **Minimal Intervention**: Change the least amount of lines possible.
3.  **Root Cause Analysis**:
    *   DOM issues? (Check `style.css` pointers-events, z-index).
    *   State issues? (Check `state.js` values).
    *   Logic issues? (Check event listeners).
4.  **Regression Check**: After fixing, ensure related tools still work.

## 2. Coding Standards
*   **Modular Architecture**:
    *   **DOM**: All element references go in `dom.js`.
    *   **State**: All app state goes in `state.js`.
    *   **Logic**: Keep files focused (e.g., `io.js` only for Import/Export).
*   **Dependency Injection**: Use `setCallbacks` patterns to avoid circular dependencies.
*   **No "Magic Strings"**: Use constants from `config.js` where possible.

## 3. Communication Style
*   **Be Direct**: State what you did. "I added the 'wheel' event listener."
*   **Be Honest**: If a tool fails (like the browser extension caching issue), admit it and propose a workaround (like renaming the file or changing the port).
*   **Celebrate Success**: Acknowledge when a major milestone (like a full refactor) is done.

## 4. Specific Technical Rules
*   **Browser Caching**: The browser submodule is aggressive with caching. When modifying a file that seems "stuck", use the **Rename Strategy** (`file.js` -> `file_core.js`) as a last resort to force a fresh load.
*   **Event Listeners**: Always check if `passive: false` is needed (e.g., for `wheel` events).
*   **DOM Cache**: If you add new HTML elements, update `dom.js` immediately.

---
*Created: 2025-12-29*
