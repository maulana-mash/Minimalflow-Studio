<script lang="ts">
  import type { FlowDocument } from '../types';
  import { WORKSPACE_PRESETS } from '../engine/canvasRenderer';

  export let doc: FlowDocument;
  export let canUndo: boolean = false;
  export let canRedo: boolean = false;

  export let onUndo: () => void;
  export let onRedo: () => void;
  export let onDelete: () => void;
  export let onClearCanvas: () => void;
  export let onToggleTheme: () => void;
  export let onOpenProjectsModal: () => void;
  export let onOpenJson: (file: File) => void;
  export let onExportAction: (action: string) => void;
  export let onPresetChange: (presetKey: string) => void;
  export let onToggleOrientation: () => void;

  let showExportDropdown = false;
  let fileInputJson: HTMLInputElement;

  function handleFileSelect(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files && input.files[0]) {
      onOpenJson(input.files[0]);
      input.value = "";
    }
  }

  function handleExportClick(action: string) {
    showExportDropdown = false;
    onExportAction(action);
  }

  function toggleDropdown(e: MouseEvent) {
    e.stopPropagation();
    showExportDropdown = !showExportDropdown;
  }

  // Menutup dropdown saat klik di luar
  function handleWindowClick() {
    showExportDropdown = false;
  }
</script>

<svelte:window on:click={handleWindowClick} />

<header class="app-header">
  <div class="brand-section">
    <button class="brand-logo-btn" title="Kelola Multi-Proyek" on:click={onOpenProjectsModal}>
      <div class="brand-logo-icon">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--bg-surface)" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
          <rect x="3" y="3" width="7" height="7"></rect>
          <rect x="14" y="3" width="7" height="7"></rect>
          <rect x="14" y="14" width="7" height="7"></rect>
          <rect x="3" y="14" width="7" height="7"></rect>
        </svg>
      </div>
      <span class="brand-title">MinimalFlow Studio</span>
    </button>

    <div class="header-divider"></div>

    <button class="header-btn" title="Undo (Ctrl+Z)" disabled={!canUndo} on:click={onUndo}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 7v6h6"></path>
        <path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"></path>
      </svg>
      <span>Undo</span>
    </button>

    <button class="header-btn" title="Redo (Ctrl+Y)" disabled={!canRedo} on:click={onRedo}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 7v6h-6"></path>
        <path d="M3 17a9 9 0 0 1 9-9 9 9 0 0 1 6 2.3L21 13"></path>
      </svg>
      <span>Redo</span>
    </button>
  </div>

  <div class="brand-section">
    <!-- Preset Workspace Boundary -->
    <select 
      class="header-select" 
      value={doc.canvas.workspace.preset} 
      on:change={(e) => onPresetChange(e.currentTarget.value)}
      title="Rasio Workspace Ekspor"
    >
      {#each Object.entries(WORKSPACE_PRESETS) as [key, val]}
        <option value={key}>{val.name}</option>
      {/each}
    </select>

    <button 
      class="header-btn" 
      title="Ubah Orientasi Kanvas (Landscape / Portrait)" 
      on:click={onToggleOrientation}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <rect x="2" y="6" width="20" height="12" rx="2"></rect>
      </svg>
      <span>{doc.canvas.workspace.orientation === 'landscape' ? 'Landscape' : 'Portrait'}</span>
    </button>

    <div class="header-divider"></div>

    <button class="header-btn" title="Hapus Elemen Terpilih (Del)" on:click={onDelete}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="3 6 5 6 21 6"></polyline>
        <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
      </svg>
      <span>Hapus</span>
    </button>

    <button class="header-btn" title="Bersihkan Seluruh Kanvas" on:click={onClearCanvas}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <circle cx="12" cy="12" r="10"></circle>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"></line>
      </svg>
      <span>Bersihkan</span>
    </button>

    <div class="header-divider"></div>

    <!-- Dark/Light Theme Toggle -->
    <button class="header-btn" title="Ganti Tema (Gelap / Terang)" on:click={onToggleTheme}>
      {#if doc.theme === 'dark'}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <circle cx="12" cy="12" r="5"></circle>
          <line x1="12" y1="1" x2="12" y2="3"></line>
          <line x1="12" y1="21" x2="12" y2="23"></line>
          <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"></line>
          <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"></line>
          <line x1="1" y1="12" x2="3" y2="12"></line>
          <line x1="21" y1="12" x2="23" y2="12"></line>
          <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"></line>
          <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"></line>
        </svg>
      {:else}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"></path>
        </svg>
      {/if}
    </button>

    <!-- Open Project JSON File -->
    <input 
      type="file" 
      accept=".json" 
      style="display: none;" 
      bind:this={fileInputJson} 
      on:change={handleFileSelect} 
    />
    <button class="header-btn" title="Buka File JSON" on:click={() => fileInputJson.click()}>
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z"></path>
      </svg>
      <span>Buka</span>
    </button>

    <!-- Export Dropdown -->
    <div class="dropdown-wrapper">
      <button class="header-btn primary" title="Menu Ekspor & Simpan" on:click={toggleDropdown}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
          <polyline points="7 10 12 15 17 10"></polyline>
          <line x1="12" y1="15" x2="12" y2="3"></line>
        </svg>
        <span>Ekspor</span>
      </button>

      {#if showExportDropdown}
        <div class="dropdown-menu show">
          <button class="dropdown-item" on:click={() => handleExportClick('export-svg')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
            <span>Ekspor Vektor SVG</span>
          </button>
          <button class="dropdown-item" on:click={() => handleExportClick('export-png-trans')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>PNG Transparan (2x)</span>
          </button>
          <button class="dropdown-item" on:click={() => handleExportClick('export-png-white')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle><polyline points="21 15 16 10 5 21"></polyline></svg>
            <span>PNG Background Putih</span>
          </button>
          <button class="dropdown-item" on:click={() => handleExportClick('export-jpg')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="3" width="18" height="18" rx="2"></rect><circle cx="8.5" cy="8.5" r="1.5"></circle></svg>
            <span>JPG Kualitas Tinggi</span>
          </button>
          <button class="dropdown-item" on:click={() => handleExportClick('export-pdf')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line></svg>
            <span>Dokumen PDF (jsPDF)</span>
          </button>
          <button class="dropdown-item" on:click={() => handleExportClick('copy-clipboard')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
            <span>Salin ke Clipboard</span>
          </button>
          <div class="context-menu-divider"></div>
          <button class="dropdown-item" on:click={() => handleExportClick('save-json')}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"></path><polyline points="17 21 17 13 7 13 7 21"></polyline><polyline points="7 3 7 8 15 8"></polyline></svg>
            <span>Simpan Project JSON</span>
          </button>
        </div>
      {/if}
    </div>
  </div>
</header>
