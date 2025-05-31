const electronAPI = window.electronAPI;

export const noteService = {
    createNote: async (noteData) => { // noteData: { id, name }
        if (!electronAPI) throw new Error("electronAPI is not available. Is preload script working?");
        return electronAPI.createNote(noteData);
    },
    getNote: async (noteId) => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.getNote(noteId);
    },
    saveNote: async (noteId, noteContent) => { // noteContent: { id, name, fabricCanvas }
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.saveNote(noteId, noteContent);
    },
    deleteNote: async (noteId) => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.deleteNote(noteId);
    },
    getAllNotesMetadata: async () => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.getAllNotesMetadata();
    }
};

export const dialogService = {
    openImageDialog: async () => {
        if (!electronAPI) throw new Error("electronAPI is not available.");
        return electronAPI.openImageDialog();
    }
};