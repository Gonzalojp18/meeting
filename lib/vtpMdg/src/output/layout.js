/**
 * Layout Engine
 * Converts tokens into lines for rendering.
 * Handles:
 * - Wrapping (based on columns)
 * - Effective width calculation (considering GS ! scale)
 */

function tokensToLines(tokens, maxColumns = 32) {
    const lines = [];
    let cur = { segments: [], align: "left" };

    function pushLine() {
        lines.push(cur);
        cur = { segments: [], align: cur.align }; // keep previous align
    }

    for (const t of tokens) {
        if (t.type === "text") {
            cur.align = t.style.align; // update align state

            const txt = t.value;
            const scaleW = t.style.size.w;

            // Basic wrapping logic
            // We process char by char or word by word? 
            // Simple approach: Char by char with rough width estimation.
            // Effective char width = 1 * scaleW

            let remainingStr = txt;

            while (remainingStr.length > 0) {
                // Calculate current line width
                const currentLen = cur.segments.reduce((acc, s) => {
                    // existing segments width
                    return acc + (s.text.length * (s.size.w));
                }, 0);

                let available = maxColumns - currentLen;
                if (available <= 0) {
                    pushLine();
                    available = maxColumns;
                }

                // how many chars fit?
                // each char takes scaleW columns
                const charsThatFit = Math.floor(available / scaleW);

                if (charsThatFit <= 0) {
                    // Edge case: single char doesn't fit? push line and force at least 1
                    pushLine();
                    continue;
                }

                const chunk = remainingStr.slice(0, charsThatFit);
                remainingStr = remainingStr.slice(charsThatFit);

                cur.segments.push({
                    text: chunk,
                    bold: t.style.bold,
                    size: t.style.size,
                    align: t.style.align,
                });

                if (remainingStr.length > 0) {
                    pushLine();
                }
            }

        } else if (t.type === "lf") {
            pushLine();
        } else if (t.type === "cr") {
            // ignore
        } else if (t.type === "img" || t.type === "image") {
            cur.segments.push({
                ...t,
                text: "",
                bold: false,
                align: "left",
                isImage: true
            });
            pushLine();
        } else if (t.type === "barcode") {
            cur.segments.push({
                ...t,
                text: "",
                bold: false,
                align: t.align || "center",
                isBarcode: true
            });
            pushLine();
        } else if (t.type === "qr") {
            cur.segments.push({
                ...t,
                text: "",
                bold: false,
                align: t.align || "center",
                isQr: true
            });
            pushLine();
        } else if (t.type === "cut") {
            cur.segments.push({
                // User requested to hide [CUT] visual artifact
                // text: `[CUT mode=${t.mode}]`,
                // bold: false,
                // size: { w: 1, h: 1 },
                // align: "left",
                // isPlaceholder: true,
            });
            pushLine();
        }
    }

    if (cur.segments.length) lines.push(cur);

    return lines;
}

module.exports = { tokensToLines };
