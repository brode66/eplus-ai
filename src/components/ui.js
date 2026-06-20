/* ============================================
   E+ AI Assistant — UI Utilities
   Handles rendering, markdown, and DOM helpers.
   ============================================ */

var EPlusUI = (function () {
    'use strict';

    var chatMessages = null;
    var speechSynthesis = window.speechSynthesis;
    var currentUtterance = null;
    var isSpeaking = false;
    var voicesLoaded = false;

    function init(container) {
        chatMessages = container;
        
        // Load voices when they become available
        if (speechSynthesis) {
            loadVoices();
            speechSynthesis.onvoiceschanged = loadVoices;
        }
    }

    function loadVoices() {
        var voices = speechSynthesis.getVoices();
        if (voices.length > 0) {
            voicesLoaded = true;
            console.log('Loaded', voices.length, 'voices');
            // Log available human-like voices for debugging
            voices.forEach(function(voice, index) {
                if (voice.lang.indexOf('en') === 0) {
                    console.log(index + ':', voice.name, '(' + voice.lang + ')', voice.localService ? 'Local' : 'Remote');
                }
            });
        }
    }

    /* ---- Markdown Rendering ---- */

    /**
     * Simple markdown-to-HTML converter.
     * Handles: code blocks, inline code, bold, italic,
     * headers, links, blockquotes, lists, line breaks.
     */
    function renderMarkdown(text) {
        if (!text) return '';

        var html = text;

        // Escape HTML first
        html = html.replace(/&/g, '&amp;');
        html = html.replace(/</g, '&lt;');
        html = html.replace(/>/g, '&gt;');

        // Fenced code blocks: ```lang\ncode\n```
        html = html.replace(/```(\w*)\n([\s\S]*?)```/g, function (_, lang, code) {
            return '<pre><code class="lang-' + (lang || 'text') + '">' + code.trim() + '</code></pre>';
        });

        // Inline code: `code`
        html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

        // Headers: ### h3, ## h2, # h1
        html = html.replace(/^### (.+)$/gm, '<h3>$1</h3>');
        html = html.replace(/^## (.+)$/gm, '<h2>$1</h2>');
        html = html.replace(/^# (.+)$/gm, '<h1>$1</h1>');

        // Bold: **text**
        html = html.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');

        // Italic: *text*
        html = html.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

        // Blockquotes: > text
        html = html.replace(/^&gt; (.+)$/gm, '<blockquote>$1</blockquote>');

        // Unordered list items: - item or * item
        html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');

        // Ordered list items: 1. item
        html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

        // Wrap consecutive <li> in <ul>
        html = html.replace(/((?:<li>.*<\/li>\n?)+)/g, '<ul>$1</ul>');

        // Links: [text](url)
        html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');

        // Line breaks: double newline = paragraph
        html = html.replace(/\n\n/g, '</p><p>');

        // Single newline = <br> (but not inside pre/code)
        html = html.replace(/(?<!<\/pre>|<\/code>|<\/h[123]>|<\/li>|<\/ul>|<\/blockquote>)\n/g, '<br>');

        // Wrap in paragraph tags
        html = '<p>' + html + '</p>';

        // Clean up empty paragraphs
        html = html.replace(/<p>\s*<\/p>/g, '');

        // Don't wrap block elements in <p>
        html = html.replace(/<p>(<pre>)/g, '$1');
        html = html.replace(/(<\/pre>)<\/p>/g, '$1');
        html = html.replace(/<p>(<h[123]>)/g, '$1');
        html = html.replace(/(<\/h[123]>)<\/p>/g, '$1');
        html = html.replace(/<p>(<ul>)/g, '$1');
        html = html.replace(/(<\/ul>)<\/p>/g, '$1');
        html = html.replace(/<p>(<blockquote>)/g, '$1');
        html = html.replace(/(<\/blockquote>)<\/p>/g, '$1');

        return html;
    }
    /**
     * Clean text for speech synthesis (remove markdown and HTML)
     */
    function cleanTextForSpeech(text) {
        if (!text) return '';
        
        // Remove markdown formatting
        var cleaned = text
            .replace(/\*\*(.*?)\*\*/g, '$1')  // Bold
            .replace(/\*(.*?)\*/g, '$1')      // Italic
            .replace(/`(.*?)`/g, '$1')        // Inline code
            .replace(/```[\s\S]*?```/g, '[Code block]')  // Code blocks
            .replace(/#{1,6}\s*(.*)/g, '$1')  // Headers
            .replace(/>\s*(.*)/g, '$1')       // Blockquotes
            .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')  // Links
            .replace(/^\s*[-*+]\s+/gm, '')    // List items
            .replace(/^\s*\d+\.\s+/gm, '')    // Numbered lists
            .replace(/⚡|🌐|❌|⏳|🖼️|💡|💻|✨/g, '')  // Emojis
            .replace(/\n+/g, '. ')            // Line breaks to pauses
            .trim();
            
        return cleaned;
    }

    /**
     * Get the best human-like voice available or user's selected voice
     */
    function getBestVoice() {
        var voices = speechSynthesis.getVoices();
        
        // Try to get user's selected voice from settings
        var selectedVoice = 'auto';
        try {
            var settings = JSON.parse(localStorage.getItem('e_plus_settings') || '{}');
            selectedVoice = settings.selectedVoice || 'auto';
        } catch(e) {}
        
        if (selectedVoice !== 'auto') {
            // Find user's selected voice
            var userVoice = voices.find(function(voice) {
                return voice.name === selectedVoice;
            });
            if (userVoice) return userVoice;
        }
        
        // Preferred voices in order of preference (more human-like)
        var preferredVoiceNames = [
            'Google US English', 'Google UK English Female', 'Google UK English Male',
            'Microsoft Zira - English (United States)', 'Microsoft David - English (United States)',
            'Microsoft Hazel - English (Great Britain)', 'Microsoft George - English (Great Britain)',
            'Samantha', 'Alex', 'Victoria', 'Daniel', 'Karen', 'Moira', 'Tessa',
            'Allison', 'Ava', 'Susan', 'Vicki', 'Bruce', 'Fred'
        ];
        
        // First try to find preferred voices
        for (var i = 0; i < preferredVoiceNames.length; i++) {
            var voice = voices.find(function(v) {
                return v.name.indexOf(preferredVoiceNames[i]) !== -1;
            });
            if (voice) return voice;
        }
        
        // Fallback: look for any English voice that sounds natural
        var englishVoice = voices.find(function(voice) {
            return voice.lang.indexOf('en') === 0 && 
                   (voice.name.indexOf('Google') !== -1 || 
                    voice.name.indexOf('Microsoft') !== -1 ||
                    voice.name.indexOf('Natural') !== -1 ||
                    voice.name.indexOf('Neural') !== -1 ||
                    voice.localService === false); // Cloud voices are usually better
        });
        
        if (englishVoice) return englishVoice;
        
        // Last fallback: any English voice
        return voices.find(function(voice) {
            return voice.lang.indexOf('en') === 0;
        });
    }

    /**
     * Speak the given text using Web Speech API with human-like voice
     */
    function speakText(text, onComplete) {
        if (!speechSynthesis) {
            console.warn('Speech synthesis not supported');
            if (onComplete) onComplete();
            return false;
        }

        // Stop current speech if any
        stopSpeaking();

        var cleanedText = cleanTextForSpeech(text);
        if (!cleanedText) {
            if (onComplete) onComplete();
            return false;
        }

        currentUtterance = new SpeechSynthesisUtterance(cleanedText);
        
        // Configure voice settings for more human-like speech
        currentUtterance.rate = 0.95;  // Slightly slower for clarity
        currentUtterance.pitch = 1.0;  // Natural pitch
        currentUtterance.volume = 0.9; // Good volume
        
        // Use the best available human-like voice
        var bestVoice = getBestVoice();
        if (bestVoice) {
            currentUtterance.voice = bestVoice;
            console.log('Using voice:', bestVoice.name, bestVoice.lang);
        }

        currentUtterance.onstart = function() {
            isSpeaking = true;
        };

        currentUtterance.onend = function() {
            isSpeaking = false;
            currentUtterance = null;
            if (onComplete) onComplete();
        };

        currentUtterance.onerror = function() {
            isSpeaking = false;
            currentUtterance = null;
            if (onComplete) onComplete();
        };

        speechSynthesis.speak(currentUtterance);
        return true;
    }

    /**
     * Stop current speech
     */
    function stopSpeaking() {
        if (speechSynthesis && isSpeaking) {
            speechSynthesis.cancel();
            isSpeaking = false;
            currentUtterance = null;
        }
    }

    /**
     * Toggle speech for a message
     */
    function toggleSpeech(text, button) {
        if (isSpeaking) {
            stopSpeaking();
            button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg>';
            button.classList.remove('speaking');
        } else {
            if (speakText(text)) {
                button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M23 9l-2 2-2-2M21 11v8a2 2 0 0 1-2 2h-1"></path></svg>';
                button.classList.add('speaking');
                
                // Update button when speech ends
                if (currentUtterance) {
                    currentUtterance.onend = function() {
                        isSpeaking = false;
                        currentUtterance = null;
                        button.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg>';
                        button.classList.remove('speaking');
                    };
                }
            }
        }
    }

    /**
     * Escape HTML for safe text insertion (no markdown).
     */
    function escapeHTML(str) {
        var p = document.createElement('p');
        p.textContent = str;
        return p.innerHTML;
    }

    /* ---- Message Rendering ---- */

    /**
     * Append a message to the chat.
     * @param {string} role — 'user' or 'assistant'
     * @param {string} text — message text
     * @param {Array} attachments — optional file attachments
     * @param {string} extraHTML — optional HTML to append after text
     */
    function appendMessage(role, text, attachments, extraHTML) {
        if (!chatMessages) return;

        attachments = attachments || [];
        extraHTML = extraHTML || '';

        var msgDiv = document.createElement('div');
        msgDiv.className = 'message ' + role;

        var avatar = role === 'assistant' ? 'E+' : 'U';

        var contentHTML = '';

        // Text file badges
        attachments.filter(function (a) { return a.type === 'text'; }).forEach(function (file) {
            contentHTML += '<div class="message-file-badge">📄 ' + escapeHTML(file.name) + '</div>';
        });

        // Text content
        if (text) {
            if (role === 'assistant') {
                contentHTML += renderMarkdown(text);
            } else {
                contentHTML += '<p>' + escapeHTML(text) + '</p>';
            }
        }

        // Images
        attachments.filter(function (a) { return a.type === 'image'; }).forEach(function (file) {
            contentHTML += '<img src="' + file.data + '" alt="' + escapeHTML(file.name) + '" class="message-image">';
        });

        // Extra HTML (retry info, etc.)
        contentHTML += extraHTML;

        // Add speak button for assistant messages
        var speakButtonHTML = '';
        if (role === 'assistant' && text && speechSynthesis) {
            speakButtonHTML = '<button class="speak-btn" title="Listen to this message"><svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"></polygon><path d="M19.07 4.93a10 10 0 0 1 0 14.14M15.54 8.46a5 5 0 0 1 0 7.08"></path></svg></button>';
        }

        msgDiv.innerHTML =
            '<div class="avatar">' + avatar + '</div>' +
            '<div class="bubble">' + contentHTML + '</div>' +
            speakButtonHTML;

        chatMessages.appendChild(msgDiv);

        // Add click handler for speak button
        if (role === 'assistant' && text && speechSynthesis) {
            var speakBtn = msgDiv.querySelector('.speak-btn');
            if (speakBtn) {
                speakBtn.addEventListener('click', function() {
                    toggleSpeech(text, speakBtn);
                });
            }
        }

        chatMessages.scrollTop = chatMessages.scrollHeight;

        return msgDiv;
    }

    /**
     * Show a typing indicator. Returns the element ID.
     */
    function showTypingIndicator() {
        var id = 'typing-' + Date.now();
        var msgDiv = document.createElement('div');
        msgDiv.className = 'message assistant';
        msgDiv.id = id;
        msgDiv.innerHTML =
            '<div class="avatar">E+</div>' +
            '<div class="bubble">' +
                '<div class="typing-indicator">' +
                    '<div class="typing-dot"></div>' +
                    '<div class="typing-dot"></div>' +
                    '<div class="typing-dot"></div>' +
                '</div>' +
            '</div>';

        chatMessages.appendChild(msgDiv);
        chatMessages.scrollTop = chatMessages.scrollHeight;
        return id;
    }
    /**
     * Update the text in the typing indicator bubble (for status updates).
     */
    function updateTypingStatus(id, statusText) {
        var el = document.getElementById(id);
        if (!el) return;
        var bubble = el.querySelector('.bubble');
        if (bubble) {
            bubble.innerHTML =
                '<div class="typing-indicator">' +
                    '<div class="typing-dot"></div>' +
                    '<div class="typing-dot"></div>' +
                    '<div class="typing-dot"></div>' +
                '</div>' +
                '<div style="font-size: 0.75rem; color: var(--text-tertiary); margin-top: 4px;">' + escapeHTML(statusText) + '</div>';

            chatMessages.scrollTop = chatMessages.scrollHeight;
        }
    }

    /**
     * Remove the typing indicator.
     */
    function removeTypingIndicator(id) {
        var el = document.getElementById(id);
        if (el) el.remove();
    }

    /**
     * Show the welcome screen.
     */
    function showWelcome(onChipClick) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '';

        var welcome = document.createElement('div');
        welcome.className = 'welcome-container';
        welcome.innerHTML =
            '<div class="welcome-icon">⚡</div>' +
            '<h2 class="welcome-title">Hello! I\'m <span>E+</span></h2>' +
            '<p class="welcome-subtitle">Your AI assistant. Ask me anything — I can help with code, writing, research, and more.</p>' +
            '<div class="welcome-chips">' +
                '<button class="welcome-chip" data-prompt="Write a Python function to sort a list">💻 Write a Python function</button>' +
                '<button class="welcome-chip" data-prompt="Explain quantum computing simply">💡 Explain quantum computing</button>' +
                '<button class="welcome-chip" data-prompt="What are some creative date ideas?">✨ Creative date ideas</button>' +
            '</div>';

        chatMessages.appendChild(welcome);

        // Attach chip click handlers
        var chips = welcome.querySelectorAll('.welcome-chip');
        chips.forEach(function (chip) {
            chip.addEventListener('click', function () {
                var prompt = chip.getAttribute('data-prompt');
                if (onChipClick) onChipClick(prompt);
            });
        });
    }

    /**
     * Set the status indicator.
     */
    function setStatus(text, state) {
        var indicator = document.getElementById('status-indicator');
        if (!indicator) return;

        var dot = indicator.querySelector('.status-dot');
        var label = indicator.querySelector('.status-text');

        dot.className = 'status-dot ' + (state || 'online');
        label.textContent = text;
    }

    return {
        init: init,
        appendMessage: appendMessage,
        showTypingIndicator: showTypingIndicator,
        updateTypingStatus: updateTypingStatus,
        removeTypingIndicator: removeTypingIndicator,
        showWelcome: showWelcome,
        setStatus: setStatus,
        escapeHTML: escapeHTML,
        speakText: speakText,
        stopSpeaking: stopSpeaking
    };

})();