import React, { useState } from 'react';
import { Box, Button, IconButton, Tooltip, Divider, Dialog, DialogTitle, DialogContent, TextField, DialogActions } from '@mui/material';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import TextFieldsIcon from '@mui/icons-material/TextFields';
import EditIcon from '@mui/icons-material/Edit'; // Pen tool
import SaveIcon from '@mui/icons-material/Save';
import DeleteIcon from '@mui/icons-material/Delete';
import { fabric } from 'fabric';
import { dialogService } from '../services/ipcService.js';

function Toolbar({ activeCanvas, currentTab, saveNote }) {
    const [isDrawingMode, setIsDrawingMode] = useState(false);
    const [textModalOpen, setTextModalOpen] = useState(false);
    const [inputText, setInputText] = useState('');

    const handleAddText = () => {
        setInputText('Your Text Here');
        setTextModalOpen(true);
    };

    const confirmAddText = () => {
        if (!activeCanvas || !inputText) return;
        const text = new fabric.IText(inputText, {
            left: 50,
            top: 50,
            fontSize: 20,
            fill: '#000000',
        });
        activeCanvas.add(text);
        activeCanvas.setActiveObject(text);
        activeCanvas.renderAll();
        setTextModalOpen(false);
        setInputText('');
    };

    const handleAddImage = async () => {
        if (!activeCanvas) return;
        try {
            const filePath = await dialogService.openImageDialog();
            if (filePath) {
                // Fabric needs a URL. For local files, we can convert to data URL or ensure Electron serves it.
                // Simplest for cross-platform: read file as data URL in main process or renderer.
                // For this example, assume filePath can be used if access is granted.
                // A more robust way is to read the file and convert to base64 data URL.
                // This can be done via an IPC call if renderer doesn't have direct fs access.
                // Let's assume fabric.Image.fromURL can handle file:// paths if appropriately configured or main process helps.
                // The `dialog:open-image` returns a file path. We convert it to `file://` URL.
                const imageURL = `file://${filePath}`;
                fabric.Image.fromURL(imageURL, (img) => {
                    img.scaleToWidth(200); // Default scale
                    activeCanvas.add(img);
                    activeCanvas.setActiveObject(img);
                    activeCanvas.renderAll();
                }, { crossOrigin: 'anonymous' }); // crossOrigin might be needed depending on how files are served/accessed
            }
        } catch (error) {
            console.error("Error adding image:", error);
            alert("Could not load image: " + error.message);
        }
    };

    const toggleDrawingMode = () => {
        if (!activeCanvas) return;
        const newDrawingMode = !activeCanvas.isDrawingMode;
        activeCanvas.isDrawingMode = newDrawingMode;
        setIsDrawingMode(newDrawingMode); // For button state
    };

    const handleDeleteSelected = () => {
        if (!activeCanvas) return;
        const activeObject = activeCanvas.getActiveObject();
        if (activeObject) {
            activeCanvas.remove(activeObject);
            if (activeObject.type === 'activeSelection') { // If multiple objects selected
                activeObject.getObjects().forEach(obj => activeCanvas.remove(obj));
                activeCanvas.discardActiveObject();
            }
            activeCanvas.renderAll();
        }
    };

    const handleSaveNote = () => {
        if (currentTab) {
            saveNote(currentTab.id);
        }
    };

    return (
        <Box sx={{ p: 1, display: 'flex', alignItems: 'center', gap: 1, borderBottom: 1, borderColor: 'divider', backgroundColor: 'background.paper' }}>
            <Tooltip title="Add Text">
                <IconButton onClick={handleAddText} disabled={!activeCanvas}>
                    <TextFieldsIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Add Image">
                <IconButton onClick={handleAddImage} disabled={!activeCanvas}>
                    <AddPhotoAlternateIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title={isDrawingMode ? "Disable Pen Tool" : "Enable Pen Tool"}>
                <IconButton onClick={toggleDrawingMode} color={isDrawingMode ? "primary" : "default"} disabled={!activeCanvas}>
                    <EditIcon />
                </IconButton>
            </Tooltip>
            <Tooltip title="Delete Selected Object">
                <IconButton onClick={handleDeleteSelected} disabled={!activeCanvas || !activeCanvas?.getActiveObject()}>
                    <DeleteIcon />
                </IconButton>
            </Tooltip>
            <Divider orientation="vertical" flexItem />
            <Button
                variant="contained"
                startIcon={<SaveIcon />}
                onClick={handleSaveNote}
                disabled={!currentTab || !currentTab.isModified}
            >
                Save Note
            </Button>

            {/* Dialog for Text Input */}
            <Dialog open={textModalOpen} onClose={() => setTextModalOpen(false)}>
                <DialogTitle>Add Text Block</DialogTitle>
                <DialogContent>
                    <TextField
                        autoFocus
                        margin="dense"
                        id="text-input"
                        label="Text Content"
                        type="text"
                        fullWidth
                        variant="standard"
                        value={inputText}
                        onChange={(e) => setInputText(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && confirmAddText()}
                    />
                </DialogContent>
                <DialogActions>
                    <Button onClick={() => setTextModalOpen(false)}>Cancel</Button>
                    <Button onClick={confirmAddText}>Add Text</Button>
                </DialogActions>
            </Dialog>
        </Box>
    );
}

export default Toolbar;