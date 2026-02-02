function escapeHtml(s) {
  if (!s) return "";
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function render(lines, meta) {
  // 58mm ~ 48mm printable. 80mm ~ 72mm printable.
  // We simulate using ch units, but added padding simulates physical margins.
  // 'overflow: hidden' on lines forces crop.

  const css = `
    body{font-family: ui-monospace, 'Courier New', monospace; background:#e0e0e0; color:#000; padding:20px; display:flex; justify-content:center;}
    .ticket{
       width: ${meta.columns}ch; 
       background: #fff;
       box-shadow: 0 4px 12px rgba(0,0,0,0.15);
       padding: 10mm 4mm; /* Added top/bottom padding */
       margin: 0 auto;
       font-size: 14px;
       line-height: 1.25;
       min-height: 200px;
    }
    .line{ 
        white-space: pre; 
        display: flex;
        overflow: hidden; /* Simulates horizontal paper limit (horizontal cropping) */
        align-items: flex-start; /* Better for multi-size lines */
        min-height: 1.25em;
    }
    .left{justify-content:flex-start;}
    .center{justify-content:center;}
    .right{justify-content:flex-end;}
    .b{font-weight:700;}
    .s{
        display: inline-block;
        transform-origin: left top;
    }
    
    .meta-hdr{ border-bottom: 2px dashed #eee; margin-bottom: 20px; padding-bottom: 15px; display:block; white-space:normal; overflow:visible;}
    .meta-ftr{ border-top: 2px dashed #eee; margin-top: 20px; padding-top: 15px; color:#999; font-size: 0.7em; display:block; white-space:normal;}

    /* Visual Mocks */
    .barcode {
        border: 1px solid #000;
        background: repeating-linear-gradient(90deg, #000 0px, #000 2px, #fff 2px, #fff 4px);
        height: 50px;
        min-width: 150px;
        display: inline-flex;
        align-items: flex-end;
        justify-content: center;
        font-family: sans-serif;
        font-size: 10px;
        background-color: #fff;
        position: relative;
    }
    .barcode span { background:#fff; padding:0 4px; }
    
    .qr {
        width: 100px; height: 100px;
        background-image: linear-gradient(45deg, #000 25%, transparent 25%), linear-gradient(-45deg, #000 25%, transparent 25%), linear-gradient(45deg, transparent 75%, #000 75%), linear-gradient(-45deg, transparent 75%, #000 75%);
        background-size: 20px 20px;
        background-color: #fff;
        border: 4px solid #000;
        position: relative;
        display: flex; align-items: center; justify-content: center;
        font-size: 10px; color: #fff; text-shadow: 0 0 2px #000;
        font-family: sans-serif;
        text-align:center;
        word-break: break-all;
    }

    .img-placeholder {
        background: #eee; border: 1px dashed #999;
        display: flex; align-items: center; justify-content: center;
        width: 100%;
        padding: 10px;
        font-size: 0.8em; color: #555;
    }
  `;

  const header = `
   <div class="meta-hdr">
     <div style="font-size:1.1em; color:#444"><strong>SIMULADOR: ${escapeHtml(meta.name)}</strong></div>
     <div style="font-size:0.75em; opacity:0.6">Ticket ID: ${escapeHtml(meta.jobId)} &bull; ${escapeHtml(meta.time)}</div>
   </div>
  `;

  const body = lines.map((ln) => {
    // Find max scaleY to set line height properly
    const maxScaleY = ln.segments.reduce((max, s) => Math.max(max, s.size?.h || 1), 1);
    const lineHeight = maxScaleY > 1 ? `${maxScaleY * 1.2}em` : '1.25em';

    const segs = ln.segments.map((s) => {
      if (!s.text && !s.isPlaceholder && !s.isBarcode && !s.isQr && !s.isImage) return "";

      if (s.isPlaceholder) {
        return `<span style="background:#eee; border:1px solid #ccc; font-size:0.8em; padding:2px;">${escapeHtml(s.text)}</span>`;
      }
      if (s.isBarcode) {
        return `<div class="barcode" title="${escapeHtml(s.data)}"><span>${escapeHtml(s.data)}</span></div>`;
      }
      if (s.isQr) {
        return `<div class="qr" title="${escapeHtml(s.data)}">QR</div>`;
      }
      if (s.isImage) {
        return `<div class="img-placeholder" style="width:${s.width || '100%'}">Raster Image<br>${s.width}x${s.height}</div>`;
      }

      const scaleX = s.size?.w || 1;
      const scaleY = s.size?.h || 1;
      const cls = [s.bold ? "b" : "", "s"].join(" ");

      // Calculate effective dimensions based on scale
      const width = `${s.text.length * scaleX}ch`;
      const height = `${scaleY}em`; // CRITICAL: Match height to scale to prevent vertical clipping by overflow:hidden

      return `<span class="${cls}" style="transform: scale(${scaleX},${scaleY}); width: ${width}; height: ${height}; line-height: 1;">${escapeHtml(s.text)}</span>`;
    }).join("");

    return `<div class="line ${ln.align}" style="min-height: ${lineHeight};">${segs || "&nbsp;"}</div>`;
  }).join("\n");

  return `<!doctype html>
<html>
<head>
 <meta charset="utf-8"/>
 <title>${escapeHtml(meta.jobId)}</title>
 <style>${css}</style>
</head>
<body>
 <div class="ticket">
   ${header}
   ${body}
 </div>
</body>
</html>`;
}

module.exports = { render };
