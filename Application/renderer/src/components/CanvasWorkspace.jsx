import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { fabric } from 'fabric';

function CanvasWorkspace({ isActive, initialData, onContentChange, onCanvasReady, noteId }) {
    const isSyncingRef = useRef(false);
    const canvasRef = useRef(null); // For the <canvas> element
    const fabricCanvasRef = useRef(null); // For the fabric.Canvas instance
    const containerRef = useRef(null); // For the container div to observe size

    const debouncedOnContentChange = useCallback(
        debounce((json) => { // Basic debounce
            onContentChange(json);
        }, 500),
        [onContentChange]
    );

    // Initialize Fabric Canvas
    useEffect(() => {
        console.log("CanvasWorkspace1.jsx");
        if (!canvasRef.current || !containerRef.current) return;

        const canvasElement = canvasRef.current;
        const containerElement = containerRef.current;

        // Ensure existing Fabric canvas is disposed if one exists for this element
        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }

        const newFabricCanvas = new fabric.Canvas(canvasElement, {
            width: containerElement.clientWidth,
            height: containerElement.clientHeight,
            backgroundColor: '#ffffff', // Default background
        });
        fabricCanvasRef.current = newFabricCanvas;

        // Load initial data if provided
        isSyncingRef.current = true; // Set to true before loading
        if (initialData && initialData.objects) {
            newFabricCanvas.loadFromJSON(initialData, () => {
                newFabricCanvas.renderAll();
                // Ensure isSyncingRef is set to false AFTER loadFromJSON callback completes
                isSyncingRef.current = false;
            });
        } else {
            // If no initial data, still set isSyncingRef to false
            isSyncingRef.current = false;
        }

        const handleModified = () => {
            if (isSyncingRef.current) return;
            const json = newFabricCanvas.toDatalessJSON(['id', 'name', /* other custom props if any */]);
            debouncedOnContentChange(json); // Use debounced version
        };

        newFabricCanvas.on('object:modified', handleModified);
        newFabricCanvas.on('object:added', handleModified);
        newFabricCanvas.on('object:removed', handleModified);
        // Could add more events like text:changed if needed for finer-grained modification tracking

        if (onCanvasReady && isActive) {
            onCanvasReady(newFabricCanvas);
        }

        // Resize observer for canvas responsiveness
        const resizeObserver = new ResizeObserver(entries => {
            if (!entries || entries.length === 0) return;
            const { width, height } = entries[0].contentRect;
            newFabricCanvas.setWidth(width);
            newFabricCanvas.setHeight(height);
            newFabricCanvas.renderAll();
        });
        resizeObserver.observe(containerElement);

        return () => {
            newFabricCanvas.off('object:modified', handleModified);
            newFabricCanvas.off('object:added', handleModified);
            newFabricCanvas.off('object:removed', handleModified);
            resizeObserver.unobserve(containerElement);
            if (fabricCanvasRef.current) {
                fabricCanvasRef.current.dispose();
                fabricCanvasRef.current = null;
            }
        };
    }, [noteId]); // Re-init if initialData or noteId (tab identity) changes. `noteId` ensures a fresh canvas for a new tab.

    // Effect to pass canvas instance when it becomes active
    useEffect(() => {
        console.log("CanvasWorkspace2.jsx");
        if (isActive && fabricCanvasRef.current && onCanvasReady) {
            onCanvasReady(fabricCanvasRef.current);
        } else if (!isActive && onCanvasReady) {
            // Optional: Notify App.jsx that this canvas is no longer active
            // onCanvasReady(null); // This might be too aggressive if App.jsx relies on the last active one.
        }
    }, [isActive, onCanvasReady, noteId]);


    // Effect for handling delete key
    useEffect(() => {
        console.log("CanvasWorkspace3.jsx");
        if (!isActive || !fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        const handleDeleteKeyPress = (event) => {
            if (event.key === 'Delete' || event.key === 'Backspace') {
                const activeObject = canvas.getActiveObject();
                if (activeObject) {
                    canvas.remove(activeObject);
                    if (activeObject.type === 'activeSelection') {
                        activeObject.getObjects().forEach(obj => canvas.remove(obj));
                        canvas.discardActiveObject();
                    }
                    canvas.renderAll();
                    // Trigger content change
                    const json = canvas.toDatalessJSON(['id', 'name']);
                    onContentChange(json);
                }
            }
        };

        // Attach to window or a focused element. For simplicity, window:
        window.addEventListener('keydown', handleDeleteKeyPress);
        return () => {
            window.removeEventListener('keydown', handleDeleteKeyPress);
        };
    }, [isActive, onContentChange, noteId]);

    return (
        <Box ref={containerRef} sx={{ width: '100%', height: '100%', overflow: 'hidden', position: 'relative' }}>
            <canvas ref={canvasRef} id={`canvas-${noteId}`} />
        </Box>
    );
}

// Simple debounce function
function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

export default CanvasWorkspace;
