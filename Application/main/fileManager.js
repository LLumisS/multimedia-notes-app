import fs from 'node:fs/promises';
import path from 'node:path';

export class NotesManager {

    constructor(notesDir) {
        this.notesDir = notesDir;
        this._initialize();
    }

    async _initialize() {
        try {
            await fs.mkdir(this.notesDir, { recursive: true });
        } catch (error) {
            console.error('Failed to initialize notes directory or metadata:', error);
        }
    }

    async saveLocalNote(noteData) {
        // noteData: { localId, name, fabricCanvasJSON, serverId, createdAtLocal, lastModifiedLocal }
        if (!noteData.localId) throw new Error('localId is required to save a note.');
        const noteFilePath = path.join(this.notesDir, `${noteData.localId}.json`);

        try {
            await fs.writeFile(noteFilePath, JSON.stringify(noteData, null, 2));
            console.log(`Local note saved: ${noteFilePath}`);
            return { ...noteData, filePath: noteFilePath };
        } catch (error) {
            console.error(`Failed to save local note ${noteData.localId}:`, error);
            throw error;
        }
    }

    async getLocalNote(localNoteId) {
        const noteFilePath = path.join(this.notesDir, `${localNoteId}.json`);
        try {
            const noteContent = await fs.readFile(noteFilePath, 'utf-8');
            return JSON.parse(noteContent);
        } catch (error) {
            if (error.code === 'ENOENT') return null;
            console.error(`Failed to read local note ${localNoteId}:`, error);
            throw error;
        }
    }

    async getAllLocalNotes() {
        try {
            const files = await fs.readdir(this.notesDir);
            const noteFiles = files.filter(file => file.endsWith('.json'));
            const notes = [];
            for (const file of noteFiles) {
                try {
                    const content = await fs.readFile(path.join(this.notesDir, file), 'utf-8');
                    notes.push(JSON.parse(content));
                } catch (parseError) {
                    console.error(`Error parsing note file ${file}:`, parseError);
                }
            }
            // Sort by most recently modified
            return notes.sort((a, b) =>
                new Date(b.lastModifiedLocal || 0) - new Date(a.lastModifiedLocal || 0));
        } catch (error) {
            console.error('Failed to get all local notes:', error);
            return [];
        }
    }

    async deleteLocalNote(localNoteId) {
        const noteFilePath = path.join(this.notesDir, `${localNoteId}.json`);
        try {
            await fs.unlink(noteFilePath);
            console.log(`Local note deleted: ${noteFilePath}`);
            return { success: true };
        } catch (error) {
            if (error.code === 'ENOENT') {
                console.warn(`Local note file ${localNoteId}.json not found for deletion.`);
                return { success: true, message: 'File not found.' };
            }
            console.error(`Failed to delete local note ${localNoteId}:`, error);
            throw error;
        }
    }

    async clearAllLocalNotes() {
        try {
            const files = await fs.readdir(this.notesDir);
            for (const file of files) {
                if (file.endsWith('.json')) { // Only delete .json note files
                    await fs.unlink(path.join(this.notesDir, file));
                }
            }
            console.log('All local notes cleared.');
            return { success: true };
        } catch (error) {
            console.error('Failed to clear all local notes:', error);
            throw error;
        }
    }
}