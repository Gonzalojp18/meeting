/**
 * Minimal ESC/POS Parser
 */

function defaultState() {
    return {
        bold: false,
        align: "left", // left|center|right
        size: { w: 1, h: 1 }, // 1..8
    };
}

function clamp(n, min, max) {
    return Math.max(min, Math.min(max, n));
}

function parse(buf) {
    const tokens = [];
    let i = 0;
    let st = defaultState();

    const snapshot = () => ({
        bold: st.bold,
        align: st.align,
        size: { ...st.size },
    });

    while (i < buf.length) {
        const b = buf[i];

        // LF
        if (b === 0x0a) {
            tokens.push({ type: "lf" });
            i++;
            continue;
        }
        // CR
        if (b === 0x0d) {
            tokens.push({ type: "cr" });
            i++;
            continue;
        }

        // ESC (0x1B)
        if (b === 0x1b) {
            const b1 = buf[i + 1];

            // ESC @ (init)
            if (b1 === 0x40) {
                st = defaultState();
                i += 2;
                continue;
            }

            // ESC E n (bold)
            if (b1 === 0x45 && i + 2 < buf.length) {
                const n = buf[i + 2];
                st.bold = n !== 0x00;
                i += 3;
                continue;
            }

            // ESC a n (align)
            if (b1 === 0x61 && i + 2 < buf.length) {
                const n = buf[i + 2];
                st.align = n === 1 ? "center" : n === 2 ? "right" : "left";
                i += 3;
                continue;
            }

            // ESC d n (feed n lines)
            if (b1 === 0x64 && i + 2 < buf.length) {
                const n = buf[i + 2];
                for (let k = 0; k < n; k++) tokens.push({ type: "lf" });
                i += 3;
                continue;
            }

            // ESC * (bit image)
            if (b1 === 0x2a && i + 4 < buf.length) {
                // ESC * m nL nH [data]
                // data length depends on m (0,1,32,33).
                // Minimal skip logic: nL + nH*256 columns.
                // If m=0 or 1 (8-dot), bytes = cols. If m=32 or 33 (24-dot), bytes = cols*3.
                const m = buf[i + 2];
                const nL = buf[i + 3];
                const nH = buf[i + 4];
                const cols = (nH << 8) | nL;
                let bytesReq = cols;
                if (m === 32 || m === 33) bytesReq = cols * 3;

                const available = buf.length - (i + 5);
                const skip = clamp(bytesReq, 0, available);
                tokens.push({
                    type: "img",
                    kind: "esc_star",
                    note: `ESC * image (m=${m}, cols=${cols}) skipped`,
                });
                i += 5 + skip;
                continue;
            }

            // Unknown ESC: skip 2
            i += 2;
            continue;
        }

        // GS (0x1D)
        if (b === 0x1d) {
            const b1 = buf[i + 1];

            // GS ! n (size)
            if (b1 === 0x21 && i + 2 < buf.length) {
                const n = buf[i + 2];
                // low nibble h-1, high nibble w-1
                const w = ((n >> 4) & 0x0f) + 1;
                const h = (n & 0x0f) + 1;
                st.size.w = clamp(w, 1, 8);
                st.size.h = clamp(h, 1, 8);
                i += 3;
                continue;
            }

            // GS V m (cut)
            if (b1 === 0x56 && i + 2 < buf.length) {
                // GS V m / GS V m n
                // Simple support for GS V m (function A) or GS V m n (function B)
                // Function A: m=0,1,48,49 (no n)
                // Function B: m=65,66 (followed by n)
                const m = buf[i + 2];
                let extra = 0;
                if (m === 65 || m === 66) {
                    // eats one more byte "n"
                    if (i + 3 < buf.length) extra = 1;
                }
                tokens.push({ type: "cut", mode: m });
                i += 3 + extra;
                continue;
            }

            // GS k (Barcode)
            if (b1 === 0x6b && i + 2 < buf.length) {
                // GS k m ...
                const m = buf[i + 2];
                let type = 'barcode';
                let data = '';

                // Function A: m = 0..6 (Terminated by NUL)
                if (m >= 0 && m <= 6) {
                    let k = i + 3;
                    while (k < buf.length && buf[k] !== 0x00) {
                        k++;
                    }
                    data = buf.slice(i + 3, k).toString();
                    tokens.push({ type: 'barcode', system: 'A', m, data });
                    i = k + 1; // skip NUL
                    continue;
                }

                // Function B: m = 65..73 (Length prefixed)
                if (m >= 65 && m <= 73) {
                    if (i + 3 < buf.length) {
                        const n = buf[i + 3];
                        if (i + 4 + n <= buf.length) {
                            data = buf.slice(i + 4, i + 4 + n).toString();
                            tokens.push({ type: 'barcode', system: 'B', m, data });
                            i += 4 + n;
                            continue;
                        }
                    }
                }
                // Fallback if incomplete
                i += 3;
                continue;
            }

            // GS ( k (QR Code functions)
            if (b1 === 0x28 && i + 2 < buf.length && buf[i + 2] === 0x6b) {
                // GS ( k pL pH cn fn [m d1...dk]
                // pL+pH*256 = number of bytes after pH
                if (i + 5 < buf.length) {
                    const pL = buf[i + 3];
                    const pH = buf[i + 4];
                    const len = pL + (pH * 256);

                    if (i + 5 + len <= buf.length) {
                        const cn = buf[i + 5];
                        const fn = buf[i + 6];

                        // fn=180 (Store data in symbol storage area)
                        // 1D 28 6B pL pH 31 180 m d1...dk
                        if (fn === 180 && i + 7 < buf.length) {
                            // Data starts at i+8
                            const data = buf.slice(i + 8, i + 5 + len).toString();
                            // We just emit a token here for sim purposes, though real printers wait for Print cmd
                            tokens.push({ type: 'qr', data });
                        }

                        // fn=181 (Print symbol data) -> We ignore since we captured at 180

                        i += 5 + len; // consume block
                        continue;
                    }
                }
            }

            // GS v 0 (raster)
            if (b1 === 0x76 && buf[i + 2] === 0x30 && i + 7 < buf.length) {
                const xL = buf[i + 4];
                const xH = buf[i + 5];
                const yL = buf[i + 6];
                const yH = buf[i + 7];
                const x = (xH << 8) | xL;
                const y = (yH << 8) | yL;
                const dataLen = x * y;
                const available = buf.length - (i + 8);
                const skip = clamp(dataLen, 0, available);
                tokens.push({
                    type: "image",
                    width: x * 8, // x is in bytes
                    height: y,
                    kind: "gs_v0",
                    note: `Raster Image (${x * 8}x${y})`
                });
                i += 8 + skip;
                continue;
            }

            // Unknown GS: skip 2
            i += 2;
            continue;
        }

        // Text run
        let j = i;
        while (
            j < buf.length &&
            buf[j] !== 0x0a &&
            buf[j] !== 0x0d &&
            buf[j] !== 0x1b &&
            buf[j] !== 0x1d
        ) {
            j++;
        }
        const chunk = buf.slice(i, j);
        // Simple UTF-8 decoding. 
        // Real ticket printers use code pages, but utf-8 is fine for simulation.
        const text = chunk.toString("utf8");
        if (text.length) {
            tokens.push({ type: "text", value: text, style: snapshot() });
        }
        i = j;
    }

    return tokens;
}

module.exports = { parse };
