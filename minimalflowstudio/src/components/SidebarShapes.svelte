<script lang="ts">
  import type { NodeType } from '../types';

  export let onCreateNode: (type: NodeType) => void;
  export let onUploadImageFile: (file: File) => void;

  let fileInput: HTMLInputElement;

  const SHAPE_LIST: Array<{ type: NodeType; label: string; svgD: string; isCircle?: boolean; isCylinder?: boolean }> = [
    { type: "rectangle", label: "Proses", svgD: "M 4 8 H 28 V 24 H 4 Z" },
    { type: "rounded", label: "Terminator", svgD: "M 10 8 H 22 A 8 8 0 0 1 30 16 A 8 8 0 0 1 22 24 H 10 A 8 8 0 0 1 2 16 A 8 8 0 0 1 10 8 Z" },
    { type: "diamond", label: "Keputusan", svgD: "M 16 6 L 28 16 L 16 26 L 4 16 Z" },
    { type: "circle", label: "Lingkaran", svgD: "", isCircle: true },
    { type: "parallelogram", label: "Data I/O", svgD: "M 8 8 L 28 8 L 24 24 L 4 24 Z" },
    { type: "cylinder", label: "Database", svgD: "M 6 10 A 10 4 0 0 1 26 10 V 22 A 10 4 0 0 1 6 22 Z M 6 10 A 10 4 0 0 0 26 10", isCylinder: true },
    { type: "triangle", label: "Segitiga", svgD: "M 16 6 L 28 26 L 4 26 Z" }
  ];

  function handleDragStart(e: DragEvent, type: NodeType) {
    if (e.dataTransfer) {
      e.dataTransfer.setData("shape-type", type);
    }
  }

  function handleFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      onUploadImageFile(input.files[0]);
      input.value = "";
    }
  }
</script>

<aside class="sidebar">
  <div class="sidebar-heading">Bentuk Bagan</div>

  <div class="shapes-grid">
    {#each SHAPE_LIST as s}
      <button 
        class="shape-card" 
        draggable="true"
        on:dragstart={(e) => handleDragStart(e, s.type)}
        on:click={() => onCreateNode(s.type)}
        title="Klik atau seret ke kanvas: {s.label}"
      >
        <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
          {#if s.isCircle}
            <circle cx="16" cy="16" r="10" />
          {:else}
            <path d={s.svgD} />
          {/if}
        </svg>
        <span>{s.label}</span>
      </button>
    {/each}

    <!-- Kartu Upload Gambar / Ikon -->
    <button 
      class="shape-card" 
      title="Upload Foto / Gambar / Ikon (PNG, JPG, SVG)"
      on:click={() => fileInput.click()}
    >
      <input 
        type="file" 
        accept="image/*,.svg" 
        style="display: none;" 
        bind:this={fileInput}
        on:change={handleFileChange}
      />
      <svg viewBox="0 0 32 32" fill="none" stroke="currentColor" stroke-width="1.5">
        <rect x="4" y="6" width="24" height="20" rx="3" />
        <circle cx="10" cy="12" r="2" />
        <path d="M28 20 L21 13 L8 26" />
      </svg>
      <span>Unggah Gambar</span>
    </button>
  </div>
</aside>
