# 🥁 Drum2Strudel

**Transform your drum loops into live coding patterns instantly.**

Drum2Strudel is a web application that analyzes audio drum loops and automatically converts them into [Strudel](https://strudel.tidalcycles.org/) code - a live coding music language. Simply upload a drum loop, and get ready-to-use Strudel code that you can copy and paste into the Strudel editor.

![TypeScript](https://img.shields.io/badge/TypeScript-98.6%25-blue)
![License](https://img.shields.io/badge/license-MIT-green)

## ✨ Features

- **🎵 Audio Analysis**: Upload drum loops in MP3, WAV, or OGG format
- **🎯 Intelligent Detection**: Automatically detects:
  - Tempo (BPM)
  - Number of beats and bars
  - Kick drum hits
  - Snare drum hits
  - Hi-hat patterns
- **💻 Code Generation**: Generates clean, formatted Strudel code with 32nd note quantization
- **🎨 Modern UI**: Beautiful, responsive interface with real-time audio visualization
- **🔊 Audio Preview**: Play your uploaded drum loop before analysis
- **📋 One-Click Copy**: Copy generated code to clipboard instantly
- **⚡ Real-time Processing**: Fast client-side audio analysis using Web Audio API

## 🚀 Quick Start

### Prerequisites

- Node.js 18+ 
- npm or yarn

### Installation

```bash
# Clone the repository
git clone https://github.com/yksanjo/Drum2Strudel.git
cd Drum2Strudel

# Install dependencies
npm install
```

### Development

```bash
# Run the development server (client + server)
npm run dev

# Or run client and server separately
npm run dev:client  # Frontend on port 5000
npm run dev          # Backend server
```

The application will be available at `http://localhost:5000`

### Production Build

```bash
# Build for production
npm run build

# Start production server
npm start
```

## 🎯 How It Works

1. **Upload**: Drop or select a drum loop audio file (1-4 bars recommended, under 8 seconds)
2. **Preview**: Optionally preview the audio to verify it's the right file
3. **Analyze**: Click "Analyze" to process the audio using Web Audio API
4. **Results**: View detected pattern statistics and generated Strudel code
5. **Copy & Use**: Copy the code and paste it into the [Strudel editor](https://strudel.repl.co)

## 🔧 Technical Details

### Audio Analysis Pipeline

The application uses advanced audio processing techniques:

- **Tempo Detection**: Onset-based tempo detection using spectral flux analysis
- **Frequency Analysis**: Multi-band filtering to separate:
  - Low frequencies (≤150Hz) for kick detection
  - Mid frequencies (~400Hz) for snare detection  
  - High frequencies (≥5000Hz) for hi-hat detection
- **Pattern Quantization**: 32nd note resolution for precise pattern capture
- **Hit Classification**: Energy-based thresholding to identify drum hits

### Technology Stack

**Frontend:**
- React 19 with TypeScript
- Vite for fast development and building
- Tailwind CSS for styling
- Radix UI components
- Framer Motion for animations
- Web Audio API for audio processing

**Backend:**
- Express.js server
- Drizzle ORM for database (if needed)
- WebSocket support (via ws)

**Shared:**
- TypeScript for type safety
- Zod for schema validation

## 📁 Project Structure

```
Drum2Strudel/
├── client/              # React frontend application
│   └── src/
│       ├── pages/       # Page components
│       ├── components/  # UI components
│       └── lib/         # Audio analysis logic
├── server/              # Express backend
│   ├── index.ts        # Server entry point
│   ├── routes.ts       # API routes
│   └── vite.ts         # Vite dev server integration
├── shared/              # Shared TypeScript types
├── script/              # Build scripts
└── attached_assets/     # Static assets
```

## 🎨 Usage Example

1. Upload a 4-bar drum loop (e.g., 120 BPM)
2. The analyzer detects:
   - BPM: 120
   - Beats: 16
   - Bars: 4
   - Kicks: 8 hits
   - Snares: 4 hits
   - Hi-hats: 32 hits

3. Generated Strudel code:
```javascript
// 16 beat drum loop @ 120 BPM
// 32nd note quantization

stack(
  s(`
    bd ~ ~ ~  ~ ~ ~ ~  ~ ~ ~ ~  ~ ~ ~ ~
    ...
  `),
  s(`
    ~ ~ ~ ~  sd ~ ~ ~  ~ ~ ~ ~  sd ~ ~ ~
    ...
  `),
  s(`
    hh ~ hh ~  hh ~ hh ~  hh ~ hh ~  hh ~ hh ~
    ...
  `)
).slow(16).cpm(120)
```

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📝 License

This project is licensed under the MIT License.

## 🔗 Links

- [Strudel Documentation](https://strudel.tidalcycles.org/)
- [Strudel Editor](https://strudel.repl.co)

## 🙏 Acknowledgments

- Built with [Strudel](https://strudel.tidalcycles.org/) - a live coding music language
- Inspired by the live coding music community
