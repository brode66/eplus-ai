/* ============================================
   E+ AI Assistant — Configuration
   API key and system prompt are now handled
   server-side in the Vercel serverless function.
   ============================================ */

var EPlusConfig = (function () {
    'use strict';

    // Models in priority order for fallback
    var MODELS = [
        'openai/gpt-oss-120b:free',
        'nvidia/nemotron-3-ultra-550b-a55b:free'
    ];

    var DEFAULT_MODEL = MODELS[0];

    // API endpoint (now our Vercel serverless function)
    var API_BASE = '/api/chat';

    // Retry settings
    var RETRY = {
        maxAttempts: 3,
        baseDelayMs: 1500,
        maxDelayMs: 12000
    };

    // Generation config
    var GENERATION_CONFIG = {
        temperature: 0.7
    };

    var config = {
        MODELS: MODELS,
        DEFAULT_MODEL: DEFAULT_MODEL,
        API_BASE: API_BASE,
        RETRY: RETRY,
        GENERATION_CONFIG: GENERATION_CONFIG
    };

    return config;

})();