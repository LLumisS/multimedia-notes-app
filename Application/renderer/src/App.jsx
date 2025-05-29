import React, { useState, useEffect, useCallback } from 'react';
import { Box, AppBar, Tabs, Tab, IconButton, Typography, Button, CircularProgress, Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle, TextField } from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import CloseIcon from '@mui/icons-material/Close';
import LoginIcon from '@mui/icons-material/Login';
import LogoutIcon from '@mui/icons-material/Logout';
import AccountCircleIcon from '@mui/icons-material/AccountCircle';
import EditIcon from '@mui/icons-material/Edit';

import Toolbar from './components/Toolbar.jsx';
import CanvasWorkspace from './components/CanvasWorkspace.jsx';
import LoginForm from './components/Auth/LoginForm.jsx';
import RegisterForm from './components/Auth/RegisterForm.jsx';
import UserProfileModal from './components/Auth/UserProfileModal.jsx';

import { generateId } from './utils/generateId.js';
import { localNoteService } from './services/localNoteService.js';
import authService from './services/authService.js';
import boardService from './services/boardService.js';
import { fabric } from 'fabric';

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
    const [tabs, setTabs] = useState([]); // Each tab: { localId, name, fabricCanvasJSON, serverId, isModified, createdAtLocal, lastModifiedLocal }
    const [activeTabId, setActiveTabId] = useState(null); // This will be localId
    const [activeCanvas, setActiveCanvas] = useState(null);

    const [isRenaming, setIsRenaming] = useState(false);
    const [newTabName, setNewTabName] = useState('');
    const [tabToRenameId, setTabToRenameId] = useState(null);

    const [isAuthenticated, setIsAuthenticated] = useState(authService.isAuthenticated());
    const [currentUser, setCurrentUser] = useState(null); // { id, email }
    const [isLoading, setIsLoading] = useState(true); // For initial load
    const [isSyncing, setIsSyncing] = useState(false);

    const [showLogin, setShowLogin] = useState(false);
    const [showRegister, setShowRegister] = useState(false);
    const [showProfile, setShowProfile] = useState(false);

    // --- LOCAL NOTE OPERATIONS ---
    const loadLocalNotes = useCallback(async () => {
        setIsLoading(true);
        try {
            const localNotes = await localNoteService.getAllNotes();
            const mappedTabs = localNotes.map(note => ({
                localId: note.localId,
                name: note.name || `Note ${note.localId.substring(0,4)}`,
                fabricCanvasJSON: note.fabricCanvasJSON,
                serverId: note.serverId || null,
                isModified: false, // Assume not modified on load
                createdAtLocal: note.createdAtLocal,
                lastModifiedLocal: note.lastModifiedLocal,
            }));
            setTabs(mappedTabs);
            if (mappedTabs.length > 0) {
                setActiveTabId(mappedTabs[0].localId);
            } else {
                // "Upon launching, the application automatically opens one new empty tab."
                // createNewLocalTab(true); // Creates a tab if none exist
            }
        } catch (error) {
            console.error("Failed to load local notes:", error);
            alert("Error loading local notes.");
            // If loading fails, still try to create a new tab
            // if (tabs.length === 0) createNewLocalTab(true);
        } finally {
            setIsLoading(false);
        }
    }, []); // Removed tabs.length dependency to avoid loop with createNewLocalTab

    const createNewLocalTab = useCallback(async (makeActive = true, serverData = null) => {
        const localId = generateId();
        const now = new Date().toISOString();
        let newTab;

        if (serverData) { // Creating a local tab from server data
            newTab = {
                localId: localId, // Or use serverData.id if you want to align localId with serverId for NEWLY FETCHED notes. For existing logic, keep localId distinct.
                name: serverData.name || `Server Note ${serverData.id.substring(0,6)}`, // Use server's name
                fabricCanvasJSON: JSON.parse(serverData.jsonData || '{"version":"5.3.0","objects":[]}'),
                serverId: serverData.id,
                isModified: false,
                createdAtLocal: serverData.createdAt || now, // Use server's createdAt if available
                lastModifiedLocal: serverData.updatedAt || now, // Use server's updatedAt
            };
            // Save this newly fetched server note locally
            await localNoteService.saveNote(newTab);
        } else { // Creating a brand new local tab (unauthorized or authorized but new)
            newTab = {
                localId,
                name: `Untitled ${tabs.length + 1}`,
                fabricCanvasJSON: { version: fabric.version, objects: [] },
                serverId: null,
                isModified: true, // New notes are "modified" until first save
                createdAtLocal: now,
                lastModifiedLocal: now,
            };
            await localNoteService.saveNote(newTab); // Save immediately locally
        }

        setTabs(prevTabs => [...prevTabs, newTab]);
        if (makeActive) {
            setActiveTabId(newTab.localId);
        }
        return newTab.localId;
    }, [tabs.length]); // tabs.length is a dependency to generate unique default names


    // --- AUTHENTICATION AND SYNC LOGIC ---
    useEffect(() => {
        // Initial load of local notes or user session check
        console.log("App.jsx");
        const currentToken = localStorage.getItem('accessToken');
        if (currentToken) {
            setIsAuthenticated(true);
            setCurrentUser({
                id: localStorage.getItem('userId'),
                email: localStorage.getItem('userEmail')
            });
            // If authenticated, full sync will happen after local notes load
            loadLocalNotes().then(() => {
                if (authService.isAuthenticated()) { // double check after async load
                    handleFullSync();
                }
            });
        } else {
            setIsAuthenticated(false);
            setCurrentUser(null);
            loadLocalNotes(); // Load local notes for unauthorized mode
        }
    }, [loadLocalNotes]); // loadLocalNotes is stable


    const handleLoginSuccess = useCallback(async (userData) => {
        setIsAuthenticated(true);
        setCurrentUser({ id: userData.userId, email: userData.email });
        setShowLogin(false);
        await handleFullSync(); // Sync after login
    }, []);

    const handleFullSync = async () => {
        // Rely on authService.isAuthenticated() which reads directly from localStorage
        // The `isAuthenticated` state variable might be stale due to async React state updates.
        if (!authService.isAuthenticated()) {
            console.log("Sync skipped: User not authenticated (authService check).");
            return;
        }
        setIsSyncing(true);
        console.log("Starting full sync...");

        // 1. Get all current local notes (already in `tabs` state or reload for fresh state)
        const currentLocalNotes = await localNoteService.getAllNotes(); // Get fresh from disk
        let updatedLocalTabs = [...currentLocalNotes]; // Create a mutable copy

        // 2. Upload local-only or modified-since-last-sync notes
        for (let i = 0; i < updatedLocalTabs.length; i++) {
            let localNote = updatedLocalTabs[i];
            if (!localNote.serverId) { // Local-only, never synced
                console.log(`Sync: Uploading new local note ${localNote.localId}`);
                try {
                    const serverBoard = await boardService.createBoard(localNote.name, JSON.stringify(localNote.fabricCanvasJSON));
                    localNote.serverId = serverBoard.id;
                    localNote.lastModifiedLocal = serverBoard.updatedAt; // Align modification time
                    await localNoteService.saveNote(localNote); // Update local file with serverId
                    updatedLocalTabs[i] = localNote; // Update in our working array
                } catch (err) {
                    console.error(`Sync: Failed to upload new local note ${localNote.localId}:`, err);
                    // Decide on error handling: retry later? Mark as "sync error"?
                }
            } else {
                // If local note is modified and has a serverId, update it on the server
                // This assumes `isModified` is correctly set when content or name changes
                if (localNote.isModified) {
                    console.log(`Sync: Updating modified local note ${localNote.localId} on server.`);
                    try {
                        const serverBoard = await boardService.updateBoard(localNote.serverId, localNote.name, JSON.stringify(localNote.fabricCanvasJSON));
                        localNote.lastModifiedLocal = serverBoard.updatedAt;
                        localNote.isModified = false; // Mark as synced
                        await localNoteService.saveNote(localNote);
                        updatedLocalTabs[i] = localNote;
                    } catch (err) {
                        console.error(`Sync: Failed to update local note ${localNote.localId} on server:`, err);
                    }
                }
            }
        }

        // 3. Fetch all boards from server
        try {
            const serverBoards = await boardService.getAllBoards();
            console.log("Sync: Fetched server boards:", serverBoards.length);

            // 4. Merge server boards with local
            for (const serverBoard of serverBoards) {
                const existingLocalIndex = updatedLocalTabs.findIndex(t => t.serverId === serverBoard.id);
                if (existingLocalIndex !== -1) { // Server board exists locally
                    const localVersion = updatedLocalTabs[existingLocalIndex];
                    // Basic conflict resolution: server wins if newer (or if timestamps are tricky, always take server on full sync)
                    // A more robust check would involve comparing serverBoard.updatedAt with localVersion.lastModifiedLocal
                    const serverJsonData = JSON.parse(serverBoard.jsonData || '{}');
                    if (new Date(serverBoard.updatedAt) > new Date(localVersion.lastModifiedLocal || 0)) {
                        console.log(`Sync: Updating local note ${localVersion.localId} from server ${serverBoard.id}`);
                        localVersion.fabricCanvasJSON = serverJsonData;
                        localVersion.name = serverBoard.name || localVersion.name; // Assuming name might come from server
                        localVersion.lastModifiedLocal = serverBoard.updatedAt;
                        await localNoteService.saveNote(localVersion);
                        updatedLocalTabs[existingLocalIndex] = localVersion;
                    }
                } else { // Server board is new to local client
                    console.log(`Sync: Adding new server note ${serverBoard.id} locally.`);
                    const now = new Date().toISOString();
                    const newLocalNote = {
                        localId: generateId(), // Generate a new local ID for this fetched note
                        name: serverBoard.name || `Server Note ${serverBoard.id.substring(0,6)}`,
                        fabricCanvasJSON: JSON.parse(serverBoard.jsonData || '{}'),
                        serverId: serverBoard.id,
                        isModified: false,
                        createdAtLocal: serverBoard.createdAt || now,
                        lastModifiedLocal: serverBoard.updatedAt || now,
                    };
                    await localNoteService.saveNote(newLocalNote);
                    updatedLocalTabs.push(newLocalNote);
                }
            }
        } catch (err) {
            console.error("Sync: Failed to fetch or merge server boards:", err);
            // Decide on error handling
        }

        setTabs(updatedLocalTabs.map(note => ({...note, isModified: false }))); // Update UI state
        if (updatedLocalTabs.length > 0 && !activeTabId) {
            setActiveTabId(updatedLocalTabs[0].localId);
        } else if (updatedLocalTabs.length === 0) {
            setActiveTabId(null);
            createNewLocalTab(true); // Ensure one tab if all are cleared/gone
        }

        setIsSyncing(false);
        console.log("Full sync completed.");
    };

    const handleLogout = async () => {
        authService.logout();
        setIsAuthenticated(false);
        setCurrentUser(null);
        setActiveTabId(null); // Reset active tab
        setShowProfile(false);
        setIsLoading(true);
        try {
            await localNoteService.clearAllNotes(); // Clear all local notes on logout
            setTabs([]); // Clear tabs from UI state
            createNewLocalTab(true); // Start fresh with one new unauthorized tab
        } catch (error) {
            console.error("Error clearing local notes on logout:", error);
            alert("Error clearing local data. Please restart the application.");
        } finally {
            setIsLoading(false);
        }
    };


    // --- TAB MANAGEMENT AND CONTENT SAVING (MODIFIED) ---
    const handleTabChange = (event, newValue) => {
        const newActiveTab = tabs[newValue];
        if (newActiveTab) {
            // Auto-save previous tab if modified (can be part of a useEffect for activeTabId change)
            const previousActiveTab = tabs.find(t => t.localId === activeTabId);
            if (previousActiveTab && previousActiveTab.isModified) {
                saveNote(previousActiveTab.localId, previousActiveTab.fabricCanvasJSON, previousActiveTab.name, true); // true for isAutoSave
            }
            setActiveTabId(newActiveTab.localId);
        }
    };

    const handleCloseTab = async (event, tabIdToClose) => {
        event.stopPropagation();
        const tabToClose = tabs.find(tab => tab.localId === tabIdToClose);
        if (tabToClose && tabToClose.isModified) {
            if (!window.confirm("This note has unsaved changes. Close without saving changes to server/local?")) {
                return;
            }
        }

        // Delete logic
        if (isAuthenticated && tabToClose.serverId) {
            try {
                await boardService.deleteBoard(tabToClose.serverId);
                console.log(`Note ${tabToClose.serverId} deleted from server.`);
            } catch (err) {
                console.error(`Failed to delete note ${tabToClose.serverId} from server:`, err);
                alert("Failed to delete note from server. It will be deleted locally only.");
            }
        }
        await localNoteService.deleteNote(tabIdToClose);

        const newTabs = tabs.filter(tab => tab.localId !== tabIdToClose);
        setTabs(newTabs);

        if (activeTabId === tabIdToClose) {
            if (newTabs.length > 0) {
                setActiveTabId(newTabs[newTabs.length - 1].localId); // Activate last tab
            } else {
                setActiveTabId(null);
                // createNewLocalTab(true); // Open a new one if all closed
            }
        }
    };

    const updateTabContent = useCallback((localTabId, newFabricJSON) => {
        setTabs(prevTabs =>
            prevTabs.map(tab =>
                tab.localId === localTabId ? { ...tab, fabricCanvasJSON: newFabricJSON, isModified: true, lastModifiedLocal: new Date().toISOString() } : tab
            )
        );
    }, []);

    const saveNote = useCallback(async (localTabId, fabricJSONToSave, name, isAutoSave = false) => {
        const tabIndex = tabs.findIndex(t => t.localId === localTabId);
        if (tabIndex === -1) return;

        let tabToSave = { ...tabs[tabIndex], name: name, fabricCanvasJSON: fabricJSONToSave, lastModifiedLocal: new Date().toISOString() };

        // 1. Save locally
        try {
            await localNoteService.saveNote(tabToSave);
            console.log(`Note ${localTabId} saved locally.`);
            // Update tab state to reflect it's no longer "modified" from the perspective of the *last save operation*
            // The `isModified` flag primarily indicates changes since last *explicit or auto save*.
            // The server sync status is handled by serverId and potentially other flags if complex sync needed.
            setTabs(prev => prev.map(t => t.localId === localTabId ? {...tabToSave, isModified: false} : t));

        } catch (error) {
            console.error(`Failed to save note ${localTabId} locally:`, error);
            if (!isAutoSave) alert(`Error saving note locally: ${error.message}`);
            return; // Don't proceed to server save if local save failed
        }

        // 2. If authenticated, save/sync to server
        if (isAuthenticated && authService.isAuthenticated()) { // Double check auth
            setIsSyncing(true);
            try {
                let serverResponse;
                const payload = JSON.stringify(tabToSave.fabricCanvasJSON);
                if (tabToSave.serverId) {
                    serverResponse = await boardService.updateBoard(tabToSave.serverId, tabToSave.name, payload);
                    console.log(`Note ${tabToSave.serverId} updated on server.`);
                } else {
                    serverResponse = await boardService.createBoard(tabToSave.name, payload);
                    tabToSave.serverId = serverResponse.id; // Get serverId for new note
                    // Update local file again with the new serverId
                    await localNoteService.saveNote(tabToSave);
                    console.log(`Note ${localTabId} created on server with ID ${tabToSave.serverId}.`);
                }
                // Update tab in state with serverId and reset modified relative to server sync
                setTabs(prev => prev.map(t => t.localId === localTabId ? {...tabToSave, serverId: serverResponse.id, lastModifiedLocal: serverResponse.updatedAt, isModified: false } : t));

            } catch (error) {
                console.error(`Failed to save note ${localTabId} to server:`, error);
                if (!isAutoSave) alert(`Error saving note to server: ${error.message}. It is saved locally.`);
                // Keep isModified true if server save fails, so user knows it's not synced
                setTabs(prev => prev.map(t => t.localId === localTabId ? {...tabToSave, isModified: true} : t));
            } finally {
                setIsSyncing(false);
            }
        }
    }, [tabs, isAuthenticated]);


    const activeTabIndex = tabs.findIndex(tab => tab.localId === activeTabId);
    const currentTab = tabs[activeTabIndex];

    const handleCanvasReady = useCallback((canvasInstance) => {
        setActiveCanvas(canvasInstance);
    }, []);

    // Auto-save on tab switch (if modified)
    // useEffect(() => {
    //     let previousTabId = activeTabId;
    //     return () => { // Cleanup function runs when activeTabId changes or component unmounts
    //         const tabToAutoSave = tabs.find(t => t.localId === previousTabId);
    //         if (tabToAutoSave && tabToAutoSave.isModified) {
    //             console.log(`Auto-saving tab ${tabToAutoSave.name} on switch/blur.`);
    //             saveNote(tabToAutoSave.localId, tabToAutoSave.fabricCanvasJSON, true);
    //         }
    //     };
    // }, [activeTabId, tabs, saveNote]);


    if (isLoading && !tabs.length) { // Show full page loader only on very initial load
        return <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}><CircularProgress /></Box>;
    }

    const handleRenameClick = (event, tabId) => {
        event.stopPropagation(); // Prevent tab change
        const tabToRename = tabs.find(tab => tab.localId === tabId);
        if (tabToRename) {
            setTabToRenameId(tabId);
            setNewTabName(tabToRename.name);
            setIsRenaming(true);
        }
    };

    const handleRenameConfirm = async () => {
        if (tabToRenameId && newTabName.trim() !== '') {
            const updatedTabs = tabs.map(tab =>
                tab.localId === tabToRenameId ? { ...tab, name: newTabName.trim(), isModified: true } : tab
            );
            setTabs(updatedTabs);

            // Find the updated tab to save
            const tabToSave = updatedTabs.find(tab => tab.localId === tabToRenameId);
            if (tabToSave) {
                await saveNote(tabToSave.localId, tabToSave.fabricCanvasJSON, tabToSave.name);
            }
        }
        setIsRenaming(false);
        setNewTabName('');
        setTabToRenameId(null);
    };

    const handleRenameCancel = () => {
        setIsRenaming(false);
        setNewTabName('');
        setTabToRenameId(null);
    };

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh' }}>
            <AppBar position="static" color="default" elevation={0}>
                <Box sx={{ display: 'flex', alignItems: 'center', borderBottom: 1, borderColor: 'divider' }}>
                    <Tabs
                        value={activeTabIndex === -1 ? false : activeTabIndex}
                        onChange={handleTabChange}
                        variant="scrollable" scrollButtons="auto" aria-label="note tabs" sx={{ flexGrow: 1 }}
                    >
                        {tabs.map((tab, index) => (
                            <Tab
                                key={tab.localId}
                                label={
                                    <Box sx={{ display: 'flex', alignItems: 'center' }}>
                                        <Typography variant="body2" sx={{ textTransform: 'none', mr: 0.5 }}>
                                            {tab.name}{tab.isModified ? '*' : ''}{tab.serverId ? '☁️' : ''}
                                        </Typography>
                                        <IconButton size="small" onClick={(e) => handleRenameClick(e, tab.localId)} title="Rename Tab">
                                            <EditIcon fontSize="inherit" sx={{ fontSize: '1rem' }} />
                                        </IconButton>
                                        <IconButton size="small" onClick={(e) => handleCloseTab(e, tab.localId)} sx={{ visibility: tabs.length > 0 ? 'visible' : 'hidden', ml: 0.5 }}>
                                            <CloseIcon fontSize="small" />
                                        </IconButton>
                                    </Box>
                                }
                                id={`tab-${tab.localId}`} aria-controls={`tabpanel-${tab.localId}`}
                            />
                        ))}
                    </Tabs>
                    <IconButton onClick={() => createNewLocalTab(true)} color="primary" title="New Note">
                        <AddIcon />
                    </IconButton>
                    {isSyncing && <CircularProgress size={24} sx={{ mx: 1 }} />}
                    {!isAuthenticated ? (
                        <>
                            <Button startIcon={<LoginIcon />} onClick={() => { setShowRegister(false); setShowLogin(true); }} sx={{mr:1}}>Login</Button>
                            <Button onClick={() => { setShowLogin(false); setShowRegister(true); }}>Register</Button>
                        </>
                    ) : (
                        <>
                            <IconButton onClick={() => setShowProfile(true)} title="Profile">
                                <AccountCircleIcon />
                            </IconButton>
                            <Button startIcon={<LogoutIcon />} onClick={handleLogout}>Logout</Button>
                        </>
                    )}
                </Box>
            </AppBar>

            <Toolbar
                activeCanvas={activeCanvas}
                currentTab={currentTab}
                saveNote={() => currentTab && saveNote(currentTab.localId, currentTab.fabricCanvasJSON, currentTab.name)}
                isAuthenticated={isAuthenticated}
            />

            {tabs.map((tab, index) => (
                <TabPanel key={tab.localId} value={activeTabIndex} index={index}>
                    {tab.localId === activeTabId && currentTab?.fabricCanvasJSON && ( // Ensure currentTab and its canvas data are ready
                        <CanvasWorkspace
                            key={tab.localId} // Important: key change forces re-mount/re-init for different tabs
                            isActive={tab.localId === activeTabId}
                            initialData={currentTab.fabricCanvasJSON} // Pass currentTab's data
                            onContentChange={(fabricJSON) => updateTabContent(tab.localId, fabricJSON)}
                            onCanvasReady={handleCanvasReady}
                            noteId={tab.localId}
                        />
                    )}
                </TabPanel>
            ))}

            {/* Rename Dialog */}
            <Dialog open={isRenaming} onClose={handleRenameCancel}>
                <DialogTitle>Rename Tab</DialogTitle>
                <DialogContent>
                    <DialogContentText>
                        Enter the new name for the tab:
                    </DialogContentText>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="name"
                        label="Tab Name"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={newTabName}
                        onChange={(e) => setNewTabName(e.target.value)}
                        onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                                handleRenameConfirm();
                            }
                        }}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={handleRenameCancel}>Cancel</Button>
                    <Button onClick={handleRenameConfirm}>Rename</Button>
                </DialogActions>
            </Dialog>

            {showLogin && <LoginForm onSuccess={handleLoginSuccess} onClose={() => setShowLogin(false)} onSwitchToRegister={() => {setShowLogin(false); setShowRegister(true);}} />}
            {showRegister && <RegisterForm onSuccess={() => { setShowRegister(false); setShowLogin(true); alert("Registration successful! Please login.");}} onClose={() => setShowRegister(false)} onSwitchToLogin={() => {setShowRegister(false); setShowLogin(true);}} />}
            {showProfile && currentUser && <UserProfileModal user={currentUser} onClose={() => setShowProfile(false)} onLogout={handleLogout}/>}
        </Box>
    );
}

export default App;
