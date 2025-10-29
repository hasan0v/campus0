import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { serveStatic } from 'hono/cloudflare-workers'

const app = new Hono()

// Enable CORS for frontend-backend communication
app.use('/api/*', cors())

// Serve static files from public directory
app.use('/static/*', serveStatic({ root: './public' }))

// Building data
const buildings = [
  {
    id: 'building-1',
    name: 'Main Building',
    description: 'The main administrative building of the campus',
    image: '/static/images/building-1.jpg',
    coordinates: { x: 165, y: 135, width: 100, height: 120 }
  },
  {
    id: 'building-2',
    name: 'Academic Building A',
    description: 'Primary academic building with lecture halls and classrooms',
    image: '/static/images/building-2.jpg',
    coordinates: { x: 385, y: 95, width: 85, height: 110 }
  },
  {
    id: 'building-3',
    name: 'Academic Building B',
    description: 'Secondary academic building with laboratories and study areas',
    image: '/static/images/building-3.jpg',
    coordinates: { x: 575, y: 95, width: 110, height: 100 }
  },
  {
    id: 'building-4',
    name: 'Library',
    description: 'Central library with extensive collection and study spaces',
    image: '/static/images/building-4.jpg',
    coordinates: { x: 290, y: 100, width: 70, height: 95 }
  },
  {
    id: 'building-5',
    name: 'Sports Complex',
    description: 'Indoor sports facilities and fitness center',
    image: '/static/images/building-5.jpg',
    coordinates: { x: 175, y: 265, width: 135, height: 90 }
  },
  {
    id: 'stadium',
    name: 'Football Stadium',
    description: 'Main football stadium for sports events and competitions',
    image: '/static/images/stadium.jpg',
    coordinates: { x: 420, y: 280, width: 135, height: 90 }
  },
  {
    id: 'building-6',
    name: 'Student Center',
    description: 'Student activities and cafeteria',
    image: '/static/images/building-6.jpg',
    coordinates: { x: 805, y: 185, width: 90, height: 95 }
  },
  {
    id: 'building-7',
    name: 'Research Building',
    description: 'Research labs and innovation center',
    image: '/static/images/building-7.jpg',
    coordinates: { x: 705, y: 270, width: 85, height: 65 }
  },
  {
    id: 'parking',
    name: 'Parking Area',
    description: 'Main parking facility for students and staff',
    image: '/static/images/parking.jpg',
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
          .building-area {
            cursor: pointer;
            transition: all 0.3s ease;
          }
          .building-area:hover {
            opacity: 0.7;
          }
          .building-area.selected {
            stroke: #3b82f6;
            stroke-width: 4;
            fill: rgba(59, 130, 246, 0.3);
          }
          #campus-container {
            position: relative;
            width: 100%;
            max-width: 1200px;
            margin: 0 auto;
          }
          #campus-map {
            width: 100%;
            height: auto;
            display: block;
          }
          #svg-overlay {
            position: absolute;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            pointer-events: none;
          }
          #svg-overlay rect {
            pointer-events: auto;
          }
          .info-panel {
            min-height: 400px;
          }
          .placeholder-image {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-size: 3rem;
          }
        </style>
    </head>
    <body class="bg-gray-50">
        <div class="min-h-screen p-6">
            <!-- Header -->
            <div class="max-w-7xl mx-auto mb-8">
                <h1 class="text-4xl font-bold text-gray-800 mb-2">
                    <i class="fas fa-map-marked-alt mr-3 text-blue-600"></i>
                    Interactive Campus Map
                </h1>
                <p class="text-gray-600">Click on any building to view details</p>
            </div>

            <!-- Main Content -->
            <div class="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-6">
                <!-- Campus Map -->
                <div class="lg:col-span-2 bg-white rounded-lg shadow-lg p-6">
                    <h2 class="text-2xl font-semibold mb-4 text-gray-800">Campus Overview</h2>
                    <div id="campus-container">
                        <img id="campus-map" src="https://page.gensparksite.com/v1/base64_upload/2f813bb274f7c2f60f9bcfc81c754dbbi" alt="Campus Map" />
                        <svg id="svg-overlay" viewBox="0 0 1000 450" preserveAspectRatio="xMidYMid meet">
                            <!-- Building overlays will be added dynamically -->
                        </svg>
                    </div>
                </div>

                <!-- Info Panel -->
                <div class="bg-white rounded-lg shadow-lg p-6 info-panel">
                    <div id="info-content">
                        <div class="text-center text-gray-500 mt-20">
                            <i class="fas fa-hand-pointer text-6xl mb-4"></i>
                            <p class="text-lg">Select a building to view details</p>
                        </div>
                    </div>
                </div>
            </div>

            <!-- Legend -->
            <div class="max-w-7xl mx-auto mt-6 bg-white rounded-lg shadow-lg p-6">
                <h3 class="text-xl font-semibold mb-4 text-gray-800">
                    <i class="fas fa-list mr-2"></i>
                    Buildings & Facilities
                </h3>
                <div id="legend" class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
                    <!-- Legend items will be added dynamically -->
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
