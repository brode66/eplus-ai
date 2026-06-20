# E+ AI Assistant

A modern AI chat interface with vision capabilities, built with vanilla JavaScript and a clean, responsive design.

## 🚀 Features

- **Vision AI Support**: Analyze images with GPT-4o Mini, GPT-4o, and Gemini Flash models
- **Clean Modern UI**: Redesigned interface with better organization and layout
- **Advanced Settings**: Configurable retry logic, model fallback, and UI preferences
- **File Attachments**: Support for both text files and images
- **Voice Input**: Speech-to-text functionality (browser dependent)
- **Mobile Responsive**: Works seamlessly on desktop and mobile devices
- **Local Storage**: Chat history and settings saved locally

## 🖼️ Image Processing

The application now supports image analysis with vision-capable AI models:

### Supported Models with Vision
- **GPT-4o Mini** (Free) - Recommended for most use cases
- **GPT-4o** (Free) - Higher quality analysis
- **Gemini Flash 1.5** (Free) - Fast and efficient

### How to Use Images
1. Select a vision-capable model from the sidebar
2. Click the attachment button (📎) in the chat input
3. Upload an image (PNG, JPG, GIF supported)
4. Ask questions about the image or request analysis
5. The AI will process both your text and the image together

### Image Features
- Automatic model validation (warns if current model doesn't support vision)
- Visual feedback during image processing
- Support for multiple image formats
- Proper error handling for vision-related issues

## 🛠️ Setup & Running

### Option 1: PowerShell Server (Recommended for Windows)
```powershell
# Navigate to project directory
cd E_Plus

# Run the enhanced server
powershell -ExecutionPolicy Bypass -File run-server.ps1
```

### Option 2: Node.js Server (If Node.js is installed)
```bash
# Install dependencies (optional - no external deps required)
npm install

# Start server
npm start
# or
node server.js
```

### Option 3: Simple PowerShell Server
```powershell
powershell -File server.ps1
```

## 📁 Project Structure

```
E_Plus/
├── index.html              # Main application HTML
├── src/
│   ├── styles/
│   │   └── main.css        # Comprehensive styles with design system
│   ├── scripts/
│   │   ├── config.js       # API configuration and model settings
│   │   ├── api.js          # API handling with retry logic
│   │   ├── app.js          # Main application logic
│   │   └── settings.js     # Settings management
│   └── components/
│       └── ui.js           # UI utilities and markdown rendering
├── server.js               # Node.js server
├── run-server.ps1          # Enhanced PowerShell server
├── server.ps1              # Simple PowerShell server
├── package.json            # Node.js project configuration
└── test-image.html         # Image testing page
```

## ⚙️ Settings

Access settings via the gear icon in the sidebar or header. Configure:

- **Auto-retry on failure**: Automatically retry failed requests
- **Model fallback**: Try alternative models if primary fails
- **Show retry information**: Display retry attempts in messages
- **Compact mode**: Reduce spacing for more messages on screen
- **Maximum retry attempts**: Control how many times to retry
- **Response creativity**: Adjust AI response randomness (temperature)

## 🔧 Technical Improvements

### Layout & Organization
- Restructured files into logical folders (`src/`, `scripts/`, `styles/`, etc.)
- Enhanced CSS with design system variables
- Improved responsive design for mobile devices
- Better typography and spacing

### Settings Management
- Moved auto-retry and model feedback to dedicated settings modal
- Persistent settings storage in localStorage
- Real-time settings validation and application

### Vision Support
- Added vision-capable models to selection
- Automatic model compatibility checking
- Enhanced error handling for vision-related issues
- Visual feedback during image processing

### Code Quality
- Modular JavaScript architecture
- Comprehensive error handling
- Better separation of concerns
- Improved documentation

## 🌐 API Configuration

The application uses OpenRouter API with the following endpoints:
- Base URL: `https://openrouter.ai/api/v1/chat/completions`
- Supports multiple model providers (OpenAI, Google, etc.)
- Automatic retry with exponential backoff
- Model fallback support

## 📱 Browser Compatibility

- **Modern browsers**: Full feature support including vision
- **Chrome/Edge**: Speech recognition support
- **Firefox/Safari**: Core features (speech recognition may be limited)
- **Mobile browsers**: Responsive design with touch-friendly interface

## 🚨 Troubleshooting

### Images Not Working
1. Ensure you're using a vision-capable model (GPT-4o Mini, GPT-4o, or Gemini Flash)
2. Check that the image format is supported (PNG, JPG, GIF)
3. Verify the image size isn't too large (< 20MB recommended)
4. Try switching to a different vision model if one fails

### Settings Not Saving
- Check browser localStorage isn't disabled
- Try refreshing the page and reconfiguring settings
- Clear browser cache if issues persist

### Server Issues
- Ensure port 3000 isn't already in use
- Try running with different server options
- Check firewall isn't blocking local connections

## 📄 License

MIT License - Feel free to use and modify as needed.

---

**Need help?** Visit the test page at `/test-image.html` to verify image processing functionality.