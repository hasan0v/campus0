# Interactive Campus Map

## Project Overview
- **Name**: Interactive Campus Map
- **Goal**: Create an interactive web application for campus navigation with clickable buildings that display detailed information
- **Features**: 
  - Interactive campus map with SVG overlay
  - Clickable buildings with hover effects
  - Real-time information display for selected buildings
  - Responsive design with Tailwind CSS
  - RESTful API for building data

## URLs
- **Development**: https://3000-ijo5wqe1prc89pffvcpx8-02b9cc79.sandbox.novita.ai
- **API Endpoint**: https://3000-ijo5wqe1prc89pffvcpx8-02b9cc79.sandbox.novita.ai/api/buildings

## Currently Completed Features
✅ Interactive campus map with SVG overlays for clickable areas
✅ Backend API with building information (9 buildings/facilities)
✅ Frontend JavaScript for dynamic interaction
✅ Building selection with visual feedback
✅ Info panel with building details, description, and location
✅ Legend with all buildings listed
✅ Responsive design with Tailwind CSS
✅ Icon-based building identification
✅ Smooth animations and transitions

## Functional Entry URIs
- **GET /**: Main application page with interactive campus map
- **GET /api/buildings**: Get all buildings data (JSON)
- **GET /api/buildings/:id**: Get specific building by ID (JSON)
- **GET /static/app.js**: Frontend JavaScript application
- **GET /static/images/campus-map.png**: Campus map image

## Buildings & Facilities
1. **Main Building** - Administrative building
2. **Academic Building A** - Lecture halls and classrooms
3. **Academic Building B** - Laboratories and study areas
4. **Library** - Central library with study spaces
5. **Sports Complex** - Indoor sports facilities
6. **Football Stadium** - Main stadium for sports events
7. **Student Center** - Student activities and cafeteria
8. **Research Building** - Research labs and innovation center
9. **Parking Area** - Main parking facility

## Data Architecture
- **Data Models**: Building objects with properties (id, name, description, coordinates, image)
- **Storage Services**: In-memory data storage (no database required for this static data)
- **Data Flow**: 
  1. Backend API serves building data
  2. Frontend fetches data via axios
  3. SVG overlays created dynamically based on coordinates
  4. Click events trigger building selection
  5. Info panel updates with selected building details

## User Guide
1. **View Campus Map**: Open the application to see the complete campus map
2. **Select Building**: Click on any building (highlighted areas) on the map
3. **View Details**: Selected building information appears on the right panel
4. **Use Legend**: Click on building names in the legend to select them
5. **Explore**: Hover over buildings to see tooltips with building names

## Technical Stack
- **Backend**: Hono (lightweight web framework for Cloudflare Workers)
- **Frontend**: Vanilla JavaScript with axios for API calls
- **Styling**: Tailwind CSS via CDN
- **Icons**: Font Awesome 6.4.0
- **Deployment Platform**: Cloudflare Pages
- **Build Tool**: Vite
- **Process Manager**: PM2 (for development)

## Features Not Yet Implemented
- Building photos/images (currently using placeholder gradients)
- Search functionality for buildings
- Routing/directions between buildings
- 3D campus view
- Mobile app version
- User authentication for admin features
- Building schedule/availability information
- Integration with campus events calendar

## Recommended Next Steps
1. **Add Real Building Images**: Replace placeholder gradients with actual building photos
2. **Search Feature**: Add search bar to quickly find buildings
3. **Enhanced Info**: Add more detailed information (opening hours, facilities, contact info)
4. **Navigation**: Implement path-finding between buildings
5. **Database Integration**: Use Cloudflare D1 for dynamic building data management
6. **Admin Panel**: Create admin interface for managing building information
7. **Deploy to Production**: Deploy to Cloudflare Pages for public access
8. **Analytics**: Add usage analytics to understand popular buildings

## Development
```bash
# Install dependencies
npm install

# Build project
npm run build

# Start development server (sandbox)
pm2 start ecosystem.config.cjs

# Test application
npm test

# View logs
pm2 logs campus-map --nostream

# Stop server
pm2 delete campus-map
```

## Deployment
- **Platform**: Cloudflare Pages (ready for deployment)
- **Status**: ✅ Active (Development)
- **Last Updated**: October 29, 2025

## Author
Developed by Ali Hasanov
- Website: https://ali-hasanov.com
- Position: Department Leader, Python Developer, Data Scientist, and ML Engineer at Baku State University
