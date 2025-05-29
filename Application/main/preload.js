const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Notes
    saveLocalNote: (noteData) => ipcRenderer.invoke('notes:save-local', noteData),
    getLocalNote: (localNoteId) => ipcRenderer.invoke('notes:get-local', localNoteId),
    getAllLocalNotes: () => ipcRenderer.invoke('notes:get-all-local'),
    deleteLocalNote: (localNoteId) => ipcRenderer.invoke('notes:delete-local', localNoteId),
    clearAllLocalNotes: () => ipcRenderer.invoke('notes:clear-all-local'),

    // Dialogs
    openImageDialog: () => ipcRenderer.invoke('dialog:open-image')
});