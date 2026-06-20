/* ============================================
   E+ AI Assistant — Settings Management
   Handles settings modal, persistence, and UI state
   ============================================ */

var EPlusSettings = (function () {
    'use strict';

    var defaults = {
        autoRetry: true,
        fallback: true,
        showRetryInfo: true,
        compactMode: false,
        maxRetries: 3,
        temperature: 0.7,
        autoSpeak: false,
        selectedVoice: 'auto'
    };

    var currentSettings = {};

    function init() {
        // Load settings from localStorage
        loadSettings();
        
        // Initialize UI elements
        setupModal();
        updateUI();
        
        // Bind events
        bindEvents();
    }

    function loadSettings() {
        try {
            var saved = localStorage.getItem('e_plus_settings');
            if (saved) {
                currentSettings = Object.assign({}, defaults, JSON.parse(saved));
            } else {
                currentSettings = Object.assign({}, defaults);
            }
        } catch (e) {
            currentSettings = Object.assign({}, defaults);
        }
    }

    function saveSettings() {
        try {
            localStorage.setItem('e_plus_settings', JSON.stringify(currentSettings));
        } catch (e) {
            console.warn('Failed to save settings:', e);
        }
    }

    function setupModal() {
        var modal = document.getElementById('settings-modal');
        if (!modal) return;

        // Populate form with current settings
        var autoRetryToggle = document.getElementById('auto-retry-toggle');
        var fallbackToggle = document.getElementById('fallback-toggle');
        var showRetryInfoToggle = document.getElementById('show-retry-info-toggle');
        var compactModeToggle = document.getElementById('compact-mode-toggle');
        var autoSpeakToggle = document.getElementById('auto-speak-toggle');
        var maxRetriesSelect = document.getElementById('max-retries');
        var temperatureRange = document.getElementById('temperature');
        var voiceSelect = document.getElementById('voice-select');

        if (autoRetryToggle) autoRetryToggle.checked = currentSettings.autoRetry;
        if (fallbackToggle) fallbackToggle.checked = currentSettings.fallback;
        if (showRetryInfoToggle) showRetryInfoToggle.checked = currentSettings.showRetryInfo;
        if (compactModeToggle) compactModeToggle.checked = currentSettings.compactMode;
        if (autoSpeakToggle) autoSpeakToggle.checked = currentSettings.autoSpeak;
        if (maxRetriesSelect) maxRetriesSelect.value = currentSettings.maxRetries;
        if (temperatureRange) {
            temperatureRange.value = currentSettings.temperature;
            updateTemperatureDisplay();
        }
        
        // Populate voice options
        if (voiceSelect) {
            populateVoiceOptions(voiceSelect);
            voiceSelect.value = currentSettings.selectedVoice || 'auto';
        }
    }

    function updateTemperatureDisplay() {
        var temperatureRange = document.getElementById('temperature');
        var rangeValue = document.querySelector('.range-value');
        if (temperatureRange && rangeValue) {
            rangeValue.textContent = temperatureRange.value;
        }
    }
    
    function populateVoiceOptions(selectElement) {
        if (!window.speechSynthesis) return;
        
        var voices = speechSynthesis.getVoices();
        
        // Clear existing options except "auto"
        selectElement.innerHTML = '<option value="auto">Auto (Best Available)</option>';
        
        // Add English voices
        voices.forEach(function(voice, index) {
            if (voice.lang.indexOf('en') === 0) {
                var option = document.createElement('option');
                option.value = voice.name;
                option.textContent = voice.name + ' (' + voice.lang + ')';
                selectElement.appendChild(option);
            }
        });
    }

    function updateUI() {
        // Apply compact mode
        document.body.classList.toggle('compact-mode', currentSettings.compactMode);
    }

    function bindEvents() {
        // Settings buttons
        var settingsBtn = document.getElementById('settings-btn');
        var headerSettingsBtn = document.getElementById('header-settings-btn');
        var closeSettings = document.getElementById('close-settings');
        var saveSettings = document.getElementById('save-settings');
        var resetSettings = document.getElementById('reset-settings');
        var modal = document.getElementById('settings-modal');
        var temperatureRange = document.getElementById('temperature');

        // Open settings modal
        function openModal() {
            if (modal) {
                modal.classList.add('active');
                setupModal(); // Refresh form values
            }
        }

        function closeModal() {
            if (modal) {
                modal.classList.remove('active');
            }
        }

        if (settingsBtn) settingsBtn.addEventListener('click', openModal);
        if (headerSettingsBtn) headerSettingsBtn.addEventListener('click', openModal);
        if (closeSettings) closeSettings.addEventListener('click', closeModal);

        // Close on overlay click
        if (modal) {
            modal.addEventListener('click', function(e) {
                if (e.target === modal) {
                    closeModal();
                }
            });
        }

        // Temperature range display
        if (temperatureRange) {
            temperatureRange.addEventListener('input', updateTemperatureDisplay);
        }

        // Save settings
        if (saveSettings) {
            saveSettings.addEventListener('click', function() {
                saveCurrentSettings();
                closeModal();
            });
        }

        // Reset settings
        if (resetSettings) {
            resetSettings.addEventListener('click', function() {
                if (confirm('Reset all settings to defaults?')) {
                    resetToDefaults();
                    setupModal();
                }
            });
        }
    }
    function saveCurrentSettings() {
        var autoRetryToggle = document.getElementById('auto-retry-toggle');
        var fallbackToggle = document.getElementById('fallback-toggle');
        var showRetryInfoToggle = document.getElementById('show-retry-info-toggle');
        var compactModeToggle = document.getElementById('compact-mode-toggle');
        var autoSpeakToggle = document.getElementById('auto-speak-toggle');
        var maxRetriesSelect = document.getElementById('max-retries');
        var temperatureRange = document.getElementById('temperature');
        var voiceSelect = document.getElementById('voice-select');

        if (autoRetryToggle) currentSettings.autoRetry = autoRetryToggle.checked;
        if (fallbackToggle) currentSettings.fallback = fallbackToggle.checked;
        if (showRetryInfoToggle) currentSettings.showRetryInfo = showRetryInfoToggle.checked;
        if (compactModeToggle) currentSettings.compactMode = compactModeToggle.checked;
        if (autoSpeakToggle) currentSettings.autoSpeak = autoSpeakToggle.checked;
        if (maxRetriesSelect) currentSettings.maxRetries = parseInt(maxRetriesSelect.value);
        if (temperatureRange) currentSettings.temperature = parseFloat(temperatureRange.value);
        if (voiceSelect) currentSettings.selectedVoice = voiceSelect.value;

        saveSettings();
        updateUI();
    }

    function resetToDefaults() {
        currentSettings = Object.assign({}, defaults);
        saveSettings();
        updateUI();
    }

    function getSettings() {
        return Object.assign({}, currentSettings);
    }

    function getSetting(key) {
        return currentSettings[key];
    }

    function setSetting(key, value) {
        currentSettings[key] = value;
        saveSettings();
        updateUI();
    }

    return {
        init: init,
        getSettings: getSettings,
        getSetting: getSetting,
        setSetting: setSetting,
        resetToDefaults: resetToDefaults
    };

})();