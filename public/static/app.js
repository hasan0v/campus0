// Campus Map Interactive Application
let buildings = [];
let selectedBuilding = null;
let editMode = false;

// Notification System
function showNotification(message, type = 'success', duration = 3000) {
    const notification = document.createElement('div');
    const bgColor = type === 'success' ? 'bg-green-500' : type === 'error' ? 'bg-red-500' : type === 'warning' ? 'bg-yellow-500' : 'bg-blue-500';
    const icon = type === 'success' ? 'fa-check-circle' : type === 'error' ? 'fa-exclamation-circle' : type === 'warning' ? 'fa-exclamation-triangle' : 'fa-info-circle';
    
    notification.style.cssText = `
        position: fixed;
        top: 80px;
        right: 20px;
        ${bgColor.replace('bg-', 'background-color: ')}
        color: white;
        padding: 16px 24px;
        border-radius: 8px;
        box-shadow: 0 4px 12px rgba(0,0,0,0.15);
        z-index: 10000;
        max-width: 400px;
        animation: slideInRight 0.3s ease-out;
        display: flex;
        align-items: center;
        gap: 12px;
    `;
    
    notification.className = bgColor;
    notification.innerHTML = `
        <i class="fas ${icon}" style="font-size: 20px;"></i>
        <span style="flex: 1;">${message}</span>
        <button onclick="this.parentElement.remove()" style="background: none; border: none; color: white; cursor: pointer; font-size: 18px; padding: 0; opacity: 0.8;">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.style.animation = 'slideOutRight 0.3s ease-out';
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, duration);
}
let currentShape = null;
let isDrawing = false;
let startPoint = null;
let draggedElement = null;
let draggedHandle = null;
let shapeType = 'rect'; // rect, circle, polygon
let isResizing = false;
let resizeHandles = [];
let selectedShapeForResize = null;

// Initialize the application
async function init() {
    try {
        // Check if there's saved data in localStorage
        const savedData = localStorage.getItem('campusBuildings');
        if (savedData) {
            try {
                const parsedData = JSON.parse(savedData);
                if (parsedData && parsedData.length > 0) {
                    buildings = parsedData;
                    console.log('Loaded', buildings.length, 'buildings from localStorage');
                    
                    // Also update server with saved data
                    await axios.post('/api/buildings/save', { buildings: buildings });
                }
            } catch (e) {
                console.error('Error parsing saved data:', e);
            }
        }
        
        // If no saved data, fetch from server
        if (buildings.length === 0) {
            const response = await axios.get('/api/buildings');
            buildings = response.data;
            console.log('Loaded', buildings.length, 'buildings from server');
        }
        
        // Create SVG overlays
        createBuildingOverlays();
        
        // Create legend
        createLegend();
        
        // Match sidebar height to map height
        matchSidebarHeight();
        
        console.log('Campus map initialized with', buildings.length, 'buildings');
        
        // Set up backup reminder (every 10 minutes)
        startBackupReminder();
        
        // Re-match heights on window resize
        window.addEventListener('resize', matchSidebarHeight);
    } catch (error) {
        console.error('Error initializing campus map:', error);
    }
}

// Backup reminder system
let backupReminderInterval = null;
let changesMade = false;

function startBackupReminder() {
    // Check for last backup time
    const lastBackup = localStorage.getItem('lastBackupTime');
    const now = Date.now();
    
    // Show reminder if last backup was more than 10 minutes ago or never
    if (!lastBackup || (now - parseInt(lastBackup)) > 10 * 60 * 1000) {
        // Show initial reminder after 2 minutes
        setTimeout(showBackupReminder, 2 * 60 * 1000);
        
        // Then show every 10 minutes
        backupReminderInterval = setInterval(showBackupReminder, 10 * 60 * 1000);
    }
}

function showBackupReminder() {
    if (!changesMade) return; // Only remind if changes were made
    
    const reminder = document.createElement('div');
    reminder.style.cssText = `
        position: fixed;
        top: 20px;
        right: 20px;
        background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
        color: white;
        padding: 20px;
        border-radius: 10px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.3);
        z-index: 10000;
        max-width: 350px;
        animation: slideIn 0.5s ease-out;
    `;
    
    reminder.innerHTML = `
        <div style="display: flex; align-items: center; margin-bottom: 10px;">
            <i class="fas fa-exclamation-triangle" style="font-size: 24px; margin-right: 10px;"></i>
            <strong style="font-size: 18px;">Backup Reminder</strong>
        </div>
        <p style="margin: 10px 0;">You have unsaved work! Click "Backup" button to download a backup file and prevent data loss.</p>
        <div style="display: flex; gap: 10px; margin-top: 15px;">
            <button onclick="exportData(); this.parentElement.parentElement.remove();" style="flex: 1; padding: 8px; background: white; color: #667eea; border: none; border-radius: 5px; cursor: pointer; font-weight: bold;">
                <i class="fas fa-download mr-2"></i>Backup Now
            </button>
            <button onclick="this.parentElement.parentElement.remove();" style="padding: 8px 15px; background: rgba(255,255,255,0.2); color: white; border: none; border-radius: 5px; cursor: pointer;">
                Later
            </button>
        </div>
    `;
    
    document.body.appendChild(reminder);
    
    // Auto-remove after 30 seconds
    setTimeout(() => {
        if (reminder.parentElement) {
            reminder.remove();
        }
    }, 30000);
}

// Mark that backup was done
function markBackupDone() {
    localStorage.setItem('lastBackupTime', Date.now().toString());
    changesMade = false;
}

// Track changes
function trackChange() {
    changesMade = true;
}

// Create interactive SVG overlays for buildings
function createBuildingOverlays() {
    const svg = document.getElementById('svg-overlay');
    svg.innerHTML = ''; // Clear existing
    
    buildings.forEach(building => {
        const coords = building.coordinates;
        let shape;
        
        if (coords.type === 'circle') {
            shape = createCircle(coords);
        } else if (coords.type === 'polygon' && coords.points) {
            shape = createPolygon(coords);
        } else {
            shape = createRect(coords);
        }
        
        shape.setAttribute('fill', 'rgba(59, 130, 246, 0.2)');
        shape.setAttribute('stroke', '#3b82f6');
        shape.setAttribute('stroke-width', '2');
        shape.setAttribute('class', 'building-area');
        shape.setAttribute('data-building-id', building.id);
        
        // Add hover title
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = building.name;
        shape.appendChild(title);
        
        // Calculate center position for text label
        let centerX, centerY;
        if (coords.type === 'circle') {
            centerX = coords.cx || coords.x || 0;
            centerY = coords.cy || coords.y || 0;
        } else if (coords.type === 'polygon' && coords.points) {
            const points = coords.points.split(' ').map(p => {
                const [x, y] = p.split(',').map(Number);
                return { x, y };
            });
            centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
            centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
        } else {
            centerX = (coords.x || 0) + (coords.width || 0) / 2;
            centerY = (coords.y || 0) + (coords.height || 0) / 2;
        }
        
        // Create text label
        const textLabel = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        textLabel.setAttribute('x', centerX);
        textLabel.setAttribute('y', centerY);
        textLabel.setAttribute('text-anchor', 'middle');
        textLabel.setAttribute('dominant-baseline', 'middle');
        textLabel.setAttribute('class', 'building-label');
        textLabel.setAttribute('data-building-id', building.id);
        textLabel.setAttribute('fill', '#1a3a5c');
        textLabel.setAttribute('font-size', '12');
        textLabel.setAttribute('font-weight', 'bold');
        textLabel.setAttribute('pointer-events', 'none');
        textLabel.setAttribute('style', 'text-shadow: 0 0 3px white, 0 0 3px white, 0 0 3px white;');
        textLabel.textContent = building.name;
        
        // Add click event for both view and edit mode
        shape.addEventListener('click', (e) => {
            if (editMode) {
                e.stopPropagation();
                selectShape(shape);
            } else {
                selectBuildingAndOpenModal(building.id);
            }
        });
        
        svg.appendChild(shape);
        svg.appendChild(textLabel);
    });
}

function createRect(coords) {
    const rect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    rect.setAttribute('x', coords.x || 0);
    rect.setAttribute('y', coords.y || 0);
    rect.setAttribute('width', coords.width || 100);
    rect.setAttribute('height', coords.height || 100);
    return rect;
}

function createCircle(coords) {
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('cx', coords.cx || coords.x || 0);
    circle.setAttribute('cy', coords.cy || coords.y || 0);
    
    // Calculate radius with fallback values
    let radius = coords.r;
    if (!radius && coords.width) {
        radius = coords.width / 2;
    }
    if (!radius || isNaN(radius)) {
        radius = 50; // Default radius
    }
    
    circle.setAttribute('r', radius);
    return circle;
}

function createPolygon(coords) {
    const polygon = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    polygon.setAttribute('points', coords.points || '0,0 50,0 50,50');
    return polygon;
}

// Select a building and show details
// Highlight building from sidebar (flicker only, no modal)
function highlightBuilding(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    selectedBuilding = building;
    
    // Update visual selection - remove selected from ALL except this one
    document.querySelectorAll('.building-area, .new-shape').forEach(area => {
        const areaId = area.getAttribute('data-building-id');
        if (areaId !== buildingId) {
            area.classList.remove('selected');
        }
    });
    
    const shape = document.querySelector(`[data-building-id="${buildingId}"]`);
    if (shape) {
        // Check if already selected
        const wasAlreadySelected = shape.classList.contains('selected');
        
        shape.classList.add('selected');
        // Move shape to front (end of SVG) so outline appears on top
        const svg = shape.parentElement;
        if (svg) {
            svg.appendChild(shape);
        }
        
        // Only add flicker animation if NOT already selected
        if (!wasAlreadySelected) {
            shape.classList.add('flicker-animation');
            setTimeout(() => {
                shape.classList.remove('flicker-animation');
            }, 600);
        }
    }
    
    // Update legend selection
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('ring-4', 'ring-[#d4af37]');
    });
    document.querySelector(`[data-legend-id="${buildingId}"]`)?.classList.add('ring-4', 'ring-[#d4af37]');
}

// Select building from map click (highlight + open modal)
function selectBuildingAndOpenModal(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    selectedBuilding = building;
    
    // Update visual selection
    document.querySelectorAll('.building-area, .new-shape').forEach(area => {
        area.classList.remove('selected');
    });
    const shape = document.querySelector(`[data-building-id="${buildingId}"]`);
    if (shape) {
        shape.classList.add('selected');
        // Move shape to front (end of SVG) so outline appears on top
        const svg = shape.parentElement;
        if (svg) {
            svg.appendChild(shape);
        }
    }
    
    // Update legend selection
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('ring-4', 'ring-[#d4af37]');
    });
    document.querySelector(`[data-legend-id="${buildingId}"]`)?.classList.add('ring-4', 'ring-[#d4af37]');
    
    // Update info panel
    updateInfoPanel(building);
    
    // Open info panel overlay
    openInfoPanel();
}

// Open info panel overlay
function openInfoPanel() {
    const modal = document.getElementById('info-modal');
    const backdrop = document.getElementById('modal-backdrop');
    if (modal && backdrop) {
        modal.classList.add('modal-open');
        backdrop.classList.add('active');
    }
}

// Close info panel overlay
function closeInfoPanel() {
    const modal = document.getElementById('info-modal');
    const backdrop = document.getElementById('modal-backdrop');
    if (modal && backdrop) {
        modal.classList.remove('modal-open');
        backdrop.classList.remove('active');
    }
    
    // Clear auto-play intervals
    Object.keys(carouselState).forEach(buildingId => {
        if (carouselState[buildingId].autoPlayInterval) {
            clearInterval(carouselState[buildingId].autoPlayInterval);
            carouselState[buildingId].autoPlayInterval = null;
        }
    });
    
    // Clear selection
    document.querySelectorAll('.building-area, .new-shape').forEach(area => {
        area.classList.remove('selected');
    });
    document.querySelectorAll('.legend-item').forEach(item => {
        item.classList.remove('ring-4', 'ring-[#d4af37]');
    });
    
    selectedBuilding = null;
}

// Zoom to selected building
function zoomToBuilding(building) {
    const container = document.getElementById('campus-container');
    const map = document.getElementById('campus-map');
    const svg = document.getElementById('svg-overlay');
    
    if (!container || !map || !building.coordinates) return;
    
    // Calculate center of the building
    let centerX, centerY;
    
    if (building.coordinates.type === 'circle') {
        centerX = building.coordinates.cx;
        centerY = building.coordinates.cy;
    } else if (building.coordinates.type === 'polygon') {
        // Calculate centroid of polygon
        const points = building.coordinates.points.split(' ').map(p => {
            const [x, y] = p.split(',').map(Number);
            return { x, y };
        });
        centerX = points.reduce((sum, p) => sum + p.x, 0) / points.length;
        centerY = points.reduce((sum, p) => sum + p.y, 0) / points.length;
    } else {
        centerX = building.coordinates.x + building.coordinates.width / 2;
        centerY = building.coordinates.y + building.coordinates.height / 2;
    }
    
    // Calculate zoom and translate
    const mapRect = map.getBoundingClientRect();
    const viewBoxWidth = 1000; // SVG viewBox width
    const viewBoxHeight = 450; // SVG viewBox height
    
    // Calculate scale to zoom in
    const scale = 2.5;
    
    // Calculate translate to center the building (accounting for info panel offset)
    const translateX = (viewBoxWidth / 2 - centerX) * (mapRect.width / viewBoxWidth);
    const translateY = (viewBoxHeight / 2 - centerY) * (mapRect.height / viewBoxHeight);
    
    // Apply transform
    container.style.transform = `scale(${scale}) translate(${translateX / scale}px, ${translateY / scale}px)`;
}

// Reset zoom to default state
function resetZoom() {
    const container = document.getElementById('campus-container');
    if (container) {
        container.style.transform = 'scale(1) translate(0, 0)';
    }
}

// Click outside to close
document.addEventListener('click', (e) => {
    const overlay = document.getElementById('info-panel-overlay');
    const campusContainer = document.getElementById('campus-container');
    const svg = document.getElementById('svg-overlay');
    
    // Check if click is on the campus container but not on a shape
    if (campusContainer?.contains(e.target)) {
        // Check if the click target is the SVG overlay or the map itself (not a shape)
        const clickedOnShape = e.target.closest('.building-area, .new-shape');
        
        if (!clickedOnShape && overlay?.classList.contains('info-panel-open')) {
            // Clicked on empty space in map - close panel and reset zoom
            closeInfoPanel();
        }
    }
    
    // Check if click is outside both the overlay and campus container
    if (overlay && overlay.classList.contains('info-panel-open')) {
        if (!overlay.contains(e.target) && !campusContainer?.contains(e.target)) {
            closeInfoPanel();
        }
    }
});

// Update the info panel with building details
function updateInfoPanel(building) {
    const infoContent = document.getElementById('info-content');
    
    // Ensure galleries is an array
    if (!building.galleries || !Array.isArray(building.galleries)) {
        building.galleries = building.image ? [{ url: building.image, caption: '' }] : [];
    }
    
    console.log(`Displaying building: ${building.id} (${building.name})`, {
        totalGalleries: building.galleries.length,
        galleries: building.galleries
    });
    
    // Get icon based on building type
    const icon = getIconForBuilding(building.name);
    
    // Get dimensions based on shape type
    let dimensions = 'N/A';
    let shapeType = 'Rectangle';
    if (building.coordinates.type === 'circle') {
        dimensions = `Radius: ${building.coordinates.r || 0} units`;
        shapeType = 'Circle';
    } else if (building.coordinates.type === 'polygon') {
        const pointCount = building.coordinates.points ? building.coordinates.points.split(' ').length : 0;
        dimensions = `${pointCount} vertices`;
        shapeType = 'Polygon';
    } else {
        dimensions = `${building.coordinates.width || 0} × ${building.coordinates.height || 0} units`;
        shapeType = 'Rectangle';
    }
    
    // Calculate approximate area
    let area = 'N/A';
    if (building.coordinates.type === 'circle') {
        const r = building.coordinates.r || 0;
        area = Math.round(Math.PI * r * r);
    } else if (building.coordinates.width && building.coordinates.height) {
        area = building.coordinates.width * building.coordinates.height;
    }
    
    // Get position
    let position = 'N/A';
    if (building.coordinates.x !== undefined && building.coordinates.y !== undefined) {
        position = `X: ${building.coordinates.x}, Y: ${building.coordinates.y}`;
    } else if (building.coordinates.cx !== undefined && building.coordinates.cy !== undefined) {
        position = `X: ${building.coordinates.cx}, Y: ${building.coordinates.cy}`;
    }
    
    // Update modal title
    const modalTitle = document.getElementById('modal-title');
    if (modalTitle) {
        modalTitle.innerHTML = `<i class="${icon}"></i><span>${building.name}</span>`;
    }
    
    // Use the galleries we already ensured exist
    const galleries = building.galleries && building.galleries.length > 0 ? building.galleries : [{ url: '', caption: '' }];
    const galleriesHTML = galleries.map((img, idx) => `
        <div class="carousel-item ${idx === 0 ? 'active' : ''}" data-index="${idx}" style="display: ${idx === 0 ? 'block' : 'none'};">
            <div class="relative">
                <div class="w-full h-96 bg-gradient-to-br from-[#1a3a5c] via-[#2d5a8c] to-[#1a3a5c] rounded-2xl flex items-center justify-center text-white text-8xl placeholder-image overflow-hidden shadow-2xl" id="building-image-container-${building.id}-${idx}">
                    <i class="${icon} animate-pulse-slow"></i>
                </div>
                ${img.caption ? `<div class="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/90 via-black/60 to-transparent p-6 rounded-b-2xl backdrop-blur-sm">
                    <p class="text-white font-bold text-lg leading-relaxed drop-shadow-lg">${img.caption}</p>
                </div>` : ''}
            </div>
        </div>
    `).join('');
    
    const carouselNavHTML = galleries.length > 1 ? `
        <div class="flex items-center justify-center mt-4 px-2 gap-2">
            ${galleries.map((_, idx) => `<button onclick="goToCarouselImage('${building.id}', ${idx})" class="carousel-dot w-2 h-2 rounded-full transition-all duration-300 ${idx === 0 ? 'bg-[#d4af37] w-6' : 'bg-[#d4af37]/40'}" data-index="${idx}"></button>`).join('')}
        </div>
    ` : '';
    
    infoContent.innerHTML = `
        <div class="animate-fadeIn">
            <div class="mb-6 relative group" id="carousel-container-${building.id}">
                <div class="carousel-wrapper">
                    ${galleriesHTML}
                </div>
                ${carouselNavHTML}
                <button onclick="toggleEditInfo('${building.id}')" id="edit-info-btn-${building.id}"
                    class="absolute top-4 right-4 px-4 py-2 bg-white/90 backdrop-blur-sm text-[#1a3a5c] rounded-xl active:bg-white transition-all duration-300 shadow-lg font-semibold hover:bg-white">
                    <i class="fas fa-edit mr-2"></i>Redaktə et
                </button>
            </div>
            
            <div id="info-view-mode">
                <div class="p-5 bg-gradient-to-br from-[#f5f7fa] to-[#e8ecf1] rounded-xl border-2 border-[#d4af37]/30 shadow-inner mb-4">
                    <div class="flex items-start gap-4">
                        <div class="w-12 h-12 bg-gradient-to-br from-[#1a3a5c] to-[#2d5a8c] rounded-xl flex items-center justify-center text-white shadow-lg flex-shrink-0">
                            <i class="fas fa-info-circle text-xl"></i>
                        </div>
                        <div class="flex-1">
                            <p class="text-sm font-bold text-[#1a3a5c] mb-2 uppercase tracking-wide">Təsvir</p>
                            <p class="text-[#2d3748] leading-relaxed" id="building-desc-display">${building.description}</p>
                        </div>
                    </div>
                </div>
            </div>
            
            <div id="info-edit-mode" class="hidden">
                <div class="space-y-5">
                    <div>
                        <label class="block text-sm font-bold text-[#2d3748] mb-3 flex items-center gap-2">
                            <i class="fas fa-tag text-[#1a3a5c]"></i>Building Name
                        </label>
                        <input type="text" id="edit-building-name" value="${building.name}" 
                            class="w-full px-4 py-3 border-2 border-[#d4af37]/50 rounded-xl focus:ring-4 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all duration-300 bg-white shadow-sm text-[#2d3748]">
                    </div>
                    
                    <div>
                        <label class="block text-sm font-bold text-[#2d3748] mb-3 flex items-center gap-2">
                            <i class="fas fa-info-circle text-[#1a3a5c]"></i>Description
                        </label>
                        <textarea id="edit-building-desc" rows="4" 
                            class="w-full px-4 py-3 border-2 border-[#d4af37]/50 rounded-xl focus:ring-4 focus:ring-[#d4af37]/30 focus:border-[#d4af37] transition-all duration-300 bg-white shadow-sm resize-none text-[#2d3748]">${building.description}</textarea>
                    </div>
                    
                    <div class="bg-gradient-to-br from-[#f5f7fa] to-[#e8ecf1] p-4 rounded-xl border-2 border-[#d4af37]/30">
                        <div class="flex items-center justify-between mb-4">
                            <label class="text-sm font-bold text-[#2d3748] flex items-center gap-2">
                                <i class="fas fa-images text-[#1a3a5c]"></i>Building Images & Captions
                            </label>
                            <button onclick="addImageGallery('${building.id}')" class="px-3 py-1 bg-gradient-to-r from-[#d4af37] to-[#e6c350] text-[#1a3a5c] rounded-lg text-xs font-bold active:from-[#c49f2f] active:to-[#d49c2f] transition-colors duration-200 shadow-md">
                                <i class="fas fa-plus mr-1"></i>Add Image
                            </button>
                        </div>
                        <div id="galleries-container-${building.id}" class="space-y-3">
                            ${(building.galleries || []).map((img, idx) => `
                                <div class="gallery-item bg-white rounded-lg p-3 border border-[#d4af37]/40 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md" draggable="true" data-index="${idx}" ondragstart="handleGalleryDragStart(event, '${building.id}', ${idx})" ondragover="handleGalleryDragOver(event)" ondrop="handleGalleryDrop(event, '${building.id}', ${idx})" ondragend="handleGalleryDragEnd(event)">
                                    <div class="flex gap-2 mb-2 items-center">
                                        <div class="text-[#d4af37] text-lg font-bold w-6 text-center" title="Drag to reorder">
                                            <i class="fas fa-grip-vertical"></i>
                                        </div>
                                        <input type="text" placeholder="Image URL or path (e.g., /static/images/eco/1.jpg)" value="${img.url}" 
                                            class="flex-1 px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                                            onchange="updateGalleryItem('${building.id}', ${idx}, 'url', this.value)">
                                        <button onclick="openImageBrowser('${building.id}', ${idx})" class="px-2 py-1 bg-gradient-to-r from-[#d4af37] to-[#e6c350] text-[#1a3a5c] rounded text-sm font-bold active:from-[#c49f2f] active:to-[#d49c2f] transition-colors duration-200" title="Browse server images">
                                            <i class="fas fa-folder-open"></i>
                                        </button>
                                        <button onclick="removeImageGallery('${building.id}', ${idx})" class="px-2 py-1 bg-red-500/20 text-red-600 rounded text-sm font-bold active:bg-red-500/40 transition-colors duration-200">
                                            <i class="fas fa-trash"></i>
                                        </button>
                                    </div>
                                    <input type="text" placeholder="Image caption (optional)" value="${img.caption || ''}" 
                                        class="w-full px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                                        onchange="updateGalleryItem('${building.id}', ${idx}, 'caption', this.value)"
                                        placeholder="e.g., Main entrance, South wing...">
                                </div>
                            `).join('')}
                        </div>
                    </div>
                    
                    <div class="flex gap-3 mt-8">
                        <button onclick="saveInfoChanges('${building.id}')" 
                            class="flex-1 bg-gradient-to-r from-[#2d7a3e] to-[#3d9a50] text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg active:from-[#1a4a2a] active:to-[#2a6a3e]">
                            <i class="fas fa-save mr-2"></i>Save Changes
                        </button>
                        <button onclick="cancelInfoEdit('${building.id}')" 
                            class="flex-1 bg-gradient-to-r from-[#4a5568] to-[#2d3748] text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg active:from-[#2d3748] active:to-[#1a202c]">
                            <i class="fas fa-times mr-2"></i>Cancel
                        </button>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Load all carousel images
    galleries.forEach((img, idx) => {
        if (img.url && img.url.trim()) {
            loadBuildingImage(building.id, img.url, icon, idx);
        }
    });
    
    // Initialize carousel auto-play and swipe after DOM is ready
    setTimeout(() => {
        initCarousel(building.id);
    }, 100);
}

// Carousel state
const carouselState = {};

// Initialize carousel with auto-play and swipe
function initCarousel(buildingId) {
    const container = document.getElementById(`carousel-container-${buildingId}`);
    if (!container) return;
    
    const wrapper = container.querySelector('.carousel-wrapper');
    if (!wrapper) return;
    
    // Only initialize if not already done
    if (carouselState[buildingId]) {
        return;
    }
    
    carouselState[buildingId] = {
        currentIndex: 0,
        touchStartX: 0,
        touchEndX: 0,
        autoPlayInterval: null
    };
    
    // Add touch/swipe listeners
    wrapper.addEventListener('touchstart', (e) => {
        carouselState[buildingId].touchStartX = e.changedTouches[0].screenX;
        // Stop auto-play on touch
        if (carouselState[buildingId].autoPlayInterval) {
            clearInterval(carouselState[buildingId].autoPlayInterval);
        }
    }, false);
    
    wrapper.addEventListener('touchend', (e) => {
        carouselState[buildingId].touchEndX = e.changedTouches[0].screenX;
        handleSwipe(buildingId);
        // Resume auto-play
        startAutoPlay(buildingId);
    }, false);
    
    // Start auto-play
    startAutoPlay(buildingId);
}

function handleSwipe(buildingId) {
    const state = carouselState[buildingId];
    if (!state) return;
    
    const diff = state.touchStartX - state.touchEndX;
    const threshold = 50; // Minimum swipe distance
    
    if (Math.abs(diff) > threshold) {
        if (diff > 0) {
            // Swiped left - next image
            nextCarouselImage(buildingId);
        } else {
            // Swiped right - previous image
            prevCarouselImage(buildingId);
        }
    }
}

function startAutoPlay(buildingId) {
    const container = document.getElementById(`carousel-container-${buildingId}`);
    if (!container) return;
    
    const items = container.querySelectorAll('.carousel-item');
    if (items.length <= 1) return;
    
    const state = carouselState[buildingId];
    if (!state) return;
    
    // Clear existing interval
    if (state.autoPlayInterval) {
        clearInterval(state.autoPlayInterval);
    }
    
    // Auto-play every 8 seconds
    state.autoPlayInterval = setInterval(() => {
        nextCarouselImage(buildingId);
    }, 8000);
}

// Load building image with fallback to icon
function loadBuildingImage(buildingId, imageUrl, fallbackIcon, imageIndex = 0) {
    const container = document.getElementById(`building-image-container-${buildingId}-${imageIndex}`);
    if (!container) return;
    
    const img = new Image();
    
    img.onload = function() {
        // Image loaded successfully, replace icon with image
        container.innerHTML = `<img src="${imageUrl}" alt="Building" class="w-full h-full object-cover" />`;
    };
    
    img.onerror = function() {
        // Image failed to load, keep the icon
        console.log('Failed to load image:', imageUrl);
    };
    
    img.src = imageUrl;
}

// Toggle edit mode for building info
function toggleEditInfo(buildingId) {
    const viewMode = document.getElementById('info-view-mode');
    const editMode = document.getElementById('info-edit-mode');
    const editBtn = document.getElementById(`edit-info-btn-${buildingId}`);
    
    if (viewMode && editMode) {
        viewMode.classList.add('hidden');
        editMode.classList.remove('hidden');
        if (editBtn) editBtn.style.display = 'none';
    }
}

// Cancel info edit
function cancelInfoEdit(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (building) {
        updateInfoPanel(building);
    }
}

// Save info changes
async function saveInfoChanges(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) {
        alert('Building not found in buildings array!');
        return;
    }
    
    // Get new values
    const newName = document.getElementById('edit-building-name').value.trim();
    const newDesc = document.getElementById('edit-building-desc').value.trim();
    
    if (!newName) {
        alert('Building name cannot be empty');
        return;
    }
    
    // Get gallery items
    const galleryItems = [];
    const galleriesContainer = document.getElementById(`galleries-container-${buildingId}`);
    if (galleriesContainer) {
        const items = galleriesContainer.querySelectorAll('.gallery-item');
        items.forEach(item => {
            const inputs = item.querySelectorAll('input');
            const url = inputs[0].value.trim();
            const caption = inputs[1].value.trim();
            if (url) { // Only add if URL is not empty
                galleryItems.push({ url, caption });
            }
        });
    }
    
    // Update building object in the array
    building.name = newName;
    building.description = newDesc;
    building.galleries = galleryItems.length > 0 ? galleryItems : [{ url: building.image || '', caption: '' }];
    building.image = galleryItems.length > 0 ? galleryItems[0].url : building.image;
    
    // Update the display
    updateInfoPanel(building);
    
    // Update legend
    createLegend();
    
    // Update shape title
    const shape = document.querySelector(`[data-building-id="${buildingId}"]`);
    if (shape) {
        const title = shape.querySelector('title');
        if (title) {
            title.textContent = newName;
        }
    }
    
    // Save to localStorage immediately
    localStorage.setItem('campusBuildings', JSON.stringify(buildings));
    
    // Also update server
    try {
        await axios.post('/api/buildings/save', { buildings: buildings });
        trackChange();
        showNotification(`Building "${newName}" updated and saved!`, 'success', 3000);
    } catch (error) {
        console.error('Error saving to server:', error);
        showNotification(`Building "${newName}" updated locally. Server save failed.`, 'warning', 4000);
    }
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
        
        const legendItem = document.createElement('button');
        legendItem.className = 'legend-item w-full p-3 bg-gradient-to-r from-white to-[#f5f7fa] border border-[#d4af37]/50 rounded-xl active:from-[#f5f7fa] active:to-[#e8ecf1] active:border-[#d4af37] cursor-pointer transition-colors duration-200 active:shadow-lg text-left';
        legendItem.setAttribute('data-legend-id', building.id);
        legendItem.innerHTML = `
            <div class="flex items-center gap-2">
                <div class="w-8 h-8 bg-gradient-to-br from-[#1a3a5c] to-[#2d5a8c] rounded-lg flex items-center justify-center text-white shadow-md flex-shrink-0">
                    <i class="${icon} text-sm"></i>
                </div>
                <span class="text-sm font-semibold text-[#2d3748] truncate">${building.name}</span>
            </div>
        `;
        
        legendItem.addEventListener('click', () => highlightBuilding(building.id));
        legend.appendChild(legendItem);
    });
}

// Match sidebar height to map height
function matchSidebarHeight() {
    const mapContainer = document.getElementById('campus-container');
    const sidebarContainer = document.getElementById('sidebar-container');
    const legend = document.getElementById('legend');
    
    if (mapContainer && sidebarContainer && legend) {
        const mapHeight = mapContainer.offsetHeight;
        sidebarContainer.style.height = mapHeight + 'px';
        
        // Calculate legend height (subtract header padding and title)
        const legendHeight = mapHeight - 80; // 80px for header area
        legend.style.maxHeight = legendHeight + 'px';
    }
}

// Toggle edit mode
function toggleEditMode() {
    editMode = !editMode;
    const editBtn = document.getElementById('edit-mode-btn');
    const editText = document.getElementById('edit-mode-text');
    const saveBtn = document.getElementById('save-btn');
    const svg = document.getElementById('svg-overlay');
    
    if (editMode) {
        editText.textContent = 'Exit Edit Mode';
        editBtn.classList.remove('bg-blue-600', 'hover:bg-blue-700');
        editBtn.classList.add('bg-red-600', 'hover:bg-red-700');
        saveBtn.classList.remove('hidden');
        svg.style.pointerEvents = 'auto';
        setupEditListeners();
        showShapeTools();
        
        // Add global listeners on document to capture all mouse events
        document.addEventListener('mousemove', handleMouseMove, true);
        document.addEventListener('mouseup', handleMouseUp, true);
        svg.addEventListener('mousedown', handleMouseDown, true);
    } else {
        editText.textContent = 'Edit Mode';
        editBtn.classList.remove('bg-red-600', 'hover:bg-red-700');
        editBtn.classList.add('bg-blue-600', 'hover:bg-blue-700');
        saveBtn.classList.add('hidden');
        svg.style.pointerEvents = 'none';
        removeEditListeners();
        hideShapeTools();
        
        // Remove global listeners
        document.removeEventListener('mousemove', handleMouseMove, true);
        document.removeEventListener('mouseup', handleMouseUp, true);
        svg.removeEventListener('mousedown', handleMouseDown, true);
        
        // Clear states
        removeResizeHandles();
        draggedElement = null;
        isDrawing = false;
        currentShape = null;
        isResizing = false;
        draggedHandle = null;
        selectedShapeForResize = null;
        
        createBuildingOverlays();
    }
}

// Show shape drawing tools
function showShapeTools() {
    const toolsPanel = document.getElementById('shape-tools');
    toolsPanel.classList.remove('hidden');
}

function hideShapeTools() {
    const toolsPanel = document.getElementById('shape-tools');
    toolsPanel.classList.add('hidden');
}

// Set shape type
function setShapeType(type) {
    shapeType = type;
    document.querySelectorAll('.shape-btn').forEach(btn => {
        btn.classList.remove('ring-2', 'ring-[#d4af37]');
    });
    document.querySelector(`[data-shape="${type}"]`).classList.add('ring-2', 'ring-[#d4af37]');
}

// Setup edit mode listeners
function setupEditListeners() {
    const svg = document.getElementById('svg-overlay');
    
    // Make existing shapes draggable and selectable
    document.querySelectorAll('.building-area, .new-shape').forEach(shape => {
        shape.style.cursor = 'move';
        shape.addEventListener('click', (e) => {
            e.stopPropagation();
            selectShape(shape);
        });
    });
}

function removeEditListeners() {
    const svg = document.getElementById('svg-overlay');
    svg.removeEventListener('mousedown', handleMouseDown);
    svg.removeEventListener('mousemove', handleMouseMove);
    svg.removeEventListener('mouseup', handleMouseUp);
}

// Select a shape for editing
function selectShape(shape) {
    // Remove selection from all shapes
    document.querySelectorAll('.building-area, .new-shape').forEach(s => {
        s.classList.remove('selected-shape');
    });
    
    // Remove old resize handles
    removeResizeHandles();
    
    // Add selection to clicked shape
    shape.classList.add('selected-shape');
    selectedShapeForResize = shape;
    
    // Add resize handles
    addResizeHandles(shape);
}

// Add resize handles to selected shape
function addResizeHandles(shape) {
    const svg = document.getElementById('svg-overlay');
    const tagName = shape.tagName.toLowerCase();
    
    if (tagName === 'rect') {
        const x = parseFloat(shape.getAttribute('x'));
        const y = parseFloat(shape.getAttribute('y'));
        const width = parseFloat(shape.getAttribute('width'));
        const height = parseFloat(shape.getAttribute('height'));
        
        // Create 8 handles: 4 corners + 4 edges
        const handles = [
            { x: x, y: y, cursor: 'nwse-resize', pos: 'nw' },
            { x: x + width/2, y: y, cursor: 'ns-resize', pos: 'n' },
            { x: x + width, y: y, cursor: 'nesw-resize', pos: 'ne' },
            { x: x, y: y + height/2, cursor: 'ew-resize', pos: 'w' },
            { x: x + width, y: y + height/2, cursor: 'ew-resize', pos: 'e' },
            { x: x, y: y + height, cursor: 'nesw-resize', pos: 'sw' },
            { x: x + width/2, y: y + height, cursor: 'ns-resize', pos: 's' },
            { x: x + width, y: y + height, cursor: 'nwse-resize', pos: 'se' }
        ];
        
        handles.forEach(h => {
            const handle = createHandle(h.x, h.y, h.cursor, h.pos, shape);
            resizeHandles.push(handle);
            svg.appendChild(handle);
        });
    } else if (tagName === 'circle') {
        const cx = parseFloat(shape.getAttribute('cx'));
        const cy = parseFloat(shape.getAttribute('cy'));
        const r = parseFloat(shape.getAttribute('r'));
        
        // Create 4 handles on circle edges
        const handles = [
            { x: cx, y: cy - r, cursor: 'ns-resize', pos: 'n' },
            { x: cx + r, y: cy, cursor: 'ew-resize', pos: 'e' },
            { x: cx, y: cy + r, cursor: 'ns-resize', pos: 's' },
            { x: cx - r, y: cy, cursor: 'ew-resize', pos: 'w' }
        ];
        
        handles.forEach(h => {
            const handle = createHandle(h.x, h.y, h.cursor, h.pos, shape);
            resizeHandles.push(handle);
            svg.appendChild(handle);
        });
    } else if (tagName === 'polygon') {
        const points = shape.getAttribute('points').split(' ').filter(p => p);
        points.forEach((point, index) => {
            const [x, y] = point.split(',').map(parseFloat);
            const handle = createHandle(x, y, 'move', `point-${index}`, shape);
            resizeHandles.push(handle);
            svg.appendChild(handle);
        });
    }
}

// Create a resize handle
function createHandle(x, y, cursor, position, parentShape) {
    const handle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    handle.setAttribute('cx', x);
    handle.setAttribute('cy', y);
    handle.setAttribute('r', 5);
    handle.setAttribute('fill', '#ef4444');
    handle.setAttribute('stroke', 'white');
    handle.setAttribute('stroke-width', '2');
    handle.setAttribute('class', 'resize-handle');
    handle.style.cursor = cursor;
    handle.handlePosition = position;
    handle.parentShape = parentShape;
    
    handle.addEventListener('mousedown', (e) => {
        e.stopPropagation();
        e.preventDefault();
        isResizing = true;
        draggedHandle = handle;
        startPoint = getMousePosition(e);
    });
    
    return handle;
}

// Remove all resize handles
function removeResizeHandles() {
    resizeHandles.forEach(handle => handle.remove());
    resizeHandles = [];
    selectedShapeForResize = null;
}

// Get mouse position relative to SVG
function getMousePosition(evt) {
    const svg = document.getElementById('svg-overlay');
    const CTM = svg.getScreenCTM();
    return {
        x: (evt.clientX - CTM.e) / CTM.a,
        y: (evt.clientY - CTM.f) / CTM.d
    };
}

// Handle mouse down for drawing
function handleMouseDown(evt) {
    const svg = document.getElementById('svg-overlay');
    
    // Check if clicking on a shape to drag it
    if (evt.target.classList.contains('building-area') || evt.target.classList.contains('new-shape')) {
        evt.preventDefault();
        evt.stopPropagation();
        selectShape(evt.target);
        draggedElement = evt.target;
        isDrawing = false;
        const pos = getMousePosition(evt);
        
        // Store offset for smooth dragging
        if (evt.target.tagName === 'rect') {
            draggedElement.dragOffset = {
                x: pos.x - parseFloat(evt.target.getAttribute('x')),
                y: pos.y - parseFloat(evt.target.getAttribute('y'))
            };
        } else if (evt.target.tagName === 'circle') {
            draggedElement.dragOffset = {
                x: pos.x - parseFloat(evt.target.getAttribute('cx')),
                y: pos.y - parseFloat(evt.target.getAttribute('cy'))
            };
        } else if (evt.target.tagName === 'polygon') {
            const points = evt.target.getAttribute('points').split(' ')[0].split(',');
            draggedElement.dragOffset = {
                x: pos.x - parseFloat(points[0]),
                y: pos.y - parseFloat(points[1])
            };
        }
        return;
    }
    
    if (evt.target.id !== 'svg-overlay') return;
    
    startPoint = getMousePosition(evt);
    
    if (shapeType === 'rect') {
        isDrawing = true;
        currentShape = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        currentShape.setAttribute('x', startPoint.x);
        currentShape.setAttribute('y', startPoint.y);
        currentShape.setAttribute('width', 0);
        currentShape.setAttribute('height', 0);
        currentShape.setAttribute('fill', 'rgba(34, 197, 94, 0.3)');
        currentShape.setAttribute('stroke', '#22c55e');
        currentShape.setAttribute('stroke-width', '2');
        currentShape.classList.add('new-shape');
        
        // Generate unique ID
        const newId = `building-new-${Date.now()}`;
        currentShape.setAttribute('data-building-id', newId);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = 'New Building - Click to edit info';
        currentShape.appendChild(title);
        
        svg.appendChild(currentShape);
    } else if (shapeType === 'circle') {
        isDrawing = true;
        currentShape = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        currentShape.setAttribute('cx', startPoint.x);
        currentShape.setAttribute('cy', startPoint.y);
        currentShape.setAttribute('r', 0);
        currentShape.setAttribute('fill', 'rgba(34, 197, 94, 0.3)');
        currentShape.setAttribute('stroke', '#22c55e');
        currentShape.setAttribute('stroke-width', '2');
        currentShape.classList.add('new-shape');
        
        // Generate unique ID
        const newId = `building-new-${Date.now()}`;
        currentShape.setAttribute('data-building-id', newId);
        const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
        title.textContent = 'New Building - Click to edit info';
        currentShape.appendChild(title);
        
        svg.appendChild(currentShape);
    } else if (shapeType === 'polygon') {
        if (!currentShape || currentShape.finished || !currentShape.polygonPoints) {
            // Start new polygon
            currentShape = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
            currentShape.polygonPoints = [{x: startPoint.x, y: startPoint.y}];
            currentShape.setAttribute('points', `${startPoint.x},${startPoint.y}`);
            currentShape.finished = false;
            currentShape.setAttribute('fill', 'rgba(34, 197, 94, 0.3)');
            currentShape.setAttribute('stroke', '#22c55e');
            currentShape.setAttribute('stroke-width', '2');
            currentShape.classList.add('new-shape');
            
            // Generate unique ID
            const newId = `building-new-${Date.now()}`;
            currentShape.setAttribute('data-building-id', newId);
            const title = document.createElementNS('http://www.w3.org/2000/svg', 'title');
            title.textContent = 'New Building - Click to edit info';
            currentShape.appendChild(title);
            
            svg.appendChild(currentShape);
        } else {
            // Add point to existing polygon
            currentShape.polygonPoints.push({x: startPoint.x, y: startPoint.y});
            const points = currentShape.polygonPoints.map(p => `${p.x},${p.y}`).join(' ');
            currentShape.setAttribute('points', points);
        }
        return;
    }
}

// Handle mouse move for drawing
function handleMouseMove(evt) {
    if (!editMode) return;
    
    // Handle resizing
    if (isResizing && draggedHandle) {
        evt.preventDefault();
        handleResize(evt);
        return;
    }
    
    // Handle dragging existing shapes
    if (draggedElement && draggedElement.dragOffset) {
        evt.preventDefault();
        handleDragMove(evt);
        return;
    }
    
    if (!isDrawing || !currentShape || shapeType === 'polygon') return;
    
    const currentPoint = getMousePosition(evt);
    
    if (shapeType === 'rect') {
        const width = currentPoint.x - startPoint.x;
        const height = currentPoint.y - startPoint.y;
        
        if (width < 0) {
            currentShape.setAttribute('x', currentPoint.x);
            currentShape.setAttribute('width', Math.abs(width));
        } else {
            currentShape.setAttribute('width', width);
        }
        
        if (height < 0) {
            currentShape.setAttribute('y', currentPoint.y);
            currentShape.setAttribute('height', Math.abs(height));
        } else {
            currentShape.setAttribute('height', height);
        }
    } else if (shapeType === 'circle') {
        const dx = currentPoint.x - startPoint.x;
        const dy = currentPoint.y - startPoint.y;
        const radius = Math.sqrt(dx * dx + dy * dy);
        currentShape.setAttribute('r', radius);
    }
}

// Handle mouse up
function handleMouseUp(evt) {
    if (!editMode) return;
    
    if (shapeType === 'polygon' && evt.detail === 2) {
        // Double click to finish polygon
        finishPolygon();
    }
    
    // Stop resizing
    if (isResizing) {
        isResizing = false;
        draggedHandle = null;
    }
    
    // Stop drawing
    if (isDrawing) {
        isDrawing = false;
    }
    
    // Stop dragging but keep selection
    if (draggedElement && draggedElement.dragOffset) {
        delete draggedElement.dragOffset;
    }
}

// Finish drawing polygon
function finishPolygon() {
    if (currentShape && currentShape.polygonPoints && currentShape.polygonPoints.length >= 3) {
        currentShape.finished = true;
        currentShape.style.cursor = 'move';
        currentShape.classList.add('building-area');
        currentShape.addEventListener('click', (e) => {
            e.stopPropagation();
            if (editMode) {
                selectShape(currentShape);
            }
        });
        const tempShape = currentShape;
        currentShape = null;
        trackChange(); // Track that a change was made
        showNotification('Polygon completed! You can now drag it or create another shape.', 'success', 2500);
    } else if (currentShape) {
        showNotification('Polygon needs at least 3 points. Click to add more points, or double-click to finish.', 'info', 3000);
    }
}

// Handle drag move
function handleDragMove(evt) {
    if (!draggedElement || !draggedElement.dragOffset) return;
    
    const pos = getMousePosition(evt);
    const tagName = draggedElement.tagName.toLowerCase();
    const offset = draggedElement.dragOffset;
    
    if (tagName === 'rect') {
        const newX = pos.x - offset.x;
        const newY = pos.y - offset.y;
        draggedElement.setAttribute('x', newX);
        draggedElement.setAttribute('y', newY);
    } else if (tagName === 'circle') {
        const newCx = pos.x - offset.x;
        const newCy = pos.y - offset.y;
        draggedElement.setAttribute('cx', newCx);
        draggedElement.setAttribute('cy', newCy);
    } else if (tagName === 'polygon') {
        const points = draggedElement.getAttribute('points').split(' ').filter(p => p);
        const firstPoint = points[0].split(',').map(parseFloat);
        const dx = (pos.x - offset.x) - firstPoint[0];
        const dy = (pos.y - offset.y) - firstPoint[1];
        
        const newPoints = points.map(p => {
            const [x, y] = p.split(',').map(parseFloat);
            return `${x + dx},${y + dy}`;
        }).join(' ');
        
        draggedElement.setAttribute('points', newPoints);
    }
    
    // Update resize handles if shape is selected
    if (selectedShapeForResize === draggedElement) {
        updateResizeHandles(draggedElement);
    }
}

// Handle resize
function handleResize(evt) {
    if (!draggedHandle || !draggedHandle.parentShape) return;
    
    const pos = getMousePosition(evt);
    const shape = draggedHandle.parentShape;
    const handlePos = draggedHandle.handlePosition;
    const tagName = shape.tagName.toLowerCase();
    
    if (tagName === 'rect') {
        resizeRect(shape, pos, handlePos);
    } else if (tagName === 'circle') {
        resizeCircle(shape, pos, handlePos);
    } else if (tagName === 'polygon') {
        resizePolygon(shape, pos, handlePos);
    }
    
    // Update all handles
    updateResizeHandles(shape);
}

// Resize rectangle
function resizeRect(rect, pos, handlePos) {
    let x = parseFloat(rect.getAttribute('x'));
    let y = parseFloat(rect.getAttribute('y'));
    let width = parseFloat(rect.getAttribute('width'));
    let height = parseFloat(rect.getAttribute('height'));
    
    const originalRight = x + width;
    const originalBottom = y + height;
    
    switch(handlePos) {
        case 'nw':
            width = originalRight - pos.x;
            height = originalBottom - pos.y;
            x = pos.x;
            y = pos.y;
            break;
        case 'n':
            height = originalBottom - pos.y;
            y = pos.y;
            break;
        case 'ne':
            width = pos.x - x;
            height = originalBottom - pos.y;
            y = pos.y;
            break;
        case 'w':
            width = originalRight - pos.x;
            x = pos.x;
            break;
        case 'e':
            width = pos.x - x;
            break;
        case 'sw':
            width = originalRight - pos.x;
            height = pos.y - y;
            x = pos.x;
            break;
        case 's':
            height = pos.y - y;
            break;
        case 'se':
            width = pos.x - x;
            height = pos.y - y;
            break;
    }
    
    // Prevent negative dimensions
    if (width > 5) {
        rect.setAttribute('x', x);
        rect.setAttribute('width', width);
    }
    if (height > 5) {
        rect.setAttribute('y', y);
        rect.setAttribute('height', height);
    }
}

// Resize circle
function resizeCircle(circle, pos, handlePos) {
    const cx = parseFloat(circle.getAttribute('cx'));
    const cy = parseFloat(circle.getAttribute('cy'));
    
    let dx = pos.x - cx;
    let dy = pos.y - cy;
    let newRadius = Math.sqrt(dx * dx + dy * dy);
    
    if (newRadius > 5) {
        circle.setAttribute('r', newRadius);
    }
}

// Resize polygon by moving individual points
function resizePolygon(polygon, pos, handlePos) {
    if (handlePos.startsWith('point-')) {
        const pointIndex = parseInt(handlePos.split('-')[1]);
        const points = polygon.getAttribute('points').split(' ').filter(p => p);
        
        if (pointIndex < points.length) {
            points[pointIndex] = `${pos.x},${pos.y}`;
            polygon.setAttribute('points', points.join(' '));
            
            // Update polygonPoints array if it exists
            if (polygon.polygonPoints && polygon.polygonPoints[pointIndex]) {
                polygon.polygonPoints[pointIndex] = {x: pos.x, y: pos.y};
            }
        }
    }
}

// Update resize handle positions
function updateResizeHandles(shape) {
    const tagName = shape.tagName.toLowerCase();
    
    if (tagName === 'rect') {
        const x = parseFloat(shape.getAttribute('x'));
        const y = parseFloat(shape.getAttribute('y'));
        const width = parseFloat(shape.getAttribute('width'));
        const height = parseFloat(shape.getAttribute('height'));
        
        const positions = [
            { x: x, y: y, pos: 'nw' },
            { x: x + width/2, y: y, pos: 'n' },
            { x: x + width, y: y, pos: 'ne' },
            { x: x, y: y + height/2, pos: 'w' },
            { x: x + width, y: y + height/2, pos: 'e' },
            { x: x, y: y + height, pos: 'sw' },
            { x: x + width/2, y: y + height, pos: 's' },
            { x: x + width, y: y + height, pos: 'se' }
        ];
        
        resizeHandles.forEach(handle => {
            const pos = positions.find(p => p.pos === handle.handlePosition);
            if (pos) {
                handle.setAttribute('cx', pos.x);
                handle.setAttribute('cy', pos.y);
            }
        });
    } else if (tagName === 'circle') {
        const cx = parseFloat(shape.getAttribute('cx'));
        const cy = parseFloat(shape.getAttribute('cy'));
        const r = parseFloat(shape.getAttribute('r'));
        
        const positions = [
            { x: cx, y: cy - r, pos: 'n' },
            { x: cx + r, y: cy, pos: 'e' },
            { x: cx, y: cy + r, pos: 's' },
            { x: cx - r, y: cy, pos: 'w' }
        ];
        
        resizeHandles.forEach(handle => {
            const pos = positions.find(p => p.pos === handle.handlePosition);
            if (pos) {
                handle.setAttribute('cx', pos.x);
                handle.setAttribute('cy', pos.y);
            }
        });
    } else if (tagName === 'polygon') {
        const points = shape.getAttribute('points').split(' ').filter(p => p);
        
        resizeHandles.forEach((handle, index) => {
            if (index < points.length) {
                const [x, y] = points[index].split(',').map(parseFloat);
                handle.setAttribute('cx', x);
                handle.setAttribute('cy', y);
            }
        });
    }
}

// Save shapes to server
async function saveShapes() {
    console.log('saveShapes() function called!');
    const shapes = document.querySelectorAll('.building-area, .new-shape');
    console.log('Found shapes:', shapes.length);
    const updatedBuildings = [];
    
    shapes.forEach((shape, index) => {
        const buildingId = shape.getAttribute('data-building-id') || `building-new-${Date.now()}-${index}`;
        const tagName = shape.tagName.toLowerCase();
        
        let coordinates = {};
        
        if (tagName === 'rect') {
            coordinates = {
                type: 'rect',
                x: parseFloat(shape.getAttribute('x')),
                y: parseFloat(shape.getAttribute('y')),
                width: parseFloat(shape.getAttribute('width')),
                height: parseFloat(shape.getAttribute('height'))
            };
        } else if (tagName === 'circle') {
            coordinates = {
                type: 'circle',
                cx: parseFloat(shape.getAttribute('cx')),
                cy: parseFloat(shape.getAttribute('cy')),
                r: parseFloat(shape.getAttribute('r'))
            };
        } else if (tagName === 'polygon') {
            coordinates = {
                type: 'polygon',
                points: shape.getAttribute('points')
            };
        }
        
        // Find existing building in the buildings array (which has latest info changes)
        const existingBuilding = buildings.find(b => b.id === buildingId);
        
        if (existingBuilding) {
            // Use existing building data with updated coordinates
            updatedBuildings.push({
                id: existingBuilding.id,
                name: existingBuilding.name,
                description: existingBuilding.description,
                image: existingBuilding.image,
                coordinates: coordinates
            });
        } else {
            // Create new building entry
            updatedBuildings.push({
                id: buildingId,
                name: 'New Building',
                description: 'Click Edit to add description',
                image: '/static/images/default.jpg',
                coordinates: coordinates
            });
        }
    });
    
    if (updatedBuildings.length === 0) {
        showNotification('No buildings to save. Draw some shapes first!', 'warning', 3000);
        return;
    }
    
    console.log('=== SAVING BUILDINGS ===');
    console.log('Total buildings to save:', updatedBuildings.length);
    updatedBuildings.forEach(b => {
        console.log(`Building: ${b.name} (${b.id})`);
        console.log('  Description:', b.description);
        console.log('  Image:', b.image);
        console.log('  Coordinates:', b.coordinates);
    });
    
    try {
        const response = await axios.post('/api/buildings/save', { buildings: updatedBuildings });
        console.log('Server response:', response.data);
        
        if (response.data.success) {
            // Update the buildings array with saved data
            buildings.length = 0;
            buildings.push(...updatedBuildings);
            
            // Save to localStorage for persistence
            localStorage.setItem('campusBuildings', JSON.stringify(updatedBuildings));
            console.log('Saved to localStorage');
            
            // Reload everything from server to ensure sync
            await reloadBuildings();
            
            console.log('=== BUILDINGS AFTER SAVE ===');
            buildings.forEach(b => {
                console.log(`${b.name}: ${b.description}`);
            });
            
            // Track that changes were made
            trackChange();
            
            showNotification(`Successfully saved ${response.data.count} building(s)! 💡 Remember to create backups regularly.`, 'success', 4000);
        }
    } catch (error) {
        console.error('Save error:', error);
        showNotification('Error saving changes: ' + (error.response?.data?.error || error.message || 'Unknown error'), 'error', 5000);
    }
}

// Reload buildings from server
async function reloadBuildings() {
    try {
        const response = await axios.get('/api/buildings');
        buildings = response.data;
        createBuildingOverlays();
        createLegend();
        
        // Update info panel if a building is selected
        if (selectedBuilding) {
            const updatedSelected = buildings.find(b => b.id === selectedBuilding.id);
            if (updatedSelected) {
                selectedBuilding = updatedSelected;
                updateInfoPanel(updatedSelected);
            }
        }
    } catch (error) {
        // Silent fail - buildings array already updated
    }
}

// Delete selected shape
function deleteShape() {
    const selectedShape = document.querySelector('.selected-shape');
    if (selectedShape) {
        selectedShape.remove();
        removeResizeHandles();
        draggedElement = null;
        selectedShapeForResize = null;
        trackChange();
        showNotification('Shape deleted successfully', 'success', 2000);
    } else {
        showNotification('Please select a shape first by clicking on it', 'warning', 2500);
    }
}

// Add CSS animation
const style = document.createElement('style');
style.textContent = `
    @keyframes fadeIn {
        from { opacity: 0; transform: translateY(10px); }
        to { opacity: 1; transform: translateY(0); }
    }
    @keyframes slideIn {
        from { 
            opacity: 0; 
            transform: translateX(400px);
        }
        to { 
            opacity: 1; 
            transform: translateX(0);
        }
    }
    @keyframes slideInRight {
        from { 
            opacity: 0; 
            transform: translateX(400px);
        }
        to { 
            opacity: 1; 
            transform: translateX(0);
        }
    }
    @keyframes slideOutRight {
        from { 
            opacity: 1; 
            transform: translateX(0);
        }
        to { 
            opacity: 0; 
            transform: translateX(400px);
        }
    }
    @keyframes pulse-slow {
        0%, 100% { 
            opacity: 1;
            transform: scale(1);
        }
        50% { 
            opacity: 0.9;
            transform: scale(1.05);
        }
    }
    @keyframes selected-pulse-shape {
        0%, 100% {
            stroke-width: 6;
            opacity: 1;
            transform: scale(1);
        }
        50% {
            stroke-width: 8;
            opacity: 0.95;
            transform: scale(1.02);
        }
    }
    @keyframes selected-glow-shape {
        0%, 100% {
            filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.9)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.5)) drop-shadow(0 0 60px rgba(245, 158, 11, 0.3));
        }
        50% {
            filter: drop-shadow(0 0 30px rgba(245, 158, 11, 1)) drop-shadow(0 0 60px rgba(245, 158, 11, 0.7)) drop-shadow(0 0 90px rgba(245, 158, 11, 0.4));
        }
    }
    @keyframes shimmer {
        0% {
            background-position: -1000px 0;
        }
        100% {
            background-position: 1000px 0;
        }
    }
    .animate-fadeIn {
        animation: fadeIn 0.5s ease-out;
    }
    .animate-pulse-slow {
        animation: pulse-slow 3s ease-in-out infinite;
    }
    .selected-shape {
        stroke: #f59e0b !important;
        stroke-width: 6 !important;
        fill: rgba(245, 158, 11, 0.2) !important;
        filter: drop-shadow(0 0 20px rgba(245, 158, 11, 0.9)) drop-shadow(0 0 40px rgba(245, 158, 11, 0.5)) drop-shadow(0 0 60px rgba(245, 158, 11, 0.3));
        animation: selected-pulse-shape 1.8s ease-in-out infinite, selected-glow-shape 1.5s ease-in-out infinite;
    }
    .new-shape {
        cursor: move;
    }
    .building-area {
        cursor: move;
    }
    .resize-handle {
        cursor: pointer;
        pointer-events: auto;
        transition: all 0.2s ease;
    }
    .resize-handle:hover {
        fill: #dc2626;
        r: 7;
        filter: drop-shadow(0 2px 4px rgba(220, 38, 38, 0.5));
    }
    #svg-overlay {
        pointer-events: auto !important;
    }
    
    input:focus, textarea:focus {
        outline: none;
    }
    
    button {
        position: relative;
        overflow: hidden;
    }
    
    button::after {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: rgba(255, 255, 255, 0.4);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
    }
    
    button:active::after {
        width: 300px;
        height: 300px;
    }
`;
document.head.appendChild(style);

// Export data to JSON file
function exportData() {
    // Ensure all buildings have complete data including galleries
    const dataToExport = buildings.map(b => ({
        id: b.id,
        name: b.name,
        description: b.description || '',
        image: b.image || '',
        coordinates: b.coordinates || {},
        galleries: b.galleries || (b.image ? [{ url: b.image, caption: '' }] : []),
        shapes: b.shapes || [] // Include any drawn shapes
    }));
    
    const dataStr = JSON.stringify(dataToExport, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `campus-buildings-backup-${new Date().toISOString().replace(/[:.]/g, '-')}.json`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    
    // Mark backup as done
    markBackupDone();
    
    showNotification(`Backup created! ${buildings.length} buildings with ${dataToExport.reduce((sum, b) => sum + (b.galleries ? b.galleries.length : 0), 0)} images saved to file. Keep it safe!`, 'success', 4000);
}

// Import data from JSON file
function importData(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    try {
        const reader = new FileReader();
        reader.onload = async (e) => {
            try {
                const text = e.target.result;
                const importedBuildings = JSON.parse(text);
                
                if (!Array.isArray(importedBuildings)) {
                    showNotification('Invalid file format. Expected an array of buildings.', 'error', 4000);
                    return;
                }
                
                // Validate the structure - be more lenient for optional fields
                const isValid = importedBuildings.every(b => 
                    b.id && b.name && b.coordinates
                );
                
                if (!isValid) {
                    showNotification('Invalid building data structure. Each building needs id, name, and coordinates.', 'error', 4000);
                    return;
                }
                
                // Ensure galleries exist for each building
                const sanitizedBuildings = importedBuildings.map(b => {
                    const galleries = b.galleries && Array.isArray(b.galleries) ? b.galleries : (b.image ? [{ url: b.image, caption: '' }] : []);
                    console.log(`Building ${b.id} (${b.name}): ${galleries.length} galleries`, galleries);
                    return {
                        ...b,
                        galleries: galleries
                    };
                });
                
                // Log summary
                const totalImages = sanitizedBuildings.reduce((sum, b) => sum + (b.galleries ? b.galleries.length : 0), 0);
                console.log(`Import summary: ${sanitizedBuildings.length} buildings with total ${totalImages} images`);
                
                // Update buildings
                buildings.length = 0;
                buildings.push(...sanitizedBuildings);
                
                // Save to localStorage
                localStorage.setItem('campusBuildings', JSON.stringify(sanitizedBuildings));
                
                // Update server
                try {
                    await axios.post('/api/buildings/save', { buildings: sanitizedBuildings });
                } catch (serverError) {
                    console.warn('Server save error:', serverError);
                    // Continue even if server fails
                }
                
                // Refresh display
                createBuildingOverlays();
                createLegend();
                
                // Mark backup as done since we just restored
                markBackupDone();
                
                showNotification(`Successfully restored ${sanitizedBuildings.length} buildings from backup! All images and data restored.`, 'success', 3000);
            } catch (parseError) {
                console.error('Parse error:', parseError);
                showNotification('Error parsing JSON file: ' + parseError.message, 'error', 5000);
            }
        };
        reader.readAsText(file);
    } catch (error) {
        console.error('Import error:', error);
        showNotification('Error importing file: ' + error.message, 'error', 5000);
    }
}

// Clear all saved data
function clearSavedData() {
    if (confirm('Are you sure you want to clear all saved data?\n\nThis will reload the default buildings from the server.')) {
        localStorage.removeItem('campusBuildings');
        alert('Saved data cleared. Please refresh the page to load default data.');
    }
}

// Restore previous data from localStorage
function restorePreviousData() {
    const savedData = localStorage.getItem('campusBuildings');
    if (savedData) {
        try {
            const parsedData = JSON.parse(savedData);
            buildings.length = 0;
            buildings.push(...parsedData);
            createBuildingOverlays();
            createLegend();
            alert(`✓ Restored ${parsedData.length} buildings from localStorage!`);
            console.log('Restored buildings:', buildings);
        } catch (e) {
            alert('✗ Error restoring data: ' + e.message);
        }
    } else {
        alert('No saved data found in localStorage.');
    }
}

// Check what's in localStorage
function checkLocalStorage() {
    const savedData = localStorage.getItem('campusBuildings');
    if (savedData) {
        const parsedData = JSON.parse(savedData);
        console.log('=== LOCALSTORAGE DATA ===');
        console.log('Total buildings:', parsedData.length);
        parsedData.forEach(b => {
            console.log(`- ${b.name} (${b.id}):`, b.coordinates);
        });
        alert(`Found ${parsedData.length} buildings in localStorage.\nCheck console for details.`);
    } else {
        alert('No data in localStorage.');
    }
}


// Carousel navigation functions
function goToCarouselImage(buildingId, index) {
    const carousel = document.getElementById(`carousel-container-${buildingId}`);
    if (!carousel) return;
    
    const items = carousel.querySelectorAll('.carousel-item');
    const dots = carousel.querySelectorAll('.carousel-dot');
    
    items.forEach(item => item.style.display = 'none');
    dots.forEach(dot => {
        dot.classList.remove('bg-[#d4af37]', 'w-6');
        dot.classList.add('bg-[#d4af37]/40');
    });
    
    if (items[index]) {
        items[index].style.display = 'block';
    }
    if (dots[index]) {
        dots[index].classList.add('bg-[#d4af37]', 'w-6');
        dots[index].classList.remove('bg-[#d4af37]/40');
    }
}

function nextCarouselImage(buildingId) {
    const carousel = document.getElementById(`carousel-container-${buildingId}`);
    if (!carousel) return;
    
    const items = carousel.querySelectorAll('.carousel-item');
    let currentIndex = 0;
    
    items.forEach((item, idx) => {
        if (item.style.display !== 'none') {
            currentIndex = idx;
        }
    });
    
    const nextIndex = (currentIndex + 1) % items.length;
    
    // Update state
    if (carouselState[buildingId]) {
        carouselState[buildingId].currentIndex = nextIndex;
        // Restart auto-play on manual navigation
        startAutoPlay(buildingId);
    }
    
    goToCarouselImage(buildingId, nextIndex);
}

function prevCarouselImage(buildingId) {
    const carousel = document.getElementById(`carousel-container-${buildingId}`);
    if (!carousel) return;
    
    const items = carousel.querySelectorAll('.carousel-item');
    let currentIndex = 0;
    
    items.forEach((item, idx) => {
        if (item.style.display !== 'none') {
            currentIndex = idx;
        }
    });
    
    const prevIndex = (currentIndex - 1 + items.length) % items.length;
    
    // Update state
    if (carouselState[buildingId]) {
        carouselState[buildingId].currentIndex = prevIndex;
        // Restart auto-play on manual navigation
        startAutoPlay(buildingId);
    }
    
    goToCarouselImage(buildingId, prevIndex);
}

// Gallery management functions
function addImageGallery(buildingId) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building) return;
    
    if (!building.galleries) {
        building.galleries = [];
    }
    
    building.galleries.push({ url: '', caption: '' });
    
    // Refresh the gallery container directly
    const container = document.getElementById(`galleries-container-${buildingId}`);
    if (container) {
        container.innerHTML = (building.galleries || []).map((img, idx) => `
            <div class="gallery-item bg-white rounded-lg p-3 border border-[#d4af37]/40 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md" draggable="true" data-index="${idx}" ondragstart="handleGalleryDragStart(event, '${buildingId}', ${idx})" ondragover="handleGalleryDragOver(event)" ondrop="handleGalleryDrop(event, '${buildingId}', ${idx})" ondragend="handleGalleryDragEnd(event)">
                <div class="flex gap-2 mb-2 items-center">
                    <div class="text-[#d4af37] text-lg font-bold w-6 text-center" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <input type="text" placeholder="Image URL or path (e.g., /static/images/eco/1.jpg)" value="${img.url}" 
                        class="flex-1 px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                        onchange="updateGalleryItem('${buildingId}', ${idx}, 'url', this.value)">
                    <button onclick="openImageBrowser('${buildingId}', ${idx})" class="px-2 py-1 bg-gradient-to-r from-[#d4af37] to-[#e6c350] text-[#1a3a5c] rounded text-sm font-bold active:from-[#c49f2f] active:to-[#d49c2f] transition-colors duration-200" title="Browse server images">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button onclick="removeImageGallery('${buildingId}', ${idx})" class="px-2 py-1 bg-red-500/20 text-red-600 rounded text-sm font-bold active:bg-red-500/40 transition-colors duration-200">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <input type="text" placeholder="Image caption (optional)" value="${img.caption || ''}" 
                    class="w-full px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                    onchange="updateGalleryItem('${buildingId}', ${idx}, 'caption', this.value)"
                    placeholder="e.g., Main entrance, South wing...">
            </div>
        `).join('');
    }
}

function removeImageGallery(buildingId, index) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.galleries) return;
    
    building.galleries.splice(index, 1);
    
    // Refresh the gallery container directly
    const container = document.getElementById(`galleries-container-${buildingId}`);
    if (container) {
        container.innerHTML = (building.galleries || []).map((img, idx) => `
            <div class="gallery-item bg-white rounded-lg p-3 border border-[#d4af37]/40 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md" draggable="true" data-index="${idx}" ondragstart="handleGalleryDragStart(event, '${buildingId}', ${idx})" ondragover="handleGalleryDragOver(event)" ondrop="handleGalleryDrop(event, '${buildingId}', ${idx})" ondragend="handleGalleryDragEnd(event)">
                <div class="flex gap-2 mb-2 items-center">
                    <div class="text-[#d4af37] text-lg font-bold w-6 text-center" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <input type="text" placeholder="Image URL or path (e.g., /static/images/eco/1.jpg)" value="${img.url}" 
                        class="flex-1 px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                        onchange="updateGalleryItem('${buildingId}', ${idx}, 'url', this.value)">
                    <button onclick="openImageBrowser('${buildingId}', ${idx})" class="px-2 py-1 bg-gradient-to-r from-[#d4af37] to-[#e6c350] text-[#1a3a5c] rounded text-sm font-bold active:from-[#c49f2f] active:to-[#d49c2f] transition-colors duration-200" title="Browse server images">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button onclick="removeImageGallery('${buildingId}', ${idx})" class="px-2 py-1 bg-red-500/20 text-red-600 rounded text-sm font-bold active:bg-red-500/40 transition-colors duration-200">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <input type="text" placeholder="Image caption (optional)" value="${img.caption || ''}" 
                    class="w-full px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                    onchange="updateGalleryItem('${buildingId}', ${idx}, 'caption', this.value)"
                    placeholder="e.g., Main entrance, South wing...">
            </div>
        `).join('');
    }
}

function updateGalleryItem(buildingId, index, field, value) {
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.galleries || !building.galleries[index]) return;
    
    if (field === 'url') {
        building.galleries[index].url = value;
    } else if (field === 'caption') {
        building.galleries[index].caption = value;
    }
}

// Drag and drop functionality for gallery items
let draggedGalleryBuildingId = null;
let draggedGalleryIndex = null;

function handleGalleryDragStart(event, buildingId, index) {
    draggedGalleryBuildingId = buildingId;
    draggedGalleryIndex = index;
    event.target.closest('.gallery-item').style.opacity = '0.5';
    event.dataTransfer.effectAllowed = 'move';
}

function handleGalleryDragOver(event) {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
    const item = event.target.closest('.gallery-item');
    if (item) {
        item.style.borderTop = '3px solid #d4af37';
    }
}

function handleGalleryDrop(event, buildingId, targetIndex) {
    event.preventDefault();
    
    if (draggedGalleryBuildingId !== buildingId || draggedGalleryIndex === targetIndex) {
        return;
    }
    
    const building = buildings.find(b => b.id === buildingId);
    if (!building || !building.galleries) return;
    
    // Reorder galleries array
    const draggedGallery = building.galleries[draggedGalleryIndex];
    building.galleries.splice(draggedGalleryIndex, 1);
    building.galleries.splice(targetIndex, 0, draggedGallery);
    
    // Refresh container
    const container = document.getElementById(`galleries-container-${buildingId}`);
    if (container) {
        container.innerHTML = (building.galleries || []).map((img, idx) => `
            <div class="gallery-item bg-white rounded-lg p-3 border border-[#d4af37]/40 shadow-sm cursor-grab active:cursor-grabbing transition-all hover:shadow-md" draggable="true" data-index="${idx}" ondragstart="handleGalleryDragStart(event, '${buildingId}', ${idx})" ondragover="handleGalleryDragOver(event)" ondrop="handleGalleryDrop(event, '${buildingId}', ${idx})" ondragend="handleGalleryDragEnd(event)">
                <div class="flex gap-2 mb-2 items-center">
                    <div class="text-[#d4af37] text-lg font-bold w-6 text-center" title="Drag to reorder">
                        <i class="fas fa-grip-vertical"></i>
                    </div>
                    <input type="text" placeholder="Image URL or path (e.g., /static/images/eco/1.jpg)" value="${img.url}" 
                        class="flex-1 px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                        onchange="updateGalleryItem('${buildingId}', ${idx}, 'url', this.value)">
                    <button onclick="openImageBrowser('${buildingId}', ${idx})" class="px-2 py-1 bg-gradient-to-r from-[#d4af37] to-[#e6c350] text-[#1a3a5c] rounded text-sm font-bold active:from-[#c49f2f] active:to-[#d49c2f] transition-colors duration-200" title="Browse server images">
                        <i class="fas fa-folder-open"></i>
                    </button>
                    <button onclick="removeImageGallery('${buildingId}', ${idx})" class="px-2 py-1 bg-red-500/20 text-red-600 rounded text-sm font-bold active:bg-red-500/40 transition-colors duration-200">
                        <i class="fas fa-trash"></i>
                    </button>
                </div>
                <input type="text" placeholder="Image caption (optional)" value="${img.caption || ''}" 
                    class="w-full px-3 py-2 border border-[#d4af37]/30 rounded-lg text-sm bg-white text-[#2d3748] focus:ring-2 focus:ring-[#d4af37]/30 focus:border-[#d4af37]"
                    onchange="updateGalleryItem('${buildingId}', ${idx}, 'caption', this.value)"
                    placeholder="e.g., Main entrance, South wing...">
            </div>
        `).join('');
    }
}

function handleGalleryDragEnd(event) {
    const items = document.querySelectorAll('.gallery-item');
    items.forEach(item => {
        item.style.opacity = '1';
        item.style.borderTop = '';
    });
    draggedGalleryBuildingId = null;
    draggedGalleryIndex = null;
}

// Image browser functionality
let currentImageBrowserBuildingId = null;
let currentImageBrowserIndex = null;

async function openImageBrowser(buildingId, index) {
    currentImageBrowserBuildingId = buildingId;
    currentImageBrowserIndex = index;
    
    // Create modal if it doesn't exist
    let modal = document.getElementById('image-browser-modal');
    if (!modal) {
        modal = document.createElement('div');
        modal.id = 'image-browser-modal';
        modal.innerHTML = `
            <div class="fixed inset-0 z-50 bg-black/50 backdrop-blur-sm flex items-center justify-center" onclick="closeImageBrowser(event)">
                <div class="bg-white rounded-3xl shadow-2xl w-11/12 max-w-4xl max-h-[80vh] overflow-hidden flex flex-col" onclick="event.stopPropagation()">
                    <div class="bg-gradient-to-r from-[#1a3a5c] via-[#2d5a8c] to-[#1a3a5c] p-6 flex items-center justify-between">
                        <h2 class="text-2xl font-bold text-white flex items-center gap-3">
                            <i class="fas fa-image"></i>Select Image from Server
                        </h2>
                        <button onclick="closeImageBrowser()" class="w-10 h-10 bg-white/20 text-white rounded-full flex items-center justify-center hover:bg-white/30 transition-colors">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div id="image-browser-content" class="flex-1 overflow-y-auto p-6">
                        <div class="text-center py-8">
                            <i class="fas fa-spinner fa-spin text-4xl text-[#1a3a5c] mb-4"></i>
                            <p class="text-[#2d3748]">Loading images...</p>
                        </div>
                    </div>
                </div>
            </div>
        `;
        document.body.appendChild(modal);
    }
    
    // Load images
    try {
        const response = await axios.get('/api/images');
        const images = response.data.images || [];
        
        // Group images by folder
        const grouped = {};
        images.forEach(img => {
            if (!grouped[img.folder]) {
                grouped[img.folder] = [];
            }
            grouped[img.folder].push(img);
        });
        
        // Render grouped images
        let html = '';
        Object.keys(grouped).sort().forEach(folder => {
            html += `
                <div class="mb-8">
                    <h3 class="text-lg font-bold text-[#1a3a5c] mb-4 flex items-center gap-2">
                        <i class="fas fa-folder text-[#d4af37]"></i>
                        ${folder.charAt(0).toUpperCase() + folder.slice(1)}
                    </h3>
                    <div class="grid grid-cols-3 gap-4">
                        ${grouped[folder].map(img => `
                            <button onclick="selectImageFromBrowser('${img.path}', '${img.name}')" 
                                class="group relative overflow-hidden rounded-xl border-2 border-[#d4af37]/40 hover:border-[#d4af37] transition-all duration-300 shadow-md hover:shadow-lg">
                                <img src="${img.path}" alt="${img.name}" class="w-full h-32 object-cover group-hover:scale-110 transition-transform duration-300">
                                <div class="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-all duration-300 flex items-end">
                                    <p class="w-full bg-gradient-to-t from-black/80 to-transparent text-white text-xs font-semibold p-2 truncate">${img.name}</p>
                                </div>
                            </button>
                        `).join('')}
                    </div>
                </div>
            `;
        });
        
        if (html === '') {
            html = '<p class="text-center text-[#2d3748] py-8">No images found</p>';
        }
        
        document.getElementById('image-browser-content').innerHTML = html;
    } catch (error) {
        console.error('Error loading images:', error);
        document.getElementById('image-browser-content').innerHTML = `
            <div class="text-center py-8">
                <i class="fas fa-exclamation-circle text-4xl text-red-500 mb-4"></i>
                <p class="text-red-600">Error loading images: ${error.message}</p>
            </div>
        `;
    }
    
    modal.style.display = 'flex';
}

function closeImageBrowser(event) {
    if (event && event.target.id !== 'image-browser-modal') return;
    const modal = document.getElementById('image-browser-modal');
    if (modal) {
        modal.style.display = 'none';
    }
    currentImageBrowserBuildingId = null;
    currentImageBrowserIndex = null;
}

function selectImageFromBrowser(imagePath, imageName) {
    if (currentImageBrowserBuildingId && currentImageBrowserIndex !== null) {
        updateGalleryItem(currentImageBrowserBuildingId, currentImageBrowserIndex, 'url', imagePath);
        
        // Update the building data
        const building = buildings.find(b => b.id === currentImageBrowserBuildingId);
        if (building && building.galleries) {
            building.galleries[currentImageBrowserIndex].url = imagePath;
            
            // Update the input field in the DOM directly
            const container = document.getElementById(`galleries-container-${currentImageBrowserBuildingId}`);
            if (container) {
                const inputs = container.querySelectorAll('input[type="text"]');
                // Each gallery item has 2 inputs (url and caption), so multiply index by 2
                const urlInputIndex = currentImageBrowserIndex * 2;
                if (inputs[urlInputIndex]) {
                    inputs[urlInputIndex].value = imagePath;
                }
            }
            
            showNotification(`Image selected: ${imageName}`, 'success', 2000);
        }
    }
    closeImageBrowser();
}

// Expose functions globally for onclick handlers
window.toggleEditMode = toggleEditMode;
window.setShapeType = setShapeType;
window.deleteShape = deleteShape;
window.saveShapes = saveShapes;
window.toggleEditInfo = toggleEditInfo;
window.cancelInfoEdit = cancelInfoEdit;
window.saveInfoChanges = saveInfoChanges;
window.exportData = exportData;
window.importData = importData;
window.clearSavedData = clearSavedData;
window.restorePreviousData = restorePreviousData;
window.checkLocalStorage = checkLocalStorage;
window.closeInfoPanel = closeInfoPanel;
window.highlightBuilding = highlightBuilding;
window.selectBuildingAndOpenModal = selectBuildingAndOpenModal;
window.goToCarouselImage = goToCarouselImage;
window.nextCarouselImage = nextCarouselImage;
window.prevCarouselImage = prevCarouselImage;
window.addImageGallery = addImageGallery;
window.removeImageGallery = removeImageGallery;
window.updateGalleryItem = updateGalleryItem;
window.openImageBrowser = openImageBrowser;
window.closeImageBrowser = closeImageBrowser;
window.selectImageFromBrowser = selectImageFromBrowser;


// Initialize on page load
document.addEventListener('DOMContentLoaded', init);

console.log('App.js loaded - functions exposed:', {
    toggleEditMode: typeof window.toggleEditMode,
    saveShapes: typeof window.saveShapes,
    setShapeType: typeof window.setShapeType
});
