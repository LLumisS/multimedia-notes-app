import React, { useRef, useEffect, useCallback } from 'react';
import { Box } from '@mui/material';
import { fabric } from 'fabric';

function CanvasWorkspace({ isActive, initialData, onContentChange, onCanvasReady, noteId }) {
    const isSyncingRef = useRef(false);
    const canvasRef = useRef(null);
    const fabricCanvasRef = useRef(null);
    const containerRef = useRef(null);

    const debouncedOnContentChange = useCallback(
        debounce((json) => {
            onContentChange(json);
        }, 500),
        [onContentChange]
    );

    // Initialize Fabric Canvas
    useEffect(() => {
        if (!canvasRef.current || !containerRef.current) return;

        const canvasElement = canvasRef.current;
        const containerElement = containerRef.current;

        if (fabricCanvasRef.current) {
            fabricCanvasRef.current.dispose();
        }

        const newFabricCanvas = new fabric.Canvas(canvasElement, {
            width: containerElement.clientWidth,
            height: containerElement.clientHeight,
            backgroundColor: '#ffffff',
        });
        fabricCanvasRef.current = newFabricCanvas;

        // Load initial data if provided
        isSyncingRef.current = true;
        if (initialData && initialData.objects) {
            newFabricCanvas.loadFromJSON(initialData, () => {
                newFabricCanvas.renderAll();
                isSyncingRef.current = false;
            });
        } else {
            isSyncingRef.current = false;
        }

        const handleModified = () => {
            if (isSyncingRef.current) return;
            const json = newFabricCanvas.toDatalessJSON(['id', 'name']);
            debouncedOnContentChange(json);
        };

        newFabricCanvas.on('object:modified', handleModified);
        newFabricCanvas.on('object:added', handleModified);
        newFabricCanvas.on('object:removed', handleModified);

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
    }, [noteId]);

    // Effect to pass canvas instance when it becomes active
    useEffect(() => {
        if (isActive && fabricCanvasRef.current && onCanvasReady) {
            onCanvasReady(fabricCanvasRef.current);
        } else if (!isActive && onCanvasReady) {}
    }, [isActive, onCanvasReady, noteId]);


    // Effect for handling delete key
    useEffect(() => {
        if (!isActive || !fabricCanvasRef.current) return;

        const canvas = fabricCanvasRef.current;
        const handleDeleteKeyPress = (event) => {
            if (event.key === 'Delete') {
                const activeObject = canvas.getActiveObject();
                if (activeObject) {
                    canvas.remove(activeObject);
                    if (activeObject.type === 'activeSelection') {
                        activeObject.getObjects().forEach(obj => canvas.remove(obj));
                        canvas.discardActiveObject();
                    }
                    canvas.renderAll();
                    const json = canvas.toDatalessJSON(['id', 'name']);
                    onContentChange(json);
                }
            }
        };

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

function debounce(func, delay) {
    let timeout;
    return function(...args) {
        const context = this;
        clearTimeout(timeout);
        timeout = setTimeout(() => func.apply(context, args), delay);
    };
}

export default CanvasWorkspace;
