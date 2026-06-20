/* ============================================
   E+ AI Assistant — API Handler
   Handles calls to Vercel serverless function
   with retry logic and model fallback.
   ============================================ */

var EPlusAPI = (function () {
    'use strict';

    /**
     * Sleep helper — returns a promise that resolves after ms milliseconds.
     */
    function sleep(ms) {
        return new Promise(function (resolve) { setTimeout(resolve, ms); });
    }

    /**
     * Calculate delay for exponential backoff with jitter.
     */
    function getBackoffDelay(attempt) {
        var delay = EPlusConfig.RETRY.baseDelayMs * Math.pow(2, attempt);
        delay = Math.min(delay, EPlusConfig.RETRY.maxDelayMs);
        // Add ±25% jitter
        var jitter = delay * 0.25 * (Math.random() * 2 - 1);
        return Math.round(delay + jitter);
    }

    /**
     * Determine if an error is retryable.
     * 429 (rate limit) and 503 (overloaded) are retryable.
     */
    function isRetryableStatus(status) {
        return status === 429 || status === 503;
    }

    /**
     * Main send function with retry + fallback logic.
     * All retry and fallback logic is now handled server-side.
     *
     * Options:
     *   model         — the primary model to use
     *   messageHistory — the conversation history
     *   autoRetry     — if true, retry on transient errors
     *   fallback      — if true, try other models on failure
     *   onStatus      — callback(statusText) for UI updates
     *   temperature   — response creativity (0-1)
     *   maxRetries    — maximum retry attempts
     *
     * Returns { data, model, attempts, fallbackUsed }
     */
    async function send(options) {
        var primaryModel = options.model || EPlusConfig.DEFAULT_MODEL;
        var history = options.messageHistory;
        var autoRetry = options.autoRetry !== false;
        var fallback = options.fallback !== false;
        var onStatus = options.onStatus || function () {};
        var temperature = options.temperature;
        var maxRetries = options.maxRetries || EPlusConfig.RETRY.maxAttempts;

        var url = EPlusConfig.API_BASE;

        var body = {
            model: primaryModel,
            messageHistory: history,
            autoRetry: autoRetry,
            fallback: fallback,
            temperature: temperature,
            maxRetries: maxRetries
        };

        var response = await fetch(url, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(body)
        });

        if (!response.ok) {
            var errorData;
            try {
                errorData = await response.json();
            } catch (e) {
                errorData = { error: { message: 'HTTP ' + response.status } };
            }

            var err = new Error(errorData.error?.message || errorData.message || 'API request failed (HTTP ' + response.status + ')');
            err.status = errorData.status || response.status;
            err.apiError = errorData;
            throw err;
        }

        var result = await response.json();
        return result;
    }

    return {
        send: send
    };

})();