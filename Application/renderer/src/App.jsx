import React, { useState, useEffect, useCallback } from 'react';
import { Box, AppBar, Tabs, Tab, IconButton, Typography } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import Toolbar from './components/Toolbar.jsx';
import CanvasWorkspace from './components/CanvasWorkspace.jsx';
import { generateId } from './utils/generateId.js';
import { noteService } from './services/ipcService.js';
import { fabric } from 'fabric'; // Import fabric for version

function TabPanel(props) {
    const { children, value, index, ...other } = props;
    return (
        <div
            role="tabpanel"
            hidden={value !== index}
            id={`tabpanel-${index}`}
            aria-labelledby={`tab-${index}`}
            style={{ height: 'calc(100vh - 48px - 64px)', overflow: 'auto' }} // Adjust height considering AppBar and Toolbar
            {...other}
        >
            {value === index && <Box sx={{ height: '100%' }}>{children}</Box>}
        </div>
    );
}

function App() {
    const [tabs, setTabs] = useState([]);
    const [activeTabId, setActiveTabId] = useState(null);
    const [activeCanvas, setActiveCanvas] = useState(null); // To pass to Toolbar

    const createNewTab = useCallback(async (makeActive = true) => {
        const newNoteId = generateId();
        const newNoteName = `Untitled Note ${tabs.length + 1}`;

        try {
            const newNoteData = await noteService.createNote({ id: newNoteId, name: newNoteName });
            const newTab = {
                id: newNoteData.id,
                name: newNoteData.name,
                filePath: newNoteData.filePath, // Provided by main process
                fabricCanvasJSON: newNoteData.fabricCanvas, // Initial empty canvas data
                isModified: false,
            };
            setTabs(prevTabs => [...prevTabs, newTab]);
            if (makeActive) {
                setActiveTabId(newNoteId);
            }
            return newNoteId;
        } catch (error) {
            console.error("Failed to create new note:", error);
            // Handle error appropriately (e.g., show a notification to the user)
            alert(`Error creating new note: ${error.message}`);
        }
    }, [tabs.length]);

    // Effect to open one new empty tab on launch
    useEffect(() => {
        const initializeApp = async () => {
            // Optional: Load existing notes metadata to populate tabs if desired.
            // For this requirement, we always start with one new tab.
            // const existingNotes = await noteService.getAllNotesMetadata();
            // if (existingNotes.length > 0) { ... load them ... } else { createNewTab() }
            if (tabs.length === 0) {
                createNewTab();
            }
        };
        initializeApp();
    }, [createNewTab, tabs.length]); // tabs.length in dependencies to re-run if all tabs are closed.

    const handleTabChange = (event, newValue) => {
        // `newValue` is the index, we need to find the ID
        const newActiveTab = tabs[newValue];
        if (newActiveTab) {
            setActiveTabId(newActiveTab.id);
        }
    };

    const handleCloseTab = async (event, tabIdToClose) => {
        event.stopPropagation(); // Prevent tab selection

        const tabToClose = tabs.find(tab => tab.id === tabIdToClose);
        if (tabToClose && tabToClose.isModified) {
            if (!window.confirm("This note has unsaved changes. Are you sure you want to close it?")) {
                return;
            }
        }

        // Save before closing IF NEEDED, or rely on explicit save.
        // For now, assume explicit save or auto-save on change handles this.

        try {
            // Optional: Delete note file if it's an "Untitled" and empty note, or always keep files.
            // For now, we don't delete the file on tab close, only through an explicit delete action (not implemented in this scope).
            // await noteService.deleteNote(tabIdToClose);
        } catch (error) {
            console.error("Error handling tab close (e.g. deleting note):", error);
        }


        const newTabs = tabs.filter(tab => tab.id !== tabIdToClose);
        setTabs(newTabs);

        if (activeTabId === tabIdToClose) {
            if (newTabs.length > 0) {
                setActiveTabId(newTabs[0].id);
            } else {
                setActiveTabId(null);
                setActiveCanvas(null); // No active canvas if no tabs
                createNewTab(); // Requirement: always have at least one tab, or auto-open new one. Let's re-open a new one.
            }
        }
    };

    const updateTabContent = useCallback(async (tabId, fabricJSON, isModified = true) => {
        setTabs(prevTabs =>
            prevTabs.map(tab =>
                tab.id === tabId ? { ...tab, fabricCanvasJSON: fabricJSON, isModified } : tab
            )
        );
    }, []);

    const saveNote = useCallback(async (tabId) => {
        const tabToSave = tabs.find(tab => tab.id === tabId);
        if (!tabToSave) return;

        try {
            const noteContent = {
                id: tabToSave.id,
                name: tabToSave.name, // Could allow renaming here
                fabricCanvas: tabToSave.fabricCanvasJSON,
            };
            await noteService.saveNote(tabToSave.id, noteContent);
            setTabs(prevTabs =>
                prevTabs.map(t => (t.id === tabId ? { ...t, isModified: false } : t))
            );
            console.log(`Note ${tabToSave.name} saved.`);
            // Add user feedback (e.g., snackbar)
        } catch (error) {
            console.error(`Failed to save note ${tabToSave.name}:`, error);
            alert(`Error saving note: ${error.message}`);
        }
    }, [tabs]);

    const activeTabIndex = tabs.findIndex(tab => tab.id === activeTabId);
    const currentTab = tabs[activeTabIndex];

    // Callback to be passed to CanvasWorkspace to update active Fabric instance
    const handleCanvasReady = useCallback((canvasInstance) => {
        setActiveCanvas(canvasInstance);
    }, []);

    // Auto-save on tab switch (if modified)
    useEffect(() => {
        const previousTabId = activeTabId; // This will be from the closure of the previous render
        return () => {
            // This cleanup runs when activeTabId changes (i.e., tab switch) OR component unmounts
            const tabToPotentiallySave = tabs.find(t => t.id === previousTabId);
            if (tabToPotentiallySave && tabToPotentiallySave.isModified) {
                console.log(`Auto-saving tab ${tabToPotentiallySave.name} on switch/blur.`);
                saveNote(tabToPotentiallySave.id);
            }
        };
    }, [activeTabId, tabs, saveNote]); // Listen to activeTabId and tabs (for isModified flag)

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static" color="default" elevation={0}>
                <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={activeTabIndex === -1 ? false : activeTabIndex} // MUI Tabs need false if no tab is selected or index
                        onChange={handleTabChange}
                        variant="scrollable"
                        scrollButtons="auto"
                        aria-label="note tabs"
                        sx={{ flexGrow: 1 }}
                    >
                        {tabs.map((tab, index) => (
                            <Tab
                                key={tab.id}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ textTransform: 'none', mr: 1 }}>
                                            {tab.name}{tab.isModified ? '*' : ''}
                                        </Typography>
                                        <IconButton
                                            size="small"
                                            onClick={(e) => handleCloseTab(e, tab.id)}
                                            sx={{ visibility: tabs.length > 1 ? 'visible' : 'hidden' }} // Hide close if only one tab
                                        >
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                }
                                id={`tab-${index}`}
                                aria-controls={`tabpanel-${index}`}
                            />
                        ))}
                    </Tabs>
                    <IconButton onClick={() => createNewTab(true)} color="primary" title="New Note">
                        <AddIcon />
                    </IconButton>
                </Box>
            </AppBar>

            <Toolbar activeCanvas={activeCanvas} currentTab={currentTab} saveNote={saveNote} />

            {tabs.map((tab, index) => (
                <TabPanel key={tab.id} value={activeTabIndex} index={index}>
                    <CanvasWorkspace
                        isActive={tab.id === activeTabId}
                        initialData={tab.fabricCanvasJSON}
                        onContentChange={(fabricJSON) => updateTabContent(tab.id, fabricJSON)}
                        onCanvasReady={handleCanvasReady} // Pass callback
                        noteId={tab.id}
                    />
                </TabPanel>
            ))}
        </Box>
    );
}

export default App;