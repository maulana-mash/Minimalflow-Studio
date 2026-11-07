/**
 * MinimalFlow Studio — AI Vision to Flowchart Scanner Engine
 * Mengonversi foto sketsa, screenshot, atau diagram grafis langsung menjadi
 * diagram alur vektor interaktif di kanvas menggunakan Google Gemini Vision API.
 * 100% Client-side (Zero backend server, kunci tersimpan privat di LocalStorage pengguna).
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  const STORAGE_KEY_GEMINI_API = "minimalflow_gemini_api_key";
  const CANDIDATE_MODELS = [
    "gemini-3.5-flash-lite", // Sangat cepat, stabil, bebas 503 spike
    "gemini-3.8-flash"       // Cadangan multimodal
  ];
  const EMBEDDED_DEFAULT_KEY = ""; // Masukkan Gemini API Key Anda melalui modal UI atau localStorage

  // Baca API Key dari LocalStorage (atau kunci default jika disediakan)
  function getApiKey() {
    try {
      const stored = (localStorage.getItem(STORAGE_KEY_GEMINI_API) || "").trim();
      return stored || EMBEDDED_DEFAULT_KEY || "";
    } catch (e) {
      return EMBEDDED_DEFAULT_KEY || "";
    }
  }

  // Simpan API Key ke LocalStorage
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

  // Konversi berkas File/Blob gambar ke Base64 (tanpa header data URL)
  function fileToBase64(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const result = reader.result;
        const base64Data = result.split(",")[1];
        resolve({
          mimeType: file.type || "image/png",
          base64: base64Data
        });
      };
      reader.onerror = (err) => reject(err);
      reader.readAsDataURL(file);
    });
  }

  // System instruction terbaik untuk rekonstruksi diagram ke sintaks Mermaid
  const SYSTEM_DIAGRAM_PROMPT = `
You are an expert Diagram & Flowchart Reverse-Engineering Specialist.
Analyze the provided diagram image and reconstruct its complete and exact semantic flow into clean, structured Mermaid flowchart syntax (flowchart TD or flowchart LR).

CRITICAL EXTRACTION RULES:
1. Orientation:
   - Use 'flowchart TD' if the diagram flows mostly from top to bottom.
   - Use 'flowchart LR' if it flows mostly horizontally from left to right.
2. Subgraphs / Swimlanes / Actors:
   - If the diagram contains visual container boxes, groups, or actor regions (e.g. 'GURU', 'SISWA', 'USER', 'SYSTEM', 'FRONTEND', 'BACKEND'), wrap them inside standard Mermaid subgraphs:
     subgraph ID ["Title of Box"]
       ...
     end
3. Geometries & Shapes:
   - Start / End / Terminator -> Stadium: ID(["Exact text"])
   - Decision / Condition / Branching -> Diamond: ID{"Exact condition text"}
   - Process / Step / Action -> Rectangle: ID["Exact text"]
   - Database / Battery / Hardware -> Cylinder: ID[("Exact text")]
   - Input / Output / Data -> Parallelogram: ID[/"Exact text"/]
   - Event / Marker -> Circle: ID(("Exact text"))
4. Text Extraction:
   - Extract the text inside each shape verbatim with exact spelling and punctuation.
   - For bullet points or multi-line text, use <br/> or clean newlines.
5. Connections, Arrows & Edge Labels:
   - Identify every arrow accurately:
     A --> B
     A -- "Outcome/Condition" --> B
     A -->|Label| B
     A -.->|Dashed Label| B
   - For decision branches, include labels like "Ya", "Tidak", "Lulus", "Perlu Perbaikan".
   - If an edge loops back to an earlier step or another subgraph, reconstruct the link cleanly.
6. Clean Output:
   - Output ONLY the raw Mermaid code. If wrapped in \`\`\`mermaid ... \`\`\`, keep it clean.
   - Do NOT include conversational filler, preamble, or explanations.
`.trim();

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

    if (fileOrBase64 instanceof Blob || fileOrBase64 instanceof File) {
      const converted = await fileToBase64(fileOrBase64);
      mimeType = converted.mimeType;
      base64 = converted.base64;
    } else if (typeof fileOrBase64 === "object" && fileOrBase64.base64) {
      mimeType = fileOrBase64.mimeType || "image/png";
      base64 = fileOrBase64.base64;
    } else {
      throw new Error("Format gambar tidak valid.");
    }

    let lastError = null;
    let successfulCandidate = null;

    for (let i = 0; i < CANDIDATE_MODELS.length; i++) {
      const modelName = CANDIDATE_MODELS[i];
      if (typeof onProgress === "function") {
        onProgress(i === 0 
          ? `Menganalisis gambar dengan Google Gemini (${modelName})...` 
          : `Model sebelumnya sibuk, beralih ke cadangan (${modelName})...`
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
          temperature: 0.1,
          maxOutputTokens: 2500
        }
      };

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000);

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
            // Model sibuk / high demand spike, coba model berikutnya
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
          successfulCandidate = candidate;
          break; // Sukses!
        }
      } catch (err) {
        clearTimeout(timeoutId);
        lastError = err;
        if (err.message && err.message.includes("otorisasi")) {
          throw err;
        }
      }
    }

    if (!successfulCandidate) {
      throw lastError || new Error("Semua model AI sedang padat. Silakan coba beberapa saat lagi.");
    }

    if (typeof onProgress === "function") {
      onProgress("Menganalisis hasil rekonstruksi alur diagram...");
    }

    let textOut = successfulCandidate.content.parts[0].text || "";
    textOut = textOut.replace(/^```(?:mermaid|flowchart|graph)?\s*/i, "").replace(/```\s*$/, "").trim();
    return textOut;
  }

  // Export module ke namespace MinimalFlow
  exports.VisionScanner = {
    getApiKey,
    saveApiKey,
    hasApiKey,
    scanDiagramImage,
    DEFAULT_MODEL: CANDIDATE_MODELS[0],
    CANDIDATE_MODELS
  };

})(window.MinimalFlow);
