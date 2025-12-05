import { useState, useCallback } from 'react';

export default function useUndoRedo(initialState, maxHistory = 50) {
    const [history, setHistory] = useState([initialState]);
    const [currentIndex, setCurrentIndex] = useState(0);

    const setState = useCallback((newState, addToHistory = true) => {
        if (addToHistory) {
            setHistory(prev => {
                // Remove any future states if we're in the middle of history
                const newHistory = prev.slice(0, currentIndex + 1);
                // Add new state
                newHistory.push(newState);
                // Keep only last maxHistory states
                if (newHistory.length > maxHistory) {
                    newHistory.shift();
                    return newHistory;
                }
                return newHistory;
            });
            setCurrentIndex(prev => Math.min(prev + 1, maxHistory - 1));
        } else {
            // Just update current state without adding to history
            setHistory(prev => {
                const newHistory = [...prev];
                newHistory[currentIndex] = newState;
                return newHistory;
            });
        }
    }, [currentIndex, maxHistory]);

    const undo = useCallback(() => {
        if (currentIndex > 0) {
            setCurrentIndex(prev => prev - 1);
            return history[currentIndex - 1];
        }
        return null;
    }, [currentIndex, history]);

    const redo = useCallback(() => {
        if (currentIndex < history.length - 1) {
            setCurrentIndex(prev => prev + 1);
            return history[currentIndex + 1];
        }
        return null;
    }, [currentIndex, history]);

    const canUndo = currentIndex > 0;
    const canRedo = currentIndex < history.length - 1;

    return {
        state: history[currentIndex],
        setState,
        undo,
        redo,
        canUndo,
        canRedo
    };
}