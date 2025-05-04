document.addEventListener('DOMContentLoaded', () => {
    const notepad = document.getElementById('notepad');
    const statusElement = document.getElementById('status');
    const UPDATE_INTERVAL = 2000; // Save every 2 seconds
    
    // Generate a unique ID for this note if none exists
    let noteId = window.location.hash.substring(1);
    if (!noteId) {
        noteId = generateId();
        window.location.hash = noteId;
    }
    
    // Load note from server
    loadNote(noteId);
    
    // Set up auto-save functionality
    let saveTimeout;
    notepad.addEventListener('input', () => {
        clearTimeout(saveTimeout);
        statusElement.textContent = 'Saving...';
        
        saveTimeout = setTimeout(() => {
            saveNote(noteId, notepad.value);
        }, UPDATE_INTERVAL);
    });
    
    // Poll for updates when the note is not being edited
    let pollInterval;
    
    function startPolling() {
        stopPolling(); // Clear any existing polling
        pollInterval = setInterval(() => {
            loadNote(noteId, true); // true = silent mode (don't display loading status)
        }, 5000); // Check for updates every 5 seconds
    }
    
    function stopPolling() {
        if (pollInterval) {
            clearInterval(pollInterval);
        }
    }
    
    // Stop polling when editing, start when inactive
    notepad.addEventListener('focus', stopPolling);
    notepad.addEventListener('blur', startPolling);
    
    // Start polling initially
    startPolling();
    
    // Generate a random ID for new notes
    function generateId(length = 10) {
        const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
        let result = '';
        for (let i = 0; i < length; i++) {
            result += characters.charAt(Math.floor(Math.random() * characters.length));
        }
        return result;
    }
    
    // Load note data from server
    function loadNote(id, silent = false) {
        if (!silent) {
            statusElement.textContent = 'Loading...';
        }
        
        fetch(`/api/notes/${id}`, {
                headers: {
                    'Accept': 'application/json'
                }
            })
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to load note');
                }
                return response.json();
            })
            .then(data => {
                // Only update content if it's different (to avoid cursor jumping)
                if (notepad.value !== data.content) {
                    notepad.value = data.content;
                }
                statusElement.textContent = 'Saved';
            })
            .catch(error => {
                console.error('Error loading note:', error);
                if (!silent) {
                    statusElement.textContent = 'Error loading';
                }
            });
    }
    
    // Save note data to server
    function saveNote(id, content) {
        fetch(`/api/notes/${id}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({ content }),
        })
        .then(response => {
            if (!response.ok) {
                throw new Error('Failed to save note');
            }
            return response.json();
        })
        .then(data => {
            statusElement.textContent = 'Saved';
        })
        .catch(error => {
            console.error('Error saving note:', error);
            statusElement.textContent = 'Error saving';
        });
    }
});
