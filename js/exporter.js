/**
 * MinimalFlow Studio — Multi-Format Exporter Engine
 * Ekspor Vektor SVG (Workspace Bounding Box), PNG 2x Retina (Transparan & Putih),
 * JPG High Quality, PDF Vektor (jsPDF CDN), Salin ke Clipboard, dan File CAD JSON (.flow / .json).
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  function getExportBoundingBox(doc) {
    const ws = (doc.canvas && doc.canvas.workspace) || { x: 40, y: 40, width: 1600, height: 900 };
    return {
      minX: ws.x,
      minY: ws.y,
      width: ws.width,
      height: ws.height
    };
  }

  function generateCleanSVG(doc, svgEl, forceTransparent = false) {
    const bbox = getExportBoundingBox(doc);
    const clone = svgEl.cloneNode(true);

    clone.querySelector("#grid-rect")?.remove();
    clone.querySelector("#layer-workspace-boundary")?.remove();
    clone.querySelector("#layer-overlays")?.remove();
    clone.querySelector("#layer-draft")?.remove();
    clone.querySelectorAll(".pin-circle")?.forEach(el => el.remove());
    clone.querySelectorAll(".edge-handle")?.forEach(el => el.remove());
    clone.querySelectorAll(".edge-hit-area")?.forEach(el => el.remove());

    // Hapus seluruh teks placeholder "Insert text" agar hasil ekspor gambar murni bersih
    clone.querySelectorAll("#layer-elements text, #layer-nodes text, .node-group text").forEach(textEl => {
      const txt = (textEl.textContent || "").trim().toLowerCase();
      if (!txt || txt === "insert text") {
        textEl.remove();
      }
    });

    if (doc && doc.nodes) {
      Object.entries(doc.nodes).forEach(([id, node]) => {
        const isPh = !node.isContainer && (!!node.text?.isPlaceholder || (node.text?.content || "").trim().toLowerCase() === "insert text");
        if (isPh) {
          clone.querySelector(`#node-text-${id}`)?.remove();
        }
      });
    }

    const vp = clone.querySelector("#viewport");
    if (vp) {
      vp.setAttribute("transform", "translate(0,0) scale(1)");
    }

    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
    clone.setAttribute("width", bbox.width);
    clone.setAttribute("height", bbox.height);
    clone.setAttribute("viewBox", `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`);

    const bgRect = clone.querySelector("#bg-rect");
    const isDark = doc.theme === "dark";
    if (forceTransparent) {
      bgRect?.remove();
    } else if (bgRect) {
      bgRect.setAttribute("x", bbox.minX);
      bgRect.setAttribute("y", bbox.minY);
      bgRect.setAttribute("width", bbox.width);
      bgRect.setAttribute("height", bbox.height);
      bgRect.setAttribute("fill", isDark ? "#121214" : "#ffffff");
    }

    const xml = new XMLSerializer().serializeToString(clone);
    return { xml, width: bbox.width, height: bbox.height };
  }

  function downloadBlob(blob, filename) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function exportToCanvas(doc, svgEl, transparent, scaleOrCallback, callback) {
    let scale = 2;
    let cb = callback;
    if (typeof scaleOrCallback === "function") {
      cb = scaleOrCallback;
      scale = 2;
    } else if (typeof scaleOrCallback === "number" || !isNaN(Number(scaleOrCallback))) {
      scale = Math.max(1, Math.min(4, Number(scaleOrCallback) || 2));
    }

    const { xml, width, height } = generateCleanSVG(doc, svgEl, transparent);
    const img = new Image();
    const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    const url = URL.createObjectURL(svgBlob);
    const isDark = doc.theme === "dark";

    img.onload = () => {
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(width * scale);
      canvas.height = Math.round(height * scale);
      const ctx = canvas.getContext("2d");

      if (!transparent) {
        ctx.fillStyle = isDark ? "#121214" : "#ffffff";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      } else {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
      }

      ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      if (typeof cb === "function") cb(canvas);
    };
    img.src = url;
  }

  function exportSvg(doc, svgEl, filename = "flowchart-workspace.svg") {
    const { xml } = generateCleanSVG(doc, svgEl, false);
    const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
    downloadBlob(blob, filename);
  }

  function exportPng(doc, svgEl, transparent, scale = 2, filename = "flowchart.png", onSuccess) {
    let s = scale;
    let fn = filename;
    let cb = onSuccess;

    if (typeof scale === "string") {
      fn = scale;
      s = 2;
      cb = filename;
    }

    exportToCanvas(doc, svgEl, transparent, s, (canvas) => {
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, fn || "flowchart.png");
          if (typeof cb === "function") cb();
        }
      }, "image/png");
    });
  }

  function exportJpg(doc, svgEl, scale = 2, quality = 0.95, filename = "flowchart.jpg", onSuccess) {
    let s = scale;
    let q = quality;
    let fn = filename;
    let cb = onSuccess;

    if (typeof scale === "string") {
      fn = scale;
      s = 2;
      cb = quality;
      q = 0.95;
    }

    exportToCanvas(doc, svgEl, false, s, (canvas) => {
      canvas.toBlob((blob) => {
        if (blob) {
          downloadBlob(blob, fn || "flowchart.jpg");
          if (typeof cb === "function") cb();
        }
      }, "image/jpeg", q || 0.95);
    });
  }

  function exportPdf(doc, svgEl, filename = "flowchart-document.pdf", onSuccess) {
    exportToCanvas(doc, svgEl, false, (canvas) => {
      try {
        const jsPDFConstructor = (window.jspdf && window.jspdf.jsPDF) ? window.jspdf.jsPDF : null;
        if (jsPDFConstructor) {
          const w = canvas.width / 2;
          const h = canvas.height / 2;
          const orientation = w > h ? "landscape" : "portrait";
          const pdfDoc = new jsPDFConstructor({ orientation, unit: "px", format: [w, h] });
          pdfDoc.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
          pdfDoc.save(filename);
          if (typeof onSuccess === "function") onSuccess();
        } else {
          window.print();
        }
      } catch (err) {
        console.error("PDF export error:", err);
        window.print();
      }
    });
  }

  function copyCanvasToClipboard(doc, svgEl, onSuccess, onError) {
    exportToCanvas(doc, svgEl, true, (canvas) => {
      canvas.toBlob(async (blob) => {
        if (!blob) return;
        try {
          await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
          if (typeof onSuccess === "function") onSuccess();
        } catch (err) {
          console.error("Clipboard error:", err);
          if (typeof onError === "function") onError();
        }
      }, "image/png");
    });
  }

  function exportJson(doc, filename = "flowchart-project.flow.json") {
    // Clone doc dan bersihkan "Insert text" placeholder agar tidak ikut masuk ke export JSON
    const cleanDoc = JSON.parse(JSON.stringify(doc));
    if (cleanDoc.nodes) {
      Object.values(cleanDoc.nodes).forEach(n => {
        if (n.text && (n.text.isPlaceholder || (n.text.content || "").trim().toLowerCase() === "insert text")) {
          n.text.content = "";
          n.text.isPlaceholder = false;
        }
      });
    }
    const jsonStr = JSON.stringify(cleanDoc, null, 2);
    const blob = new Blob([jsonStr], { type: "application/json" });
    downloadBlob(blob, filename);
  }

  exports.Exporter = {
    getExportBoundingBox,
    generateCleanSVG,
    downloadBlob,
    exportToCanvas,
    exportSvg,
    exportPng,
    exportJpg,
    exportPdf,
    copyCanvasToClipboard,
    exportJson
  };

})(window.MinimalFlow);
