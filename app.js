
document.addEventListener('DOMContentLoaded', () => {
    const notepad = document.getElementById('notepad');
    const statusElement = document.getElementById('status');
    const saveBtn = document.getElementById('saveBtn');
    const loadBtn = document.getElementById('loadBtn');
    const noteidSelect = document.getElementById('noteid-select');

    // Trigger loadNote when selection changes (including Select2 events)
    // (Moved after all DOM element declarations)
    if (noteidSelect) {
        // For native select change
        noteidSelect.addEventListener('change', () => {
            let selectedId = noteidSelect.value || (window.$ && $(noteidSelect).val());
            if (selectedId) {
                window.location.hash = selectedId;
                noteId = selectedId;
                loadNote(selectedId);
            }
        });
        // For Select2: listen to select2:select and select2:unselect (for allowClear)
        if (window.$ && $(noteidSelect).on) {
            $(noteidSelect).on('select2:select', function(e) {
                let selectedId = e.params.data.id;
                if (selectedId) {
                    window.location.hash = selectedId;
                    noteId = selectedId;
                    loadNote(selectedId);
                }
            });
            $(noteidSelect).on('select2:clear', function(e) {
                // Optionally clear the note if desired
                // notepad.value = '';
            });
        }
    }

    // Prepopulate select with note IDs from data/ directory
    function populateNoteIdSelect(ids, currentId) {
        noteidSelect.innerHTML = '';
        ids.forEach(id => {
            const opt = document.createElement('option');
            opt.value = id;
            opt.textContent = id;
            noteidSelect.appendChild(opt);
        });
        // If currentId is not in the list, add it as an option
        if (currentId && !ids.includes(currentId)) {
            const opt = document.createElement('option');
            opt.value = currentId;
            opt.textContent = currentId;
            noteidSelect.appendChild(opt);
        }
        // Set selected value
        if (currentId) noteidSelect.value = currentId;
    }

    // Initialize select2 for dynamic option creation
    function initSelect2() {
        if (window.$ && $(noteidSelect).select2) {
            $(noteidSelect).select2({
                tags: true,
                placeholder: 'Note ID',
                allowClear: true,
                width: 'resolve',
                selectOnClose: true,
                createTag: function (params) {
                    var term = $.trim(params.term);
                    if (term === '') {
                        return null;
                    }
                    return {
                        id: term,
                        text: term,
                        newTag: true
                    };
                }
            });
        }
    }

    // Wait for select2 to be loaded, then initialize
    function waitForSelect2AndInit() {
        if (window.$ && $(noteidSelect).select2) {
            initSelect2();
        } else {
            setTimeout(waitForSelect2AndInit, 100);
        }
    }
    waitForSelect2AndInit();
    const UPDATE_INTERVAL = 2000; // Save every 2 seconds
    
    // Generate a unique ID for this note if none exists
    let noteId = window.location.hash.substring(1);
    if (!noteId) {
        noteId = generateId();
        window.location.hash = noteId;
    }
    
    // Populate select and load note
    getNoteIds();
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

    // Manual Save button
    if (saveBtn) {
        saveBtn.addEventListener('click', () => {
            let customId = noteidSelect && (noteidSelect.value || (window.$ && $(noteidSelect).val()))?.trim();
            let useId = customId || noteId;
            if (customId) {
                window.location.hash = customId;
                noteId = customId;
                // Add to select if not present
                if (![...noteidSelect.options].some(o => o.value === customId)) {
                    const opt = document.createElement('option');
                    opt.value = customId;
                    opt.textContent = customId;
                    noteidSelect.appendChild(opt);
                }
                if (window.$ && $(noteidSelect).select2) {
                    $(noteidSelect).val(customId).trigger('change');
                }
            }
            saveNote(useId, notepad.value);
        });
    }

    // Manual Load button
    if (loadBtn) {
        loadBtn.addEventListener('click', () => {
            let customId = noteidSelect && (noteidSelect.value || (window.$ && $(noteidSelect).val()))?.trim();
            let useId = customId || noteId;
            if (customId) {
                window.location.hash = customId;
                noteId = customId;
                // Add to select if not present
                if (![...noteidSelect.options].some(o => o.value === customId)) {
                    const opt = document.createElement('option');
                    opt.value = customId;
                    opt.textContent = customId;
                    noteidSelect.appendChild(opt);
                }
                if (window.$ && $(noteidSelect).select2) {
                    $(noteidSelect).val(customId).trigger('change');
                }
            }
            loadNote(useId);
        });
    }
    
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
        if (!content) {
            statusElement.textContent = 'Nothing to save';
            return;
        }
        statusElement.textContent = 'Saving...';
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
            getNoteIds();
        })
        .catch(error => {
            console.error('Error saving note:', error);
            statusElement.textContent = 'Error saving';
        });
    }

    function getNoteIds() {
        return fetch('/api/notes')
            .then(response => {
                if (!response.ok) {
                    throw new Error('Failed to fetch note IDs');
                }
                return response.json();
            })
            .then(data => {
                populateNoteIdSelect(data.ids || [], noteId)
                return data.ids || [];
            })
            .catch(error => {
                console.error('Error fetching note IDs:', error);
                return [];
            });
    }
});
