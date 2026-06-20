/* ============================================
   E+ AI Assistant — UI Utilities
   Handles rendering, markdown, and DOM helpers.
   ============================================ */

var EPlusUI = (function () {
    'use strict';

    var chatMessages = null;

    function init(container) {
        chatMessages = container;
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

        msgDiv.innerHTML =
            '<div class="avatar">' + avatar + '</div>' +
            '<div class="bubble">' + contentHTML + '</div>';

        chatMessages.appendChild(msgDiv);
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
                '<button class="welcome-chip" data-prompt="Explain quantum computing simply">💡 Explain quantum computing</button>' +
                '<button class="welcome-chip" data-prompt="Write a Python function to sort a list">💻 Write a Python function</button>' +
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
        escapeHTML: escapeHTML
    };

})();
