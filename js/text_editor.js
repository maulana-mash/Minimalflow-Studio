/**
 * MinimalFlow Studio — Live Inline Text Editor Engine (v3 — Word-Grade Rich Paragraph & Inline Engine)
 * Mendukung:
 * - True word-spacing Justify (hanya spasi antar-kata melebar, baris terakhir paragraf tidak direnggangkan)
 * - Pengeditan per paragraf & per seleksi kata (Align, Numbering, Bold, Italic, Underline, Font Family, Font Size, Color)
 * - Penomoran hanging-indent ala Microsoft Word (1., 1), a., a), A., A)) yang menghormati penggalan baris kosong
 * - Zero-blur toolbar interaction untuk dropdown Font Family, Font Size, Color Picker, dan Numbering
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

  function normalizeColorValue(val) {
    if (!val) return null;
    const v = String(val).trim();
    if (!v || v === "inherit" || v === "initial" || v === "transparent" || v === "currentColor") return null;
    // Convert rgb(r, g, b) to #rrggbb for clean serialization
    const rgbM = v.match(/^rgba?\(\s*(\d+)\s*,\s*(\d+)\s*,\s*(\d+)/i);
    if (rgbM) {
      const hex = [rgbM[1], rgbM[2], rgbM[3]].map(n => Math.max(0, Math.min(255, parseInt(n, 10))).toString(16).padStart(2, "0")).join("");
      return `#${hex}`;
    }
    return v;
  }

  function normalizeFontSizeValue(val) {
    if (val === undefined || val === null || val === "") return null;
    const num = parseFloat(String(val));
    if (!isFinite(num) || num < 6 || num > 144) return null;
    return Math.round(num * 10) / 10;
  }

  function normalizeFontFamilyValue(val) {
    if (!val) return null;
    const cleaned = decodeHtmlEntities(String(val)).replace(/"/g, "'").trim();
    if (!cleaned || cleaned === "inherit" || cleaned === "initial") return null;
    return cleaned;
  }

  function extractInlineStyleProps(tagAttrs) {
    const out = { bold: false, italic: false, underline: false, color: null, fontSize: null, fontFamily: null };
    if (!tagAttrs) return out;

    const styleM = tagAttrs.match(/style\s*=\s*"([^"]*)"/i) || tagAttrs.match(/style\s*=\s*'([^']*)'/i);
    if (styleM) {
      const style = styleM[1];
      if (/font-weight\s*:\s*(?:bold|[6789]00)/i.test(style)) out.bold = true;
      if (/font-style\s*:\s*italic/i.test(style)) out.italic = true;
      if (/text-decoration[^;]*underline/i.test(style)) out.underline = true;

      const colM = style.match(/(?:^|;)\s*color\s*:\s*([^;]+)/i);
      if (colM) out.color = normalizeColorValue(colM[1]);

      const szM = style.match(/font-size\s*:\s*([0-9.]+)\s*px/i);
      if (szM) out.fontSize = normalizeFontSizeValue(szM[1]);

      const ffM = style.match(/font-family\s*:\s*([^;]+)/i);
      if (ffM) out.fontFamily = normalizeFontFamilyValue(ffM[1]);
    }

    const dcM = tagAttrs.match(/data-color\s*=\s*"([^"]+)"/i);
    if (dcM) out.color = normalizeColorValue(dcM[1]);
    const dsM = tagAttrs.match(/data-size\s*=\s*"([^"]+)"/i);
    if (dsM) out.fontSize = normalizeFontSizeValue(dsM[1]);
    const dfM = tagAttrs.match(/data-font\s*=\s*"([^"]+)"/i);
    if (dfM) out.fontFamily = normalizeFontFamilyValue(dfM[1]);

    return out;
  }

  function buildSpanStyleAttr(color, fontSize, fontFamily) {
    const parts = [];
    if (color) parts.push(`color:${color}`);
    if (fontSize) parts.push(`font-size:${fontSize}px`);
    if (fontFamily) parts.push(`font-family:${fontFamily}`);
    return parts.join(";");
  }

  function sanitizeHtmlFormatting(html) {
    if (!html) return "";
    let s = String(html);

    // 1. Normalize <span ...> — pertahankan hanya color, font-size, font-family; konversi bold/italic/underline ke <b>/<i>/<u>
    s = s.replace(/<span\b([^>]*)>([\s\S]*?)<\/span>/gi, (m, attrs, inner) => {
      const p = extractInlineStyleProps(attrs);
      let res = inner;
      const keepStyle = buildSpanStyleAttr(p.color, p.fontSize, p.fontFamily);
      if (keepStyle) {
        res = `<span style="${escapeAttr(keepStyle)}">${res}</span>`;
      }
      if (p.underline) res = `<u>${res}</u>`;
      if (p.italic) res = `<i>${res}</i>`;
      if (p.bold) res = `<b>${res}</b>`;
      return res;
    });

    // 2. Normalize strong/em/ins to <b>/<i>/<u>
    s = s.replace(/<strong\b[^>]*>/gi, "<b>").replace(/<\/strong>/gi, "</b>");
    s = s.replace(/<em\b[^>]*>/gi, "<i>").replace(/<\/em>/gi, "</i>");
    s = s.replace(/<ins\b[^>]*>/gi, "<u>").replace(/<\/ins>/gi, "</u>");

    // 3. Unwrap other non-essential formatting tags (keep p, b, i, u, span, br)
    for (let i = 0; i < 3; i++) {
      const next = s.replace(/<(?:font|mark|small|del|s|strike|a)\b[^>]*>([\s\S]*?)<\/(?:font|mark|small|del|s|strike|a)>/gi, "$1");
      if (next === s) break;
      s = next;
    }

    s = s.replace(/<\/?(?:font|mark|small|del|s|strike|a)\b[^>]*>/gi, "");

    // 4. Clean empty tags
    s = s.replace(/<b>\s*<\/b>/gi, "");
    s = s.replace(/<i>\s*<\/i>/gi, "");
    s = s.replace(/<u>\s*<\/u>/gi, "");
    s = s.replace(/<span\b[^>]*>\s*<\/span>/gi, "");

    return s;
  }

  function cleanMarkdownToHtml(str) {
    if (!str) return "";
    let s = String(str);
    s = sanitizeHtmlFormatting(s);
    s = s.replace(/\*\*\*([^*]+)\*\*\*/g, "<b><i>$1</i></b>");
    s = s.replace(/\*\*([^*]+)\*\*/g, "<b>$1</b>");
    s = s.replace(/\*([^*]+)\*/g, "<i>$1</i>");
    return s;
  }

  function stripManualListPrefix(html) {
    if (!html) return "";
    return String(html).replace(/^((?:<(?:b|i|u|span\b[^>]*)>)*)\s*(?:\d+[.)]|[a-zA-Z][.)])\s+/, "$1");
  }

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

  /**
   * Stateful inline tokenizer: mendukung <b>, <i>, <u>, dan <span style="color;font-size;font-family">
   * secara bertingkat dan 100% bebas tag bocor!
   */
  function parseInlineSpans(str, defaultBold = false, defaultItalic = false, defaultUnderline = false, defaultColor = null, defaultFontSize = null, defaultFontFamily = null) {
    if (!str) return [];
    let s = cleanMarkdownToHtml(String(str));

    const tagRegex = /<\/?(b|strong|i|em|u|span)\b([^>]*)>/gi;
    const tokens = [];
    let boldDepth = 0;
    let italicDepth = 0;
    let underlineDepth = 0;
    const spanStack = [];
    let lastIndex = 0;
    let match;

    function getActiveSpanStyles() {
      let color = defaultColor;
      let fontSize = defaultFontSize;
      let fontFamily = defaultFontFamily;
      let sBold = false;
      let sItalic = false;
      let sUnderline = false;
      for (const st of spanStack) {
        if (st.color) color = st.color;
        if (st.fontSize) fontSize = st.fontSize;
        if (st.fontFamily) fontFamily = st.fontFamily;
        if (st.bold) sBold = true;
        if (st.italic) sItalic = true;
        if (st.underline) sUnderline = true;
      }
      return { color, fontSize, fontFamily, sBold, sItalic, sUnderline };
    }

    function emitText(rawChunk) {
      if (!rawChunk) return;
      const stripped = rawChunk.replace(/<\/?[a-zA-Z][^>]*>/g, "");
      const cleanText = decodeHtmlEntities(stripped);
      if (!cleanText) return;
      const activeSpan = getActiveSpanStyles();
      const isBold = defaultBold || boldDepth > 0 || activeSpan.sBold;
      const isItalic = defaultItalic || italicDepth > 0 || activeSpan.sItalic;
      const isUnderline = defaultUnderline || underlineDepth > 0 || activeSpan.sUnderline;
      const color = activeSpan.color || null;
      const fontSize = activeSpan.fontSize || null;
      const fontFamily = activeSpan.fontFamily || null;

      const prev = tokens[tokens.length - 1];
      if (prev &&
          prev.bold === isBold &&
          prev.italic === isItalic &&
          prev.underline === isUnderline &&
          prev.color === color &&
          prev.fontSize === fontSize &&
          prev.fontFamily === fontFamily) {
        prev.text += cleanText;
      } else {
        tokens.push({ text: cleanText, bold: isBold, italic: isItalic, underline: isUnderline, color, fontSize, fontFamily });
      }
    }

    while ((match = tagRegex.exec(s)) !== null) {
      if (match.index > lastIndex) {
        emitText(s.slice(lastIndex, match.index));
      }
      const fullTag = match[0];
      const tagName = match[1].toLowerCase();
      const attrs = match[2] || "";
      const isClosing = fullTag.charAt(1) === "/";

      if (tagName === "b" || tagName === "strong") {
        boldDepth = isClosing ? Math.max(0, boldDepth - 1) : boldDepth + 1;
      } else if (tagName === "i" || tagName === "em") {
        italicDepth = isClosing ? Math.max(0, italicDepth - 1) : italicDepth + 1;
      } else if (tagName === "u") {
        underlineDepth = isClosing ? Math.max(0, underlineDepth - 1) : underlineDepth + 1;
      } else if (tagName === "span") {
        if (isClosing) {
          if (spanStack.length > 0) spanStack.pop();
        } else {
          spanStack.push(extractInlineStyleProps(attrs));
        }
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
      const spanStyle = buildSpanStyleAttr(run.color, run.fontSize, run.fontFamily);
      if (!run.text.trim() && !spanStyle) return safe;
      let out = safe;
      if (spanStyle) out = `<span style="${escapeAttr(spanStyle)}">${out}</span>`;
      if (run.underline) out = `<u>${out}</u>`;
      if (run.italic) out = `<i>${out}</i>`;
      if (run.bold) out = `<b>${out}</b>`;
      return out;
    }).join("");
  }

  function normalizeInlineHtml(rawInline) {
    if (!rawInline) return "";
    const runs = parseInlineSpans(rawInline, false, false, false, null, null, null);
    return runsToInlineHtml(runs);
  }

  /**
   * Parse node.text.content menjadi daftar paragraf terstruktur.
   * ATURAN EMAS PENGGALAN SPASI:
   * - Baris kosong ("" / whitespace only) TIDAK PERNAH diberi nomor dan SELALU me-reset counter penomoran!
   */
  function parseParagraphs(rawContent, defaultAlign = "center") {
    const str = String(rawContent || "");
    const rawParas = [];

    if (/<p\b[^>]*>/i.test(str)) {
      const blockRegex = /<p\b([^>]*)>([\s\S]*?)<\/p>/gi;
      let lastIdx = 0;
      let m;

      function pushPlainSegment(seg) {
        const lines = seg.split("\n");
        for (let i = 0; i < lines.length; i++) {
          const ln = lines[i];
          if (i === 0 && ln === "" && rawParas.length > 0) continue;
          if (i === lines.length - 1 && ln === "" && lastIdx < str.length) continue;
          rawParas.push({ html: normalizeInlineHtml(ln), align: null, list: null, fontSize: null, fontFamily: null, color: null });
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
        const pStyles = extractInlineStyleProps(attrs);

        const align = alignM && VALID_ALIGNS.has(alignM[1].toLowerCase()) ? alignM[1].toLowerCase() : null;
        const list = listM && VALID_LISTS.has(listM[1]) ? listM[1] : null;

        const subLines = inner.replace(/<br\s*\/?>/gi, "\n").split("\n");
        subLines.forEach(sub => {
          const normHtml = normalizeInlineHtml(sub);
          const isBlank = getPlainText(normHtml).length === 0;
          rawParas.push({
            html: normHtml,
            align,
            list: isBlank ? null : list, // Baris kosong TIDAK pernah memiliki nomor!
            fontSize: pStyles.fontSize,
            fontFamily: pStyles.fontFamily,
            color: pStyles.color
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
          list: null,
          fontSize: null,
          fontFamily: null,
          color: null
        });
      }
    }

    if (rawParas.length === 0) {
      rawParas.push({ html: "", align: null, list: null, fontSize: null, fontFamily: null, color: null });
    }

    // Hitung counter penomoran: baris kosong atau tanpa list SELALU me-reset urutan!
    let listCounter = 0;
    let prevListType = null;
    for (let i = 0; i < rawParas.length; i++) {
      const p = rawParas[i];
      const isBlank = getPlainText(p.html).length === 0;
      if (p.list && !isBlank) {
        if (p.list === prevListType) {
          listCounter += 1;
        } else {
          listCounter = 1;
          prevListType = p.list;
        }
        p.listIndex = listCounter;
        p.marker = formatListMarker(p.list, listCounter);
      } else {
        if (isBlank) p.list = null;
        listCounter = 0;
        prevListType = null;
        p.listIndex = 0;
        p.marker = null;
      }
      p.effectiveAlign = p.align || defaultAlign || "center";
    }

    return rawParas;
  }

  function serializeParagraphs(paragraphs) {
    if (!paragraphs || paragraphs.length === 0) return "";
    const hasBlockMetadata = paragraphs.some(p =>
      (p.align && VALID_ALIGNS.has(p.align)) ||
      (p.list && VALID_LISTS.has(p.list)) ||
      p.fontSize || p.fontFamily || p.color
    );

    if (!hasBlockMetadata) {
      return paragraphs.map(p => p.html || "").join("\n");
    }

    return paragraphs.map(p => {
      const attrs = [];
      const isBlank = getPlainText(p.html || "").length === 0;
      if (p.align && VALID_ALIGNS.has(p.align)) attrs.push(`data-align="${p.align}"`);
      if (p.list && VALID_LISTS.has(p.list) && !isBlank) attrs.push(`data-list="${escapeAttr(p.list)}"`);
      if (p.fontSize) attrs.push(`data-size="${p.fontSize}"`);
      if (p.fontFamily) attrs.push(`data-font="${escapeAttr(p.fontFamily)}"`);
      if (p.color) attrs.push(`data-color="${escapeAttr(p.color)}"`);
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
    let curMeta = { align: null, list: null, fontSize: null, fontFamily: null, color: null };
    let hasOpenBlock = false;

    function pushRun(str, st) {
      if (!str) return;
      const last = currentRuns[currentRuns.length - 1];
      if (last &&
          last.bold === st.bold &&
          last.italic === st.italic &&
          last.underline === st.underline &&
          last.color === st.color &&
          last.fontSize === st.fontSize &&
          last.fontFamily === st.fontFamily) {
        last.text += str;
      } else {
        currentRuns.push({
          text: str,
          bold: st.bold,
          italic: st.italic,
          underline: st.underline,
          color: st.color,
          fontSize: st.fontSize,
          fontFamily: st.fontFamily
        });
      }
    }

    function flushParagraph() {
      const lineHtml = runsToInlineHtml(currentRuns);
      const isBlank = getPlainText(lineHtml).length === 0;
      paragraphs.push({
        html: lineHtml,
        align: curMeta.align,
        list: isBlank ? null : curMeta.list,
        fontSize: curMeta.fontSize,
        fontFamily: curMeta.fontFamily,
        color: curMeta.color
      });
      currentRuns = [];
      curMeta = { align: null, list: null, fontSize: null, fontFamily: null, color: null };
      hasOpenBlock = false;
    }

    function extractBlockMeta(blockEl, inherited) {
      const meta = {
        align: inherited.align,
        list: inherited.list,
        fontSize: inherited.fontSize,
        fontFamily: inherited.fontFamily,
        color: inherited.color
      };
      if (blockEl.getAttribute) {
        const da = blockEl.getAttribute("data-align");
        if (da && VALID_ALIGNS.has(da.toLowerCase())) meta.align = da.toLowerCase();
        else if (blockEl.style && blockEl.style.textAlign && VALID_ALIGNS.has(blockEl.style.textAlign.toLowerCase())) {
          meta.align = blockEl.style.textAlign.toLowerCase();
        }
        const dl = blockEl.getAttribute("data-list");
        if (dl && VALID_LISTS.has(dl)) meta.list = dl;

        const ds = blockEl.getAttribute("data-size");
        if (ds) meta.fontSize = normalizeFontSizeValue(ds);
        const df = blockEl.getAttribute("data-font");
        if (df) meta.fontFamily = normalizeFontFamilyValue(df);
        const dc = blockEl.getAttribute("data-color");
        if (dc) meta.color = normalizeColorValue(dc);
      }
      return meta;
    }

    function walk(node, st, blockMeta) {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (isBlockElement(child)) {
          if (hasOpenBlock || currentRuns.length > 0) {
            flushParagraph();
          }
          const meta = extractBlockMeta(child, blockMeta);
          curMeta = { ...meta };
          hasOpenBlock = true;
          const styleAttr = (child.getAttribute && child.getAttribute("style")) || "";
          const nextSt = {
            bold: st.bold || /font-weight:\s*(?:bold|[6789]00)/i.test(styleAttr),
            italic: st.italic || /font-style:\s*italic/i.test(styleAttr),
            underline: st.underline || /text-decoration[^;]*underline/i.test(styleAttr),
            color: st.color,
            fontSize: st.fontSize,
            fontFamily: st.fontFamily
          };
          walk(child, nextSt, meta);
          flushParagraph();
        } else if (child.nodeType === 3) {
          if (!hasOpenBlock) {
            curMeta = { ...blockMeta };
            hasOpenBlock = true;
          }
          const val = child.nodeValue.replace(/\u00A0/g, " ");
          if (val.includes("\n")) {
            const parts = val.split("\n");
            for (let p = 0; p < parts.length; p++) {
              if (p > 0) {
                flushParagraph();
                curMeta = { ...blockMeta };
              }
              pushRun(parts[p], st);
            }
            hasOpenBlock = true;
          } else {
            pushRun(val, st);
          }
        } else if (child.nodeType === 1) {
          const tag = child.tagName;
          if (tag === "BR") {
            if (!hasOpenBlock) {
              curMeta = { ...blockMeta };
              hasOpenBlock = true;
            }
            if (!isTrailingBogusBr(child)) {
              flushParagraph();
            }
          } else {
            if (!hasOpenBlock) {
              curMeta = { ...blockMeta };
              hasOpenBlock = true;
            }
            const styleAttr = (child.getAttribute && child.getAttribute("style")) || "";
            const inlineProps = extractInlineStyleProps(`style="${styleAttr}"`);
            const nextSt = {
              bold: st.bold || tag === "B" || tag === "STRONG" || inlineProps.bold,
              italic: st.italic || tag === "I" || tag === "EM" || inlineProps.italic,
              underline: st.underline || tag === "U" || tag === "INS" || inlineProps.underline,
              color: inlineProps.color || st.color,
              fontSize: inlineProps.fontSize || st.fontSize,
              fontFamily: inlineProps.fontFamily || st.fontFamily
            };
            walk(child, nextSt, blockMeta);
          }
        }
      }
    }

    const emptySt = { bold: false, italic: false, underline: false, color: null, fontSize: null, fontFamily: null };
    const emptyMeta = { align: null, list: null, fontSize: null, fontFamily: null, color: null };
    walk(el, emptySt, emptyMeta);
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

  function computeParagraphIndents(paragraphs, defaultBold, baseFontSize, baseFontFamily) {
    const indents = new Array(paragraphs.length).fill(0);
    let i = 0;
    while (i < paragraphs.length) {
      if (!paragraphs[i].list || !paragraphs[i].marker) {
        i++;
        continue;
      }
      const listType = paragraphs[i].list;
      let j = i;
      let maxIndent = 0;
      while (j < paragraphs.length && paragraphs[j].list === listType && paragraphs[j].marker) {
        const fs = paragraphs[j].fontSize || baseFontSize;
        const ff = paragraphs[j].fontFamily || baseFontFamily;
        const ind = computeListIndentForMarker(paragraphs[j].marker, defaultBold, fs, ff);
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

  function tokenizeSpansIntoWords(spans, maxLineWidth, fallbackFontSize, fallbackFontFamily) {
    const rawWords = [];
    let currentWordParts = [];

    function flushWord() {
      if (currentWordParts.length === 0) return;
      let totalW = 0;
      let maxFs = fallbackFontSize;
      for (const part of currentWordParts) {
        const fs = part.fontSize || fallbackFontSize;
        const ff = part.fontFamily || fallbackFontFamily;
        if (fs > maxFs) maxFs = fs;
        totalW += measureSpanWidth(part.text, part.bold, part.italic, fs, ff);
      }
      if (totalW <= maxLineWidth || currentWordParts.every(p => p.text.length <= 1)) {
        rawWords.push({ parts: currentWordParts, width: totalW, maxFontSize: maxFs });
      } else {
        let chunkParts = [];
        let chunkW = 0;
        let chunkMaxFs = fallbackFontSize;
        for (const part of currentWordParts) {
          const fs = part.fontSize || fallbackFontSize;
          const ff = part.fontFamily || fallbackFontFamily;
          for (let ci = 0; ci < part.text.length; ci++) {
            const ch = part.text[ci];
            const chW = measureSpanWidth(ch, part.bold, part.italic, fs, ff);
            if (chunkW + chW <= maxLineWidth || chunkParts.length === 0) {
              const lastP = chunkParts[chunkParts.length - 1];
              if (lastP &&
                  lastP.bold === part.bold &&
                  lastP.italic === part.italic &&
                  lastP.underline === part.underline &&
                  lastP.color === part.color &&
                  lastP.fontSize === part.fontSize &&
                  lastP.fontFamily === part.fontFamily) {
                lastP.text += ch;
              } else {
                chunkParts.push({ ...part, text: ch });
              }
              chunkW += chW;
              if (fs > chunkMaxFs) chunkMaxFs = fs;
            } else {
              rawWords.push({ parts: chunkParts, width: chunkW, maxFontSize: chunkMaxFs });
              chunkParts = [{ ...part, text: ch }];
              chunkW = chW;
              chunkMaxFs = fs;
            }
          }
        }
        if (chunkParts.length > 0) {
          rawWords.push({ parts: chunkParts, width: chunkW, maxFontSize: chunkMaxFs });
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
          if (lastP &&
              lastP.bold === span.bold &&
              lastP.italic === span.italic &&
              lastP.underline === span.underline &&
              lastP.color === span.color &&
              lastP.fontSize === span.fontSize &&
              lastP.fontFamily === span.fontFamily) {
            lastP.text += piece;
          } else {
            currentWordParts.push({
              text: piece,
              bold: span.bold,
              italic: span.italic,
              underline: span.underline,
              color: span.color,
              fontSize: span.fontSize,
              fontFamily: span.fontFamily
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
    const baseFontSize = text.fontSize || 14;
    const baseFontFamily = text.fontFamily || "Poppins, sans-serif";
    const defaultBold = !!text.bold;
    const defaultItalic = !!text.italic;
    const defaultUnderline = !!text.underline;
    const defaultAlign = text.align || "center";

    const shapeSafeReduction = getShapeSafeReduction(node);
    const boxLeftX = paddingX + (shapeSafeReduction / 2);
    const boxRightX = width - paddingX - (shapeSafeReduction / 2);
    const maxWidth = Math.max(8, boxRightX - boxLeftX);
    const baseLineHeight = baseFontSize * 1.35;

    const paragraphs = parseParagraphs(text.content || "", defaultAlign);
    const indents = computeParagraphIndents(paragraphs, defaultBold, baseFontSize, baseFontFamily);
    const lines = [];

    for (let pIdx = 0; pIdx < paragraphs.length; pIdx++) {
      const para = paragraphs[pIdx];
      const paraAlign = para.effectiveAlign || defaultAlign;
      const paraFontSize = para.fontSize || baseFontSize;
      const paraFontFamily = para.fontFamily || baseFontFamily;
      const paraColor = para.color || null;
      const paraLineH = paraFontSize * 1.35;
      const normalSpaceW = measureSpanWidth(" ", defaultBold, defaultItalic, paraFontSize, paraFontFamily);

      const indentX = indents[pIdx] || 0;
      const lineStartX = boxLeftX + indentX;
      const paraMaxWidth = Math.max(12, boxRightX - lineStartX);

      const spans = parseInlineSpans(para.html, defaultBold, defaultItalic, defaultUnderline, paraColor, para.fontSize || null, para.fontFamily || null);
      const words = tokenizeSpansIntoWords(spans, paraMaxWidth, paraFontSize, paraFontFamily);

      if (words.length === 0) {
        lines.push({
          words: [],
          lineWidth: 0,
          wordsWidthSum: 0,
          wordCount: 0,
          align: paraAlign,
          justify: false,
          listMarker: null, // Baris kosong TIDAK PERNAH punya marker nomor!
          listMarkerX: boxLeftX,
          listMarkerFontSize: paraFontSize,
          listMarkerFontFamily: paraFontFamily,
          listMarkerColor: paraColor,
          lineStartX,
          lineRightX: boxRightX,
          availWidth: paraMaxWidth,
          normalSpaceW,
          lineFontSize: paraFontSize,
          lineHeight: paraLineH
        });
        continue;
      }

      const paraLines = [];
      let curWords = [];
      let curLineW = 0;
      let curWordsW = 0;
      let curMaxFs = paraFontSize;

      for (let wi = 0; wi < words.length; wi++) {
        const w = words[wi];
        const needSpace = curWords.length > 0;
        const spaceW = needSpace ? normalSpaceW : 0;
        if (curLineW + spaceW + w.width <= paraMaxWidth || curWords.length === 0) {
          curWords.push(w);
          curLineW += spaceW + w.width;
          curWordsW += w.width;
          if (w.maxFontSize > curMaxFs) curMaxFs = w.maxFontSize;
        } else {
          paraLines.push({ words: curWords, lineWidth: curLineW, wordsWidthSum: curWordsW, maxFontSize: curMaxFs });
          curWords = [w];
          curLineW = w.width;
          curWordsW = w.width;
          curMaxFs = Math.max(paraFontSize, w.maxFontSize);
        }
      }
      if (curWords.length > 0) {
        paraLines.push({ words: curWords, lineWidth: curLineW, wordsWidthSum: curWordsW, maxFontSize: curMaxFs });
      }

      for (let li = 0; li < paraLines.length; li++) {
        const pl = paraLines[li];
        const isLastInPara = (li === paraLines.length - 1);
        const shouldJustify = (paraAlign === "justify" && !isLastInPara && pl.words.length > 1);
        const lFs = pl.maxFontSize || paraFontSize;

        lines.push({
          words: pl.words,
          lineWidth: pl.lineWidth,
          wordsWidthSum: pl.wordsWidthSum,
          wordCount: pl.words.length,
          align: paraAlign,
          justify: shouldJustify,
          listMarker: (li === 0 && para.marker) ? para.marker : null,
          listMarkerX: boxLeftX,
          listMarkerFontSize: paraFontSize,
          listMarkerFontFamily: paraFontFamily,
          listMarkerColor: paraColor,
          lineStartX,
          lineRightX: boxRightX,
          availWidth: paraMaxWidth,
          normalSpaceW,
          lineFontSize: lFs,
          lineHeight: lFs * 1.35
        });
      }
    }

    // Hitung total tinggi & baseline Y per baris secara kumulatif (mendukung campuran ukuran font!)
    let totalTextHeight = 0;
    for (let i = 0; i < lines.length; i++) {
      lines[i].yBaselineOffset = totalTextHeight + (lines[i].lineFontSize || baseFontSize) * 0.85;
      totalTextHeight += lines[i].lineHeight || baseLineHeight;
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
    let availableHeight = height - paddingY * 2;
    let blockTopY = 0;

    if (node.type === "cylinder") {
      const ry = Math.min(height * 0.22, 18);
      availableHeight = height - ry * 1.5 - paddingY * 2;
      if (verticalAlign === "top") blockTopY = ry + paddingY;
      else if (verticalAlign === "bottom") blockTopY = height - paddingY - totalTextHeight;
      else blockTopY = ry + paddingY + (availableHeight - totalTextHeight) / 2;
    } else {
      if (verticalAlign === "top") blockTopY = paddingY;
      else if (verticalAlign === "bottom") blockTopY = height - paddingY - totalTextHeight;
      else blockTopY = (height - totalTextHeight) / 2;
    }

    if (verticalAlign === "top" && blockTopY < paddingY) blockTopY = paddingY;
    if (node.isContainer) blockTopY = paddingY;

    const firstFs = (lines[0] && lines[0].lineFontSize) || baseFontSize;
    const startY = blockTopY + firstFs * 0.85;
    for (let i = 0; i < lines.length; i++) {
      lines[i].y = Math.round((blockTopY + lines[i].yBaselineOffset) * 10) / 10;
    }

    return { lines, xPos, startY, blockTopY, lineHeight: baseLineHeight, anchor, totalTextHeight, maxWidth, boxLeftX, boxRightX };
  }

  // ============================================================================
  // WORD-LIKE PER-PARAGRAPH, PER-SECTION & PER-SELECTION ENGINE FOR LIVE EDITOR
  // ============================================================================

  function createParagraphDiv(html, align, list, fontSize = null, fontFamily = null, color = null) {
    const div = document.createElement("div");
    div.className = "mf-p";
    if (align && VALID_ALIGNS.has(align)) div.setAttribute("data-align", align);
    if (list && VALID_LISTS.has(list) && getPlainText(html || "").length > 0) {
      div.setAttribute("data-list", list);
    }
    if (fontSize) {
      div.setAttribute("data-size", String(fontSize));
      div.style.fontSize = `${fontSize}px`;
      div.style.lineHeight = `${fontSize * 1.35}px`;
    }
    if (fontFamily) {
      div.setAttribute("data-font", fontFamily);
      div.style.fontFamily = fontFamily;
    }
    if (color) {
      div.setAttribute("data-color", color);
      div.style.color = color;
    }
    div.innerHTML = (html && html.length > 0) ? html : "<br>";
    return div;
  }

  function ensureEditorParagraphStructure(editor) {
    if (!editor) return;
    if (editor.childNodes.length === 0) {
      editor.appendChild(createParagraphDiv("", null, null));
      return;
    }
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

  function refreshEditorListMarkers(editor, node) {
    if (!editor) return;
    ensureEditorParagraphStructure(editor);
    const baseFontSize = (node && node.text && node.text.fontSize) || 14;
    const baseFontFamily = (node && node.text && node.text.fontFamily) || "Poppins, sans-serif";
    const defaultBold = !!(node && node.text && node.text.bold);

    const pEls = Array.from(editor.querySelectorAll(":scope > .mf-p"));
    let listCounter = 0;
    let prevList = null;

    const metas = pEls.map(el => {
      const listType = el.getAttribute("data-list");
      const hasText = (el.textContent || "").replace(/\u00A0/g, " ").trim().length > 0;
      const isActiveItem = listType && VALID_LISTS.has(listType);
      // Saat sedang mengetik di baris baru bernomor yang masih kosong (baru tekan Enter), tetap tampilkan nomor preview;
      // namun jika baris kosong tsb tidak memiliki data-list, reset counter agar blok bawah mulai dari 1 lagi!
      if (isActiveItem) {
        if (listType === prevList) listCounter += 1;
        else { listCounter = 1; prevList = listType; }
        const marker = formatListMarker(listType, listCounter);
        const fs = normalizeFontSizeValue(el.getAttribute("data-size")) || baseFontSize;
        const ff = normalizeFontFamilyValue(el.getAttribute("data-font")) || baseFontFamily;
        return { el, listType, marker, fs, ff, hasText };
      } else {
        listCounter = 0;
        prevList = null;
        return { el, listType: null, marker: null, fs: baseFontSize, ff: baseFontFamily, hasText };
      }
    });

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
        const ind = computeListIndentForMarker(metas[j].marker, defaultBold, metas[j].fs, metas[j].ff);
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

  function saveEditorSelection(editor) {
    if (!editor || !window.getSelection) return;
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);
    if (editor.contains(range.commonAncestorContainer) || range.commonAncestorContainer === editor) {
      editor._savedRange = range.cloneRange();
      editor._savedParas = getSelectedParagraphElementsFromRange(editor, range);
    }
  }

  function restoreEditorSelection(editor) {
    if (!editor || !editor._savedRange || !window.getSelection) return false;
    try {
      const sel = window.getSelection();
      sel.removeAllRanges();
      sel.addRange(editor._savedRange.cloneRange());
      return true;
    } catch (e) {
      return false;
    }
  }

  function getSelectedParagraphElementsFromRange(editor, range) {
    if (!editor) return [];
    ensureEditorParagraphStructure(editor);
    const allP = Array.from(editor.querySelectorAll(":scope > .mf-p"));
    if (allP.length === 0) return [];
    if (!range) return [allP[0]];

    const startP = findClosestParagraph(editor, range.startContainer);
    const endP = findClosestParagraph(editor, range.endContainer);

    if (startP && endP) {
      const i1 = allP.indexOf(startP);
      const i2 = allP.indexOf(endP);
      if (i1 !== -1 && i2 !== -1) {
        return allP.slice(Math.min(i1, i2), Math.max(i1, i2) + 1);
      }
    }

    const hit = allP.filter(p => {
      try { return range.intersectsNode(p); } catch (e) { return false; }
    });
    return hit.length > 0 ? hit : [startP || endP || allP[0]];
  }

  function getSelectedParagraphElements(editor) {
    if (!editor) return [];
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount > 0) {
      const r = sel.getRangeAt(0);
      if (editor.contains(r.commonAncestorContainer) || r.commonAncestorContainer === editor) {
        return getSelectedParagraphElementsFromRange(editor, r);
      }
    }
    if (editor._savedParas && editor._savedParas.length > 0) {
      const stillInDom = editor._savedParas.filter(p => editor.contains(p));
      if (stillInDom.length > 0) return stillInDom;
    }
    if (editor._savedRange) {
      return getSelectedParagraphElementsFromRange(editor, editor._savedRange);
    }
    ensureEditorParagraphStructure(editor);
    const first = editor.querySelector(":scope > .mf-p");
    return first ? [first] : [];
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

    // Jika beberapa paragraf diseleksi bersama baris kosong di antaranya, lewati baris kosong!
    const nonEmptyTargets = targets.length > 1
      ? targets.filter(el => (el.textContent || "").replace(/\u00A0/g, " ").trim().length > 0)
      : targets;
    const effectiveTargets = nonEmptyTargets.length > 0 ? nonEmptyTargets : targets;

    const turningOff = !listType || listType === "none" || effectiveTargets.every(el => el.getAttribute("data-list") === listType);

    effectiveTargets.forEach(pEl => {
      if (turningOff) {
        pEl.removeAttribute("data-list");
        pEl.removeAttribute("data-marker");
        pEl.style.paddingLeft = "";
      } else if (VALID_LISTS.has(listType)) {
        pEl.setAttribute("data-list", listType);
        const cleaned = stripManualListPrefix(pEl.innerHTML);
        if (cleaned !== pEl.innerHTML) {
          pEl.innerHTML = cleaned || "<br>";
        }
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

  /**
   * Penomoran cerdas saat node dipilih secara keseluruhan (di luar mode edit teks):
   * - Baris kosong (penggalan spasi) TIDAK PERNAH diberi nomor!
   * - Jika ada penggalan baris kosong memisahkan judul (1 baris) di atas dari isi poin-poin di bawah,
   *   ATAU baris pertama adalah judul (tebal / diakhiri titik dua ':') diikuti beberapa baris isi,
   *   maka HANYA bagian isi yang diberi penomoran (1., 2., 3.) sementara judul & penggalan tetap bersih!
   */
  function applyNumberingToNode(node, listType) {
    if (!node || !node.text) return;
    const defaultAlign = node.text.align || "center";
    const paras = parseParagraphs(node.text.content || "", defaultAlign);

    // Jika mematikan penomoran ("none"), bersihkan semua paragraf
    if (!listType || listType === "none") {
      paras.forEach(p => { p.list = null; });
      node.text.content = serializeParagraphs(paras);
      return;
    }

    // Kelompokkan paragraf non-kosong ke dalam blok/penggalan (dipisahkan oleh baris kosong)
    const sections = [];
    let curSec = [];
    paras.forEach((p, idx) => {
      const isBlank = getPlainText(p.html).length === 0;
      if (isBlank) {
        p.list = null; // Pastikan baris kosong selalu tanpa nomor
        if (curSec.length > 0) {
          sections.push(curSec);
          curSec = [];
        }
      } else {
        curSec.push(idx);
      }
    });
    if (curSec.length > 0) sections.push(curSec);

    if (sections.length === 0) return;

    let targetIndices = [];
    if (sections.length >= 2) {
      // Ada penggalan baris kosong! Cek apakah blok pertama adalah 1 baris judul
      const sec0 = sections[0];
      const firstP = paras[sec0[0]];
      const firstPlain = getPlainText(firstP.html);
      const isHeadingSec = sec0.length === 1 && (
        firstPlain.endsWith(":") ||
        /^\s*<b>[\s\S]*<\/b>\s*$/i.test(firstP.html) ||
        firstPlain.length <= 70
      );
      if (isHeadingSec) {
        for (let s = 1; s < sections.length; s++) {
          targetIndices.push(...sections[s]);
        }
      } else {
        sections.forEach(sec => targetIndices.push(...sec));
      }
    } else {
      // 1 blok tanpa baris kosong: cek apakah baris 0 adalah judul (bold penuh / berakhiran ':') diikuti >= 2 baris isi
      const sec = sections[0];
      const firstP = paras[sec[0]];
      const firstPlain = getPlainText(firstP.html);
      const isHeadingLine = sec.length >= 3 && (
        firstPlain.endsWith(":") ||
        /^\s*<b>[\s\S]*<\/b>\s*$/i.test(firstP.html)
      );
      targetIndices = isHeadingLine ? sec.slice(1) : sec.slice();
    }

    const turningOff = targetIndices.length > 0 && targetIndices.every(i => paras[i].list === listType);

    targetIndices.forEach(idx => {
      const p = paras[idx];
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

  /**
   * Menerapkan Font Size, Font Family, atau Text Color secara granular:
   * - Jika ada teks/kata yang diblok (range tidak collapsed) -> ubah HANYA kata/teks terpilih!
   * - Jika kursor hanya diletakkan pada 1 paragraf (collapsed) -> ubah HANYA paragraf aktif tsb!
   */
  function applyInlineOrParagraphStyle(editor, node, prop, value) {
    if (!editor || !node) return false;
    editor.focus();
    restoreEditorSelection(editor);

    const sel = window.getSelection ? window.getSelection() : null;
    const hasRange = sel && sel.rangeCount > 0 && (editor.contains(sel.getRangeAt(0).commonAncestorContainer) || sel.getRangeAt(0).commonAncestorContainer === editor);
    const range = hasRange ? sel.getRangeAt(0) : null;

    const cssPropMap = { fontSize: "fontSize", fontFamily: "fontFamily", color: "color" };
    const attrMap = { fontSize: "data-size", fontFamily: "data-font", color: "data-color" };
    const cssProp = cssPropMap[prop];
    const dataAttr = attrMap[prop];
    if (!cssProp) return false;

    const cssVal = prop === "fontSize" ? `${value}px` : value;

    // KASUS A: Seleksi teks aktif (beberapa huruf/kata/penggalan diblok) -> bungkus span hanya pada teks terpilih!
    if (range && !range.collapsed) {
      const startP = findClosestParagraph(editor, range.startContainer);
      const endP = findClosestParagraph(editor, range.endContainer);

      if (startP && endP && startP === endP) {
        const frag = range.extractContents();
        // Bersihkan properti lama yang bentrok di dalam fragmen agar gaya baru langsung menang
        frag.querySelectorAll("span").forEach(sp => {
          sp.style[cssProp] = "";
        });
        const span = document.createElement("span");
        span.style[cssProp] = cssVal;
        span.appendChild(frag);
        range.insertNode(span);

        // Pertahankan seleksi pada span baru agar user bisa langsung atur gaya lain (misal ukuran + warna)
        const newRange = document.createRange();
        newRange.selectNodeContents(span);
        sel.removeAllRanges();
        sel.addRange(newRange);
        saveEditorSelection(editor);
      } else {
        // Seleksi melintasi beberapa paragraf: terapkan ke setiap paragraf terpilih secara terisolasi
        const targets = getSelectedParagraphElementsFromRange(editor, range);
        targets.forEach(pEl => {
          pEl.setAttribute(dataAttr, String(value));
          pEl.style[cssProp] = cssVal;
          if (prop === "fontSize") pEl.style.lineHeight = `${value * 1.35}px`;
          pEl.querySelectorAll("span").forEach(sp => { sp.style[cssProp] = ""; });
        });
        saveEditorSelection(editor);
      }

      refreshEditorListMarkers(editor, node);
      editor.dispatchEvent(new Event("input"));
      editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
      return true;
    }

    // KASUS B: Kursor diletakkan di dalam 1 paragraf (collapsed) -> ubah HANYA paragraf aktif tsb!
    const targets = getSelectedParagraphElements(editor);
    if (targets.length === 0) return false;
    targets.forEach(pEl => {
      if (value === null || value === "" || value === "auto") {
        pEl.removeAttribute(dataAttr);
        pEl.style[cssProp] = "";
        if (prop === "fontSize") pEl.style.lineHeight = "";
      } else {
        pEl.setAttribute(dataAttr, String(value));
        pEl.style[cssProp] = cssVal;
        if (prop === "fontSize") pEl.style.lineHeight = `${value * 1.35}px`;
      }
      pEl.querySelectorAll("span").forEach(sp => { sp.style[cssProp] = ""; });
    });

    refreshEditorListMarkers(editor, node);
    saveEditorSelection(editor);
    editor.dispatchEvent(new Event("input"));
    editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    return true;
  }

  function getActiveEditorState(editor, node) {
    const defaultAlign = (node && node.text && node.text.align) || "center";
    const defaultSize = (node && node.text && node.text.fontSize) || 14;
    const defaultFont = (node && node.text && node.text.fontFamily) || "Poppins, sans-serif";
    const defaultColor = (node && node.text && node.text.color) || null;

    if (!editor) {
      const paras = node && node.text ? parseParagraphs(node.text.content || "", defaultAlign) : [];
      const nonBlank = paras.filter(p => getPlainText(p.html).length > 0);
      const firstList = nonBlank.length > 0 && nonBlank.some(p => p.list)
        ? (nonBlank.find(p => p.list)?.list || null)
        : null;
      return {
        align: defaultAlign,
        list: firstList,
        bold: !!(node && node.text && node.text.bold),
        italic: !!(node && node.text && node.text.italic),
        underline: !!(node && node.text && node.text.underline),
        fontSize: defaultSize,
        fontFamily: defaultFont,
        color: defaultColor
      };
    }

    const targets = getSelectedParagraphElements(editor);
    const firstP = targets[0];
    const align = (firstP && firstP.getAttribute("data-align")) || defaultAlign;
    const list = (firstP && firstP.getAttribute("data-list")) || null;

    let fontSize = (firstP && normalizeFontSizeValue(firstP.getAttribute("data-size"))) || defaultSize;
    let fontFamily = (firstP && normalizeFontFamilyValue(firstP.getAttribute("data-font"))) || defaultFont;
    let color = (firstP && normalizeColorValue(firstP.getAttribute("data-color"))) || defaultColor;

    // Periksa inline span di posisi kursor jika ada gaya khusus per-kata
    const sel = window.getSelection ? window.getSelection() : null;
    if (sel && sel.rangeCount > 0) {
      let curNode = sel.getRangeAt(0).startContainer;
      if (curNode && curNode.nodeType === 3) curNode = curNode.parentNode;
      while (curNode && curNode !== editor && editor.contains(curNode)) {
        if (curNode.nodeType === 1 && curNode.tagName === "SPAN") {
          const sp = extractInlineStyleProps(`style="${curNode.getAttribute("style") || ""}"`);
          if (sp.fontSize) fontSize = sp.fontSize;
          if (sp.fontFamily) fontFamily = sp.fontFamily;
          if (sp.color) color = sp.color;
        }
        curNode = curNode.parentNode;
      }
    }

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

    return { align, list, bold, italic, underline, fontSize, fontFamily, color };
  }

  let activeEditingNodeId = null;
  let activeEditingFinishFn = null;
  let activeEditingNodeRef = null;
  let suppressEditorBlur = false;

  function holdFocusForToolbar(hold) {
    suppressEditorBlur = !!hold;
    if (hold) {
      const ed = document.querySelector(".node-seamless-editor");
      if (ed) saveEditorSelection(ed);
    }
  }

  function closeInlineEditor() {
    suppressEditorBlur = false;
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
      suppressEditorBlur = false;
      activeEditingFinishFn();
    }

    const nodeGroupEl = document.querySelector(`.node-group[data-id="${nodeId}"]`);
    if (!nodeGroupEl) return;

    activeEditingNodeId = nodeId;
    activeEditingNodeRef = node;
    suppressEditorBlur = false;
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
        editor.appendChild(createParagraphDiv(p.html, p.align, p.list, p.fontSize, p.fontFamily, p.color));
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
      if (vAlign === "top") padTop = padY;
      else if (vAlign === "bottom") padTop = Math.max(0, node.height - totalH - padY);
      if (node.type === "cylinder") {
        const ry = Math.min(node.height * 0.22, 18);
        if (vAlign === "top") padTop = ry + padY;
        else if (vAlign === "bottom") padTop = Math.max(ry, node.height - totalH - padY);
        else padTop = Math.max(ry, ry + (node.height - ry * 1.5 - totalH) / 2);
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
      saveEditorSelection(editor);
      editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    });
    editor.addEventListener("keyup", () => {
      saveEditorSelection(editor);
      editor.dispatchEvent(new CustomEvent("mf-selection-change", { bubbles: true }));
    });
    editor.addEventListener("click", stopPropagation);
    editor.addEventListener("dblclick", stopPropagation);
    editor.addEventListener("wheel", stopPropagation);

    const onDocSelectionChange = () => {
      if (document.activeElement === editor) {
        saveEditorSelection(editor);
      }
    };
    document.addEventListener("selectionchange", onDocSelectionChange);

    const initialTextSnapshot = node.text?.content ?? "";

    function onLiveInput() {
      refreshEditorListMarkers(editor, node);
      saveEditorSelection(editor);
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
          const firstText = document.createTextNode(pasteLines[0]);
          range.insertNode(firstText);
          range.setStartAfter(firstText);
          range.collapse(true);

          let refNode = curP;
          for (let i = 1; i < pasteLines.length; i++) {
            const lineTxt = pasteLines[i];
            const isBlank = !lineTxt.trim();
            const detectedList = isBlank ? null : detectManualListPrefix(lineTxt);
            const cleanLine = detectedList ? stripManualListPrefix(escapeHtmlText(lineTxt)) : escapeHtmlText(lineTxt);
            const newP = createParagraphDiv(
              cleanLine,
              detectedList ? "left" : (curP.getAttribute("data-align") || null),
              detectedList || null
            );
            refNode.parentNode.insertBefore(newP, refNode.nextSibling);
            refNode = newP;
          }
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
      if (suppressEditorBlur) return; // Jangan tutup editor saat user memilih dropdown Font / Size / Color di toolbar!
      if (Date.now() - openTime < 200) return;
      isFinished = true;

      document.removeEventListener("selectionchange", onDocSelectionChange);

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
    editor.addEventListener("blur", () => {
      // Beri jeda 1 tick agar handler mousedown pada toolbar sempat mengaktifkan suppressEditorBlur
      setTimeout(() => {
        if (!suppressEditorBlur && document.activeElement !== editor) {
          finishEditing();
        }
      }, 20);
    });

    editor.addEventListener("keydown", (e) => {
      e.stopPropagation();

      const mod = e.ctrlKey || e.metaKey;

      if (mod && !e.shiftKey && !e.altKey && (e.key === "b" || e.key === "B" || e.code === "KeyB")) {
        e.preventDefault();
        document.execCommand("bold", false, null);
        onLiveInput();
        return;
      }

      if (mod && !e.shiftKey && !e.altKey && (e.key === "i" || e.key === "I" || e.code === "KeyI")) {
        e.preventDefault();
        document.execCommand("italic", false, null);
        onLiveInput();
        return;
      }

      if (mod && !e.shiftKey && !e.altKey && (e.key === "u" || e.key === "U" || e.code === "KeyU")) {
        e.preventDefault();
        document.execCommand("underline", false, null);
        onLiveInput();
        return;
      }

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

      if (mod && e.key === "Enter") {
        e.preventDefault();
        suppressEditorBlur = false;
        finishEditing();
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        suppressEditorBlur = false;
        finishEditing();
        return;
      }

      // Auto-numbering ala Word saat mengetik "1.", "1)", "a.", "a)", "A.", "A)" + Spasi di awal baris
      if (e.key === " " && !mod && !e.altKey) {
        const sel = window.getSelection();
        if (sel && sel.rangeCount > 0 && sel.getRangeAt(0).collapsed) {
          const range = sel.getRangeAt(0);
          const curP = findClosestParagraph(editor, range.startContainer);
          if (curP && !curP.getAttribute("data-list")) {
            const before = getTextBeforeCaretInElement(curP, range);
            const autoMap = { "1.": "1.", "1)": "1)", "a.": "a.", "a)": "a)", "A.": "A.", "A)": "A)" };
            const matchedList = autoMap[before];
            if (matchedList) {
              e.preventDefault();
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
          const curSize = curP.getAttribute("data-size");
          const curFont = curP.getAttribute("data-font");
          const curColor = curP.getAttribute("data-color");
          const curPlain = (curP.textContent || "").replace(/\u00A0/g, " ").trim();

          if (curList && curPlain.length === 0) {
            curP.removeAttribute("data-list");
            curP.removeAttribute("data-marker");
            curP.style.paddingLeft = "";
            refreshEditorListMarkers(editor, node);
            setCaretAtStart(curP);
            onLiveInput();
            return;
          }

          const afterRange = document.createRange();
          afterRange.selectNodeContents(curP);
          afterRange.setStart(range.endContainer, range.endOffset);
          const trailingFrag = afterRange.extractContents();

          if (!curP.textContent && !curP.querySelector("br")) {
            curP.innerHTML = "<br>";
          }

          const newP = document.createElement("div");
          newP.className = "mf-p";
          if (curAlign && VALID_ALIGNS.has(curAlign)) newP.setAttribute("data-align", curAlign);
          if (curList && VALID_LISTS.has(curList)) newP.setAttribute("data-list", curList);
          if (curSize) {
            newP.setAttribute("data-size", curSize);
            newP.style.fontSize = `${curSize}px`;
            newP.style.lineHeight = `${parseFloat(curSize) * 1.35}px`;
          }
          if (curFont) {
            newP.setAttribute("data-font", curFont);
            newP.style.fontFamily = curFont;
          }
          if (curColor) {
            newP.setAttribute("data-color", curColor);
            newP.style.color = curColor;
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

    setTimeout(() => {
      if (uiState.mode === "EDITING_TEXT" && activeEditingNodeId === nodeId) {
        editor.focus();
        if (window.getSelection && document.createRange) {
          const allP = editor.querySelectorAll(":scope > .mf-p");
          const lastP = allP[allP.length - 1] || editor;
          const range = document.createRange();
          range.selectNodeContents(lastP);
          if (!isPh) range.collapse(false);
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
          saveEditorSelection(editor);
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
      saveEditorSelection(editor);
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
    applyInlineOrParagraphStyle,
    holdFocusForToolbar,
    saveEditorSelection,
    restoreEditorSelection,
    getActiveEditorState,
    refreshEditorListMarkers,
    getActiveEditingNode: () => activeEditingNodeRef
  };

})(window.MinimalFlow);
