# FlowGuide - AI Assistant Platform

A powerful AI-powered workflow assistant with multiple specialized AI agents for various tasks.

## 📱 Mobile App Available

FlowGuide is now available as a **Progressive Web App (PWA)** for iPhone, iPad, and Android devices!

**Installation URL**: `https://brendan-b25.github.io/flow-guide/`

### Features
- ✅ Install on your home screen
- ✅ Works offline
- ✅ Push notifications
- ✅ Multiple specialized AI agents
- ✅ Voice input and camera integration
- ✅ Native app-like experience

👉 **[Read the Mobile Installation Guide](./MOBILE_INSTALLATION_GUIDE.md)** for step-by-step instructions.

## 🤖 AI Agents

The app includes multiple specialized AI agents:

1. **Voice Assistant** - Speech recognition and voice commands
2. **Vision AI** - Image recognition and document scanning
3. **Location AI** - Location-aware assistance
4. **Offline AI** - Basic AI features that work without internet
5. **Translation AI** - Multi-language translation (100+ languages)
6. **Smart Capture** - AI-powered photo and document capture

## 🚀 Getting Started

### Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

### Installing on Mobile

See the [Mobile Installation Guide](./MOBILE_INSTALLATION_GUIDE.md) for detailed instructions on installing the app on iOS and Android devices.

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite
- **UI Components**: Radix UI, Tailwind CSS
- **AI Integration**: Multiple AI model support (GPT-4, Claude, Gemini)
- **PWA**: Service Workers, Web App Manifest
- **Mobile Features**: Camera, Microphone, Geolocation APIs

## 📦 Project Structure

```
flow-guide/
├── public/
│   ├── manifest.json        # PWA manifest
│   ├── service-worker.js    # Service worker for offline support
│   ├── offline.html         # Offline fallback page
│   └── icons/              # App icons for various sizes
├── src/
│   ├── components/         # React components
│   │   ├── AIAgentSelector.jsx
│   │   ├── EnhancedAIAgents.jsx
│   │   └── InstallPrompt.jsx
│   ├── lib/               # Utilities and libraries
│   │   ├── pwa.js        # PWA utilities
│   │   └── mobile-utils.js # Mobile-specific utilities
│   ├── pages/            # Application pages
│   └── App.jsx           # Main app component
└── MOBILE_INSTALLATION_GUIDE.md
```

## 🔧 Configuration

### Service Worker

The app uses a service worker for:
- Offline functionality
- Caching strategies
- Background sync
- Push notifications

### Manifest

The PWA manifest (`public/manifest.json`) defines:
- App name and description
- Icons and splash screens
- Display mode (standalone)
- Shortcuts
- Share target

## 📝 License

See LICENSE file for details.

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📧 Support

For issues or questions, please open an issue on GitHub.
