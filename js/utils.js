import { iconSvgs } from './config.js';

export function getSmoothPathD(points) {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x},${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x},${points[0].y} L ${points[1].x},${points[1].y}`;

    let d = `M ${points[0].x},${points[0].y}`;

    // Loop to n-1
    for (let i = 1; i < points.length - 1; i++) {
        const p1 = points[i];
        const p2 = points[i + 1];
        // Midpoint between p1 and p2
        const midX = (p1.x + p2.x) / 2;
        const midY = (p1.y + p2.y) / 2;
        // Quad curve: Control point is p1, end point is mid
        d += ` Q ${p1.x},${p1.y} ${midX},${midY}`;
    }

    // Line to the very last point
    const last = points[points.length - 1];
    d += ` L ${last.x},${last.y}`;
    return d;
}

export function getIconDataUri(name) {
    const svg = iconSvgs[name.toLowerCase()];
    if (!svg) return '';
    return 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg);
}

export function escapeCSVField(field) {
    if (field === null || field === undefined) return '';
    const str = String(field);
    // If field contains comma, quote, or newline, wrap in quotes and escape internal quotes
    if (str.includes(',') || str.includes('"') || str.includes('\n') || str.includes('\r')) {
        return '"' + str.replace(/"/g, '""') + '"';
    }
    return str;
}

export function parseCSVLine(text) {
    const result = [];
    let cell = '';
    let insideQuote = false;

    for (let i = 0; i < text.length; i++) {
        const char = text[i];

        if (insideQuote) {
            if (char === '"') {
                if (i + 1 < text.length && text[i + 1] === '"') {
                    cell += '"';
                    i++; // skip next quote
                } else {
                    insideQuote = false;
                }
            } else {
                cell += char;
            }
        } else {
            if (char === '"') {
                insideQuote = true;
            } else if (char === ',') {
                result.push(cell);
                cell = '';
            } else {
                cell += char;
            }
        }
    }
    result.push(cell);
    return result;
}
