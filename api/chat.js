/* ============================================
   E+ AI Assistant — Vercel Serverless Function
   Handles OpenRouter API calls with retry logic
   and model fallback. API key and system prompt
   are kept server-side for security.
   ============================================ */

const fs = require('fs');
const path = require('path');

// Configuration
const API_BASE = 'https://openrouter.ai/api/v1/chat/completions';
const MODELS = [
    'openai/gpt-oss-120b:free',
    'nvidia/nemotron-3-ultra-550b-a55b:free'
];

// Retry settings
const RETRY = {
    maxAttempts: 3,
    baseDelayMs: 1500,
    maxDelayMs: 12000
};

// Load system prompt from file
let SYSTEM_PROMPT = '';
try {
    const systemPromptPath = path.join(__dirname, '../enilimeanthropic.txt');
    console.log('Loading system prompt from:', systemPromptPath);
    SYSTEM_PROMPT = fs.readFileSync(systemPromptPath, 'utf-8');
    console.log('System prompt loaded successfully, length:', SYSTEM_PROMPT.length);
} catch (err) {
    console.error('Failed to load system prompt:', err);
    console.error('File path attempted:', path.join(__dirname, '../enilimeanthropic.txt'));
    SYSTEM_PROMPT = 'You are a helpful AI assistant.';
}

// Helper functions
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function getBackoffDelay(attempt) {
    const delay = RETRY.baseDelayMs * Math.pow(2, attempt);
    const clampedDelay = Math.min(delay, RETRY.maxDelayMs);
    // Add ±25% jitter
    const jitter = clampedDelay * 0.25 * (Math.random() * 2 - 1);
    return Math.round(clampedDelay + jitter);
}

function isRetryableStatus(status) {
    return status === 429 || status === 503;
}

async function callModel(model, messageHistory, temperature, apiKey) {
    const messages = [
        { role: 'system', content: SYSTEM_PROMPT }
    ].concat(messageHistory);

    const body = {
        model: model,
        messages: messages,
        temperature: temperature || 0.7
    };

    const response = await fetch(API_BASE, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${apiKey}`,
            'HTTP-Referer': 'https://e-plus.vercel.app',
            'X-Title': 'E+ Assistant'
        },
        body: JSON.stringify(body)
    });

    if (!response.ok) {
        let errorData;
        try {
            errorData = await response.json();
        } catch (e) {
            errorData = { error: { message: `HTTP ${response.status}` } };
        }

        const err = new Error(errorData.error?.message || `API request failed (HTTP ${response.status})`);
        err.status = response.status;
        err.apiError = errorData;
        throw err;
    }

    return await response.json();
}

async function send(options) {
    const {
        model = MODELS[0],
        messageHistory,
        autoRetry = true,
        fallback = true,
        temperature = 0.7,
        maxRetries = RETRY.maxAttempts
    } = options;

    const apiKey = process.env.OPENROUTER_API_KEY;
    if (!apiKey) {
        throw new Error('OPENROUTER_API_KEY environment variable is not set');
    }

    // Build the list of models to try
    const modelsToTry = [model];
    if (fallback) {
        MODELS.forEach(m => {
            if (m !== model) modelsToTry.push(m);
        });
    }

    let lastError = null;

    for (let mi = 0; mi < modelsToTry.length; mi++) {
        const currentModel = modelsToTry[mi];
        const maxAttempts = autoRetry ? maxRetries : 1;

        for (let attempt = 0; attempt < maxAttempts; attempt++) {
            try {
                if (attempt > 0) {
                    const delay = getBackoffDelay(attempt - 1);
                    await sleep(delay);
                } else if (mi > 0) {
                    await sleep(500);
                }

                const data = await callModel(currentModel, messageHistory, temperature, apiKey);

                return {
                    data: data,
                    model: currentModel,
                    attempts: attempt + 1,
                    fallbackUsed: mi > 0
                };

            } catch (err) {
                lastError = err;

                // If it's not retryable, break out of retry loop for this model
                if (err.status && !isRetryableStatus(err.status)) {
                    break;
                }

                // If it's retryable but we've used all attempts, move to next model
                if (attempt === maxAttempts - 1) {
                    // Continue to next model
                }
            }
        }
    }

    // All models and retries exhausted
    throw lastError || new Error('All models failed. Please try again later.');
}

// Vercel serverless function handler
export default async function handler(req, res) {
    // Only allow POST requests
    if (req.method !== 'POST') {
        return res.status(405).json({ error: 'Method not allowed' });
    }

    try {
        console.log('Received request, body keys:', Object.keys(req.body || {}));
        const body = req.body;
        const result = await send(body);

        return res.status(200).json(result);
    } catch (error) {
        console.error('API Error:', error.message);
        console.error('Error stack:', error.stack);
        console.error('Error status:', error.status);
        
        const statusCode = error.status || 500;
        const errorResponse = {
            error: error.message || 'Internal server error',
            status: statusCode
        };

        return res.status(statusCode).json(errorResponse);
    }
}
