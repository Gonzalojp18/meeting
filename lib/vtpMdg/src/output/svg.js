function render(lines, meta) {
    const charW = 10;
    const lineH = 20;
    // Estimate canvas
    const width = (meta.columns || 48) * charW + 40;
    const contentH = lines.length * lineH;
    const height = contentH + 100; // + header/footer

    const escapeXml = (s) => String(s).replace(/[<>&'"]/g, c => ({
        '<': '&lt;', '>': '&gt;', '&': '&amp;', '\'': '&apos;', '"': '&quot;'
    }[c]));

    const parts = [];
    parts.push(`<rect x="0" y="0" width="${width}" height="${height}" fill="white"/>`);

    // Header
    let y = 20;
    parts.push(`<text x="10" y="${y}" font-family="monospace" font-size="14" font-weight="bold">${escapeXml(meta.jobId)}</text>`);
    y += 20;
    parts.push(`<line x1="10" y1="${y}" x2="${width - 10}" y2="${y}" stroke="black" stroke-dasharray="4"/>`);
    y += 20;

    // Body
    for (const ln of lines) {
        // Handling alignment in SVG is tricky without exact font metrics.
        // We'll trust the layout engine did wrapping, and we just use x=10 for left, center/right approx.
        let x = 10;
        const txt = ln.segments.map(s => s.text).join("");
        const txtW = txt.length * charW;

        if (ln.align === 'center') x = (width - txtW) / 2;
        if (ln.align === 'right') x = width - 10 - txtW;
        if (x < 10) x = 10;

        // Segment rendering 
        // Simplified: Render whole line as one text element for SVG simplicity
        // If we wanted bold/scale per segment, we'd need multiple text elements.
        // MVP: Single text element
        parts.push(`<text x="${x}" y="${y}" font-family="monospace" font-size="14" xml:space="preserve">${escapeXml(txt)}</text>`);
        y += lineH;
    }

    return `<?xml version="1.0" standalone="no"?>
  <svg width="${width}" height="${height}" version="1.1" xmlns="http://www.w3.org/2000/svg">
    ${parts.join('\n')}
  </svg>`;
}

module.exports = { render };
