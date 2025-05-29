import { app, BrowserWindow, ipcMain, dialog } from 'electron';
import path from 'node:path';
import url from 'node:url';
import { fileURLToPath } from 'node:url';
import installExtension, { REACT_DEVELOPER_TOOLS } from 'electron-devtools-installer';

import { NotesManager } from './fileManager.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const notesManager = new NotesManager(path.join(app.getPath('userData'), 'NotesData'));

function createWindow() {
    const mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            preload: path.join(__dirname, 'preload.js'),
            contextIsolation: true,
            nodeIntegration: false,
        },
    });

    // Load the React app
    if (process.env.NODE_ENV === 'development') {
        mainWindow.loadURL('http://localhost:5173'); // Vite dev server
        mainWindow.webContents.openDevTools();
    } else {
        // In production, load the bundled index.html
        const indexPath = path.join(__dirname, '..', 'renderer', 'dist', 'index.html')
        mainWindow.loadFile(indexPath);
        mainWindow.webContents.openDevTools();
    }

    // IPC Handlers
    ipcMain.handle('notes:save-local', async (event, noteData) => {
        return notesManager.saveLocalNote(noteData);
    });

    ipcMain.handle('notes:get-local', async (event, localNoteId) => {
        return notesManager.getLocalNote(localNoteId);
    });

    ipcMain.handle('notes:get-all-local', async () => {
        return notesManager.getAllLocalNotes();
    });

    ipcMain.handle('notes:delete-local', async (event, localNoteId) => {
        return notesManager.deleteLocalNote(localNoteId);
    });

    ipcMain.handle('notes:clear-all-local', async () => {
        return notesManager.clearAllLocalNotes();
    });

    ipcMain.handle('dialog:open-image', async () => {
        const { canceled, filePaths } = await dialog.showOpenDialog(mainWindow, {
            properties: ['openFile'],
            filters: [{ name: 'Images', extensions: ['png', 'jpg', 'jpeg', 'gif'] }],
        });
        if (canceled || filePaths.length === 0) {
            return null;
        }
        return filePaths[0];
    });
}

app.whenReady().then(() => {
    if (process.env.NODE_ENV === 'development') {
        installExtension(REACT_DEVELOPER_TOOLS)
            .then((name) => console.log(`Added Extension:  ${name}`))
            .catch((err) => console.log('An error occurred: ', err));
    }

    createWindow();

    app.on('activate', () => {
        if (BrowserWindow.getAllWindows().length === 0) {
            createWindow();
        }
    });
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});