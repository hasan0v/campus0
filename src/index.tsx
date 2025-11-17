import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { readdirSync, readFileSync, existsSync } from 'fs'
import { join, extname } from 'path'

const app = new Hono()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files
app.use('/static/*', async (c, next) => {
  try {
    const filepath = c.req.path.replace('/static/', '')
    
    // Try different possible paths for Vercel environment
    const paths = [
      join(process.cwd(), 'public', 'static', filepath),
      join(process.cwd(), '../..', 'public', 'static', filepath),
      join('/var/task', 'public', 'static', filepath),
    ]
    
    let fullPath = paths[0]
    let content = null
    
    for (const path of paths) {
      if (existsSync(path)) {
        fullPath = path
        try {
          content = readFileSync(path)
          break
        } catch (e) {
          // continue to next path
        }
      }
    }
    
    if (!content) {
      return c.notFound()
    }
    
    const ext = extname(filepath).toLowerCase()
    
    let contentType = 'application/octet-stream'
    if (ext === '.js') contentType = 'application/javascript'
    else if (ext === '.css') contentType = 'text/css'
    else if (['.jpg', '.jpeg'].includes(ext)) contentType = 'image/jpeg'
    else if (ext === '.png') contentType = 'image/png'
    else if (ext === '.gif') contentType = 'image/gif'
    else if (ext === '.webp') contentType = 'image/webp'
    else if (ext === '.svg') contentType = 'image/svg+xml'
    
    return c.body(content, 200, { 'Content-Type': contentType })
  } catch (error) {
    console.error('Static file error:', error)
    return c.notFound()
  }
})

// Building data
const buildings = [
  {
    id: 'building-1',
    name: 'Main Building',
    description: 'The main administrative building of the campus',
    image: '/static/images/eco/1.jpg',
    coordinates: { x: 165, y: 135, width: 100, height: 120 }
  },
  {
    id: 'building-2',
    name: 'Academic Building A',
    description: 'Primary academic building with lecture halls and classrooms',
    image: '/static/images/kitab_evi/1.jpg',
    coordinates: { x: 385, y: 95, width: 85, height: 110 }
  },
  {
    id: 'building-3',
    name: 'Academic Building B',
    description: 'Secondary academic building with laboratories and study areas',
    image: '/static/images/tetym/1.jpeg',
    coordinates: { x: 575, y: 95, width: 110, height: 100 }
  },
  {
    id: 'building-4',
    name: 'Library',
    description: 'Central library with extensive collection and study spaces',
    image: '/static/images/eco/2.jpg',
    coordinates: { x: 290, y: 100, width: 70, height: 95 }
  },
  {
    id: 'building-5',
    name: 'Sports Complex',
    description: 'Indoor sports facilities and fitness center',
    image: '/static/images/stadion/1.jpg',
    coordinates: { x: 175, y: 265, width: 135, height: 90 }
  },
  {
    id: 'stadium',
    name: 'Football Stadium',
    description: 'Main football stadium for sports events and competitions',
    image: '/static/images/stadion/2.jpg',
    coordinates: { x: 420, y: 280, width: 135, height: 90 }
  },
  {
    id: 'building-6',
    name: 'Student Center',
    description: 'Student activities and cafeteria',
    image: '/static/images/kitab_evi/2.jpg',
    coordinates: { x: 805, y: 185, width: 90, height: 95 }
  },
  {
    id: 'building-7',
    name: 'Research Building',
    description: 'Research labs and innovation center',
    image: '/static/images/eco/3.jpg',
    coordinates: { x: 705, y: 270, width: 85, height: 65 }
  },
  {
    id: 'parking',
    name: 'Parking Area',
    description: 'Main parking facility for students and staff',
    image: '/static/images/tetym/2.jpeg',
    coordinates: { x: 70, y: 310, width: 60, height: 55 }
  }
]

// API route to get all buildings
app.get('/api/buildings', (c) => {
  return c.json(buildings)
})

// API route to get specific building
app.get('/api/buildings/:id', (c) => {
  const id = c.req.param('id')
  const building = buildings.find(b => b.id === id)
  if (!building) {
    return c.json({ error: 'Building not found' }, 404)
  }
  return c.json(building)
})

// API route to save buildings
app.post('/api/buildings/save', async (c) => {
  try {
    const body = await c.req.json()
    const updatedBuildings = body.buildings
    
    if (!Array.isArray(updatedBuildings)) {
      return c.json({ error: 'Invalid data format' }, 400)
    }
    
    // Update the buildings array
    buildings.length = 0
    buildings.push(...updatedBuildings)
    
    return c.json({ 
      success: true, 
      count: buildings.length,
      message: 'Buildings saved successfully' 
    })
  } catch (error) {
    return c.json({ 
      error: 'Failed to save buildings',
      details: error instanceof Error ? error.message : 'Unknown error'
    }, 500)
  }
})

// API route to get available images
app.get('/api/images', (c) => {
  try {
    const imagesDir = join(process.cwd(), 'public', 'static', 'images')
    const images: Array<{ name: string; path: string; folder: string }> = []
    
    const getFilesRecursive = (dir: string, baseDir: string = '') => {
      try {
        const entries = readdirSync(dir, { withFileTypes: true })
        
        for (const entry of entries) {
          const fullPath = join(dir, entry.name)
          const relativePath = baseDir ? `${baseDir}/${entry.name}` : entry.name
          
          if (entry.isDirectory()) {
            getFilesRecursive(fullPath, relativePath)
          } else if (entry.isFile()) {
            const ext = entry.name.split('.').pop()?.toLowerCase()
            if (['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext || '')) {
              images.push({
                name: entry.name,
                path: `/static/images/${relativePath}`,
                folder: baseDir || 'root'
              })
            }
          }
        }
      } catch (error) {
        console.error('Error reading directory:', dir, error)
      }
    }
    
    getFilesRecursive(imagesDir)
    return c.json({ images })
  } catch (error) {
    console.error('Error in /api/images:', error)
    return c.json({ images: [] })
  }
})

// Default route - Main page
app.get('/', (c) => {
  return c.html(`
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Interactive Campus Map</title>
        <script src="https://cdn.tailwindcss.com"></script>
        <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.4.0/css/all.min.css" rel="stylesheet">
        <style>
          :root {
            --primary-blue: #1a3a5c;
            --secondary-blue: #2d5a8c;
            --accent-gold: #d4af37;
            --light-gray: #f5f7fa;
            --medium-gray: #e8ecf1;
            --dark-gray: #4a5568;
            --text-primary: #2d3748;
            --text-secondary: #718096;
            --white: #ffffff;
            --shadow-sm: 0 2px 8px rgba(0, 0, 0, 0.08);
            --shadow-md: 0 4px 16px rgba(0, 0, 0, 0.12);
            --shadow-lg: 0 8px 24px rgba(0, 0, 0, 0.15);
          }
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          html, body {
            margin: 0;
            padding: 0;
            width: 100%;
            height: 100%;
            overflow-x: hidden;
          }
          
          .building-area {
            cursor: pointer;
            stroke: var(--secondary-blue);
            stroke-width: 1;
          }
          .building-area.selected {
            stroke: var(--accent-gold);
            stroke-width: 4;
            stroke-linejoin: round;
            stroke-linecap: round;
            fill: rgba(212, 175, 55, 0.15);
            filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.8)) drop-shadow(0 0 40px rgba(212, 175, 55, 0.4));
            animation: selected-pulse 2s ease-in-out infinite, selected-glow 1.5s ease-in-out infinite;
            paint-order: fill stroke;
          }
          #campus-container {
            position: relative;
            width: 100%;
            max-width: 100%;
            margin: 0 auto;
          }
          #campus-map {
            width: 100%;
            height: auto;
            display: block;
            transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #svg-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
            transition: transform 0.8s cubic-bezier(0.4, 0, 0.2, 1);
          }
          #svg-overlay rect {
            pointer-events: auto;
          }
          .modal-open {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
          }
          
          .modal-open .modal-content {
            transform: scale(1) !important;
            opacity: 1 !important;
          }
          
          .modal-backdrop {
            position: fixed;
            inset: 0;
            background: rgba(0, 0, 0, 0.5);
            backdrop-filter: blur(4px);
            z-index: 40;
            opacity: 0;
            visibility: hidden;
            transition: all 0.3s ease;
          }
          
          .modal-backdrop.active {
            opacity: 1;
            visibility: visible;
          }
          
          .building-sidebar {
            position: absolute;
            right: 0;
            top: 0;
            width: 300px;
            height: 100%;
            overflow-y: auto;
            z-index: 30;
          }
          
          .building-sidebar::-webkit-scrollbar {
            width: 8px;
          }
          
          .building-sidebar::-webkit-scrollbar-track {
            background: rgba(255, 255, 255, 0.1);
            border-radius: 10px;
          }
          
          .building-sidebar::-webkit-scrollbar-thumb {
            background: rgba(99, 102, 241, 0.5);
            border-radius: 10px;
          }
          
          .building-sidebar::-webkit-scrollbar-thumb:hover {
            background: rgba(99, 102, 241, 0.8);
          }
          
          .placeholder-image {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 3rem;
          }
          
          @keyframes gradient {
            0% { background-position: 0% 50%; }
            50% { background-position: 100% 50%; }
            100% { background-position: 0% 50%; }
          }
          
          .animate-gradient {
            background-size: 200% 200%;
            animation: gradient 3s ease infinite;
          }
          
          @keyframes fade-in {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes fade-in-up {
            from { opacity: 0; transform: translateY(30px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes slide-down {
            from { opacity: 0; transform: translateY(-20px); }
            to { opacity: 1; transform: translateY(0); }
          }
          
          @keyframes bounce-slow {
            0%, 100% { transform: translateY(0); }
            50% { transform: translateY(-5px); }
          }
          
          .animate-fade-in {
            animation: fade-in 0.6s ease-out;
          }
          
          .animate-fade-in-up {
            animation: fade-in-up 0.8s ease-out;
          }
          
          .animate-slide-down {
            animation: slide-down 0.4s ease-out;
          }
          
          .animate-bounce-slow {
            animation: bounce-slow 2s ease-in-out infinite;
          }
          
          @keyframes selected-pulse {
            0%, 100% {
              stroke-width: 4;
              opacity: 1;
            }
            50% {
              stroke-width: 5;
              opacity: 0.9;
            }
          }
          
          @keyframes selected-glow {
            0%, 100% {
              filter: drop-shadow(0 0 20px rgba(212, 175, 55, 0.8)) drop-shadow(0 0 40px rgba(212, 175, 55, 0.4));
            }
            50% {
              filter: drop-shadow(0 0 30px rgba(212, 175, 55, 1)) drop-shadow(0 0 60px rgba(212, 175, 55, 0.6));
            }
          }
          
          @keyframes flicker {
            0%, 100% { opacity: 1; }
            25% { opacity: 0.3; }
            50% { opacity: 1; }
            75% { opacity: 0.3; }
          }
          
          .flicker-animation {
            animation: flicker 0.6s ease-in-out;
          }
          
          .building-area {
            transition: stroke 0.2s ease;
          }
          
          .shape-btn {
            transition: opacity 0.2s ease;
          }
          
          .shape-btn:active {
            opacity: 0.8;
          }
          
          .carousel-wrapper {
            position: relative;
            width: 100%;
            overflow: hidden;
            touch-action: pan-y;
            user-select: none;
            -webkit-user-select: none;
            cursor: grab;
          }
          
          .carousel-wrapper:active {
            cursor: grabbing;
          }
          
          .carousel-item {
            width: 100%;
            animation: fadeInCarousel 0.5s ease-in-out;
            touch-action: none;
          }
          
          @keyframes fadeInCarousel {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          
          .carousel-dot {
            cursor: pointer;
            transition: all 0.3s ease;
          }
          
          .carousel-dot:hover {
            transform: scale(1.2);
          }
          
          #campus-map {
            transition: none;
          }
        </style>
    </head>
    <body class="bg-gradient-to-br from-[#f5f7fa] via-[#e8ecf1] to-[#f5f7fa] min-h-screen">
        <div class="min-h-screen p-6 backdrop-blur-sm">
            <!-- Header -->
            <div class="max-w-7xl mx-auto mb-8 animate-fade-in hidden">
                <div class="bg-gradient-to-r from-[#1a3a5c] via-[#2d5a8c] to-[#1a3a5c] rounded-2xl shadow-xl p-6 border border-white/30">
                    <div class="flex justify-between items-start">
                        <div>
                            <h1 class="text-5xl font-extrabold text-white mb-3 animate-gradient">
                                <i class="fas fa-map-marked-alt mr-3"></i>
                                Interactive Campus Map
                            </h1>
                            <p class="text-white/90 text-lg flex items-center gap-2">
                                <i class="fas fa-hand-pointer text-[#d4af37] animate-bounce-slow"></i>
                                Click on any building to view details
                            </p>
                        </div>
                        <div class="flex gap-3 flex-wrap">
                            <button id="edit-mode-btn" onclick="toggleEditMode()" class="px-5 py-2.5 bg-gradient-to-r from-[#1a3a5c] to-[#2d5a8c] text-white rounded-xl active:from-[#0f1e35] active:to-[#1a3a5c] transition-colors duration-200 shadow-lg">
                                <i class="fas fa-edit mr-2"></i>
                                <span id="edit-mode-text">Edit Mode</span>
                            </button>
                            <button onclick="saveShapes()" id="save-btn" class="hidden px-5 py-2.5 bg-gradient-to-r from-[#2d7a3e] to-[#3d9a50] text-white rounded-xl active:from-[#1a4a2a] active:to-[#2a6a3e] transition-colors duration-200 shadow-lg">
                                <i class="fas fa-save mr-2"></i>
                                Save Changes
                            </button>
                            <button onclick="exportData()" class="px-5 py-2.5 bg-gradient-to-r from-[#d4af37] to-[#e6c350] text-[#1a3a5c] rounded-xl active:from-[#c49f2f] active:to-[#d49c2f] transition-colors duration-200 shadow-lg font-semibold" title="Download backup file">
                                <i class="fas fa-download mr-2"></i>
                                Backup
                            </button>
                            <button onclick="document.getElementById('import-file').click()" class="px-5 py-2.5 bg-gradient-to-r from-[#2d5a8c] to-[#1a3a5c] text-white rounded-xl active:from-[#1a3a5c] active:to-[#0f1e35] transition-colors duration-200 shadow-lg" title="Restore from backup file">
                                <i class="fas fa-upload mr-2"></i>
                                Restore
                            </button>
                            <input type="file" id="import-file" accept=".json" onchange="importData(event)" class="hidden" />
                        </div>
                    </div>
                </div>
            </div>

            <!-- Shape Tools Panel (Hidden by default) -->
            <div id="shape-tools" class="hidden max-w-7xl mx-auto mb-6 animate-slide-down">
                <div class="bg-gradient-to-r from-[#1a3a5c] to-[#2d5a8c] rounded-2xl shadow-2xl p-5 border border-[#d4af37]/30">
                    <div class="flex items-center gap-4 flex-wrap">
                        <span class="font-bold text-white text-lg flex items-center gap-2">
                            <i class="fas fa-pencil-ruler text-[#d4af37]"></i>
                            Draw Shape:
                        </span>
                        <button onclick="setShapeType('rect')" data-shape="rect" class="shape-btn px-5 py-2.5 bg-gradient-to-br from-[#2d5a8c] to-[#1a3a5c] text-white rounded-xl active:from-[#1a3a5c] active:to-[#0f1e35] transition-colors duration-200 shadow-lg ring-2 ring-[#d4af37]">
                            <i class="fas fa-square mr-2"></i>Rectangle
                        </button>
                        <button onclick="setShapeType('circle')" data-shape="circle" class="shape-btn px-5 py-2.5 bg-gradient-to-br from-[#2d7a3e] to-[#1a4a2a] text-white rounded-xl active:from-[#1a3a5c] active:to-[#0f1e35] transition-colors duration-200 shadow-lg">
                            <i class="fas fa-circle mr-2"></i>Circle
                        </button>
                        <button onclick="setShapeType('polygon')" data-shape="polygon" class="shape-btn px-5 py-2.5 bg-gradient-to-br from-[#4a5568] to-[#2d3748] text-white rounded-xl active:from-[#2d3748] active:to-[#1a202c] transition-colors duration-200 shadow-lg">
                            <i class="fas fa-draw-polygon mr-2"></i>Polygon
                        </button>
                        <button onclick="deleteShape()" class="px-5 py-2.5 bg-gradient-to-br from-[#d4af37] to-[#c49f2f] text-[#1a3a5c] rounded-xl active:from-[#c49f2f] active:to-[#a88025] transition-colors duration-200 shadow-lg ml-auto font-semibold">
                            <i class="fas fa-trash mr-2"></i>Delete Selected
                        </button>
                    </div>
                </div>
            </div>

            <!-- Main Content -->
            <div class="max-w-full mx-auto animate-fade-in-up">
                <div class="bg-white/95 backdrop-blur-lg rounded-2xl shadow-2xl border border-white/50 overflow-hidden">
                    <div class="p-8 pb-6">
                        <h2 class="text-3xl font-bold mb-6 bg-gradient-to-r from-[#1a3a5c] to-[#2d5a8c] bg-clip-text text-transparent flex items-center gap-2">
                            <i class="fas fa-map text-[#1a3a5c]"></i>
                            Kampus Xəritəsi
                        </h2>
                    </div>
                    
                    <div class="flex relative">
                        <!-- Campus Map -->
                        <div class="flex-1 px-8 pb-8">
                            <div id="campus-container" class="relative overflow-hidden rounded-xl shadow-inner border-4 border-gray-100">
                                <img id="campus-map" src="/static/images/campus-map.png" alt="Campus Map" />
                                <svg id="svg-overlay" viewBox="0 0 1000 450" preserveAspectRatio="xMidYMid meet">
                                    <!-- Building overlays will be added dynamically -->
                                </svg>
                            </div>
                        </div>
                        
                        <!-- Building List Sidebar -->
                        <div id="sidebar-container" class="w-80 border-l border-[#d4af37]/30 bg-gradient-to-b from-[#f5f7fa] to-[#e8ecf1] overflow-hidden flex flex-col">
                            <div class="p-6 pb-4">
                                <h3 class="text-lg font-bold bg-gradient-to-r from-[#1a3a5c] to-[#2d5a8c] bg-clip-text text-transparent flex items-center gap-2">
                                    <i class="fas fa-building-columns text-[#1a3a5c]"></i>
                                    Binalar
                                </h3>
                            </div>
                            <div id="legend" class="space-y-2 overflow-y-auto pr-8 pl-7 flex-1 pb-6 pt-4">
                                <!-- Building buttons will be added dynamically -->
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Modal Backdrop -->
                <div id="modal-backdrop" class="modal-backdrop" onclick="closeInfoPanel()"></div>
                
                <!-- Info Modal -->
                <div id="info-modal" class="fixed inset-0 z-50 flex items-center justify-center opacity-0 pointer-events-none transition-all duration-300" style="visibility: hidden;">
                    <div class="modal-content bg-white rounded-3xl shadow-2xl border border-gray-200 w-full max-w-4xl max-h-[95vh] overflow-hidden transform scale-95 opacity-0 transition-all duration-300">
                        <!-- Modal Header -->
                        <div class="bg-gradient-to-r from-[#1a3a5c] via-[#2d5a8c] to-[#1a3a5c] p-6 relative">
                            <button onclick="closeInfoPanel()" class="absolute top-4 right-4 w-10 h-10 bg-white/20 active:bg-white/40 text-white rounded-full transition-colors duration-200 shadow-lg flex items-center justify-center backdrop-blur-sm">
                                <i class="fas fa-times text-xl"></i>
                            </button>
                            <h2 id="modal-title" class="text-3xl font-bold text-white flex items-center gap-3">
                                <i class="fas fa-building"></i>
                                <span>Building Information</span>
                            </h2>
                        </div>
                        
                        <!-- Modal Body -->
                        <div class="overflow-y-auto max-h-[calc(95vh-180px)] p-6">
                            <div id="info-content">
                                <!-- Content will be populated when building is selected -->
                            </div>
                        </div>
                    </div>
                </div>
            </div>

        </div>

        <script src="https://cdn.jsdelivr.net/npm/axios@1.6.0/dist/axios.min.js"></script>
        <script src="/static/app.js"></script>
    </body>
    </html>
  `)
})

export default app
