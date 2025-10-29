// Campus Map Interactive Application
let buildings = [];
let selectedBuilding = null;

// Initialize the application
async function init() {
    try {
        // Fetch buildings data
        const response = await axios.get('/api/buildings');
        buildings = response.data;
        
        // Create SVG overlays
        createBuildingOverlays();
        
        // Create legend
        createLegend();
        
        console.log('Campus map initialized with', buildings.length, 'buildings');
    } catch (error) {
        console.error('Error initializing campus map:', error);
    }
}

// Create interactive SVG overlays for buildings
function createBuildingOverlays() {
    const svg = document.getElementById('svg-overlay');
    
    buildings.forEach(building => {
        const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        rect.setAttribute('x', building.coordinates.x);
        rect.setAttribute('y', building.coordinates.y);
        rect.setAttribute('width', building.coordinates.width);
        rect.setAttribute('height', building.coordinates.height);
        rect.setAttribute('fill', 'rgba(59, 130, 246, 0.2)');
        rect.setAttribute('stroke', '#3b82f6');
        rect.setAttribute('stroke-width', '2');
        rect.setAttribute('class', 'building-area');
        rect.setAttribute('data-building-id', building.id);
        
        // Add hover title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = building.name;
        rect.appendChild(title);
        
        // Add click event
        rect.addEventListener('click', () => selectBuilding(building.id));
        
        svg.appendChild(rect);
    });
}

// Select a building and show details
function selectBuilding(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    selectedBuilding = building;
    
    // Update visual selection
    document.querySelectorAll('.building-area').forEach(area => {
        area.classList.remove('selected');
    });
    document.querySelector(`[data-building-id="${buildingId}"]`).classList.add('selected');
    
    // Update legend selection
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('ring-4', 'ring-blue-500');
    });
    document.querySelector(`[data-legend-id="${buildingId}"]`)?.classList.add('ring-4', 'ring-blue-500');
    
    // Update info panel
    updateInfoPanel(building);
}

// Update the info panel with building details
function updateInfoPanel(building) {
    const infoContent = document.getElementById('info-content');
    
    // Get icon based on building type
    const icon = getIconForBuilding(building.name);
    
    infoContent.innerHTML = `
        <div class="animate-fadeIn">
            <div class="mb-6">
                <div class="w-full h-48 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center text-white text-6xl placeholder-image">
                    <i class="${icon}"></i>
                </div>
            </div>
            
            <h3 class="text-2xl font-bold text-gray-800 mb-3">
                <i class="${icon} mr-2 text-blue-600"></i>
                ${building.name}
            </h3>
            
            <div class="space-y-3">
                <div class="flex items-start">
                    <i class="fas fa-info-circle text-blue-600 mt-1 mr-3"></i>
                    <div>
                        <p class="text-sm font-semibold text-gray-600 mb-1">Description</p>
                        <p class="text-gray-700">${building.description}</p>
                    </div>
                </div>
                
                <div class="flex items-start">
                    <i class="fas fa-map-pin text-blue-600 mt-1 mr-3"></i>
                    <div>
                        <p class="text-sm font-semibold text-gray-600 mb-1">Location</p>
                        <p class="text-gray-700">Grid Position: (${building.coordinates.x}, ${building.coordinates.y})</p>
                    </div>
                </div>
                
                <div class="flex items-start">
                    <i class="fas fa-ruler-combined text-blue-600 mt-1 mr-3"></i>
                    <div>
                        <p class="text-sm font-semibold text-gray-600 mb-1">Dimensions</p>
                        <p class="text-gray-700">${building.coordinates.width} × ${building.coordinates.height} units</p>
                    </div>
                </div>
            </div>
            
            <div class="mt-6 p-4 bg-blue-50 rounded-lg border border-blue-200">
                <p class="text-sm text-blue-800">
                    <i class="fas fa-lightbulb mr-2"></i>
                    <strong>Tip:</strong> Click on different buildings on the map to explore more facilities
                </p>
            </div>
        </div>
    `;
}

// Get appropriate icon for building type
function getIconForBuilding(name) {
    const lowerName = name.toLowerCase();
    
    if (lowerName.includes('stadium') || lowerName.includes('sports')) {
        return 'fas fa-futbol';
    } else if (lowerName.includes('library')) {
        return 'fas fa-book';
    } else if (lowerName.includes('parking')) {
        return 'fas fa-parking';
    } else if (lowerName.includes('student')) {
        return 'fas fa-users';
    } else if (lowerName.includes('research')) {
        return 'fas fa-microscope';
    } else if (lowerName.includes('academic')) {
        return 'fas fa-graduation-cap';
    } else if (lowerName.includes('main')) {
        return 'fas fa-building';
    } else {
        return 'fas fa-building';
    }
}

// Create legend with all buildings
function createLegend() {
    const legend = document.getElementById('legend');
    
    buildings.forEach(building => {
        const icon = getIconForBuilding(building.name);
        
        const legendItem = document.createElement('div');
        legendItem.className = 'legend-item p-3 border-2 border-gray-200 rounded-lg hover:border-blue-400 cursor-pointer transition-all duration-200';
        legendItem.setAttribute('data-legend-id', building.id);
        legendItem.innerHTML = `
            <div class="flex items-center">
                <i class="${icon} text-blue-600 mr-2"></i>
                <span class="text-sm font-medium text-gray-700">${building.name}</span>
            </div>
        `;
        
        legendItem.addEventListener('click', () => selectBuilding(building.id));
        legend.appendChild(legendItem);
    });
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    .animate-fadeIn {
        animation: fadeIn 0.3s ease-out;
    }
`;
document.head.appendChild(style);

// Initialize on page load
document.addEventListener('DOMContentLoaded', init);
