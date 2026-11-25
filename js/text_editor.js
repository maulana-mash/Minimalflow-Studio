/**
 * MinimalFlow Studio — Live Inline Text Editor Engine
 * Mengelola rendering tata letak teks SVG (auto-wrap, true word-spacing justify,
 * per-paragraph alignment, Word-style hanging-indent numbering) dan editor teks
 * contentEditable yang MENYATU RAPI KE DALAM BOX CHART.
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  const VALID_ALIGNS = new Set(["left", "center", "right", "justify"]);
  const VALID_LISTS = new Set(["1.", "1)", "a.", "a)", "A.", "A)"]);

  let measureCanvas = null;
  let measureCtx = null;

  function getMeasureContext() {
    if (!measureCtx && typeof document !== "undefined") {
      measureCanvas = document.createElement("canvas");
      measureCtx = measureCanvas.getContext("2d");
    }
    return measureCtx;
  }

  function toAlpha(num, upper) {
    let n = Math.max(1, num);
    let out = "";
    while (n > 0) {
      n -= 1;
      out = String.fromCharCode((upper ? 65 : 97) + (n % 26)) + out;
      n = Math.floor(n / 26);
    }
    return out;
  }

  function formatListMarker(listType, index) {
    const n = Math.max(1, index || 1);
    switch (listType) {
      case "1.": return `${n}.`;
      case "1)": return `${n})`;
      case "a.": return `${toAlpha(n, false)}.`;
      case "a)": return `${toAlpha(n, false)})`;
      case "A.": return `${toAlpha(n, true)}.`;
      case "A)": return `${toAlpha(n, true)})`;
      default: return "";
    }
  }

  function escapeAttr(str) {
    return String(str || "").replace(/"/g, "&quot;");
  }

  function escapeHtmlText(str) {
    return String(str || "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;");
  }

  function decodeHtmlEntities(str) {
    if (!str) return "";
    return String(str)
      .replace(/&nbsp;/gi, " ")
      .replace(/&amp;/gi, "&")
      .replace(/&quot;/gi, '"')
      .replace(/&#39;|&apos;/gi, "'")
      .replace(/&lt;/gi, "<")
      .replace(/&gt;/gi, ">");
  }

  function getPlainText(rawContent) {
    if (!rawContent) return "";
    let s = String(rawContent);
    s = s.replace(/<\/p>\s*<p\b[^>]*>/gi, "\n");
    s = s.replace(/<br\s*\/?>/gi, "\n");
    s = s.replace(/<[^>]*>/g, "");
    return decodeHtmlEntities(s).trim();
  }

  function sanitizeHtmlFormatting(html) {
    if (!html) return "";
    let s = String(html);

    // 1. Convert spans with explicit bold/italic/underline styles to <b>, <i>, <u>
    s = s.replace(/<span\b[^>]*style="([^"]*)"[^>]*>([\s\S]*?)<\/span>/gi, (m, style, inner) => {
      let res = inner;
      if (/text-decoration[^;]*underline/i.test(style)) res = `<u>${res}</u>`;
      if (/font-style:\s*italic/i.test(style)) res = `<i>${res}</i>`;
      if (/font-weight:\s*(?:bold|[6789]00)/i.test(style)) res = `<b>${res}</b>`;
      return res;
    });

    // 2. Unwrap any remaining spans (loop up to 5 times for nested spans)
    for (let i = 0; i < 5; i++) {
      const next = s.replace(/<span\b[^>]*>([\s\S]*?)<\/span>/gi, "$1");
      if (next === s) break;
      s = next;
    }

    // 3. Normalize strong/em/ins to <b>/<i>/<u>
    s = s.replace(/<strong\b[^>]*>/gi, "<b>").replace(/<\/strong>/gi, "</b>");
    s = s.replace(/<em\b[^>]*>/gi, "<i>").replace(/<\/em>/gi, "</i>");
    s = s.replace(/<ins\b[^>]*>/gi, "<u>").replace(/<\/ins>/gi, "</u>");

    // 4. Unwrap other non-essential formatting tags (keep p, b, i, u, br)
    for (let i = 0; i < 3; i++) {
      const next = s.replace(/<(?:font|mark|small|del|s|strike|a)\b[^>]*>([\s\S]*?)<\/(?:font|mark|small|del|s|strike|a)>/gi, "$1");
      if (next === s) break;
      s = next;
    }

    // 5. Remove orphan non-essential tags
    s = s.replace(/<\/?(?:span|font|mark|small|del|s|strike|a)\b[^>]*>/gi, "");

    // 6. Clean empty b/i/u
    s = s.replace(/<b>\s*<\/b>/gi, "");
    s = s.replace(/<i>\s*<\/i>/gi, "");
    s = s.replace(/<u>\s*<\/u>/gi, "");

    return s;
  }

  function cleanMarkdownToHtml(str) {
    if (!str) return "";
    let s = String(str);
    s = sanitizeHtmlFormatting(s);
    // Convert ***text*** -> <b><i>text</i></b>
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<b><i>$1</i></b>");
    // Convert **text** -> <b>text</b>
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    // Convert *text* -> <i>text</i>
    s = s.replace(/\*([^*]+)\*/g, "<i>$1</i>");
    return s;
  }

  // Strip leading manual list markers like "1. ", "2) ", "a. ", "A) " (preserving inner tags)
  function stripManualListPrefix(html) {
    if (!html) return "";
    // Match optional opening tags at start, followed by marker + space
    return String(html).replace(/^((?:<(?:b|i|u)>)*)\s*(?:\d+[.)]|[a-zA-Z][.)])\s+/, "$1");
  }

  // Detect if raw paragraph text starts with a manual numbering prefix (returns list type or null)
  function detectManualListPrefix(plainText) {
    if (!plainText) return null;
    const m = String(plainText).match(/^\s*(\d+[.)]|[a-z][.)]|[A-Z][.)])\s+/);
    if (!m) return null;
    const tok = m[1];
    if (/^\d+\.$/.test(tok)) return "1.";
    if (/^\d+\)$/.test(tok)) return "1)";
    if (/^[a-z]\.$/.test(tok)) return "a.";
    if (/^[a-z]\)$/.test(tok)) return "a)";
    if (/^[A-Z]\.$/.test(tok)) return "A.";
    if (/^[A-Z]\)$/.test(tok)) return "A)";
    return null;
  }

  // Parse inline HTML tags (<b>, <i>, <u>) into flat coalesced styled runs (ZERO leaked tags)
  function parseInlineSpans(str, defaultBold = false, defaultItalic = false, defaultUnderline = false) {
    if (!str) return [];
    let s = String(str);
    s = cleanMarkdownToHtml(s);

    const tagRegex = /<\/?(b|strong|i|em|u)\b[^>]*>/gi;
    const tokens = [];
    let boldDepth = 0;
    let italicDepth = 0;
    let underlineDepth = 0;
    let lastIndex = 0;
    let match;

    function emitText(rawChunk) {
      if (!rawChunk) return;
      const stripped = rawChunk.replace(/<\/?[a-zA-Z][^>]*>/g, "");
      const cleanText = decodeHtmlEntities(stripped);
      if (!cleanText) return;
      const isBold = defaultBold || boldDepth > 0;
      const isItalic = defaultItalic || italicDepth > 0;
      const isUnderline = defaultUnderline || underlineDepth > 0;
      const prev = tokens[tokens.length - 1];
      if (prev && prev.bold === isBold && prev.italic === isItalic && prev.underline === isUnderline) {
        prev.text += cleanText;
      } else {
        tokens.push({ text: cleanText, bold: isBold, italic: isItalic, underline: isUnderline });
      }
    }

    while ((match = tagRegex.exec(s)) !== null) {
      if (match.index > lastIndex) {
        emitText(s.slice(lastIndex, match.index));
      }
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      const isClosing = fullTag.charAt(1) === "/";
      if (tagName === "b" || tagName === "strong") {
        boldDepth = isClosing ? Math.max(0, boldDepth - 1) : boldDepth + 1;
      } else if (tagName === "i" || tagName === "em") {
        italicDepth = isClosing ? Math.max(0, italicDepth - 1) : italicDepth + 1;
      } else if (tagName === "u") {
        underlineDepth = isClosing ? Math.max(0, underlineDepth - 1) : underlineDepth + 1;
      }
      lastIndex = tagRegex.lastIndex;
    }

    if (lastIndex < s.length) {
      emitText(s.slice(lastIndex));
    }

    return tokens;
  }

  function runsToInlineHtml(runs) {
    return runs.map(run => {
      if (!run.text) return "";
      const safe = escapeHtmlText(run.text);
      if (!run.text.trim()) return safe;
      let out = safe;
      if (run.underline) out = `<u>${out}</u>`;
      if (run.italic) out = `<i>${out}</i>`;
      if (run.bold) out = `<b>${out}</b>`;
      return out;
    }).join("");
  }

  function normalizeInlineHtml(rawInline) {
    if (!rawInline) return "";
    const runs = parseInlineSpans(rawInline, false, false, false);
    return runsToInlineHtml(runs);
  }

  /**
   * Parse node.text.content (baik plain text lama dengan \n maupun blok <p data-align="..." data-list="...">)
   * menjadi daftar paragraf terstruktur lengkap dengan counter penomoran.
   */
  function parseParagraphs(rawContent, defaultAlign = "center") {
    const str = String(rawContent || "");
    const rawParas = [];

    if (/<p\b[^>]*>/i.test(str)) {
      // Ekstrak blok <p ...>...</p> serta teks di luar <p> (jika campuran)
      const blockRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
      let lastIdx = 0;
      let m;

      function pushPlainSegment(seg) {
        const cleaned = seg.replace(/^\n+|\n+$/g, "");
        if (!cleaned && rawParas.length > 0) return;
        const lines = seg.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          if (i === 0 && ln === "" && rawParas.length > 0) continue;
          if (i === lines.length - 1 && ln === "" && lastIdx < str.length) continue;
          rawParas.push({ html: normalizeInlineHtml(ln), align: null, list: null });
        }
      }

      while ((m = blockRegex.exec(str)) !== null) {
        if (m.index > lastIdx) {
          const between = str.slice(lastIdx, m.index);
          if (between.replace(/\n/g, "").length > 0) {
            pushPlainSegment(between);
          }
        }
        const attrs = m[1] || "";
        const inner = m[2] || "";
        const alignM = attrs.match(/data-align\s*=\s*"([^"]+)"/i);
        const listM = attrs.match(/data-list\s*=\s*"([^"]+)"/i);
        const align = alignM && VALID_ALIGNS.has(alignM[1].toLowerCase()) ? alignM[1].toLowerCase() : null;
        const list = listM && VALID_LISTS.has(listM[1]) ? listM[1] : null;

        // Jika di dalam <p> ada <br> atau \n, pisahkan jadi beberapa paragraf
        const subLines = inner.replace(/<br\s*\/?>/gi, "\n").split("\n");
        subLines.forEach((sub, sIdx) => {
          rawParas.push({
            html: normalizeInlineHtml(sub),
            align,
            list: sIdx === 0 ? list : list
          });
        });

        lastIdx = blockRegex.lastIndex;
      }

      if (lastIdx < str.length) {
        const tail = str.slice(lastIdx);
        if (tail.replace(/\n/g, "").length > 0) {
          pushPlainSegment(tail);
        }
      }
    } else {
      // Legacy plain / markdown / inline HTML text separated by \n
      // Balance any tags crossing newlines via DOM serializer when browser is available
      let normalized = str;
      if (/<\/?(?:b|strong|i|em|u|span|div)\b/i.test(str) && typeof document !== "undefined") {
        normalized = serializeEditorDOM(cleanMarkdownToHtml(str));
        if (/<p\b[^>]*>/i.test(normalized)) {
          return parseParagraphs(normalized, defaultAlign);
        }
      }
      const lines = normalized.split("\n");
      for (const ln of lines) {
        rawParas.push({
          html: normalizeInlineHtml(ln),
          align: null,
          list: null
        });
      }
    }

    if (rawParas.length === 0) {
      rawParas.push({ html: "", align: null, list: null });
    }

    // Hitung counter penomoran berurutan untuk setiap grup list yang bersambung
    let listCounter = 0;
    let prevListType = null;
    for (let i = 0; i < rawParas.length; i++) {
      const p = rawParas[i];
      if (p.list) {
        if (p.list === prevListType) {
          listCounter += 1;
        } else {
          listCounter = 1;
          prevListType = p.list;
        }
        p.listIndex = listCounter;
        p.marker = formatListMarker(p.list, listCounter);
      } else {
        listCounter = 0;
        prevListType = null;
        p.listIndex = 0;
        p.marker = null;
      }
      p.effectiveAlign = p.align || defaultAlign || "center";
    }

    return rawParas;
  }

  /**
   * Serialisasi daftar paragraf ke string node.text.content yang bersih & backwards-compatible.
   */
  function serializeParagraphs(paragraphs) {
    if (!paragraphs || paragraphs.length === 0) return "";
    const hasBlockMetadata = paragraphs.some(p => (p.align && VALID_ALIGNS.has(p.align)) || (p.list && VALID_LISTS.has(p.list)));

    if (!hasBlockMetadata) {
      return paragraphs.map(p => p.html || "").join("\n");
    }

    return paragraphs.map(p => {
      const attrs = [];
      if (p.align && VALID_ALIGNS.has(p.align)) {
        attrs.push(`data-align="${p.align}"`);
      }
      if (p.list && VALID_LISTS.has(p.list)) {
        attrs.push(`data-list="${escapeAttr(p.list)}"`);
      }
      const attrStr = attrs.length > 0 ? " " + attrs.join(" ") : "";
      return `<p${attrStr}>${p.html || ""}</p>`;
    }).join("\n");
  }

  function serializeEditorDOM(rootEl) {
    if (!rootEl) return "";
    let el = rootEl;
    if (typeof rootEl === "string") {
      el = document.createElement("div");
      el.innerHTML = rootEl;
    }

    const BLOCK_TAGS = new Set(["DIV", "P", "LI", "H1", "H2", "H3", "H4", "H5", "H6", "BLOCKQUOTE"]);

    function isBlockElement(node) {
      return node && node.nodeType === 1 && BLOCK_TAGS.has(node.tagName);
    }

    function isTrailingBogusBr(brNode) {
      let next = brNode.nextSibling;
      while (next) {
        if (isBlockElement(next)) return true;
        if (next.nodeType === 3 && next.nodeValue.length > 0) return false;
        if (next.nodeType === 1) {
          if (next.tagName === "BR") return false;
          if ((next.textContent && next.textContent.length > 0) || (next.querySelector && next.querySelector("br"))) {
            return false;
          }
        }
        next = next.nextSibling;
      }
      return true;
    }

    const paragraphs = [];
    let currentRuns = [];
    let currentAlign = null;
    let currentList = null;
    let hasOpenBlock = false;

    function pushRun(str, bold, italic, underline) {
      if (!str) return;
      const last = currentRuns[currentRuns.length - 1];
      if (last && last.bold === bold && last.italic === italic && last.underline === underline) {
        last.text += str;
      } else {
        currentRuns.push({ text: str, bold, italic, underline });
      }
    }

    function flushParagraph() {
      const lineHtml = runsToInlineHtml(currentRuns);
      paragraphs.push({
        html: lineHtml,
        align: currentAlign,
        list: currentList
      });
      currentRuns = [];
      currentAlign = null;
      currentList = null;
      hasOpenBlock = false;
    }

    function extractBlockMeta(blockEl, inheritedAlign, inheritedList) {
      let align = inheritedAlign;
      let list = inheritedList;
      if (blockEl.getAttribute) {
        const da = blockEl.getAttribute("data-align");
        if (da && VALID_ALIGNS.has(da.toLowerCase())) {
          align = da.toLowerCase();
        } else if (blockEl.style && blockEl.style.textAlign && VALID_ALIGNS.has(blockEl.style.textAlign.toLowerCase())) {
          align = blockEl.style.textAlign.toLowerCase();
        }
        const dl = blockEl.getAttribute("data-list");
        if (dl && VALID_LISTS.has(dl)) {
          list = dl;
        }
      }
      return { align, list };
    }

    function walk(node, isBold = false, isItalic = false, isUnderline = false, blockAlign = null, blockList = null) {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (isBlockElement(child)) {
          if (hasOpenBlock || currentRuns.length > 0) {
            flushParagraph();
          }
          const meta = extractBlockMeta(child, blockAlign, blockList);
          currentAlign = meta.align;
          currentList = meta.list;
          hasOpenBlock = true;
          const styleAttr = (child.getAttribute && child.getAttribute("style")) || "";
          const bBold = isBold || /font-weight:\s*(?:bold|[6789]00)/i.test(styleAttr);
          const bItalic = isItalic || /font-style:\s*italic/i.test(styleAttr);
          const bUnderline = isUnderline || /text-decoration[^;]*underline/i.test(styleAttr);
          walk(child, bBold, bItalic, bUnderline, meta.align, meta.list);
          flushParagraph();
        } else if (child.nodeType === 3) {
          if (!hasOpenBlock) {
            currentAlign = blockAlign;
            currentList = blockList;
            hasOpenBlock = true;
          }
          const val = child.nodeValue.replace(/\u00A0/g, " ");
          if (val.includes("\n")) {
            const parts = val.split("\n");
            for (let p = 0; p < parts.length; p++) {
              if (p > 0) {
                flushParagraph();
                currentAlign = blockAlign;
                currentList = blockList;
              }
              pushRun(parts[p], isBold, isItalic, isUnderline);
            }
            hasOpenBlock = true;
          } else {
            pushRun(val, isBold, isItalic, isUnderline);
          }
        } else if (child.nodeType === 1) {
          const tag = child.tagName;
          if (tag === "BR") {
            if (!hasOpenBlock) {
              currentAlign = blockAlign;
              currentList = blockList;
              hasOpenBlock = true;
            }
            if (!isTrailingBogusBr(child)) {
              flushParagraph();
            }
          } else {
            if (!hasOpenBlock) {
              currentAlign = blockAlign;
              currentList = blockList;
              hasOpenBlock = true;
            }
            const styleAttr = (child.getAttribute && child.getAttribute("style")) || "";
            const nextBold = isBold || tag === "B" || tag === "STRONG" || /font-weight:\s*(?:bold|[6789]00)/i.test(styleAttr);
            const nextItalic = isItalic || tag === "I" || tag === "EM" || /font-style:\s*italic/i.test(styleAttr);
            const nextUnderline = isUnderline || tag === "U" || tag === "INS" || /text-decoration[^;]*underline/i.test(styleAttr);
            walk(child, nextBold, nextItalic, nextUnderline, blockAlign, blockList);
          }
        }
      }
    }

    walk(el, false, false, false, null, null);
    if (hasOpenBlock || currentRuns.length > 0) {
      flushParagraph();
    }

    return serializeParagraphs(paragraphs);
  }

  const serializeEditorHtml = serializeEditorDOM;

  function computeRequiredNodeHeight(node, totalTextHeight) {
    const padY = (node.text && node.text.paddingY !== undefined) ? node.text.paddingY : 10;
    const baseContentH = totalTextHeight + (padY * 2);

    if (node.type === "cylinder") {
      const uncappedH = baseContentH / (1 - 0.22 * 1.5);
      const cappedH = baseContentH + (18 * 1.5);
      return Math.round(Math.min(uncappedH, cappedH));
    }

    return Math.round(baseContentH);
  }

  function measureSpanWidth(str, bold, italic, fontSize, fontFamily) {
    const ctx = getMeasureContext();
    if (!ctx) return str.length * fontSize * 0.6;
    const fontStyle = italic ? "italic " : "";
    const fontWeight = bold ? "700 " : "500 ";
    ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
    return ctx.measureText(str).width;
  }

  function computeListIndentForMarker(marker, defaultBold, fontSize, fontFamily) {
    const markerW = measureSpanWidth(marker || "1.", defaultBold, false, fontSize, fontFamily);
    return Math.max(Math.ceil(fontSize * 1.6), Math.ceil(markerW + fontSize * 0.55));
  }

  /**
   * Menghitung indentasi seragam untuk setiap blok list bersambung (seperti tab-stop Word)
   */
  function computeParagraphIndents(paragraphs, defaultBold, fontSize, fontFamily) {
    const indents = new Array(paragraphs.length).fill(0);
    let i = 0;
    while (i < paragraphs.length) {
      if (!paragraphs[i].list) {
        i++;
        continue;
      }
      const listType = paragraphs[i].list;
      let j = i;
      let maxIndent = 0;
      while (j < paragraphs.length && paragraphs[j].list === listType) {
        const ind = computeListIndentForMarker(paragraphs[j].marker, defaultBold, fontSize, fontFamily);
        if (ind > maxIndent) maxIndent = ind;
        j++;
      }
      for (let k = i; k < j; k++) {
        indents[k] = maxIndent;
      }
      i = j;
    }
    return indents;
  }

  function getShapeSafeReduction(node) {
    const { width } = node;
    if (node.type === "parallelogram") return Math.min(width * 0.2, 28) * 2;
    if (node.type === "diamond") return Math.min(width * 0.22, 28);
    if (node.type === "triangle") return Math.min(width * 0.25, 30);
    if (node.type === "circle") return Math.min(width * 0.16, 20);
    if (node.type === "preparation") return Math.min(width * 0.18, 26) * 1.5;
    if (node.type === "predefined_process") return Math.min(width * 0.12, 18) * 2;
    if (node.type === "manual_operation") return Math.min(width * 0.18, 26);
    if (node.type === "display") return Math.min(width * 0.14, 18);
    if (node.type === "magnetic_tape") return Math.min(width * 0.2, 24);
    return 0;
  }

  /**
   * Memecah deretan inline spans menjadi daftar kata (word objects).
   * Setiap kata bisa terdiri dari 1+ part berbeda gaya (misal `(<i>Mashimurelay</i>)`),
   * sehingga spasi tidak pernah disisipkan di tengah kata saat justified!
   */
  function tokenizeSpansIntoWords(spans, maxLineWidth, fontSize, fontFamily) {
    const rawWords = [];
    let currentWordParts = [];

    function flushWord() {
      if (currentWordParts.length === 0) return;
      // Hitung total lebar kata
      let totalW = 0;
      for (const part of currentWordParts) {
        totalW += measureSpanWidth(part.text, part.bold, part.italic, fontSize, fontFamily);
      }
      if (totalW <= maxLineWidth || currentWordParts.every(p => p.text.length <= 1)) {
        rawWords.push({ parts: currentWordParts, width: totalW });
      } else {
        // Pecah kata yang lebih lebar dari kotak per karakter
        let chunkParts = [];
        let chunkW = 0;
        for (const part of currentWordParts) {
          for (let ci = 0; ci < part.text.length; ci++) {
            const ch = part.text[ci];
            const chW = measureSpanWidth(ch, part.bold, part.italic, fontSize, fontFamily);
            if (chunkW + chW <= maxLineWidth || chunkParts.length === 0) {
              const lastP = chunkParts[chunkParts.length - 1];
              if (lastP && lastP.bold === part.bold && lastP.italic === part.italic && lastP.underline === part.underline) {
                lastP.text += ch;
              } else {
                chunkParts.push({ text: ch, bold: part.bold, italic: part.italic, underline: part.underline });
              }
              chunkW += chW;
            } else {
              rawWords.push({ parts: chunkParts, width: chunkW });
              chunkParts = [{ text: ch, bold: part.bold, italic: part.italic, underline: part.underline }];
              chunkW = chW;
            }
          }
        }
        if (chunkParts.length > 0) {
          rawWords.push({ parts: chunkParts, width: chunkW });
        }
      }
      currentWordParts = [];
    }

    for (const span of spans) {
      const pieces = span.text.split(/(\s+)/);
      for (const piece of pieces) {
        if (!piece) continue;
        if (/^\s+$/.test(piece)) {
          flushWord();
        } else {
          const lastP = currentWordParts[currentWordParts.length - 1];
          if (lastP && lastP.bold === span.bold && lastP.italic === span.italic && lastP.underline === span.underline) {
            lastP.text += piece;
          } else {
            currentWordParts.push({
              text: piece,
              bold: span.bold,
              italic: span.italic,
              underline: span.underline
            });
          }
        }
      }
    }
    flushWord();
    return rawWords;
  }

  function layoutNodeText(node) {
    if (!node.text) {
      return { lines: [], xPos: 0, startY: 0, lineHeight: 14, anchor: "middle", totalTextHeight: 0, maxWidth: 0, boxLeftX: 0, boxRightX: 0 };
    }

    const { width, height, text } = node;
    const paddingX = text.paddingX !== undefined ? text.paddingX : 14;
    const paddingY = text.paddingY !== undefined ? text.paddingY : 10;
    const fontSize = text.fontSize || 14;
    const fontFamily = text.fontFamily || "Poppins, sans-serif";
    const defaultBold = !!text.bold;
    const defaultItalic = !!text.italic;
    const defaultUnderline = !!text.underline;
    const defaultAlign = text.align || "center";

    const shapeSafeReduction = getShapeSafeReduction(node);
    const boxLeftX = paddingX + (shapeSafeReduction / 2);
    const boxRightX = width - paddingX - (shapeSafeReduction / 2);
    const maxWidth = Math.max(8, boxRightX - boxLeftX);
    const lineHeight = fontSize * 1.35;
    const normalSpaceW = measureSpanWidth(" ", defaultBold, defaultItalic, fontSize, fontFamily);

    const paragraphs = parseParagraphs(text.content || "", defaultAlign);
    const indents = computeParagraphIndents(paragraphs, defaultBold, fontSize, fontFamily);
    const lines = [];

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const paraAlign = para.effectiveAlign || defaultAlign;
      const indentX = indents[pIdx] || 0;
      const lineStartX = boxLeftX + indentX;
      const paraMaxWidth = Math.max(12, boxRightX - lineStartX);

      const spans = parseInlineSpans(para.html, defaultBold, defaultItalic, defaultUnderline);
      const words = tokenizeSpansIntoWords(spans, paraMaxWidth, fontSize, fontFamily);

      if (words.length === 0) {
        lines.push({
          words: [],
          lineWidth: 0,
          wordsWidthSum: 0,
          wordCount: 0,
          align: paraAlign,
          justify: false,
          listMarker: para.marker || null,
          listMarkerX: boxLeftX,
          lineStartX,
          lineRightX: boxRightX,
          availWidth: paraMaxWidth,
          normalSpaceW
        });
        continue;
      }

      const paraLines = [];
      let curWords = [];
      let curLineW = 0;
      let curWordsW = 0;

      for (let wi = 0; wi < words.length; wi++) {
        const w = words[wi];
        const needSpace = curWords.length > 0;
        const spaceW = needSpace ? normalSpaceW : 0;
        if (curLineW + spaceW + w.width <= paraMaxWidth || curWords.length === 0) {
          curWords.push(w);
          curLineW += spaceW + w.width;
          curWordsW += w.width;
        } else {
          paraLines.push({ words: curWords, lineWidth: curLineW, wordsWidthSum: curWordsW });
          curWords = [w];
          curLineW = w.width;
          curWordsW = w.width;
        }
      }
      if (curWords.length > 0) {
        paraLines.push({ words: curWords, lineWidth: curLineW, wordsWidthSum: curWordsW });
      }

      for (let li = 0; li < paraLines.length; li++) {
        const pl = paraLines[li];
        const isLastInPara = (li === paraLines.length - 1);
        // Word-exact justify rule: ONLY wrapped lines with >= 2 words are justified;
        // last line of paragraph & single-line headings are NEVER stretched!
        const shouldJustify = (paraAlign === "justify" && !isLastInPara && pl.words.length > 1);

        lines.push({
          words: pl.words,
          lineWidth: pl.lineWidth,
          wordsWidthSum: pl.wordsWidthSum,
          wordCount: pl.words.length,
          align: paraAlign,
          justify: shouldJustify,
          listMarker: (li === 0 && para.marker) ? para.marker : null,
          listMarkerX: boxLeftX,
          lineStartX,
          lineRightX: boxRightX,
          availWidth: paraMaxWidth,
          normalSpaceW
        });
      }
    }

    let anchor = "middle";
    let xPos = width / 2;
    if (defaultAlign === "left" || defaultAlign === "justify") {
      anchor = "start";
      xPos = boxLeftX;
    } else if (defaultAlign === "right") {
      anchor = "end";
      xPos = boxRightX;
    }

    const verticalAlign = (node.text && node.text.verticalAlign) || "middle";
    const totalTextHeight = lines.length * lineHeight;
    let availableHeight = height - paddingY * 2;
    let startY = 0;

    if (node.type === "cylinder") {
      const ry = Math.min(height * 0.22, 18);
      availableHeight = height - ry * 1.5 - paddingY * 2;
      if (verticalAlign === "top") {
        startY = ry + paddingY + fontSize * 0.85;
      } else if (verticalAlign === "bottom") {
        startY = height - paddingY - totalTextHeight + fontSize * 0.85;
      } else {
        startY = ry + paddingY + (availableHeight - totalTextHeight) / 2 + fontSize * 0.85;
      }
    } else {
      if (verticalAlign === "top") {
        startY = paddingY + fontSize * 0.85;
      } else if (verticalAlign === "bottom") {
        startY = height - paddingY - totalTextHeight + fontSize * 0.85;
      } else {
        startY = (height - totalTextHeight) / 2 + fontSize * 0.85;
      }
    }

    if (verticalAlign === "top" && startY < paddingY + fontSize * 0.8) {
      startY = paddingY + fontSize * 0.8;
    }

    if (node.isContainer) {
      startY = paddingY + fontSize * 0.85;
    }

    return { lines, xPos, startY, lineHeight, anchor, totalTextHeight, maxWidth, boxLeftX, boxRightX };
  }

  // ============================================================================
  // WORD-LIKE PER-PARAGRAPH & NUMBERING HELPERS FOR LIVE EDITOR
  // ============================================================================

  function createParagraphDiv(html, align, list) {
    const div = document.createElement("div");
    div.className = "mf-p";
    if (align && VALID_ALIGNS.has(align)) {
      div.setAttribute("data-align", align);
    }
    if (list && VALID_LISTS.has(list)) {
      div.setAttribute("data-list", list);
    }
    div.innerHTML = (html && html.length > 0) ? html : "<br>";
    return div;
  }

  /**
   * Pastikan setiap anak langsung editor adalah .mf-p (menjaga konsistensi Word-like block editing)
   */
  function ensureEditorParagraphStructure(editor) {
    if (!editor) return;
    if (editor.childNodes.length === 0) {
      editor.appendChild(createParagraphDiv("", null, null));
      return;
    }

    // Wrap stray top-level text nodes or inline elements into .mf-p
    const children = Array.from(editor.childNodes);
    for (const child of children) {
      if (child.nodeType === 1 && child.classList && child.classList.contains("mf-p")) {
        if (child.innerHTML === "") child.innerHTML = "<br>";
        continue;
      }
      if (child.nodeType === 1 && (child.tagName === "DIV" || child.tagName === "P")) {
        child.classList.add("mf-p");
        if (child.innerHTML === "") child.innerHTML = "<br>";
        continue;
      }
      if (child.nodeType === 3 || child.nodeType === 1) {
        const wrapper = document.createElement("div");
        wrapper.className = "mf-p";
        editor.insertBefore(wrapper, child);
        wrapper.appendChild(child);
      }
    }
  }

  /**
   * Hitung ulang nomor & padding-left (hanging indent) untuk semua .mf-p di dalam editor aktif
   */
  function refreshEditorListMarkers(editor, node) {
    if (!editor) return;
    ensureEditorParagraphStructure(editor);
    const fontSize = (node && node.text && node.text.fontSize) || 14;
    const fontFamily = (node && node.text && node.text.fontFamily) || "Poppins, sans-serif";
    const defaultBold = !!(node && node.text && node.text.bold);

    const pEls = Array.from(editor.querySelectorAll(":scope > .mf-p"));
    // Assign numbers
    let listCounter = 0;
    let prevList = null;
    const metas = pEls.map(el => {
      const listType = el.getAttribute("data-list");
      if (listType && VALID_LISTS.has(listType)) {
        if (listType === prevList) {
          listCounter += 1;
        } else {
          listCounter = 1;
          prevList = listType;
        }
        const marker = formatListMarker(listType, listCounter);
        return { el, listType, marker };
      } else {
        listCounter = 0;
        prevList = null;
        return { el, listType: null, marker: null };
      }
    });

    // Compute uniform indent per contiguous group
    let i = 0;
    while (i < metas.length) {
      if (!metas[i].listType) {
        metas[i].el.removeAttribute("data-marker");
        metas[i].el.style.paddingLeft = "";
        i++;
        continue;
      }
      const lt = metas[i].listType;
      let j = i;
      let maxIndent = 0;
      while (j < metas.length && metas[j].listType === lt) {
        const ind = computeListIndentForMarker(metas[j].marker, defaultBold, fontSize, fontFamily);
        if (ind > maxIndent) maxIndent = ind;
        j++;
      }
      for (let k = i; k < j; k++) {
        metas[k].el.setAttribute("data-marker", metas[k].marker);
        metas[k].el.style.paddingLeft = `${maxIndent}px`;
      }
      i = j;
    }
  }

  function findClosestParagraph(editor, domNode) {
    let cur = domNode;
    while (cur && cur !== editor) {
      if (cur.nodeType === 1 && cur.parentNode === editor && cur.classList && cur.classList.contains("mf-p")) {
        return cur;
      }
      cur = cur.parentNode;
    }
    return null;
  }

  /**
   * Mengembalikan semua blok paragraf (.mf-p) yang disentuh kursor atau seleksi saat ini
   */
  function getSelectedParagraphElements(editor) {
    if (!editor) return [];
    ensureEditorParagraphStructure(editor);
    const allP = Array.from(editor.querySelectorAll(":scope > .mf-p"));
    if (allP.length === 0) return [];

    const sel = window.getSelection ? window.getSelection() : null;
    if (!sel || sel.rangeCount === 0) return [allP[0]];

    const range = sel.getRangeAt(0);
    if (!editor.contains(range.commonAncestorContainer) && range.commonAncestorContainer !== editor) {
      return [allP[0]];
    }

    const startP = findClosestParagraph(editor, range.startContainer);
    const endP = findClosestParagraph(editor, range.endContainer);

    if (startP && endP) {
      const i1 = allP.indexOf(startP);
      const i2 = allP.indexOf(endP);
      if (i1 !== -1 && i2 !== -1) {
        const lo = Math.min(i1, i2);
        const hi = Math.max(i1, i2);
        return allP.slice(lo, hi + 1);
      }
    }

    // Fallback: cek interseksi range dengan setiap .mf-p
    const hit = allP.filter(p => {
      try {
        return range.intersectsNode(p);
      } catch (e) {
        return false;
      }
    });
    return hit.length > 0 ? hit : [startP || endP || allP[0]];
  }

  function isCaretAtStartOfElement(el, range) {
    if (!range || !range.collapsed) return false;
    try {
      const testRange = document.createRange();
      testRange.selectNodeContents(el);
      testRange.setEnd(range.startContainer, range.startOffset);
      return testRange.toString().length === 0;
    } catch (e) {
      return false;
    }
  }

  function getTextBeforeCaretInElement(el, range) {
    if (!range || !range.collapsed) return "";
    try {
      const testRange = document.createRange();
      testRange.selectNodeContents(el);
      testRange.setEnd(range.startContainer, range.startOffset);
      return testRange.toString();
    } catch (e) {
      return "";
    }
  }

  function setCaretAtStart(el) {
    if (!el || !window.getSelection || !document.createRange) return;
    const range = document.createRange();
    if (el.firstChild && el.firstChild.nodeType === 3) {
      range.setStart(el.firstChild, 0);
    } else {
      range.setStart(el, 0);
    }
    range.collapse(true);
    const sel = window.getSelection();
    sel.removeAllRanges();
    sel.addRange(range);
  }

  function applyAlignmentToEditor(editor, node, align) {
    if (!editor || !VALID_ALIGNS.has(align)) return false;
    const targets = getSelectedParagraphElements(editor);
    if (targets.length === 0) return false;

    targets.forEach(pEl => {
      pEl.setAttribute("data-align", align);
    });

    // Jika hanya ada 1 paragraf atau semua paragraf dipilih, sinkronkan juga node.text.align
    const allP = Array.from(editor.querySelectorAll(":scope > .mf-p"));
    if (node && node.text && targets.length === allP.length) {
      node.text.align = align;
      editor.style.textAlign = align;
    }

    editor.dispatchEvent(new Event("input"));
    editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    return true;
  }

  function applyNumberingToEditor(editor, node, listType) {
    if (!editor) return false;
    const targets = getSelectedParagraphElements(editor);
    if (targets.length === 0) return false;

    const turningOff = !listType || listType === "none" || targets.every(el => el.getAttribute("data-list") === listType);

    targets.forEach(pEl => {
      if (turningOff) {
        pEl.removeAttribute("data-list");
        pEl.removeAttribute("data-marker");
        pEl.style.paddingLeft = "";
      } else if (VALID_LISTS.has(listType)) {
        pEl.setAttribute("data-list", listType);
        // Jika baris sebelumnya punya prefix manual (mis. "1. "), bersihkan agar tidak dobel
        const cleaned = stripManualListPrefix(pEl.innerHTML);
        if (cleaned !== pEl.innerHTML) {
          pEl.innerHTML = cleaned || "<br>";
        }
        // Nomor seperti Word: default rata kiri jika sebelumnya rata tengah/kanan
        const curAlign = pEl.getAttribute("data-align") || (node && node.text && node.text.align) || "center";
        if (curAlign === "center" || curAlign === "right") {
          pEl.setAttribute("data-align", "left");
        }
      }
    });

    refreshEditorListMarkers(editor, node);
    editor.dispatchEvent(new Event("input"));
    editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    return true;
  }

  function applyNumberingToNode(node, listType) {
    if (!node || !node.text) return;
    const defaultAlign = node.text.align || "center";
    const paras = parseParagraphs(node.text.content || "", defaultAlign);
    const nonEmpty = paras.filter(p => getPlainText(p.html).length > 0);
    const checkSet = nonEmpty.length > 0 ? nonEmpty : paras;
    const turningOff = !listType || listType === "none" || checkSet.every(p => p.list === listType);

    paras.forEach(p => {
      if (turningOff) {
        p.list = null;
      } else if (VALID_LISTS.has(listType)) {
        p.list = listType;
        p.html = stripManualListPrefix(p.html);
        const effAlign = p.align || defaultAlign;
        if (effAlign === "center" || effAlign === "right") {
          p.align = "left";
        }
      }
    });

    node.text.content = serializeParagraphs(paras);
  }

  function getActiveEditorState(editor, node) {
    const defaultAlign = (node && node.text && node.text.align) || "center";
    if (!editor) {
      const paras = node && node.text ? parseParagraphs(node.text.content || "", defaultAlign) : [];
      const firstList = paras.length > 0 && paras.every(p => p.list && p.list === paras[0].list) ? paras[0].list : null;
      return {
        align: defaultAlign,
        list: firstList,
        bold: !!(node && node.text && node.text.bold),
        italic: !!(node && node.text && node.text.italic),
        underline: !!(node && node.text && node.text.underline)
      };
    }

    const targets = getSelectedParagraphElements(editor);
    const firstP = targets[0];
    const align = (firstP && firstP.getAttribute("data-align")) || defaultAlign;
    const list = (firstP && firstP.getAttribute("data-list")) || null;

    let bold = !!(node && node.text && node.text.bold);
    let italic = !!(node && node.text && node.text.italic);
    let underline = !!(node && node.text && node.text.underline);
    try {
      if (document.queryCommandState) {
        bold = bold || document.queryCommandState("bold");
        italic = italic || document.queryCommandState("italic");
        underline = underline || document.queryCommandState("underline");
      }
    } catch (e) {}

    return { align, list, bold, italic, underline };
  }

  let activeEditingNodeId = null;
  let activeEditingFinishFn = null;
  let activeEditingNodeRef = null;

  function closeInlineEditor() {
    if (activeEditingFinishFn) {
      activeEditingFinishFn();
    }
  }

  function getDefaultShapeHeight(type) {
    if (type === "circle" || type === "diamond" || type === "offpage") return 110;
    if (type === "triangle") return 96;
    if (type === "cylinder" || type === "magnetic_tape") return 100;
    if (type === "document") return 85;
    if (type === "image") return 130;
    return 60;
  }

  function openInlineEditor(nodeId, doc, uiState, dom, onSave, onLiveRender) {
    const node = doc.nodes[nodeId];
    if (!node || node.type === "image") return;

    if (node.baseHeight === undefined) {
      node.baseHeight = Math.max(getDefaultShapeHeight(node.type), Math.min(node.height, 80));
    }

    if (activeEditingNodeId && activeEditingFinishFn) {
      activeEditingFinishFn();
    }

    const nodeGroupEl = document.querySelector(`.node-group[data-id="${nodeId}"]`);
    if (!nodeGroupEl) return;

    activeEditingNodeId = nodeId;
    activeEditingNodeRef = node;
    uiState.mode = "EDITING_TEXT";
    const openTime = Date.now();

    const curSvgText = document.getElementById(`node-text-${nodeId}`);
    if (curSvgText) {
      curSvgText.style.display = "none";
    }

    const oldForeign = nodeGroupEl.querySelector(".node-inline-foreign");
    if (oldForeign) oldForeign.remove();

    const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute("class", "node-inline-foreign");
    fo.setAttribute("x", "0");
    fo.setAttribute("y", "0");
    fo.setAttribute("width", String(node.width));
    fo.setAttribute("height", String(node.height));

    const editor = document.createElement("div");
    editor.className = "node-seamless-editor";
    editor.contentEditable = "true";
    editor.setAttribute("spellcheck", "false");
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-multiline", "true");
    editor.dataset.nodeId = nodeId;

    const isDark = doc.theme === "dark";
    const FlowEngine = window.MinimalFlow && window.MinimalFlow.FlowEngine;
    const isBgDark = (FlowEngine && FlowEngine.isDarkColor) ? FlowEngine.isDarkColor(node.style.fill) : isDark;
    const textColor = node.text.color || (isBgDark ? "#ffffff" : "#18181b");

    editor.style.fontFamily = node.text.fontFamily || "Poppins, sans-serif";
    editor.style.fontSize = `${node.text.fontSize || 14}px`;
    editor.style.fontWeight = node.text.bold ? "700" : "500";
    editor.style.fontStyle = node.text.italic ? "italic" : "normal";
    editor.style.textDecoration = node.text.underline ? "underline" : "none";
    editor.style.textAlign = node.text.align || "center";
    editor.style.color = textColor;
    editor.style.caretColor = textColor;
    editor.style.lineHeight = `${(node.text.fontSize || 14) * 1.35}px`;

    const plainRaw = getPlainText(node.text.content || "");
    const isPh = !plainRaw || plainRaw.toLowerCase() === "insert text" || !!node.text.isPlaceholder;

    editor.innerHTML = "";
    if (isPh) {
      editor.appendChild(createParagraphDiv("", null, null));
    } else {
      const paras = parseParagraphs(node.text.content || "", node.text.align || "center");
      paras.forEach(p => {
        editor.appendChild(createParagraphDiv(p.html, p.align, p.list));
      });
    }
    editor.setAttribute("data-placeholder", "Ketik teks di sini...");
    refreshEditorListMarkers(editor, node);

    function adjustPadding() {
      const layout = layoutNodeText(node);
      const totalH = layout.totalTextHeight || (node.text.fontSize || 14) * 1.35;
      const vAlign = (node.text && node.text.verticalAlign) || "middle";
      const padY = node.text.paddingY !== undefined ? node.text.paddingY : 10;
      let padTop = Math.max(0, (node.height - totalH) / 2);
      if (vAlign === "top") {
        padTop = padY;
      } else if (vAlign === "bottom") {
        padTop = Math.max(0, node.height - totalH - padY);
      }
      if (node.type === "cylinder") {
        const ry = Math.min(node.height * 0.22, 18);
        if (vAlign === "top") {
          padTop = ry + padY;
        } else if (vAlign === "bottom") {
          padTop = Math.max(ry, node.height - totalH - padY);
        } else {
          padTop = Math.max(ry, ry + (node.height - ry * 1.5 - totalH) / 2);
        }
      }
      const basePadX = node.text.paddingX !== undefined ? node.text.paddingX : 14;
      const safePadX = basePadX + (getShapeSafeReduction(node) / 2);
      editor.style.paddingTop = `${Math.round(padTop)}px`;
      editor.style.paddingLeft = `${Math.round(safePadX)}px`;
      editor.style.paddingRight = `${Math.round(safePadX)}px`;
      editor.style.paddingBottom = "0px";
    }

    adjustPadding();
    fo.appendChild(editor);
    nodeGroupEl.appendChild(fo);

    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    const stopPropagation = (e) => e.stopPropagation();
    editor.addEventListener("mousedown", stopPropagation);
    editor.addEventListener("mousemove", stopPropagation);
    editor.addEventListener("mouseup", (e) => {
      e.stopPropagation();
      editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    });
    editor.addEventListener("keyup", () => {
      editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    });
    editor.addEventListener("click", stopPropagation);
    editor.addEventListener("dblclick", stopPropagation);
    editor.addEventListener("wheel", stopPropagation);

    const initialTextSnapshot = node.text?.content ?? "";

    function onLiveInput() {
      refreshEditorListMarkers(editor, node);
      const val = serializeEditorDOM(editor);
      node.text.content = val;
      node.text.isPlaceholder = !getPlainText(val);
      adjustPadding();

      const layout = layoutNodeText(node);
      const baseH = node.baseHeight || getDefaultShapeHeight(node.type);
      const targetHeight = Math.max(baseH, computeRequiredNodeHeight(node, layout.totalTextHeight));

      if (targetHeight !== node.height) {
        node.height = targetHeight;
        fo.setAttribute("height", String(node.height));
        const shapePath = nodeGroupEl.querySelector(".node-shape");
        if (shapePath && FlowEngine) {
          shapePath.setAttribute("d", FlowEngine.getShapePath(node.type, node.width, node.height));
        }
        adjustPadding();
        if (typeof onLiveRender === "function") onLiveRender();
      }
      editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    }

    editor.addEventListener("input", onLiveInput);

    // Handle paste: bersihkan gaya luar, pecah per baris menjadi .mf-p, dan deteksi list bila ada
    editor.addEventListener("paste", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const plain = (e.clipboardData || window.clipboardData).getData("text/plain") || "";
      const pasteLines = plain.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");
      if (pasteLines.length <= 1) {
        document.execCommand("insertText", false, pasteLines[0] || "");
      } else {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          let curP = findClosestParagraph(editor, range.startContainer);
          if (!curP) {
            ensureEditorParagraphStructure(editor);
            curP = editor.querySelector(":scope > .mf-p");
          }
          // Sisipkan baris pertama pada kursor
          const firstText = document.createTextNode(pasteLines[0]);
          range.insertNode(firstText);
          range.setStartAfter(firstText);
          range.collapse(true);

          // Sisipkan baris selanjutnya sebagai .mf-p baru
          let refNode = curP;
          for (let i = 1; i < pasteLines.length; i++) {
            const lineTxt = pasteLines[i];
            const detectedList = detectManualListPrefix(lineTxt);
            const cleanLine = detectedList ? stripManualListPrefix(escapeHtmlText(lineTxt)) : escapeHtmlText(lineTxt);
            const newP = createParagraphDiv(
              cleanLine,
              detectedList ? "left" : (curP.getAttribute("data-align") || null),
              detectedList || null
            );
            refNode.parentNode.insertBefore(newP, refNode.nextSibling);
            refNode = newP;
          }
          // Taruh kursor di akhir paragraf terakhir hasil paste
          const endRange = document.createRange();
          endRange.selectNodeContents(refNode);
          endRange.collapse(false);
          sel.removeAllRanges();
          sel.addRange(endRange);
        }
      }
      onLiveInput();
    });

    let isFinished = false;
    function finishEditing() {
      if (isFinished) return;
      if (Date.now() - openTime < 200) return;
      isFinished = true;

      uiState.mode = "IDLE";
      activeEditingNodeId = null;
      activeEditingFinishFn = null;
      activeEditingNodeRef = null;

      const previousContent = node.text?.content ?? "";
      refreshEditorListMarkers(editor, node);
      const serialized = serializeEditorDOM(editor);
      const plain = getPlainText(serialized);
      const isPlaceholder = plain.toLowerCase() === "insert text";

      if (isPlaceholder || !plain) {
        node.text.content = "";
        node.text.isPlaceholder = false;
      } else {
        node.text.content = serialized;
        node.text.isPlaceholder = false;
      }

      if (node.text.content !== previousContent && node.text.content !== initialTextSnapshot) {
        const layout = layoutNodeText(node);
        const baseH = node.baseHeight || getDefaultShapeHeight(node.type);
        node.height = Math.max(baseH, computeRequiredNodeHeight(node, layout.totalTextHeight));
      }

      fo.remove();
      if (curSvgText) {
        curSvgText.style.display = "";
      }

      if (typeof onSave === "function") onSave();
    }

    activeEditingFinishFn = finishEditing;
    editor.addEventListener("blur", finishEditing);

    editor.addEventListener("keydown", (e) => {
      e.stopPropagation();

      const mod = e.ctrlKey || e.metaKey;

      // Ctrl + B: Bold
      if (mod && !e.shiftKey && !e.altKey && (e.key === "b" || e.key === "B" || e.code === "KeyB")) {
        e.preventDefault();
        document.execCommand("bold", false, null);
        onLiveInput();
        return;
      }

      // Ctrl + I: Italic
      if (mod && !e.shiftKey && !e.altKey && (e.key === "i" || e.key === "I" || e.code === "KeyI")) {
        e.preventDefault();
        document.execCommand("italic", false, null);
        onLiveInput();
        return;
      }

      // Ctrl + U: Underline
      if (mod && !e.shiftKey && !e.altKey && (e.key === "u" || e.key === "U" || e.code === "KeyU")) {
        e.preventDefault();
        document.execCommand("underline", false, null);
        onLiveInput();
        return;
      }

      // Ctrl + L / E / R / J: Per-paragraph Alignment ala Microsoft Word
      if (mod && !e.shiftKey && !e.altKey) {
        const keyLower = (e.key || "").toLowerCase();
        if (keyLower === "l" || e.code === "KeyL") {
          e.preventDefault();
          applyAlignmentToEditor(editor, node, "left");
          return;
        }
        if (keyLower === "e" || e.code === "KeyE") {
          e.preventDefault();
          applyAlignmentToEditor(editor, node, "center");
          return;
        }
        if (keyLower === "r" || e.code === "KeyR") {
          e.preventDefault();
          applyAlignmentToEditor(editor, node, "right");
          return;
        }
        if (keyLower === "j" || e.code === "KeyJ") {
          e.preventDefault();
          const st = getActiveEditorState(editor, node);
          applyAlignmentToEditor(editor, node, st.align === "justify" ? "left" : "justify");
          return;
        }
      }

      // Ctrl + Enter: Simpan & keluar
      if (mod && e.key === "Enter") {
        e.preventDefault();
        finishEditing();
        return;
      }

      // Escape: Selesai
      if (e.key === "Escape") {
        e.preventDefault();
        finishEditing();
        return;
      }

      // Space: Auto-numbering ala Word jika mengetik "1.", "1)", "a.", "a)", "A.", "A)" di awal baris
      if (e.key === " " && !mod && !e.altKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
          const range = sel.getRangeAt(0);
          const curP = findClosestParagraph(editor, range.startContainer);
          if (curP && !curP.getAttribute("data-list")) {
            const before = getTextBeforeCaretInElement(curP, range);
            const autoMap = {
              "1.": "1.",
              "1)": "1)",
              "a.": "a.",
              "a)": "a)",
              "A.": "A.",
              "A)": "A)"
            };
            const matchedList = autoMap[before];
            if (matchedList) {
              e.preventDefault();
              // Hapus token pemicu sebelum kursor
              const delRange = document.createRange();
              delRange.selectNodeContents(curP);
              delRange.setEnd(range.startContainer, range.startOffset);
              delRange.deleteContents();
              if (!curP.textContent.trim() && !curP.querySelector("br")) {
                curP.innerHTML = "<br>";
              }
              curP.setAttribute("data-list", matchedList);
              const curAlign = curP.getAttribute("data-align") || node.text.align || "center";
              if (curAlign === "center" || curAlign === "right") {
                curP.setAttribute("data-align", "left");
              }
              refreshEditorListMarkers(editor, node);
              setCaretAtStart(curP);
              onLiveInput();
              return;
            }
          }
        }
      }

      // Backspace di awal baris bernomor -> matikan penomoran dulu (seperti Word!)
      if (e.key === "Backspace" && !mod && !e.altKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
          const range = sel.getRangeAt(0);
          const curP = findClosestParagraph(editor, range.startContainer);
          if (curP && curP.getAttribute("data-list") && isCaretAtStartOfElement(curP, range)) {
            e.preventDefault();
            curP.removeAttribute("data-list");
            curP.removeAttribute("data-marker");
            curP.style.paddingLeft = "";
            refreshEditorListMarkers(editor, node);
            onLiveInput();
            return;
          }
        }
      }

      // Enter: buat paragraf .mf-p baru (melanjutkan penomoran / keluar dari penomoran jika kosong)
      if (e.key === "Enter" && !e.shiftKey) {
        e.preventDefault();
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0) {
          const range = sel.getRangeAt(0);
          range.deleteContents();
          let curP = findClosestParagraph(editor, range.startContainer);
          if (!curP) {
            ensureEditorParagraphStructure(editor);
            curP = editor.querySelector(":scope > .mf-p");
          }
          const curList = curP.getAttribute("data-list");
          const curAlign = curP.getAttribute("data-align");
          const curPlain = (curP.textContent || "").replace(/\u00A0/g, " ").trim();

          // Jika Enter ditekan pada baris bernomor yang kosong -> akhiri penomoran (Word behavior!)
          if (curList && curPlain.length === 0) {
            curP.removeAttribute("data-list");
            curP.removeAttribute("data-marker");
            curP.style.paddingLeft = "";
            refreshEditorListMarkers(editor, node);
            setCaretAtStart(curP);
            onLiveInput();
            return;
          }

          // Pisahkan konten setelah kursor ke paragraf .mf-p baru
          const afterRange = document.createRange();
          afterRange.selectNodeContents(curP);
          afterRange.setStart(range.endContainer, range.endOffset);
          const trailingFrag = afterRange.extractContents();

          if (!curP.textContent && !curP.querySelector("br")) {
            curP.innerHTML = "<br>";
          }

          const newP = document.createElement("div");
          newP.className = "mf-p";
          if (curAlign && VALID_ALIGNS.has(curAlign)) {
            newP.setAttribute("data-align", curAlign);
          }
          if (curList && VALID_LISTS.has(curList)) {
            newP.setAttribute("data-list", curList);
          }
          newP.appendChild(trailingFrag);
          if (!newP.textContent && !newP.querySelector("br")) {
            newP.innerHTML = "<br>";
          }

          curP.parentNode.insertBefore(newP, curP.nextSibling);
          refreshEditorListMarkers(editor, node);
          setCaretAtStart(newP);
          onLiveInput();
        }
        return;
      }
    });

    // Delayed focus & caret positioning
    setTimeout(() => {
      if (uiState.mode === "EDITING_TEXT" && activeEditingNodeId === nodeId) {
        editor.focus();
        if (window.getSelection && document.createRange) {
          const allP = editor.querySelectorAll(":scope > .mf-p");
          const lastP = allP[allP.length - 1] || editor;
          const range = document.createRange();
          range.selectNodeContents(lastP);
          if (!isPh) {
            range.collapse(false);
          }
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
        }
      }
    }, 30);
  }

  function toggleSelectionFormatting(editor, marker) {
    let cmd = "bold";
    if (marker === "*" || marker === "italic") cmd = "italic";
    else if (marker === "u" || marker === "underline") cmd = "underline";
    document.execCommand(cmd, false, null);
    if (editor && typeof editor.dispatchEvent === "function") {
      editor.dispatchEvent(new Event("input"));
      editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    }
  }

  exports.TextEditor = {
    layoutNodeText,
    open: openInlineEditor,
    close: closeInlineEditor,
    toggleSelectionFormatting,
    parseInlineSpans,
    parseParagraphs,
    serializeParagraphs,
    cleanMarkdownToHtml,
    serializeEditorHtml,
    serializeEditorDOM,
    computeRequiredNodeHeight,
    sanitizeHtmlFormatting,
    getPlainText,
    formatListMarker,
    stripManualListPrefix,
    applyAlignmentToEditor,
    applyNumberingToEditor,
    applyNumberingToNode,
    getActiveEditorState,
    refreshEditorListMarkers,
    getActiveEditingNode: () => activeEditingNodeRef
  };

})(window.MinimalFlow);
