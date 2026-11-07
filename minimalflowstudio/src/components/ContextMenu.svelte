<script lang="ts">
  export let visible: boolean = false;
  export let x: number = 0;
  export let y: number = 0;
  export let targetType: 'node' | 'edge' | 'canvas' | null = null;
  export let isNodeLocked: boolean = false;

  export let onAction: (action: string) => void;
  export let onClose: () => void;

  function handleAction(action: string) {
    onAction(action);
    onClose();
  }

  function handleWindowClick() {
    if (visible) onClose();
  }
</script>

<svelte:window on:click={handleWindowClick} />

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div 
    class="app-context-menu show" 
    style="left: {x}px; top: {y}px;"
    on:click|stopPropagation
    tabindex="-1"
    role="menu"
  >
    {#if targetType === 'node'}
      <button class="context-menu-item" on:click={() => handleAction('edit-text')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
        <span>Edit Teks</span>
      </button>

      <button class="context-menu-item" on:click={() => handleAction('copy')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
        <span>Salin (Ctrl+C)</span>
      </button>

      <button class="context-menu-item" on:click={() => handleAction('duplicate')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
        <span>Duplikat</span>
      </button>

      <button class="context-menu-item" on:click={() => handleAction('toggle-lock')}>
        {#if isNodeLocked}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 10 0v4"></path></svg>
          <span>Buka Kunci Posisi</span>
        {:else}
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"></rect><path d="M7 11V7a5 5 0 0 1 9.9-1"></path></svg>
          <span>Kunci Posisi</span>
        {/if}
      </button>

      <button class="context-menu-item" on:click={() => handleAction('rotate')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
        <span>Putar 90°</span>
      </button>
    {/if}

    <button class="context-menu-item" on:click={() => handleAction('paste')}>
      <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path><rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect></svg>
      <span>Tempel (Ctrl+V)</span>
    </button>

    {#if targetType === 'node' || targetType === 'edge'}
      <div class="context-menu-divider"></div>
      <button class="context-menu-item danger" on:click={() => handleAction('delete')}>
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
        <span>Hapus</span>
      </button>
    {/if}
  </div>
{/if}
