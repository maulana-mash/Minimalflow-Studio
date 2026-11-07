<script lang="ts">
  import type { FlowNode, FlowConnector, LineStyle, MarkerType } from '../types';

  export let selectedType: 'node' | 'edge' | null = null;
  export let selectedNode: FlowNode | null = null;
  export let selectedEdge: FlowConnector | null = null;

  export let onNodeChange: (updated: Partial<FlowNode>) => void;
  export let onEdgeChange: (updated: Partial<FlowConnector>) => void;
  export let onStartEditText: () => void;
  export let onRotateNode: () => void;
  export let onToggleLockNode: () => void;

  const SWATCHES = [
    { fill: "#ffffff", stroke: "#18181b", label: "Putih" },
    { fill: "#f4f4f5", stroke: "#18181b", label: "Abu Terang" },
    { fill: "#e0f2fe", stroke: "#0284c7", label: "Biru Muda" },
    { fill: "#dcfce7", stroke: "#16a34a", label: "Hijau Muda" },
    { fill: "#fef9c3", stroke: "#ca8a04", label: "Kuning Pastel" },
    { fill: "#fee2e2", stroke: "#dc2626", label: "Merah Pastel" },
    { fill: "#18181b", stroke: "#18181b", label: "Hitam Solid" },
    { fill: "transparent", stroke: "#18181b", label: "Transparan" }
  ];

  // Helper bindings for Node Text
  function updateNodeText(changes: Partial<FlowNode['text']>) {
    if (!selectedNode) return;
    onNodeChange({
      text: {
        ...selectedNode.text,
        ...changes
      }
    });
  }

  function handleFontSizeNum(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 8 && val <= 48) {
      updateNodeText({ fontSize: val });
    }
  }

  function handlePadXNum(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 0 && val <= 50) {
      updateNodeText({ paddingX: val });
    }
  }

  function handlePadYNum(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 0 && val <= 50) {
      updateNodeText({ paddingY: val });
    }
  }

  function handleWidth(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 40 && val <= 1000) {
      onNodeChange({ width: val });
    }
  }

  function handleHeight(e: Event) {
    const val = parseInt((e.target as HTMLInputElement).value, 10);
    if (!isNaN(val) && val >= 30 && val <= 800) {
      onNodeChange({ height: val });
    }
  }
</script>

{#if selectedType === 'node' && selectedNode}
  <!-- Two-Tier Floating Properties Bar (Bertumpuk 2 Baris Tanpa Scrollbar Horizontal) -->
  <div class="floating-properties-panel" role="toolbar" aria-label="Node Properties">
    <!-- BARIS 1: Font, Ukuran, Format Teks, Margins X & Y -->
    <div class="prop-row">
      <span class="prop-tag">NODE</span>

      <!-- Font Family -->
      <select 
        class="prop-select" 
        value={selectedNode.text.fontFamily}
        on:change={(e) => updateNodeText({ fontFamily: e.currentTarget.value })}
      >
        <option value="Poppins, sans-serif">Poppins (Sans)</option>
        <option value="Inter, sans-serif">Inter (UI)</option>
        <option value="Fira Code, monospace">Fira Code (Mono)</option>
      </select>

      <!-- Font Size: Numerik + Select berdampingan -->
      <div class="prop-control-group">
        <input 
          type="number" 
          class="prop-input-number" 
          style="width: 44px;" 
          min="8" 
          max="48"
          value={selectedNode.text.fontSize}
          on:input={handleFontSizeNum}
          title="Ketik Ukuran Font (px)"
        />
        <select 
          class="prop-select" 
          value={selectedNode.text.fontSize}
          on:change={(e) => updateNodeText({ fontSize: parseInt(e.currentTarget.value, 10) })}
        >
          <option value="11">11 px</option>
          <option value="12">12 px</option>
          <option value="13">13 px</option>
          <option value="14">14 px</option>
          <option value="16">16 px</option>
          <option value="18">18 px</option>
          <option value="20">20 px</option>
          <option value="24">24 px</option>
        </select>
      </div>

      <!-- Format Teks: Bold, Italic, Underline -->
      <div class="prop-control-group">
        <button 
          class="prop-btn" 
          class:active={selectedNode.text.bold}
          title="Tebal (Bold)"
          on:click={() => updateNodeText({ bold: !selectedNode.text.bold })}
        >
          <strong>B</strong>
        </button>
        <button 
          class="prop-btn" 
          class:active={selectedNode.text.italic}
          title="Miring (Italic)"
          on:click={() => updateNodeText({ italic: !selectedNode.text.italic })}
        >
          <em>I</em>
        </button>
        <button 
          class="prop-btn" 
          class:active={selectedNode.text.underline}
          title="Garis Bawah (Underline)"
          on:click={() => updateNodeText({ underline: !selectedNode.text.underline })}
        >
          <u>U</u>
        </button>
      </div>

      <!-- Alignment -->
      <select 
        class="prop-select" 
        value={selectedNode.text.align}
        on:change={(e) => updateNodeText({ align: e.currentTarget.value as any })}
      >
        <option value="center">Tengah</option>
        <option value="left">Kiri</option>
        <option value="right">Kanan</option>
      </select>

      <!-- Pad-X (Margin X): Input Numerik + Slider Berdampingan -->
      <div class="prop-control-group">
        <span class="prop-label">Pad-X</span>
        <input 
          type="number" 
          class="prop-input-number" 
          style="width: 42px;" 
          min="0" 
          max="50"
          value={selectedNode.text.paddingX}
          on:input={handlePadXNum}
          title="Ketik Margin Horizontal (px)"
        />
        <input 
          type="range" 
          class="prop-slider" 
          min="0" 
          max="50"
          value={selectedNode.text.paddingX}
          on:input={handlePadXNum}
          title="Geser Margin Horizontal"
        />
      </div>

      <!-- Pad-Y (Margin Y): Input Numerik + Slider Berdampingan -->
      <div class="prop-control-group">
        <span class="prop-label">Pad-Y</span>
        <input 
          type="number" 
          class="prop-input-number" 
          style="width: 42px;" 
          min="0" 
          max="50"
          value={selectedNode.text.paddingY}
          on:input={handlePadYNum}
          title="Ketik Margin Vertikal (px)"
        />
        <input 
          type="range" 
          class="prop-slider" 
          min="0" 
          max="50"
          value={selectedNode.text.paddingY}
          on:input={handlePadYNum}
          title="Geser Margin Vertikal"
        />
      </div>
    </div>

    <!-- BARIS 2: Dimensi W/H, Palet Warna & Swatches, Aksi Cepat -->
    <div class="prop-row">
      <div class="prop-control-group">
        <span class="prop-label">W</span>
        <input 
          type="number" 
          class="prop-input-number" 
          value={selectedNode.width}
          on:input={handleWidth}
          title="Lebar Chart (px)"
        />
        <span class="prop-label" style="margin-left: 4px;">H</span>
        <input 
          type="number" 
          class="prop-input-number" 
          value={selectedNode.height}
          on:input={handleHeight}
          title="Tinggi Chart (px)"
        />
      </div>

      <div class="prop-control-group prop-swatches">
        {#each SWATCHES as sw}
          <button 
            class="color-swatch-circle"
            class:active={selectedNode.style.fill === sw.fill}
            style="background: {sw.fill === 'transparent' ? 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%) 50% / 6px 6px' : sw.fill}; border-color: {sw.stroke};"
            title={sw.label}
            on:click={() => {
              const textColor = sw.fill === '#18181b' ? '#ffffff' : '#18181b';
              onNodeChange({
                style: { ...selectedNode.style, fill: sw.fill },
                text: { ...selectedNode.text, color: textColor }
              });
            }}
          ></button>
        {/each}

        <!-- Native Color Picker Bebas -->
        <label class="color-swatch-circle" title="Pilih Warna Bebas" style="position: relative; overflow: hidden; cursor: pointer; display: flex; align-items: center; justify-content: center;">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <circle cx="12" cy="12" r="10"></circle>
          </svg>
          <input 
            type="color" 
            style="opacity: 0; position: absolute; inset: 0; width: 100%; height: 100%; cursor: pointer;"
            value={selectedNode.style.fill.startsWith('#') ? selectedNode.style.fill : '#ffffff'}
            on:change={(e) => onNodeChange({ style: { ...selectedNode.style, fill: e.currentTarget.value } })}
          />
        </label>
      </div>

      <div class="prop-control-group" style="margin-left: auto;">
        <!-- Tombol Edit Teks Langsung -->
        <button class="prop-btn" title="Ketik Teks Langsung (Double-Click)" on:click={onStartEditText}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
          <span>Teks</span>
        </button>

        <!-- Tombol Rotasi 90 Derajat -->
        <button class="prop-btn" title="Putar 90 Derajat" on:click={onRotateNode}>
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        </button>

        <!-- Tombol Kunci Posisi -->
        <button 
          class="prop-btn" 
          class:active={selectedNode.locked} 
          title={selectedNode.locked ? 'Buka Kunci Posisi' : 'Kunci Posisi'}
          on:click={onToggleLockNode}
        >
          {#if selectedNode.locked}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          {:else}
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
          {/if}
        </button>
      </div>
    </div>
  </div>

{:else if selectedType === 'edge' && selectedEdge}
  <!-- Toolbar Edge / Kabel Penghubung (1 Baris Ringkas) -->
  <div class="floating-properties-panel" role="toolbar" aria-label="Edge Properties">
    <div class="prop-row">
      <span class="prop-tag">KABEL</span>

      <!-- Tipe Garis -->
      <select 
        class="prop-select" 
        value={selectedEdge.type}
        on:change={(e) => onEdgeChange({ type: e.currentTarget.value as LineStyle })}
      >
        <option value="step">Siku (Orthogonal)</option>
        <option value="bezier">Lengkung (Bezier)</option>
        <option value="straight">Lurus (Straight)</option>
      </select>

      <!-- Tebal Garis: 1.0 sampai 5.0 px -->
      <div class="prop-control-group">
        <span class="prop-label">Tebal</span>
        <select 
          class="prop-select" 
          value={String(selectedEdge.style.strokeWidth)}
          on:change={(e) => onEdgeChange({ style: { ...selectedEdge.style, strokeWidth: parseFloat(e.currentTarget.value) } })}
        >
          <option value="1">1.0 px</option>
          <option value="1.5">1.5 px</option>
          <option value="2">2.0 px</option>
          <option value="2.5">2.5 px</option>
          <option value="3">3.0 px</option>
          <option value="4">4.0 px</option>
          <option value="5">5.0 px</option>
        </select>
      </div>

      <!-- Gaya Garis: Solid / Putus-putus -->
      <select 
        class="prop-select" 
        value={selectedEdge.style.dashed}
        on:change={(e) => onEdgeChange({ style: { ...selectedEdge.style, dashed: e.currentTarget.value as any } })}
      >
        <option value="solid">Garis Solid</option>
        <option value="dashed">Putus-putus</option>
      </select>

      <!-- Panah Ujung -->
      <div class="prop-control-group">
        <button 
          class="prop-btn" 
          class:active={selectedEdge.style.markerStart === 'arrow'}
          title="Panah di Titik Awal"
          on:click={() => {
            const next = selectedEdge.style.markerStart === 'arrow' ? 'none' : 'arrow';
            onEdgeChange({ style: { ...selectedEdge.style, markerStart: next } });
          }}
        >
          <span>←</span>
        </button>
        <button 
          class="prop-btn" 
          class:active={selectedEdge.style.markerEnd === 'arrow'}
          title="Panah di Titik Akhir"
          on:click={() => {
            const next = selectedEdge.style.markerEnd === 'arrow' ? 'none' : 'arrow';
            onEdgeChange({ style: { ...selectedEdge.style, markerEnd: next } });
          }}
        >
          <span>→</span>
        </button>
      </div>
    </div>
  </div>
{/if}
