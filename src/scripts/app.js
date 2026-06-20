/* ============================================
   E+ AI Assistant — Main Application
   Orchestrates UI, API, file handling, and
   conversation history.
   ============================================ */

document.addEventListener('DOMContentLoaded', function () {
    'use strict';

    // --- DOM Elements ---
    var chatMessages   = document.getElementById('chat-messages');
    var messageInput   = document.getElementById('message-input');
    var sendBtn        = document.getElementById('send-btn');
    var attachBtn      = document.getElementById('attach-btn');
    var micBtn         = document.getElementById('mic-btn');
    var conversationBtn = document.getElementById('conversation-btn');
    var fileInput      = document.getElementById('file-input');
    var filePreviewArea = document.getElementById('file-preview-area');
    var modelSelect    = document.getElementById('model-select');
    var headerBadge    = document.getElementById('header-model-badge');
    var clearHistoryBtn = document.getElementById('clear-history-btn');
    var mobileMenuBtn  = document.getElementById('mobile-menu-btn');
    var sidebar        = document.getElementById('sidebar');
    var sidebarOverlay = document.getElementById('sidebar-overlay');

    // --- State ---
    var attachedFiles = [];
    var isSending = false;
    var conversationMode = false;
    var conversationRecognition = null;

    // Load history from localStorage
    var savedHistory = localStorage.getItem('e_plus_chat_history');
    var messageHistory = [];

    try {
        messageHistory = savedHistory ? JSON.parse(savedHistory) : [];
    } catch (e) {
        messageHistory = [];
    }

    // Clean old format history (Gemini)
    if (messageHistory.length > 0 && messageHistory[0].parts) {
        messageHistory = [];
        localStorage.removeItem('e_plus_chat_history');
    }

    // --- Initialize Modules ---
    EPlusUI.init(chatMessages);
    EPlusSettings.init();

    // Request microphone permission early to avoid repeated prompts
    function requestMicrophonePermission() {
        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
            navigator.mediaDevices.getUserMedia({ audio: true })
                .then(function(stream) {
                    console.log('Microphone permission granted');
                    // Stop the stream immediately as we don't need it
                    stream.getTracks().forEach(function(track) {
                        track.stop();
                    });
                })
                .catch(function(error) {
                    console.log('Microphone permission denied or not available:', error);
                });
        }
    }

    // Request permission on first user interaction
    var permissionRequested = false;
    function requestPermissionOnInteraction() {
        if (!permissionRequested) {
            permissionRequested = true;
            requestMicrophonePermission();
        }
    }

    // Add listeners for user interaction
    document.addEventListener('click', requestPermissionOnInteraction, { once: true });
    document.addEventListener('keydown', requestPermissionOnInteraction, { once: true });

    if (messageHistory.length === 0) {
        EPlusUI.showWelcome(function (prompt) {
            messageInput.value = prompt;
            sendMessage();
        });
    } else {
        // Re-render saved messages
        messageHistory.forEach(function (msg) {
            var role = msg.role === 'assistant' ? 'assistant' : 'user';
            var text = '';
            if (typeof msg.content === 'string') {
                text = msg.content;
            } else if (Array.isArray(msg.content)) {
                msg.content.forEach(function (p) {
                    if (p.type === 'text' && p.text.indexOf('--- Content of file:') === -1) {
                        text += p.text + '\n';
                    }
                });
            }
            if (text) EPlusUI.appendMessage(role, text.trim());
        });
    }

    // --- Event Listeners ---

    // Send on Enter (Shift+Enter for new line)
    messageInput.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    });

    // Auto-resize textarea
    messageInput.addEventListener('input', function () {
        this.style.height = 'auto';
        this.style.height = this.scrollHeight + 'px';
        if (this.value === '') this.style.height = 'auto';

        // Update send button visual state
        sendBtn.classList.toggle('active', this.value.trim().length > 0);
    });

    sendBtn.addEventListener('click', sendMessage);
    attachBtn.addEventListener('click', function () { fileInput.click(); });
    fileInput.addEventListener('change', handleFileSelect);
    // Model selector
    modelSelect.addEventListener('change', function () {
        headerBadge.textContent = modelSelect.value;
    });

    // Clear history
    clearHistoryBtn.addEventListener('click', function () {
        if (confirm('Are you sure you want to clear your chat history?')) {
            // Stop conversation mode if active
            if (conversationMode) {
                stopConversationMode();
            }
            
            localStorage.removeItem('e_plus_chat_history');
            messageHistory = [];
            EPlusUI.showWelcome(function (prompt) {
                messageInput.value = prompt;
                sendMessage();
            });
        }
    });

    // Mobile sidebar
    mobileMenuBtn.addEventListener('click', function () {
        sidebar.classList.add('open');
        sidebarOverlay.classList.add('active');
    });

    sidebarOverlay.addEventListener('click', function () {
        sidebar.classList.remove('open');
        sidebarOverlay.classList.remove('active');
    });

    // --- Voice to Text (Speech Recognition) ---
    var SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    var recognition = null;
    var isRecording = false;
    var micToggleMode = false; // New toggle mode for mic
    var permissionGranted = false;

    if (SpeechRecognition) {
        // Create recognition instance once and reuse it
        recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        
        recognition.onstart = function() {
            isRecording = true;
            permissionGranted = true;
            micBtn.classList.add('recording');
            if (micToggleMode) {
                messageInput.placeholder = 'Mic is ON - Speak or click to turn off...';
                micBtn.title = 'Turn off microphone';
            } else {
                messageInput.placeholder = 'Listening...';
            }
        };

        recognition.onresult = function(event) {
            var interimTranscript = '';
            var finalTranscript = '';

            for (var i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                var currentVal = messageInput.value;
                messageInput.value = (currentVal + (currentVal.endsWith(' ') ? '' : ' ') + finalTranscript).trim();
                
                // In toggle mode, don't automatically send - just add to input
                if (!micToggleMode) {
                    // Auto-send after a pause (original behavior for conversation mode)
                    // This will be handled by conversation mode
                }
            }
            
            // Trigger auto-resize and send button state
            messageInput.dispatchEvent(new Event('input'));
        };

        recognition.onerror = function(event) {
            console.error('Speech recognition error', event.error);
            
            // Handle different error types
            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                alert('Microphone permission denied. Please allow microphone access and try again.');
                stopRecording();
                return;
            }
            
            if (event.error === 'network') {
                console.log('Network error - will retry');
            }
            
            // For other errors in toggle mode, try to restart after delay
            if (micToggleMode && event.error !== 'aborted' && permissionGranted) {
                setTimeout(function() {
                    if (micToggleMode && !isRecording) {
                        startRecording();
                    }
                }, 1000);
            } else if (!micToggleMode) {
                stopRecording();
            }
        };

        recognition.onend = function() {
            console.log('Recognition ended, toggle mode:', micToggleMode, 'isRecording:', isRecording);
            
            // Only restart if we're in toggle mode and expect to be recording
            if (micToggleMode && permissionGranted) {
                // Brief delay before restarting to avoid rapid restarts
                setTimeout(function() {
                    if (micToggleMode && permissionGranted) {
                        try {
                            recognition.start();
                        } catch(e) {
                            console.log('Recognition restart failed:', e);
                            // If restart fails, stop toggle mode
                            if (e.name === 'InvalidStateError') {
                                // Already running, ignore
                                return;
                            }
                            stopRecording();
                        }
                    }
                }, 500); // Increased delay to reduce permission prompts
            } else {
                stopRecording();
            }
        };

        micBtn.addEventListener('click', function() {
            if (conversationMode) {
                // Don't interfere with conversation mode
                return;
            }
            
            if (isRecording || micToggleMode) {
                // Turn off mic
                micToggleMode = false;
                stopRecording();
            } else {
                // Turn on mic in toggle mode
                micToggleMode = true;
                startRecording();
            }
        });
    } else {
        micBtn.style.display = 'none';
        console.warn('Speech Recognition API not supported in this browser.');
    }

    function startRecording() {
        if (!recognition) return;
        
        // Don't start if already running
        if (isRecording) {
            console.log('Recognition already running');
            return;
        }
        
        try {
            recognition.start();
        } catch(e) {
            console.error('Failed to start recognition:', e);
            if (e.name === 'InvalidStateError') {
                // Already running, just update UI
                isRecording = true;
                micBtn.classList.add('recording');
                if (micToggleMode) {
                    messageInput.placeholder = 'Mic is ON - Speak or click to turn off...';
                    micBtn.title = 'Turn off microphone';
                }
            }
        }
    }

    function stopRecording() {
        if (!recognition) return;
        
        isRecording = false;
        micToggleMode = false;
        micBtn.classList.remove('recording');
        micBtn.title = 'Voice Input (Click to toggle)';
        messageInput.placeholder = 'Message E+...';
        
        try {
            recognition.stop();
        } catch(e) {
            console.log('Error stopping recognition:', e);
        }
    }

    // --- Conversation Mode ---
    
    function startConversationMode() {
        if (!SpeechRecognition) {
            alert('Speech recognition not supported in this browser.');
            return;
        }

        // Stop toggle mic if active
        if (micToggleMode || isRecording) {
            stopRecording();
        }

        conversationMode = true;
        conversationBtn.classList.add('active');
        conversationBtn.title = 'Stop Conversation Mode';
        
        // Update UI to show conversation mode
        messageInput.placeholder = 'Conversation Mode Active - Speak to E+';
        messageInput.disabled = true;
        
        // Show status
        EPlusUI.setStatus('Listening...', 'busy');
        
        // Setup conversation recognition
        setupConversationRecognition();
    }

    function stopConversationMode() {
        conversationMode = false;
        conversationBtn.classList.remove('active');
        conversationBtn.title = 'Start Conversation Mode';
        
        messageInput.placeholder = 'Message E+...';
        messageInput.disabled = false;
        
        EPlusUI.setStatus('Ready', 'online');
        EPlusUI.stopSpeaking();
        
        if (conversationRecognition) {
            try {
                conversationRecognition.stop();
            } catch(e) {}
            conversationRecognition = null;
        }
    }

    function setupConversationRecognition() {
        if (!SpeechRecognition) return;

        // Create a separate recognition instance for conversation mode
        conversationRecognition = new SpeechRecognition();
        conversationRecognition.continuous = true;
        conversationRecognition.interimResults = false; // Only final results for conversation
        
        conversationRecognition.onstart = function() {
            EPlusUI.setStatus('Listening...', 'busy');
        };

        conversationRecognition.onresult = function(event) {
            var transcript = '';
            for (var i = event.resultIndex; i < event.results.length; i++) {
                if (event.results[i].isFinal) {
                    transcript += event.results[i][0].transcript;
                }
            }
            
            if (transcript.trim()) {
                // Don't restart recognition immediately, let message processing handle it
                messageInput.value = transcript.trim();
                sendMessage();
            }
        };

        conversationRecognition.onerror = function(event) {
            console.error('Conversation recognition error:', event.error);
            
            if (event.error === 'not-allowed' || event.error === 'permission-denied') {
                alert('Microphone permission denied. Please allow microphone access for conversation mode.');
                stopConversationMode();
                return;
            }
            
            // For other errors, try to restart if still in conversation mode
            if (conversationMode && event.error !== 'aborted') {
                setTimeout(function() {
                    if (conversationMode) {
                        try {
                            conversationRecognition.start();
                        } catch(e) {
                            console.log('Conversation recognition restart failed:', e);
                        }
                    }
                }, 2000); // Longer delay for conversation mode
            }
        };

        conversationRecognition.onend = function() {
            // Don't automatically restart here - let the message completion callback handle it
            // This prevents the constant permission requests
        };

        // Start listening
        try {
            conversationRecognition.start();
        } catch(e) {
            console.error('Failed to start conversation recognition:', e);
        }
    }

    // Conversation button event
    conversationBtn.addEventListener('click', function() {
        if (conversationMode) {
            stopConversationMode();
        } else {
            startConversationMode();
        }
    });
    // --- Core: Send Message ---
    async function sendMessage() {
        var text = messageInput.value.trim();
        if ((!text && attachedFiles.length === 0) || isSending) return;

        // Stop any ongoing speech
        EPlusUI.stopSpeaking();

        isSending = true;

        // Reset input
        messageInput.value = '';
        messageInput.style.height = 'auto';
        sendBtn.classList.remove('active');

        var currentAttachments = attachedFiles.slice();
        attachedFiles = [];
        updateFilePreview();

        // Clear welcome if showing
        var welcomeEl = chatMessages.querySelector('.welcome-container');
        if (welcomeEl) welcomeEl.remove();

        // Check if we have images - these models don't support vision
        var hasImages = currentAttachments.some(function(f) { return f.type === 'image'; });
        if (hasImages) {
            EPlusUI.appendMessage('assistant', 
                '⚠️ **Images not supported**: The current models don\'t support image processing. Please use text-only input or attach text files instead.');
            isSending = false;
            return;
        }

        // Render user message
        EPlusUI.appendMessage('user', text, currentAttachments);

        // Build OpenAI payload content
        var content = [];

        currentAttachments.forEach(function (file) {
            if (file.type === 'text') {
                content.push({
                    type: 'text',
                    text: '\n\n--- Content of file: ' + file.name + ' ---\n' + file.data + '\n--- End of file ---'
                });
            }
        });

        if (text) {
            content.push({ type: 'text', text: text });
        }

        // If it's just text, send as string for simpler models
        if (content.length === 1 && content[0].type === 'text') {
            content = content[0].text;
        }

        messageHistory.push({ role: 'user', content: content });
        saveHistory();

        // Show typing indicator
        var typingId = EPlusUI.showTypingIndicator();
        EPlusUI.setStatus('Thinking...', 'busy');

        // Get current settings
        var settings = EPlusSettings.getSettings();

        try {
            var result = await EPlusAPI.send({
                model: modelSelect.value,
                messageHistory: messageHistory,
                autoRetry: settings.autoRetry,
                fallback: settings.fallback,
                temperature: settings.temperature,
                maxRetries: settings.maxRetries,
                onStatus: function (statusText) {
                    EPlusUI.updateTypingStatus(typingId, statusText);
                }
            });

            EPlusUI.removeTypingIndicator(typingId);

            var replyText = result.data.choices[0].message.content;

            // Build extra info HTML
            var extraHTML = '';
            if (settings.showRetryInfo && (result.fallbackUsed || result.attempts > 1)) {
                var info = '';
                if (result.fallbackUsed) info += 'Model: ' + result.model;
                if (result.attempts > 1) info += (info ? ' · ' : '') + result.attempts + ' attempts';
                extraHTML = '<div class="retry-info">⚡ ' + info + '</div>';
            }

            messageHistory.push({ role: 'assistant', content: replyText });
            saveHistory();

            EPlusUI.appendMessage('assistant', replyText, [], extraHTML);
            EPlusUI.setStatus('Ready', 'online');

            // Auto-speak if enabled OR if in conversation mode
            var settings = EPlusSettings.getSettings();
            if (settings.autoSpeak || conversationMode) {
                setTimeout(function() {
                    EPlusUI.speakText(replyText, function() {
                        // Callback when speech is done
                        if (conversationMode && conversationRecognition) {
                            setTimeout(function() {
                                if (conversationMode) {
                                    EPlusUI.setStatus('Listening...', 'busy');
                                    try {
                                        // Only restart if not already running
                                        conversationRecognition.start();
                                    } catch(e) {
                                        if (e.name !== 'InvalidStateError') {
                                            console.log('Failed to restart conversation recognition:', e);
                                        }
                                    }
                                }
                            }, 1000); // Longer pause before restarting to avoid permission prompts
                        }
                    });
                }, 500); // Small delay to let the message render
            } else if (conversationMode) {
                // Even without auto-speak, restart listening in conversation mode
                setTimeout(function() {
                    if (conversationMode && conversationRecognition) {
                        EPlusUI.setStatus('Listening...', 'busy');
                        try {
                            conversationRecognition.start();
                        } catch(e) {
                            if (e.name !== 'InvalidStateError') {
                                console.log('Failed to restart conversation recognition:', e);
                            }
                        }
                    }
                }, 2000); // Even longer delay without speech
            }

        } catch (error) {
            EPlusUI.removeTypingIndicator(typingId);

            var errorMsg = error.message || 'Something went wrong.';

            // Provide specific guidance based on error type
            if (error.status === 429 || errorMsg.toLowerCase().indexOf('high demand') !== -1) {
                errorMsg = '⏳ **High demand.** The API is rate-limited. Wait a moment and try again, or switch to a different model in the sidebar.';
            } else if (error.status === 404) {
                errorMsg = '❌ **Model not found.** The selected model may be unavailable. Try switching to a different model in the sidebar.';
            } else if (errorMsg === 'Failed to fetch') {
                errorMsg = '🌐 **Network error.** Could not reach the API. Check your internet connection and try again.';
            }

            EPlusUI.appendMessage('assistant', errorMsg);
            EPlusUI.setStatus('Error', 'error');

            // Remove the failed user message from history
            messageHistory.pop();
            saveHistory();

            // If in conversation mode, restart listening after error
            if (conversationMode) {
                setTimeout(function() {
                    if (conversationMode && conversationRecognition) {
                        EPlusUI.setStatus('Listening...', 'busy');
                        try {
                            conversationRecognition.start();
                        } catch(e) {
                            if (e.name !== 'InvalidStateError') {
                                console.log('Failed to restart after error:', e);
                            }
                        }
                    }
                }, 3000); // Longer delay after errors
            }

            // Reset status after a moment
            setTimeout(function () {
                if (!conversationMode) {
                    EPlusUI.setStatus('Ready', 'online');
                }
            }, 5000);
        }

        isSending = false;
    }
    // --- File Handling ---
    function handleFileSelect(e) {
        var files = Array.from(e.target.files);

        files.forEach(function (file) {
            // Only process text files
            if (file.type.startsWith('image/')) {
                alert('Images are not supported by the current models. Please use text files only.');
                return;
            }

            var reader = new FileReader();

            reader.onload = function (event) {
                attachedFiles.push({
                    name: file.name,
                    type: 'text',
                    data: event.target.result
                });

                updateFilePreview();
            };

            reader.readAsText(file);
        });

        fileInput.value = '';
    }

    function updateFilePreview() {
        filePreviewArea.innerHTML = '';

        if (attachedFiles.length === 0) {
            filePreviewArea.classList.add('hidden');
            return;
        }

        filePreviewArea.classList.remove('hidden');

        attachedFiles.forEach(function (file, index) {
            var item = document.createElement('div');
            item.className = 'file-preview-item';
            var icon = file.type === 'image' ? '🖼️' : '📄';
            item.innerHTML = icon + ' ' + EPlusUI.escapeHTML(file.name) +
                ' <button data-index="' + index + '">&times;</button>';
            filePreviewArea.appendChild(item);
        });

        filePreviewArea.querySelectorAll('button').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                var idx = parseInt(e.target.getAttribute('data-index'));
                attachedFiles.splice(idx, 1);
                updateFilePreview();
            });
        });
    }

    // --- Persistence ---
    function saveHistory() {
        try {
            localStorage.setItem('e_plus_chat_history', JSON.stringify(messageHistory));
        } catch (e) {
            // Storage full — trim oldest messages
            if (messageHistory.length > 10) {
                messageHistory = messageHistory.slice(-10);
                localStorage.setItem('e_plus_chat_history', JSON.stringify(messageHistory));
            }
        }
    }

});