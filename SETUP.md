# Campus Map Application - Setup & Installation Guide

## System Compatibility

This application is compatible with:
- ✅ Windows 10/11
- ✅ Linux (Ubuntu, Debian, Fedora, etc.)
- ✅ macOS

## Prerequisites

### Windows
- Node.js 18+ ([Download](https://nodejs.org/))
- npm (comes with Node.js)
- Git (optional, for version control)

### Linux/Ubuntu
```bash
# Ubuntu/Debian
sudo apt-get update
sudo apt-get install -y nodejs npm git

# Check versions
node --version
npm --version
```

### macOS
```bash
# Using Homebrew
brew install node git

# Or download from https://nodejs.org/
```

## Installation

### Windows Users

1. **Clone or download the repository**
2. **Open Command Prompt or PowerShell** in the project directory
3. **Run:**
   ```bash
   npm install
   ```
4. **Start the development server:**
   ```bash
   npm run dev
   ```
5. **Open your browser** and go to `http://localhost:3000`

### Linux/Ubuntu Users

1. **Clone or download the repository**
2. **Open Terminal** in the project directory
3. **Make the bash script executable:**
   ```bash
   chmod +x run.sh
   ```
4. **Run the application:**
   ```bash
   ./run.sh
   ```
5. **Open your browser** and go to `http://localhost:3000`

### Linux/Ubuntu (If Permission Error Occurs)

If you get **"Permission denied"** error:

```bash
# Fix 1: Make script executable
chmod +x run.sh
./run.sh

# Fix 2: Run with bash directly (no chmod needed)
bash run.sh

# Fix 3: Manual setup
npm install
npm run build
npm run dev
```

## Manual Setup (Linux/Ubuntu)

If you prefer to run commands manually:

```bash
# Install dependencies
npm install

# Build TypeScript
npm run build

# Start development server
npm run dev
```

## Environment Variables

You can customize the port by setting the `PORT` environment variable:

### Windows (PowerShell)
```powershell
$env:PORT = 5000
npm run dev
```

### Windows (Command Prompt)
```cmd
set PORT=5000
npm run dev
```

### Linux/Ubuntu/macOS
```bash
PORT=5000 npm run dev
# Or
export PORT=5000
npm run dev
```

## Building for Production

```bash
# Build the application
npm run build

# Start production server
npm start
```

## File Structure

```
campus0/
├── src/
│   ├── index.tsx          # Main Hono application
│   ├── server.ts          # Development server wrapper
│   ├── renderer.tsx       # Server-side rendering
│   └── defaultBuildings.ts # Default buildings database
├── public/
│   └── static/
│       ├── app.js         # Frontend JavaScript
│       ├── style.css      # Custom styles
│       └── images/        # Building images
├── api/
│   ├── index.ts           # API routes
│   ├── handler.js         # Vercel serverless handler
│   └── handler.cjs        # CommonJS handler
├── run.sh                 # Bash script (Linux/Ubuntu/macOS)
├── package.json           # Dependencies and scripts
├── tsconfig.json          # TypeScript configuration
└── vite.config.ts         # Vite configuration
```

## Available Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start development server with hot reload |
| `npm run build` | Build TypeScript and prepare for production |
| `npm start` | Start production server |
| `npm test` | Test server connectivity (curl) |

## Troubleshooting

### Linux/Ubuntu: "Permission denied" error
```bash
chmod +x run.sh
./run.sh
```

### Port already in use
```bash
# Find and stop the process using port 3000
# Linux/Ubuntu
lsof -i :3000
kill -9 <PID>

# Or use a different port
PORT=5000 npm run dev
```

### Node modules issues
```bash
# Remove node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### TypeScript compilation errors
```bash
npm run build
```

## Browser Compatibility

- Chrome/Chromium 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## Deployment

### Deploy to Vercel
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Heroku
```bash
# Install Heroku CLI
# Then run
heroku login
heroku create your-app-name
git push heroku main
```

## API Endpoints

- `GET /` - Main application page
- `GET /api/buildings` - Get all buildings
- `GET /api/buildings/:id` - Get specific building
- `POST /api/buildings/save` - Save building changes
- `GET /api/images` - Get building images

## Support

For issues or questions, check the README.md or contact the development team.

## License

© 2025 Campus Map Application
