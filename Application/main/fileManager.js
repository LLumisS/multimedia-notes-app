import fs from 'node:fs/promises';
import path from 'node:path';

const METADATA_FILENAME = '_metadata.json';

export class NotesManager {
    constructor(notesDir) {
        this.notesDir = notesDir;
        this.metadataFilePath = path.join(this.notesDir, METADATA_FILENAME);
        this._initialize();
    }

    async _initialize() {
        try {
            await fs.mkdir(this.notesDir, { recursive: true });
            // Try to load metadata, if it doesn't exist, an empty object will be used
            await this._readMetadata();
        } catch (error) {
            console.error('Failed to initialize notes directory or metadata:', error);
            this.metadata = {}; // Initialize with empty metadata on error
        }
    }

    async _readMetadata() {
        try {
            const data = await fs.readFile(this.metadataFilePath, 'utf-8');
            this.metadata = JSON.parse(data);
        } catch (error) {
            // If metadata file doesn't exist or is corrupt, start with empty metadata
            if (error.code === 'ENOENT') {
                this.metadata = {};
            } else {
                console.error('Error reading metadata file:', error);
                this.metadata = {}; // Fallback to empty
            }
        }
        return this.metadata;
    }

    async _saveMetadata() {
        try {
            await fs.writeFile(this.metadataFilePath, JSON.stringify(this.metadata, null, 2));
        } catch (error) {
            console.error('Error saving metadata file:', error);
        }
    }

    async createNote(noteData) { // noteData contains { id, name }
        const { id, name } = noteData;
        const noteFilePath = path.join(this.notesDir, `${id}.json`);
        const initialContent = {
            id,
            name,
            fabricCanvas: { version: '5.3.0', objects: [] }, // fabric.version might not be accessible here. Let's use a fixed string.
            // The actual fabric version string should ideally come from the renderer or be a known constant.
            // For simplicity, let's assume the renderer provides it or we use a placeholder.
            // Renderer will send 'fabricCanvas' when saving content. Here we just create a shell.
        };

        try {
            await fs.writeFile(noteFilePath, JSON.stringify(initialContent, null, 2));
            this.metadata[id] = { id, name, filePath: noteFilePath, createdAt: Date.now() };
            await this._saveMetadata();
            console.log(`Note created: ${noteFilePath}`);
            return { id, name, filePath: noteFilePath, fabricCanvas: initialContent.fabricCanvas };
        } catch (error) {
            console.error(`Failed to create note ${id}:`, error);
            throw error; // Propagate error to be handled by renderer
        }
    }

    async getNote(noteId) {
        const noteMetadata = this.metadata[noteId];
        if (!noteMetadata) {
            throw new Error(`Note with ID ${noteId} not found in metadata.`);
        }
        try {
            const noteContent = await fs.readFile(noteMetadata.filePath, 'utf-8');
            return JSON.parse(noteContent); // This will include id, name, and fabricCanvas
        } catch (error) {
            console.error(`Failed to read note ${noteId}:`, error);
            // If file not found but metadata exists, it's an inconsistency.
            // For now, we throw, but could also attempt to clean up metadata.
            throw error;
        }
    }

    async saveNote(noteId, noteFullContent) { // noteFullContent is { id, name, fabricCanvas }
        const noteMetadata = this.metadata[noteId];
        if (!noteMetadata) {
            // This case might happen if a note is created but metadata saving failed, or ID mismatch.
            // For robustness, we could try to create metadata entry if file path can be derived.
            // Or, if noteFullContent has 'name', update/create metadata.
            // For now, strict check:
            console.warn(`Attempted to save note ${noteId} not found in metadata. Trying to update/create metadata.`);
            const noteFilePath = path.join(this.notesDir, `${noteId}.json`);
            this.metadata[noteId] = { id: noteId, name: noteFullContent.name, filePath: noteFilePath, updatedAt: Date.now() };
            // Fallthrough to save
        } else {
            // Update name in metadata if it changed
            if (noteMetadata.name !== noteFullContent.name) {
                this.metadata[noteId].name = noteFullContent.name;
            }
            this.metadata[noteId].updatedAt = Date.now();
        }


        const filePath = this.metadata[noteId].filePath;
        try {
            await fs.writeFile(filePath, JSON.stringify(noteFullContent, null, 2));
            await this._saveMetadata(); // Save metadata potentially with updated name/timestamp
            console.log(`Note saved: ${filePath}`);
            return { success: true, filePath };
        } catch (error) {
            console.error(`Failed to save note ${noteId}:`, error);
            throw error;
        }
    }

    async deleteNote(noteId) {
        const noteMetadata = this.metadata[noteId];
        if (!noteMetadata) {
            // Note doesn't exist in metadata, perhaps already deleted.
            console.warn(`Note with ID ${noteId} not found in metadata for deletion.`);
            return { success: true, message: 'Note not found in metadata, assumed deleted.' };
        }
        try {
            await fs.unlink(noteMetadata.filePath);
            delete this.metadata[noteId];
            await this._saveMetadata();
            console.log(`Note deleted: ${noteMetadata.filePath}`);
            return { success: true };
        } catch (error) {
            if (error.code === 'ENOENT') { // File already deleted
                console.warn(`File for note ${noteId} was already deleted. Removing from metadata.`);
                delete this.metadata[noteId];
                await this._saveMetadata();
                return { success: true, message: 'File already deleted, metadata cleaned.' };
            }
            console.error(`Failed to delete note ${noteId}:`, error);
            throw error;
        }
    }

    async getAllNotesMetadata() {
        // Ensure metadata is fresh, especially if files could be manipulated externally
        // For simplicity, we rely on the current in-memory metadata.
        // A more robust version might re-scan the directory or validate.
        await this._readMetadata(); // Refresh from disk
        return Object.values(this.metadata);
    }
}