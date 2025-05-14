const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    // Notes
    createNote: (noteData) => ipcRenderer.invoke('notes:create', noteData),
    getNote: (noteId) => ipcRenderer.invoke('notes:get', noteId),
    saveNote: (noteId, noteContent) => ipcRenderer.invoke('notes:save', noteId, noteContent),
    deleteNote: (noteId) => ipcRenderer.invoke('notes:delete', noteId),
    getAllNotesMetadata: () => ipcRenderer.invoke('notes:get-all-metadata'),

    // Dialogs
    openImageDialog: () => ipcRenderer.invoke('dialog:open-image')
});