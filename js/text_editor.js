/**
 * MinimalFlow Studio — Live Inline Text Editor Engine
 * Mengelola rendering tata letak teks SVG (auto-wrap, character-break, padding kata)
 * dan editor teks yang MENYATU RAPI KE DALAM BOX CHART (Bukan tumpukan kotak transparan lepas).
 */

window.MinimalFlow = window.MinimalFlow || {};

(function (exports) {
  'use strict';

  let measureCanvas = null;
  let measureCtx = null;

  function getMeasureContext() {
    if (!measureCtx && typeof document !== "undefined") {
      measureCanvas = document.createElement("canvas");
      measureCtx = measureCanvas.getContext("2d");
    }
    return measureCtx;
  }

  function sanitizeHtmlFormatting(html) {
    if (!html) return "";
    let s = String(html);

    // 1. Convert spans with explicit bold/italic styles to <b> and <i>
    s = s.replace(/<span\b[^>]*font-weight:\s*(?:bold|[789]00)[^>]*font-style:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, "<b><i>$1</i></b>");
    s = s.replace(/<span\b[^>]*font-style:\s*italic[^>]*font-weight:\s*(?:bold|[789]00)[^>]*>([\s\S]*?)<\/span>/gi, "<b><i>$1</i></b>");
    s = s.replace(/<span\b[^>]*font-weight:\s*(?:bold|[789]00)[^>]*>([\s\S]*?)<\/span>/gi, "<b>$1</b>");
    s = s.replace(/<span\b[^>]*font-style:\s*italic[^>]*>([\s\S]*?)<\/span>/gi, "<i>$1</i>");

    // 2. Unwrap any remaining spans (loop up to 5 times for nested spans)
    for (let i = 0; i < 5; i++) {
      const next = s.replace(/<span\b[^>]*>([\s\S]*?)<\/span>/gi, "$1");
      if (next === s) break;
      s = next;
    }

    // 3. Normalize strong/em to <b>/<i>
    s = s.replace(/<strong\b[^>]*>/gi, "<b>").replace(/<\/strong>/gi, "</b>");
    s = s.replace(/<em\b[^>]*>/gi, "<i>").replace(/<\/em>/gi, "</i>");

    // 4. Unwrap other non-essential formatting tags (font, mark, u, small, a)
    for (let i = 0; i < 3; i++) {
      const next = s.replace(/<(?:font|mark|small|u|ins|del|s|strike|a)\b[^>]*>([\s\S]*?)<\/(?:font|mark|small|u|ins|del|s|strike|a)>/gi, "$1");
      if (next === s) break;
      s = next;
    }

    // 5. Remove any orphan/stray/unclosed tags (like leftover <span ...>, </span>, etc.)
    s = s.replace(/<\/?(?:span|font|mark|small|u|ins|del|s|strike|a)\b[^>]*>/gi, "");

    // 6. Clean empty b/i
    s = s.replace(/<b>\s*<\/b>/gi, "");
    s = s.replace(/<i>\s*<\/i>/gi, "");

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

    // Membedakan Enter disengaja vs bogus placeholder <br> bawaan browser
    function isTrailingBogusBr(brNode) {
      let next = brNode.nextSibling;
      while (next) {
        if (isBlockElement(next)) {
          return true; // Berada tepat sebelum block berikutnya
        }
        if (next.nodeType === 3 && next.nodeValue.length > 0) {
          return false; // Masih ada teks setelahnya
        }
        if (next.nodeType === 1) {
          if (next.tagName === "BR") return false; // Ada <br> lagi setelahnya (misal <br><br>)
          if ((next.textContent && next.textContent.length > 0) || (next.querySelector && next.querySelector("br"))) {
            return false;
          }
        }
        next = next.nextSibling;
      }
      return true; // Mencapai akhir container tanpa konten lanjutan -> bogus!
    }

    const lines = [];
    let currentLine = "";
    let hasOpenBlock = false;

    function flushLine() {
      lines.push(currentLine);
      currentLine = "";
      hasOpenBlock = false;
    }

    function walk(node) {
      for (let child = node.firstChild; child; child = child.nextSibling) {
        if (isBlockElement(child)) {
          if (hasOpenBlock || currentLine.length > 0) {
            flushLine();
          }
          hasOpenBlock = true;
          walk(child);
          flushLine();
        } else if (child.nodeType === 3) {
          hasOpenBlock = true;
          const val = child.nodeValue.replace(/\u00A0/g, " ");
          if (val.includes("\n")) {
            const parts = val.split("\n");
            for (let p = 0; p < parts.length; p++) {
              if (p > 0) flushLine();
              currentLine += parts[p];
            }
            hasOpenBlock = true;
          } else {
            currentLine += val;
          }
        } else if (child.nodeType === 1) {
          const tag = child.tagName;
          if (tag === "BR") {
            hasOpenBlock = true;
            if (!isTrailingBogusBr(child)) {
              flushLine();
            }
          } else if (tag === "B" || tag === "STRONG") {
            hasOpenBlock = true;
            currentLine += "<b>";
            walk(child);
            currentLine += "</b>";
          } else if (tag === "I" || tag === "EM") {
            hasOpenBlock = true;
            currentLine += "<i>";
            walk(child);
            currentLine += "</i>";
          } else {
            hasOpenBlock = true;
            walk(child);
          }
        }
      }
    }

    walk(el);
    if (hasOpenBlock || currentLine.length > 0) {
      flushLine();
    }

    let res = lines.join("\n")
      .replace(/<b>\s*<\/b>/gi, "")
      .replace(/<i>\s*<\/i>/gi, "");

    return res;
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

  // Parse inline Markdown / HTML tags into styled spans (100% clean, ZERO asterisks)
  function parseInlineSpans(str, defaultBold = false, defaultItalic = false) {
    if (!str) return [];
    // Decode HTML entities yang tersimpan agar teks tampil murni (tanpa &amp;)
    str = String(str)
      .replace(/&amp;/g, "&")
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&apos;/g, "'");
    // Otomatis bersihkan tanda bintang markdown warisan menjadi tag visual murni
    str = cleanMarkdownToHtml(str);

    const regex = /(<b><i>([\s\S]*?)<\/i><\/b>|<i><b>([\s\S]*?)<\/b><\/i>|<b>([\s\S]*?)<\/b>|<strong>([\s\S]*?)<\/strong>|<i>([\s\S]*?)<\/i>|<em>([\s\S]*?)<\/em>)/gi;
    const tokens = [];
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(str)) !== null) {
      if (match.index > lastIndex) {
        tokens.push({
          text: str.slice(lastIndex, match.index),
          bold: defaultBold,
          italic: defaultItalic
        });
      }

      const full = match[0];
      if (match[2] !== undefined || match[3] !== undefined) {
        tokens.push({ text: match[2] || match[3], bold: true, italic: true });
      } else if (match[4] !== undefined || match[5] !== undefined) {
        tokens.push({ text: match[4] || match[5], bold: true, italic: defaultItalic });
      } else if (match[6] !== undefined || match[7] !== undefined) {
        tokens.push({ text: match[6] || match[7], bold: defaultBold, italic: true });
      }

      lastIndex = regex.lastIndex;
    }

    if (lastIndex < str.length) {
      tokens.push({
        text: str.slice(lastIndex),
        bold: defaultBold,
        italic: defaultItalic
      });
    }

    return tokens;
  }

  function measureSpanWidth(str, bold, italic, fontSize, fontFamily) {
    const ctx = getMeasureContext();
    if (!ctx) return str.length * fontSize * 0.6;
    const fontStyle = italic ? "italic " : "";
    const fontWeight = bold ? "700 " : "500 ";
    ctx.font = `${fontStyle}${fontWeight}${fontSize}px ${fontFamily}`;
    return ctx.measureText(str).width;
  }

  function layoutNodeText(node) {
    if (!node.text) {
      return { lines: [], xPos: 0, startY: 0, lineHeight: 14, anchor: "middle", totalTextHeight: 0 };
    }

    const { width, height, text } = node;
    const paddingX = text.paddingX !== undefined ? text.paddingX : 14;
    const paddingY = text.paddingY !== undefined ? text.paddingY : 10;
    const fontSize = text.fontSize || 14;
    const fontFamily = text.fontFamily || "Poppins, sans-serif";
    const defaultBold = !!text.bold;
    const defaultItalic = !!text.italic;

    // Reduksi area aman berdasarkan geometri bentuk chart
    let shapeSafeReduction = 0;
    if (node.type === "parallelogram") {
      const skew = Math.min(width * 0.2, 28);
      shapeSafeReduction = skew * 2;
    } else if (node.type === "diamond") {
      shapeSafeReduction = Math.min(width * 0.22, 28);
    } else if (node.type === "triangle") {
      shapeSafeReduction = Math.min(width * 0.25, 30);
    } else if (node.type === "circle") {
      shapeSafeReduction = Math.min(width * 0.16, 20);
    } else if (node.type === "preparation") {
      shapeSafeReduction = Math.min(width * 0.18, 26) * 1.5;
    } else if (node.type === "predefined_process") {
      shapeSafeReduction = Math.min(width * 0.12, 18) * 2;
    } else if (node.type === "manual_operation") {
      shapeSafeReduction = Math.min(width * 0.18, 26);
    } else if (node.type === "display") {
      shapeSafeReduction = Math.min(width * 0.14, 18);
    } else if (node.type === "magnetic_tape") {
      shapeSafeReduction = Math.min(width * 0.2, 24);
    }

    const maxWidth = Math.max(8, width - (paddingX * 2) - shapeSafeReduction);
    const lineHeight = fontSize * 1.35;

    // Pecah kata panjang per karakter jika melebihi maxWidth
    function breakWordIfNeeded(word, bold, italic) {
      if (!word) return [];
      if (measureSpanWidth(word, bold, italic, fontSize, fontFamily) <= maxWidth) {
        return [{ word, bold, italic }];
      }
      const chunks = [];
      let cur = "";
      for (let i = 0; i < word.length; i++) {
        const ch = word[i];
        if (measureSpanWidth(cur + ch, bold, italic, fontSize, fontFamily) <= maxWidth) {
          cur += ch;
        } else {
          if (cur) chunks.push({ word: cur, bold, italic });
          cur = ch;
        }
      }
      if (cur) chunks.push({ word: cur, bold, italic });
      return chunks.length > 0 ? chunks : [{ word, bold, italic }];
    }

    const paragraphs = (text.content || "").split("\n");
    const lines = [];

    for (const para of paragraphs) {
      if (!para.trim()) {
        lines.push([{ text: "", bold: defaultBold, italic: defaultItalic }]);
        continue;
      }

      const spans = parseInlineSpans(para, defaultBold, defaultItalic);
      const words = [];

      for (const span of spans) {
        const parts = span.text.split(" ");
        for (let i = 0; i < parts.length; i++) {
          if (parts[i].length > 0) {
            const broken = breakWordIfNeeded(parts[i], span.bold, span.italic);
            words.push(...broken);
          }
        }
      }

      if (words.length === 0) {
        lines.push([{ text: "", bold: defaultBold, italic: defaultItalic }]);
        continue;
      }

      let currentSpans = [];
      let currentLineWidth = 0;

      for (let i = 0; i < words.length; i++) {
        const item = words[i];
        const itemW = measureSpanWidth(item.word, item.bold, item.italic, fontSize, fontFamily);
        const needSpace = currentSpans.length > 0;
        const prevSpan = currentSpans[currentSpans.length - 1];
        const spaceW = needSpace 
          ? measureSpanWidth(" ", prevSpan ? prevSpan.bold : item.bold, prevSpan ? prevSpan.italic : item.italic, fontSize, fontFamily)
          : 0;
        const additionalW = spaceW + itemW;

        if (currentLineWidth + additionalW <= maxWidth || currentSpans.length === 0) {
          if (needSpace) {
            currentSpans[currentSpans.length - 1].text += " ";
          }
          const lastSpan = currentSpans[currentSpans.length - 1];
          if (lastSpan && lastSpan.bold === item.bold && lastSpan.italic === item.italic) {
            lastSpan.text += item.word;
          } else {
            currentSpans.push({ text: item.word, bold: item.bold, italic: item.italic });
          }
          currentLineWidth += additionalW;
        } else {
          lines.push(currentSpans);
          currentSpans = [{ text: item.word, bold: item.bold, italic: item.italic }];
          currentLineWidth = itemW;
        }
      }

      if (currentSpans.length > 0) {
        lines.push(currentSpans);
      }
    }

    let anchor = "middle";
    let xPos = width / 2;
    if (text.align === "left") {
      anchor = "start";
      xPos = paddingX + (shapeSafeReduction / 2);
    }
    if (text.align === "right") {
      anchor = "end";
      xPos = width - paddingX - (shapeSafeReduction / 2);
    }

    const verticalAlign = (node.text && node.text.verticalAlign) || "middle";
    const totalTextHeight = lines.length * lineHeight;
    let availableHeight = height - paddingY * 2;
    let startY = 0;

    // Centering vertikal khusus tabung database agar tidak menabrak elips atas
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

    return { lines, xPos, startY, lineHeight, anchor, totalTextHeight };
  }

  let activeEditingNodeId = null;
  let activeEditingFinishFn = null;

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
    return 60; // rectangle, rounded, parallelogram, manual_operation, preparation, predefined_process, display, disk_storage, punch_card
  }

  function openInlineEditor(nodeId, doc, uiState, dom, onSave, onLiveRender) {
    const node = doc.nodes[nodeId];
    if (!node || node.type === "image") return;

    // Jika baseHeight belum tercatat atau node belum pernah di-resize manual, catat tinggi acuan dasar
    if (node.baseHeight === undefined) {
      node.baseHeight = Math.max(getDefaultShapeHeight(node.type), Math.min(node.height, 80));
    }

    // Jika ada node lain yang sedang diedit, selesaikan dulu
    if (activeEditingNodeId && activeEditingFinishFn) {
      activeEditingFinishFn();
    }

    const nodeGroupEl = document.querySelector(`.node-group[data-id="${nodeId}"]`);
    if (!nodeGroupEl) return;

    activeEditingNodeId = nodeId;
    uiState.mode = "EDITING_TEXT";
    const openTime = Date.now();

    // Sembunyikan SVG text bawaan selama sedang mengedit langsung
    const curSvgText = document.getElementById(`node-text-${nodeId}`);
    if (curSvgText) {
      curSvgText.style.display = "none";
    }

    // Bersihkan foreignObject lama jika ada
    const oldForeign = nodeGroupEl.querySelector(".node-inline-foreign");
    if (oldForeign) oldForeign.remove();

    // Buat foreignObject langsung di dalam grup SVG node! (100% sejajar geometri node)
    const fo = document.createElementNS("http://www.w3.org/2000/svg", "foreignObject");
    fo.setAttribute("class", "node-inline-foreign");
    fo.setAttribute("x", "0");
    fo.setAttribute("y", "0");
    fo.setAttribute("width", String(node.width));
    fo.setAttribute("height", String(node.height));

    // Gunakan contenteditable DIV agar menghasilkan pemformatan visual murni seperti Word (tanpa bintang **)
    const editor = document.createElement("div");
    editor.className = "node-seamless-editor";
    editor.contentEditable = "true";
    editor.setAttribute("spellcheck", "false");
    editor.setAttribute("role", "textbox");
    editor.setAttribute("aria-multiline", "true");

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

    const rawContent = (node.text.content || "").trim();
    const isPh = !rawContent || rawContent.toLowerCase() === "insert text" || !!node.text.isPlaceholder;

    // Bersihkan sintaks markdown bintang dan span liar menjadi HTML visual murni
    const cleanContent = sanitizeHtmlFormatting(String(node.text.content || "").replace(/&amp;/g, "&"));
    const initialHtml = isPh ? "" : cleanMarkdownToHtml(cleanContent).replace(/&(?!(amp|lt|gt|quot|apos|nbsp);)/g, "&amp;");
    editor.innerHTML = initialHtml;
    editor.setAttribute("data-placeholder", "Ketik teks di sini...");

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
      let safePadX = node.text.paddingX !== undefined ? node.text.paddingX : 14;
      if (node.type === "parallelogram") {
        safePadX += Math.min(node.width * 0.2, 28);
      } else if (node.type === "diamond") {
        safePadX += Math.min(node.width * 0.22, 28);
      } else if (node.type === "triangle") {
        safePadX += Math.min(node.width * 0.25, 30);
      } else if (node.type === "preparation") {
        safePadX += Math.min(node.width * 0.18, 26);
      } else if (node.type === "predefined_process") {
        safePadX += Math.min(node.width * 0.12, 18);
      } else if (node.type === "manual_operation") {
        safePadX += Math.min(node.width * 0.18, 26);
      } else if (node.type === "display") {
        safePadX += Math.min(node.width * 0.14, 18);
      }
      editor.style.paddingTop = `${Math.round(padTop)}px`;
      editor.style.paddingLeft = `${Math.round(safePadX)}px`;
      editor.style.paddingRight = `${Math.round(safePadX)}px`;
      editor.style.paddingBottom = "0px";
    }

    adjustPadding();
    fo.appendChild(editor);
    nodeGroupEl.appendChild(fo);

    // Bersihkan artifak seleksi teks bawaan browser
    if (window.getSelection) {
      window.getSelection().removeAllRanges();
    }

    // Isolasi event mouse agar pengetikan dan drag teks tidak bocor ke kanvas
    const stopPropagation = (e) => e.stopPropagation();
    editor.addEventListener("mousedown", stopPropagation);
    editor.addEventListener("mousemove", stopPropagation);
    editor.addEventListener("mouseup", stopPropagation);
    editor.addEventListener("click", stopPropagation);
    editor.addEventListener("dblclick", stopPropagation);
    editor.addEventListener("wheel", stopPropagation);

    const initialTextSnapshot = node.text?.content ?? "";

    function onLiveInput() {
      const val = serializeEditorDOM(editor);
      node.text.content = val;
      node.text.isPlaceholder = !editor.textContent.trim();
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
    }

    editor.addEventListener("input", onLiveInput);

    // Handle paste untuk membersihkan styling luar yang tidak diinginkan
    editor.addEventListener("paste", (e) => {
      e.stopPropagation();
      e.preventDefault();
      const text = (e.clipboardData || window.clipboardData).getData("text/plain");
      document.execCommand("insertText", false, text);
      onLiveInput();
    });

    let isFinished = false;
    function finishEditing() {
      if (isFinished) return;
      if (Date.now() - openTime < 200) return; // Anti-blur guard
      isFinished = true;

      uiState.mode = "IDLE";
      activeEditingNodeId = null;
      activeEditingFinishFn = null;

      const previousContent = node.text?.content ?? "";
      const serialized = serializeEditorDOM(editor);

      const rawText = serialized.trim();
      const isPlaceholder = rawText.toLowerCase() === "insert text";

      if (isPlaceholder || !rawText) {
        node.text.content = "";
        node.text.isPlaceholder = false;
      } else {
        node.text.content = serialized;
        node.text.isPlaceholder = false;
      }

      // DIRTY-CHECK GUARD:
      // Hanya sesuaikan tinggi jika teks memang berubah dari kondisi awal sebelum diedit.
      // Jika teks sama sekali tidak berubah (atau hanya klik lalu keluar), tinggi node 100% dipertahankan.
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
      e.stopPropagation(); // Shortcut keyboard seperti Delete / Ctrl+A bekerja lokal pada editor, bukan kanvas

      // Ctrl + B: Tebal (Bold) visual murni seperti di Word
      if ((e.ctrlKey || e.metaKey) && (e.key === "b" || e.key === "B" || e.code === "KeyB")) {
        e.preventDefault();
        document.execCommand("bold", false, null);
        onLiveInput();
        return;
      }

      // Ctrl + I: Miring (Italic) visual murni seperti di Word
      if ((e.ctrlKey || e.metaKey) && (e.key === "i" || e.key === "I" || e.code === "KeyI")) {
        e.preventDefault();
        document.execCommand("italic", false, null);
        onLiveInput();
        return;
      }

      // Ctrl + Enter: Simpan dan selesai mengedit
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter") {
        e.preventDefault();
        finishEditing();
        return;
      }

      // Enter langsung atau Shift + Enter: Langsung buat baris baru di bawahnya
      if (e.key === "Enter") {
        // Biarkan browser native menangani Enter sehingga kursor 100% berada di baris baru dengan fokus aktif
        setTimeout(onLiveInput, 0);
        return;
      }

      if (e.key === "Escape") {
        e.preventDefault();
        finishEditing();
        return;
      }
    });

    // Delayed focus & caret positioning
    setTimeout(() => {
      if (uiState.mode === "EDITING_TEXT" && activeEditingNodeId === nodeId) {
        editor.focus();
        if (window.getSelection && document.createRange) {
          const range = document.createRange();
          range.selectNodeContents(editor);
          if (!isPh) {
            range.collapse(false); // Letakkan kursor di akhir teks jika sudah ada isi
          }
          const sel = window.getSelection();
          sel.removeAllRanges();
          sel.addRange(range);
        }
      }
    }, 30);
  }

  function toggleSelectionFormatting(editor, marker) {
    const cmd = (marker === "**" || marker === "bold") ? "bold" : "italic";
    document.execCommand(cmd, false, null);
    if (editor && typeof editor.dispatchEvent === "function") {
      editor.dispatchEvent(new Event("input"));
    }
  }

  exports.TextEditor = {
    layoutNodeText,
    open: openInlineEditor,
    close: closeInlineEditor,
    toggleSelectionFormatting,
    parseInlineSpans,
    cleanMarkdownToHtml,
    serializeEditorHtml,
    serializeEditorDOM,
    computeRequiredNodeHeight,
    sanitizeHtmlFormatting
  };

})(window.MinimalFlow);
