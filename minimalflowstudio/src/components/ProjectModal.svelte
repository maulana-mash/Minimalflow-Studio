<script lang="ts">
  import type { FlowProjectItem } from '../types';

  export let visible: boolean = false;
  export let projects: FlowProjectItem[] = [];
  export let activeId: string = "";

  export let onClose: () => void;
  export let onSelectProject: (id: string) => void;
  export let onCreateProject: (name: string) => void;
  export let onRenameProject: (id: string, newName: string) => void;
  export let onDuplicateProject: (id: string) => void;
  export let onDeleteProject: (id: string) => void;

  let newProjectName: string = "";
  let editingId: string | null = null;
  let editingName: string = "";

  function handleCreate() {
    onCreateProject(newProjectName.trim());
    newProjectName = "";
  }

  function startRename(proj: FlowProjectItem) {
    editingId = proj.id;
    editingName = proj.name;
  }

  function commitRename(id: string) {
    if (editingName.trim()) {
      onRenameProject(id, editingName.trim());
    }
    editingId = null;
  }

  function formatDate(timestamp: number): string {
    const d = new Date(timestamp);
    return d.toLocaleDateString("id-ID", {
      day: "numeric",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  }
</script>

{#if visible}
  <!-- svelte-ignore a11y_click_events_have_key_events -->
  <div class="modal-backdrop" on:click={onClose} role="dialog" aria-modal="true" tabindex="-1">
    <!-- svelte-ignore a11y_click_events_have_key_events -->
    <!-- svelte-ignore a11y_no_static_element_interactions -->
    <div class="modal-dialog" on:click|stopPropagation>
      <div class="modal-header">
        <div style="display: flex; align-items: center; gap: 8px;">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <rect x="3" y="3" width="7" height="7"></rect>
            <rect x="14" y="3" width="7" height="7"></rect>
            <rect x="14" y="14" width="7" height="7"></rect>
            <rect x="3" y="14" width="7" height="7"></rect>
          </svg>
          <h2 class="modal-title">Daftar Proyek Workflow</h2>
        </div>
        <button class="header-btn" on:click={onClose} title="Tutup Dialog">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
        </button>
      </div>

      <div class="modal-body">
        <!-- Input Buat Proyek Baru -->
        <div style="display: flex; gap: 8px;">
          <input 
            type="text" 
            class="prop-input-number" 
            style="flex: 1; height: 34px; text-align: left; padding: 0 10px;"
            placeholder="Ketik nama alur baru..." 
            bind:value={newProjectName}
            on:keydown={(e) => e.key === 'Enter' && handleCreate()}
          />
          <button class="header-btn primary" style="height: 34px; padding: 0 12px;" on:click={handleCreate}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>
            <span>Buat Proyek</span>
          </button>
        </div>

        <div style="font-size: 11px; font-weight: 600; color: var(--text-muted); text-transform: uppercase; margin-top: 8px;">
          Tersimpan ({projects.length} Proyek)
        </div>

        <!-- Daftar Kartu Proyek -->
        <div style="display: flex; flex-direction: column; gap: 8px; max-height: 380px; overflow-y: auto;">
          {#each projects as proj}
            <div class="project-card-item" class:active={proj.id === activeId}>
              <!-- svelte-ignore a11y_click_events_have_key_events -->
              <!-- svelte-ignore a11y_no_static_element_interactions -->
              <div class="project-info" style="cursor: pointer; flex: 1;" on:click={() => onSelectProject(proj.id)}>
                {#if editingId === proj.id}
                  <input 
                    type="text" 
                    class="prop-input-number" 
                    style="width: 220px; height: 26px; text-align: left; padding: 0 6px;"
                    bind:value={editingName} 
                    on:blur={() => commitRename(proj.id)}
                    on:keydown={(e) => e.key === 'Enter' && commitRename(proj.id)}
                    on:click|stopPropagation
                  />
                {:else}
                  <div class="project-name">
                    {proj.name}
                    {#if proj.id === activeId}
                      <span style="font-size: 10px; background: var(--text-main); color: var(--bg-surface); padding: 1px 6px; border-radius: 999px; margin-left: 6px;">Aktif</span>
                    {/if}
                  </div>
                {/if}
                <div class="project-date">Diperbarui: {formatDate(proj.updatedAt)}</div>
              </div>

              <div class="project-actions">
                <button class="prop-btn" title="Ubah Nama" on:click={() => startRename(proj)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg>
                </button>
                <button class="prop-btn" title="Duplikat Proyek" on:click={() => onDuplicateProject(proj.id)}>
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="8" y="8" width="12" height="12" rx="2"></rect><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"></path></svg>
                </button>
                {#if projects.length > 1}
                  <button class="prop-btn" style="color: #ef4444;" title="Hapus Proyek" on:click={() => onDeleteProject(proj.id)}>
                    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path></svg>
                  </button>
                {/if}
              </div>
            </div>
          {/each}
        </div>
      </div>
    </div>
  </div>
{/if}
