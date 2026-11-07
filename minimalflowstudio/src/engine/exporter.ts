import type { FlowDocument } from '../types';
import { jsPDF } from 'jspdf';

export function getExportBoundingBox(doc: FlowDocument): { minX: number; minY: number; width: number; height: number } {
  const ws = doc.canvas.workspace;
  return {
    minX: ws.x,
    minY: ws.y,
    width: ws.width,
    height: ws.height
  };
}

export function generateCleanSVG(
  doc: FlowDocument,
  svgElement: SVGSVGElement,
  forceTransparent = false
): { xml: string; width: number; height: number } {
  const bbox = getExportBoundingBox(doc);
  const clone = svgElement.cloneNode(true) as SVGSVGElement;

  clone.querySelector("#grid-rect")?.remove();
  clone.querySelector("#layer-workspace-boundary")?.remove();
  clone.querySelector("#layer-overlays")?.remove();
  clone.querySelector("#layer-draft")?.remove();
  clone.querySelectorAll(".pin-circle")?.forEach(el => el.remove());
  clone.querySelectorAll(".edge-handle")?.forEach(el => el.remove());

  const vp = clone.querySelector("#viewport");
  if (vp) {
    vp.setAttribute("transform", "translate(0,0) scale(1)");
  }

  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  clone.setAttribute("width", String(bbox.width));
  clone.setAttribute("height", String(bbox.height));
  clone.setAttribute("viewBox", `${bbox.minX} ${bbox.minY} ${bbox.width} ${bbox.height}`);

  const bgRect = clone.querySelector("#bg-rect");
  const isDark = doc.theme === "dark";
  if (forceTransparent) {
    bgRect?.remove();
  } else if (bgRect) {
    bgRect.setAttribute("x", String(bbox.minX));
    bgRect.setAttribute("y", String(bbox.minY));
    bgRect.setAttribute("width", String(bbox.width));
    bgRect.setAttribute("height", String(bbox.height));
    bgRect.setAttribute("fill", isDark ? "#121214" : "#ffffff");
  }

  const xml = new XMLSerializer().serializeToString(clone);
  return { xml, width: bbox.width, height: bbox.height };
}

export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export function exportToCanvas(
  doc: FlowDocument,
  svgElement: SVGSVGElement,
  transparent: boolean,
  callback: (canvas: HTMLCanvasElement) => void
): void {
  const { xml, width, height } = generateCleanSVG(doc, svgElement, transparent);
  const img = new Image();
  const svgBlob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  const url = URL.createObjectURL(svgBlob);
  const isDark = doc.theme === "dark";

  img.onload = () => {
    const scale = 2;
    const canvas = document.createElement("canvas");
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    if (!transparent) {
      ctx.fillStyle = isDark ? "#121214" : "#ffffff";
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
    }

    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
    URL.revokeObjectURL(url);
    callback(canvas);
  };
  img.src = url;
}

export function exportSvg(doc: FlowDocument, svgElement: SVGSVGElement, filename = "flowchart-workspace.svg"): void {
  const { xml } = generateCleanSVG(doc, svgElement, false);
  const blob = new Blob([xml], { type: "image/svg+xml;charset=utf-8" });
  downloadBlob(blob, filename);
}

export function exportPng(
  doc: FlowDocument,
  svgElement: SVGSVGElement,
  transparent: boolean,
  filename: string,
  onSuccess?: () => void
): void {
  exportToCanvas(doc, svgElement, transparent, (canvas) => {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, filename);
        if (onSuccess) onSuccess();
      }
    }, "image/png");
  });
}

export function exportJpg(
  doc: FlowDocument,
  svgElement: SVGSVGElement,
  filename = "flowchart.jpg",
  onSuccess?: () => void
): void {
  exportToCanvas(doc, svgElement, false, (canvas) => {
    canvas.toBlob((blob) => {
      if (blob) {
        downloadBlob(blob, filename);
        if (onSuccess) onSuccess();
      }
    }, "image/jpeg", 0.95);
  });
}

export function copyCanvasToClipboard(
  doc: FlowDocument,
  svgElement: SVGSVGElement,
  onSuccess?: () => void,
  onError?: () => void
): void {
  exportToCanvas(doc, svgElement, true, (canvas) => {
    canvas.toBlob(async (blob) => {
      if (!blob) return;
      try {
        await navigator.clipboard.write([new ClipboardItem({ "image/png": blob })]);
        if (onSuccess) onSuccess();
      } catch (err) {
        if (onError) onError();
      }
    }, "image/png");
  });
}

export function exportPdf(
  doc: FlowDocument,
  svgElement: SVGSVGElement,
  filename = "flowchart-document.pdf",
  onSuccess?: () => void
): void {
  exportToCanvas(doc, svgElement, false, (canvas) => {
    try {
      const w = canvas.width / 2;
      const h = canvas.height / 2;
      const orientation = w > h ? "landscape" : "portrait";
      const pdf = new jsPDF({ orientation, unit: "px", format: [w, h] });
      pdf.addImage(canvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, w, h);
      pdf.save(filename);
      if (onSuccess) onSuccess();
    } catch (e) {
      console.error("PDF export error:", e);
      window.print();
    }
  });
}

export function exportJson(doc: FlowDocument, filename = "flowchart-project.flow.json"): void {
  const jsonStr = JSON.stringify(doc, null, 2);
  const blob = new Blob([jsonStr], { type: "application/json" });
  downloadBlob(blob, filename);
}
