<script lang="ts">
  import { onMount, tick } from 'svelte';
  import type { FlowNode } from '../types';
  import { layoutNodeText } from '../engine/textLayout';

  export let node: FlowNode | null = null;
  export let pan: { x: number; y: number } = { x: 0, y: 0 };
  export let zoom: number = 1.0;
  export let active: boolean = false;

  export let onCommit: (newContent: string) => void;
  export let onCancel: () => void;
  export let onResizeHeight: (newHeight: number) => void;

  let textareaEl: HTMLTextAreaElement;
  let textValue: string = "";

  $: if (active && node) {
    const isPh = !!node.text.isPlaceholder || (node.text.content || "").trim().toLowerCase() === "insert text";
    textValue = isPh ? "Insert text" : (node.text.content || "");
    focusAndSelect();
  }

  async function focusAndSelect() {
    await tick();
    if (textareaEl) {
      textareaEl.focus();
      textareaEl.select();
      adjustVerticalPadding();
    }
  }

  function adjustVerticalPadding() {
    if (!textareaEl || !node) return;
    const testNode: FlowNode = {
      ...node,
      text: { ...node.text, content: textValue }
    };
    const layout = layoutNodeText(testNode);
    const scaledTextH = layout.totalTextHeight * zoom;
    const containerH = node.height * zoom;
    const padY = (node.text.paddingY || 10) * zoom;
    const topPad = Math.max(padY, (containerH - scaledTextH) / 2);
    textareaEl.style.paddingTop = `${topPad}px`;
  }

  function handleInput() {
    adjustVerticalPadding();
    if (!node) return;
    const testNode: FlowNode = {
      ...node,
      text: { ...node.text, content: textValue }
    };
    const layout = layoutNodeText(testNode);
    const minRequiredH = layout.totalTextHeight + (node.text.paddingY || 10) * 2;
    if (minRequiredH > node.height) {
      onResizeHeight(Math.round(minRequiredH + 8));
    }
  }

  function handleKeyDown(e: KeyboardEvent) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      finish();
    } else if (e.key === "Escape") {
      e.preventDefault();
      onCancel();
    }
  }

  function handleBlur() {
    finish();
  }

  function finish() {
    if (!active) return;
    const trimmed = textValue.trim();
    if (!trimmed || trimmed.toLowerCase() === "insert text") {
      onCommit("Insert text");
    } else {
      // Huruf pertama otomatis kapital jika belum kapital
      const capitalized = trimmed.charAt(0).toUpperCase() + trimmed.slice(1);
      onCommit(capitalized);
    }
  }
</script>

{#if active && node}
  <textarea
    bind:this={textareaEl}
    class="inline-text-editor-textarea"
    style="
      display: block;
      left: {node.x * zoom + pan.x}px;
      top: {node.y * zoom + pan.y}px;
      width: {node.width * zoom}px;
      height: {node.height * zoom}px;
      font-size: {node.text.fontSize * zoom}px;
      font-family: {node.text.fontFamily};
      font-weight: {node.text.bold ? '700' : '500'};
      font-style: {node.text.italic ? 'italic' : 'normal'};
      text-decoration: {node.text.underline ? 'underline' : 'none'};
      text-align: {node.text.align};
      color: {node.text.color};
      padding-left: {(node.text.paddingX || 12) * zoom}px;
      padding-right: {(node.text.paddingX || 12) * zoom}px;
      transform: {node.rotation ? `rotate(${node.rotation}deg)` : 'none'};
      transform-origin: center center;
    "
    bind:value={textValue}
    on:input={handleInput}
    on:keydown={handleKeyDown}
    on:blur={handleBlur}
  ></textarea>
{/if}
