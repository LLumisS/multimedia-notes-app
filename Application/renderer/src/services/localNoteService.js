const electronAPI = window.electronAPI;

export const localNoteService = {
    saveNote: async (noteData) => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.saveLocalNote(noteData);
    },
    getNote: async (localNoteId) => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.getLocalNote(localNoteId);
    },
    getAllNotes: async () => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.getAllLocalNotes();
    },
    deleteNote: async (localNoteId) => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.deleteLocalNote(localNoteId);
    },
    clearAllNotes: async () => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.clearAllLocalNotes();
    }
};