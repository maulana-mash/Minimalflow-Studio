/**
 * MinimalFlow Studio — AI Vision to Flowchart Scanner Engine (v2 — Direct Spatial JSON Reconstruction)
 * Mengonversi foto sketsa, screenshot Word/Visio, atau diagram grafis langsung menjadi
 * diagram alur vektor interaktif di kanvas menggunakan Google Gemini Vision API
 * dengan presisi tata letak 2D (box_2d), OCR verbatim, format bold/italic, alignment per paragraf,
 * dan penomoran hanging-indent ala Word.
 * 100% Client-side (Zero backend server, kunci tersimpan privat di LocalStorage pengguna).
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  const STORAGE_KEY_GEMINI_API = "minimalflow_gemini_api_key";
  const CANDIDATE_MODELS = [
    "gemini-3.8-flash",      // Utama: Akurasi tinggi multimodal OCR & tata letak spasial
    "gemini-3.5-flash-lite"  // Cadangan cepat jika model utama sedang padat
  ];
  const EMBEDDED_DEFAULT_KEY = ""; // Masukkan Gemini API Key Anda melalui modal UI atau localStorage

  function getApiKey() {
    try {
      const stored = (localStorage.getItem(STORAGE_KEY_GEMINI_API) || "").trim();
      return stored || EMBEDDED_DEFAULT_KEY || "";
    } catch (e) {
      return EMBEDDED_DEFAULT_KEY || "";
    }
  }

  function saveApiKey(key) {
    try {
      if (key && key.trim()) {
        localStorage.setItem(STORAGE_KEY_GEMINI_API, key.trim());
        return true;
      } else {
        localStorage.removeItem(STORAGE_KEY_GEMINI_API);
        return false;
      }
    } catch (e) {
      return false;
    }
  }

  function hasApiKey() {
    return !!getApiKey();
  }

  // Konversi berkas File/Blob gambar ke Base64 sekaligus membaca dimensi asli (width & height)
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64Data = result.split(",")[1];
        const mimeType = file.type || "image/png";

        const img = new Image();
        img.onload = () => {
          resolve({
            mimeType,
            base64: base64Data,
            width: img.naturalWidth || 1600,
            height: img.naturalHeight || 900
          });
        };
        img.onerror = () => {
          resolve({
            mimeType,
            base64: base64Data,
            width: 1600,
            height: 900
          });
        };
        img.src = result;
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // Prompt rekonstruksi visual presisi tinggi (Direct Native Spatial JSON)
  const SYSTEM_DIAGRAM_PROMPT = `
You are a precision Flowchart & Diagram Visual Reverse-Engineering Specialist.
Analyze the provided diagram image carefully and reconstruct EVERY SINGLE visible box, shape, container, text paragraph, and arrow into a single valid JSON object matching the exact schema below.

OUTPUT JSON SCHEMA:
{
  "format": "minimalflow_vision",
  "orientation": "TD",
  "nodes": [
    {
      "id": "n1",
      "type": "rectangle",
      "box_2d": [ymin, xmin, ymax, xmax],
      "isContainer": false,
      "fill": "light",
      "paragraphs": [
        {
          "text": "<b>Exact Heading:</b>",
          "align": "center",
          "list": null
        },
        {
          "text": "Exact body paragraph with <i>italic words</i> preserved verbatim.",
          "align": "justify",
          "list": "1."
        }
      ]
    }
  ],
  "edges": [
    {
      "source": "n1",
      "target": "n2",
      "sourcePin": "S",
      "targetPin": "N",
      "label": "",
      "dashed": "solid",
      "markerStart": "none",
      "markerEnd": "arrow"
    }
  ]
}

STRICT EXTRACTION RULES (ZERO ERRORS TOLERATED):
1. EXHAUSTIVE BOX DETECTION:
   - Scan the entire image systematically from top-to-bottom and left-to-right.
   - Extract EVERY SINGLE visible shape/box/node in the image. NEVER skip, omit, or merge separate boxes, even when 5 or more boxes sit side-by-side in a horizontal row.
   - For each node, provide accurate normalized bounding box coordinates "box_2d": [ymin, xmin, ymax, xmax] where each integer is in 0..1000 relative to image height/width.
   - If a large dashed/framed outer container wraps inner boxes (swimlane/group/subgraph), include it with "isContainer": true.

2. EXACT SHAPE TYPE MAPPING (use ONLY these exact strings for "type"):
   - "rectangle"          : Standard rectangular process / text box
   - "rounded"            : Stadium / pill-shaped Start / End / Terminator
   - "diamond"            : Rhombus Decision / Branching condition
   - "parallelogram"      : Slanted Input / Output data box
   - "circle"             : On-page connector circle / small circular node
   - "offpage"            : Pentagon / home-plate Off-page connector
   - "document"           : Rectangle with wavy bottom edge (Document)
   - "predefined_process" : Rectangle with double vertical side bars (Subroutine)
   - "preparation"        : Hexagon (Preparation / Initialization)
   - "manual_input"       : Trapezoid with slanted top edge (Keyboard / Manual Input)
   - "manual_operation"   : Inverted trapezoid (Manual Operation)
   - "display"            : Bullet / curved-sides Display output shape
   - "cylinder"           : Vertical drum / Database storage
   - "disk_storage"       : Horizontal curved-side Disk / Online storage
   - "magnetic_tape"      : Circle with bottom horizontal tail
   - "punch_card"         : Rectangle with top-left cut corner

3. 100% VERBATIM OCR & FORMATTING FIDELITY:
   - Copy EVERY SINGLE WORD, letter, acronym, proper noun, number, parenthesis, colon, comma, and period 100% VERBATIM as shown in the image (Indonesian, English, technical terms, names, etc.).
   - NEVER paraphrase, abbreviate, summarize, translate, or alter spelling.
   - IGNORE red or green squiggly spell-checker underlines (e.g., from Microsoft Word screenshots) — do NOT wrap spell-checked words in <u> or misread characters because of the squiggle.
   - Preserve visual text formatting inside each paragraph's "text":
     * Bold text -> <b>...</b>
     * Italic text -> <i>...</i>
     * Intentional solid underline -> <u>...</u>
   - Split distinct visual paragraphs or headings inside a box into separate entries in the "paragraphs" array!
     * Keep wrapped lines of the SAME continuous sentence/paragraph joined together with single spaces into ONE paragraph object (do NOT insert artificial breaks mid-sentence).
     * Put a heading (e.g. "Analysis (Analisis):" or "Hasil yang Diharapkan:") in its own paragraph object if it sits on its own line or has different alignment/bold styling.
   - Detect each paragraph's visual horizontal alignment: "left", "center", "right", or "justify".
   - Detect numbered lists accurately:
     * If a paragraph starts with "1.", "2.", "3." -> set "list": "1." and REMOVE the "1. " prefix from "text".
     * If it starts with "1)", "2)", "3)" -> set "list": "1)" and REMOVE the "1) " prefix from "text".
     * If it starts with "a.", "b.", "c." -> set "list": "a." and REMOVE the "a. " prefix from "text".
     * If it starts with "a)", "b)", "c)" -> set "list": "a)" and REMOVE the "a) " prefix from "text".
     * If it starts with "A.", "B.", "C." -> set "list": "A." and REMOVE the "A. " prefix from "text".
     * If it starts with "A)", "B)", "C)" -> set "list": "A)" and REMOVE the "A) " prefix from "text".
     * Otherwise set "list": null.

4. CONNECTIONS, ARROWS & BUS / FORK / MERGE LINES:
   - Identify EVERY arrow connecting visible nodes.
   - If multiple side-by-side boxes connect downward into a shared horizontal bus line that merges into a single arrow pointing into a box below (fan-in), emit one edge from EACH upper box ("sourcePin": "S") to the lower box ("targetPin": "N").
   - If a single box connects via a splitting bus line into multiple boxes below (fan-out), emit one edge from the upper box ("sourcePin": "S") to EACH lower box ("targetPin": "N").
   - Only emit edges whose "source" and "target" both exist in "nodes". Ignore cut-off arrows entering from outside the cropped image frame if their source box is not visible.
   - Use "sourcePin" and "targetPin" from: "N" (top), "E" (right), "S" (bottom), "W" (left).
   - Extract any text label printed on or next to an arrow (e.g., "Ya", "Tidak") into "label".
   - Set "dashed" to "dashed" if the connector line is dashed/dotted, otherwise "solid".

5. CLEAN JSON ONLY:
   - Return ONLY valid JSON. Do not include markdown fences or any commentary outside the JSON object.
`.trim();

  function cleanJsonOutput(rawText) {
    if (!rawText) return "";
    let s = String(rawText).trim();
    s = s.replace(/^```(?:json|mermaid|flowchart|graph)?\s*/i, "").replace(/```\s*$/i, "").trim();
    const firstBrace = s.indexOf("{");
    const lastBrace = s.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace > firstBrace) {
      s = s.slice(firstBrace, lastBrace + 1);
    }
    return s;
  }

  // Panggil endpoint Gemini API secara langsung dari peramban
  async function scanDiagramImage(fileOrBase64, onProgress) {
    const apiKey = getApiKey();
    if (!apiKey) {
      throw new Error("API Key Gemini belum diatur. Silakan masukkan kunci API Google Gemini Anda.");
    }

    if (typeof onProgress === "function") {
      onProgress("Mempersiapkan berkas gambar...");
    }

    let mimeType = "image/png";
    let base64 = "";
    let imgWidth = 1600;
    let imgHeight = 900;

    if (fileOrBase64 instanceof Blob || fileOrBase64 instanceof File) {
      const converted = await fileToBase64(fileOrBase64);
      mimeType = converted.mimeType;
      base64 = converted.base64;
      imgWidth = converted.width || 1600;
      imgHeight = converted.height || 900;
    } else if (typeof fileOrBase64 === "object" && fileOrBase64.base64) {
      mimeType = fileOrBase64.mimeType || "image/png";
      base64 = fileOrBase64.base64;
      imgWidth = fileOrBase64.width || 1600;
      imgHeight = fileOrBase64.height || 900;
    } else {
      throw new Error("Format gambar tidak valid.");
    }

    let lastError = null;
    let successfulText = null;

    for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
      const modelName = CANDIDATE_MODELS[i];
      if (typeof onProgress === "function") {
        onProgress(i === 0
          ? `Menganalisis struktur, teks & tata letak dengan Google Gemini (${modelName})...`
          : `Model utama sibuk, beralih ke cadangan (${modelName})...`
        );
      }

      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${modelName}:generateContent?key=${encodeURIComponent(apiKey)}`;
      const payload = {
        contents: [
          {
            parts: [
              { text: SYSTEM_DIAGRAM_PROMPT },
              {
                inlineData: {
                  mimeType: mimeType,
                  data: base64
                }
              }
            ]
          }
        ],
        generationConfig: {
          temperature: 0.05,
          maxOutputTokens: 8192,
          responseMimeType: "application/json"
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 90000);

      try {
        const response = await fetch(endpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
          signal: controller.signal
        });
        clearTimeout(timeoutId);

        if (!response.ok) {
          let errDetail = "";
          try {
            const errJson = await response.json();
            errDetail = errJson.error ? errJson.error.message : JSON.stringify(errJson);
          } catch (e) {
            errDetail = response.statusText;
          }

          if (response.status === 400 || response.status === 403) {
            throw new Error(`API Key tidak valid atau otorisasi ditolak: ${errDetail}`);
          } else if (response.status === 503 || response.status === 429) {
            lastError = new Error(`Model ${modelName} sedang padat (${errDetail})`);
            continue;
          } else {
            lastError = new Error(`Kesalahan API (${response.status}): ${errDetail}`);
            continue;
          }
        }

        const data = await response.json();
        const candidate = data.candidates && data.candidates[0];
        if (candidate && candidate.content && candidate.content.parts && candidate.content.parts.length > 0) {
          const textPart = candidate.content.parts.map(p => p.text || "").join("");
          if (textPart.trim()) {
            successfulText = textPart;
            break;
          }
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err.message && err.message.includes("otorisasi")) {
          throw err;
        }
      }
    }

    if (!successfulText) {
      throw lastError || new Error("Semua model AI sedang padat. Silakan coba beberapa saat lagi.");
    }

    if (typeof onProgress === "function") {
      onProgress("Memverifikasi tata letak spasial dan teks verbatim...");
    }

    const cleaned = cleanJsonOutput(successfulText);
    try {
      const parsed = JSON.parse(cleaned);
      if (parsed && Array.isArray(parsed.nodes)) {
        parsed.format = "minimalflow_vision";
        parsed.imageWidth = imgWidth;
        parsed.imageHeight = imgHeight;
        return JSON.stringify(parsed, null, 2);
      }
    } catch (e) {
      // Fallback: jika model mengembalikan Mermaid polos, teruskan apa adanya
      return successfulText.replace(/^```(?:mermaid|flowchart|graph)?\s*/i, "").replace(/```\s*$/, "").trim();
    }

    return cleaned;
  }

  exports.VisionScanner = {
    getApiKey,
    saveApiKey,
    hasApiKey,
    scanDiagramImage,
    DEFAULT_MODEL: CANDIDATE_MODELS[0],
    CANDIDATE_MODELS
  };

})(window.MinimalFlow);
