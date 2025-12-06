// Windows XP Portfolio JavaScript

// State management
let activeWindow = null;
let draggedWindow = null;
let dragOffset = { x: 0, y: 0 };
let zIndexCounter = 100;
let openWindows = [];

// Resize state
let resizingWindow = null;
let resizeDirection = '';
let resizeStart = { x: 0, y: 0, width: 0, height: 0, left: 0, top: 0 };

// Initialize on page load
document.addEventListener('DOMContentLoaded', function() {
    updateClock();
    setInterval(updateClock, 1000);
    
    // Add click listener to close start menu when clicking outside
    document.addEventListener('click', function(e) {
        const startMenu = document.getElementById('start-menu');
        const startButton = document.querySelector('.start-button');
        if (!startMenu.contains(e.target) && !startButton.contains(e.target)) {
            startMenu.style.display = 'none';
            startButton.classList.remove('active');
        }
    });
    
    // Add click listener to desktop to deselect icons
    document.querySelector('.desktop').addEventListener('click', function(e) {
        if (e.target === this || e.target === document.querySelector('.desktop-icons')) {
            // Don't deselect if we just finished a drag selection
            if (justFinishedSelecting) {
                justFinishedSelecting = false;
                return;
            }
            deselectAllIcons();
        }
    });
    
    // Make windows draggable and resizable
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    
    // Touch support for mobile
    document.addEventListener('touchmove', handleTouchMove, { passive: false });
    document.addEventListener('touchend', handleMouseUp);
    
    // Initialize resize handles
    initResizeHandles();
    
    // Initialize icon selection
    initIconSelection();
});

// Handle all mouse movement
function handleMouseMove(e) {
    if (draggedWindow) {
        drag(e);
    } else if (resizingWindow) {
        resizeWindow(e);
    }
}

// Handle touch movement
function handleTouchMove(e) {
    if (draggedWindow || resizingWindow) {
        e.preventDefault();
        const touch = e.touches[0];
        handleMouseMove({ clientX: touch.clientX, clientY: touch.clientY });
    }
}

// Handle mouse up for all drag operations
function handleMouseUp() {
    if (draggedWindow) {
        stopDrag();
    }
    if (resizingWindow) {
        stopResize();
    }
}

// Clock update
function updateClock() {
    const now = new Date();
    const hours = now.getHours();
    const minutes = now.getMinutes().toString().padStart(2, '0');
    const ampm = hours >= 12 ? 'PM' : 'AM';
    const displayHours = hours % 12 || 12;
    document.getElementById('clock').textContent = displayHours + ':' + minutes + ' ' + ampm;
}

// Start Menu toggle
function toggleStartMenu() {
    const startMenu = document.getElementById('start-menu');
    const startButton = document.querySelector('.start-button');
    
    if (startMenu.style.display === 'none' || startMenu.style.display === '') {
        startMenu.style.display = 'block';
        startButton.classList.add('active');
        // Hide the right panel when opening start menu
        hideAllPrograms();
    } else {
        startMenu.style.display = 'none';
        startButton.classList.remove('active');
        hideAllPrograms();
    }
}

// All Programs panel hover handling
let allProgramsTimeout = null;
let isHoveringRightPanel = false;

function showAllPrograms() {
    if (allProgramsTimeout) {
        clearTimeout(allProgramsTimeout);
        allProgramsTimeout = null;
    }
    const rightPanel = document.getElementById('start-menu-right');
    if (rightPanel) {
        rightPanel.classList.add('visible');
    }
}

function hideAllPrograms() {
    const rightPanel = document.getElementById('start-menu-right');
    if (rightPanel) {
        rightPanel.classList.remove('visible');
    }
    isHoveringRightPanel = false;
}

function handleAllProgramsLeave() {
    // Small delay to allow mouse to move to right panel
    allProgramsTimeout = setTimeout(() => {
        if (!isHoveringRightPanel) {
            hideAllPrograms();
        }
    }, 100);
}

function keepAllProgramsOpen() {
    isHoveringRightPanel = true;
    if (allProgramsTimeout) {
        clearTimeout(allProgramsTimeout);
        allProgramsTimeout = null;
    }
}

// Window management
function openWindow(windowId) {
    const windowEl = document.getElementById(windowId);
    if (windowEl) {
        windowEl.style.display = 'flex';
        bringToFront(windowEl);
        
        // Add to taskbar if not already there
        if (!openWindows.includes(windowId)) {
            openWindows.push(windowId);
            updateTaskbar();
        }
    }
}

function closeWindow(windowId) {
    const windowEl = document.getElementById(windowId);
    if (windowEl) {
        windowEl.style.display = 'none';
        windowEl.classList.remove('maximized');
        
        // Remove from taskbar
        openWindows = openWindows.filter(id => id !== windowId);
        updateTaskbar();
    }
}

function minimizeWindow(windowId) {
    const windowEl = document.getElementById(windowId);
    if (windowEl) {
        windowEl.style.display = 'none';
    }
}

function maximizeWindow(windowId) {
    const windowEl = document.getElementById(windowId);
    if (windowEl) {
        windowEl.classList.toggle('maximized');
    }
}

function bringToFront(windowEl) {
    document.querySelectorAll('.window').forEach(w => w.classList.remove('active'));
    windowEl.classList.add('active');
    windowEl.style.zIndex = ++zIndexCounter;
    activeWindow = windowEl;
    updateTaskbarActive(windowEl.id);
}

// Taskbar management
function updateTaskbar() {
    const taskbarPrograms = document.getElementById('taskbar-programs');
    taskbarPrograms.innerHTML = '';
    
    openWindows.forEach(windowId => {
        const windowEl = document.getElementById(windowId);
        if (windowEl) {
            const titleText = windowEl.querySelector('.title-bar-text').textContent;
            const programBtn = document.createElement('button');
            programBtn.className = 'taskbar-program';
            programBtn.textContent = titleText;
            programBtn.onclick = () => {
                if (windowEl.style.display === 'none') {
                    windowEl.style.display = 'flex';
                }
                bringToFront(windowEl);
            };
            
            if (activeWindow === windowEl) {
                programBtn.classList.add('active');
            }
            taskbarPrograms.appendChild(programBtn);
        }
    });
}

function updateTaskbarActive(windowId) {
    document.querySelectorAll('.taskbar-program').forEach((btn, index) => {
        if (openWindows[index] === windowId) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

// Window Dragging
function startDrag(event, windowId) {
    const windowEl = document.getElementById(windowId);
    if (windowEl && !windowEl.classList.contains('maximized')) {
        draggedWindow = windowEl;
        bringToFront(windowEl);
        
        const rect = windowEl.getBoundingClientRect();
        const clientX = event.clientX || (event.touches && event.touches[0].clientX);
        const clientY = event.clientY || (event.touches && event.touches[0].clientY);
        
        dragOffset.x = clientX - rect.left;
        dragOffset.y = clientY - rect.top;
    }
}

function drag(event) {
    if (draggedWindow) {
        const clientX = event.clientX;
        const clientY = event.clientY;
        
        let newX = clientX - dragOffset.x;
        let newY = clientY - dragOffset.y;
        
        const maxX = window.innerWidth - draggedWindow.offsetWidth;
        const maxY = window.innerHeight - 32 - draggedWindow.offsetHeight;
        
        newX = Math.max(0, Math.min(newX, maxX));
        newY = Math.max(0, Math.min(newY, maxY));
        
        draggedWindow.style.left = newX + 'px';
        draggedWindow.style.top = newY + 'px';
    }
}

function stopDrag() {
    draggedWindow = null;
}

// Window Resizing
function initResizeHandles() {
    document.querySelectorAll('.resize-handle').forEach(handle => {
        handle.addEventListener('mousedown', startResize);
        handle.addEventListener('touchstart', (e) => {
            const touch = e.touches[0];
            startResize({ 
                target: handle, 
                clientX: touch.clientX, 
                clientY: touch.clientY,
                preventDefault: () => e.preventDefault()
            });
        });
    });
}

function startResize(e) {
    e.preventDefault();
    const handle = e.target;
    const windowEl = handle.closest('.window');
    
    if (windowEl && !windowEl.classList.contains('maximized')) {
        resizingWindow = windowEl;
        bringToFront(windowEl);
        
        const classes = handle.className.split(' ');
        resizeDirection = classes.find(c => c.startsWith('resize-') && c !== 'resize-handle');
        if (resizeDirection) {
            resizeDirection = resizeDirection.replace('resize-', '');
        }
        
        const rect = windowEl.getBoundingClientRect();
        resizeStart = {
            x: e.clientX,
            y: e.clientY,
            width: rect.width,
            height: rect.height,
            left: windowEl.offsetLeft,
            top: windowEl.offsetTop
        };
    }
}

function resizeWindow(e) {
    if (!resizingWindow || !resizeDirection) return;
    
    const dx = e.clientX - resizeStart.x;
    const dy = e.clientY - resizeStart.y;
    
    const minWidth = 200;
    const minHeight = 150;
    
    let newWidth = resizeStart.width;
    let newHeight = resizeStart.height;
    let newLeft = resizeStart.left;
    let newTop = resizeStart.top;
    
    if (resizeDirection.includes('e')) {
        newWidth = Math.max(minWidth, resizeStart.width + dx);
    }
    if (resizeDirection.includes('w')) {
        const possibleWidth = resizeStart.width - dx;
        if (possibleWidth >= minWidth) {
            newWidth = possibleWidth;
            newLeft = resizeStart.left + dx;
        }
    }
    if (resizeDirection.includes('s')) {
        newHeight = Math.max(minHeight, resizeStart.height + dy);
    }
    if (resizeDirection.includes('n')) {
        const possibleHeight = resizeStart.height - dy;
        if (possibleHeight >= minHeight) {
            newHeight = possibleHeight;
            newTop = resizeStart.top + dy;
        }
    }
    
    resizingWindow.style.width = newWidth + 'px';
    resizingWindow.style.height = newHeight + 'px';
    resizingWindow.style.left = newLeft + 'px';
    resizingWindow.style.top = newTop + 'px';
}

function stopResize() {
    resizingWindow = null;
    resizeDirection = '';
}

// Icon Selection (no dragging)
function initIconSelection() {
    document.querySelectorAll('.icon').forEach(icon => {
        icon.addEventListener('click', function(e) {
            deselectAllIcons();
            this.classList.add('selected');
        });
    });
}

function deselectAllIcons() {
    document.querySelectorAll('.icon').forEach(icon => {
        icon.classList.remove('selected');
    });
}

// Iframe navigation
function navigateBack() {
    console.log('Back navigation');
}

function navigateForward() {
    console.log('Forward navigation');
}

function refreshIframe() {
    const iframe = document.getElementById('app-iframe');
    iframe.src = iframe.src;
}

function goHome() {
    const iframe = document.getElementById('app-iframe');
    iframe.src = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    document.getElementById('url-input').value = 'https://www.youtube.com';
}

function navigateToUrl() {
    const url = document.getElementById('url-input').value;
    const iframe = document.getElementById('app-iframe');
    
    let embedUrl = url;
    if (url.includes('youtube.com/watch')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        if (videoId) {
            embedUrl = 'https://www.youtube.com/embed/' + videoId;
        }
    } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) {
            embedUrl = 'https://www.youtube.com/embed/' + videoId;
        }
    }
    
    iframe.src = embedUrl;
}

function handleUrlEnter(event) {
    if (event.key === 'Enter') {
        navigateToUrl();
    }
}

// ==================== Internet Explorer Functions ====================
let ieCurrentView = 'home'; // 'home' or 'iframe'

function ieGoHome() {
    const landing = document.getElementById('ie-landing');
    const iframe = document.getElementById('ie-iframe');
    const urlInput = document.getElementById('ie-url-input');
    const titleEl = document.getElementById('ie-title');
    
    landing.style.display = 'flex';
    iframe.style.display = 'none';
    iframe.src = '';
    urlInput.value = 'https://www.google.com';
    titleEl.textContent = 'Google - Microsoft Internet Explorer';
    ieCurrentView = 'home';
    document.getElementById('ie-status').textContent = 'Done';
}

function ieGoBack() {
    if (ieCurrentView === 'iframe') {
        ieGoHome();
    }
}

function ieRefresh() {
    if (ieCurrentView === 'iframe') {
        const iframe = document.getElementById('ie-iframe');
        iframe.src = iframe.src;
    }
}

function ieNavigate() {
    const urlInput = document.getElementById('ie-url-input');
    const url = urlInput.value.trim();
    
    if (!url) return;
    
    // If it's a Google search URL or other searchable term
    if (!url.startsWith('http://') && !url.startsWith('https://')) {
        // Treat as search query
        iePerformSearchQuery(url);
        return;
    }
    
    // Check if it's YouTube (embeddable)
    if (url.includes('youtube.com') || url.includes('youtu.be')) {
        ieLoadYouTube(url);
        return;
    }
    
    // For most sites, open in new tab (due to iframe restrictions)
    window.open(url, '_blank');
}

function ieLoadYouTube(url) {
    const landing = document.getElementById('ie-landing');
    const iframe = document.getElementById('ie-iframe');
    const titleEl = document.getElementById('ie-title');
    
    let embedUrl = url;
    if (url.includes('youtube.com/watch')) {
        const videoId = url.split('v=')[1]?.split('&')[0];
        if (videoId) {
            embedUrl = 'https://www.youtube.com/embed/' + videoId;
        }
    } else if (url.includes('youtu.be/')) {
        const videoId = url.split('youtu.be/')[1]?.split('?')[0];
        if (videoId) {
            embedUrl = 'https://www.youtube.com/embed/' + videoId;
        }
    } else if (!url.includes('/embed/')) {
        // Default to embed format
        embedUrl = 'https://www.youtube.com/embed/dQw4w9WgXcQ';
    }
    
    landing.style.display = 'none';
    iframe.style.display = 'block';
    iframe.src = embedUrl;
    titleEl.textContent = 'YouTube - Microsoft Internet Explorer';
    ieCurrentView = 'iframe';
    document.getElementById('ie-status').textContent = 'Done';
}

function handleIEUrlEnter(event) {
    if (event.key === 'Enter') {
        ieNavigate();
    }
}

function handleIESearchEnter(event) {
    if (event.key === 'Enter') {
        iePerformSearch();
    }
}

function iePerformSearch() {
    const searchInput = document.getElementById('ie-search-input');
    const query = searchInput.value.trim();
    
    if (query) {
        iePerformSearchQuery(query);
    }
}

function iePerformSearchQuery(query) {
    const searchUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query);
    window.open(searchUrl, '_blank');
    document.getElementById('ie-status').textContent = 'Opening Google Search...';
}

function ieImFeelingLucky() {
    const searchInput = document.getElementById('ie-search-input');
    const query = searchInput.value.trim();
    
    if (query) {
        const luckyUrl = 'https://www.google.com/search?q=' + encodeURIComponent(query) + '&btnI=1';
        window.open(luckyUrl, '_blank');
    } else {
        // Random fun sites
        const funSites = [
            'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
            'https://github.com/sidc43',
            'https://www.linkedin.com/in/sidharth-chilakamarri-6656aa213/'
        ];
        const randomSite = funSites[Math.floor(Math.random() * funSites.length)];
        window.open(randomSite, '_blank');
    }
}

function ieSearchWeb(type) {
    const searchInput = document.getElementById('ie-search-input');
    const query = searchInput.value.trim() || '';
    
    let url;
    switch(type) {
        case 'images':
            url = 'https://www.google.com/search?tbm=isch&q=' + encodeURIComponent(query || 'wallpaper');
            break;
        case 'maps':
            url = 'https://www.google.com/maps';
            break;
        case 'news':
            url = 'https://news.google.com';
            break;
        default:
            url = 'https://www.google.com';
    }
    window.open(url, '_blank');
}

// Window click to bring to front
document.querySelectorAll('.window').forEach(windowEl => {
    windowEl.addEventListener('mousedown', function() {
        bringToFront(this);
    });
});

// Touch support for title bar dragging
document.querySelectorAll('.title-bar').forEach(titleBar => {
    titleBar.addEventListener('touchstart', function(e) {
        const windowId = this.parentElement.id;
        const touch = e.touches[0];
        startDrag({ clientX: touch.clientX, clientY: touch.clientY }, windowId);
    });
});

// Keyboard shortcuts
document.addEventListener('keydown', function(e) {
    if (e.key === 'Escape' && activeWindow) {
        closeWindow(activeWindow.id);
    }
});

// Calendar functionality
let currentCalendarDate = new Date();

function toggleCalendar() {
    const calendar = document.getElementById('calendar-popup');
    if (calendar.style.display === 'none' || calendar.style.display === '') {
        currentCalendarDate = new Date();
        renderCalendar();
        calendar.style.display = 'block';
    } else {
        calendar.style.display = 'none';
    }
}

function changeMonth(delta) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + delta);
    renderCalendar();
}

function renderCalendar() {
    const monthYear = document.getElementById('calendar-month-year');
    const grid = document.getElementById('calendar-grid');
    
    const months = ['January', 'February', 'March', 'April', 'May', 'June',
                    'July', 'August', 'September', 'October', 'November', 'December'];
    
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    monthYear.textContent = months[month] + ' ' + year;
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();
    
    const today = new Date();
    const isCurrentMonth = today.getFullYear() === year && today.getMonth() === month;
    
    grid.innerHTML = '';
    
    // Previous month days
    for (let i = firstDay - 1; i >= 0; i--) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = daysInPrevMonth - i;
        grid.appendChild(day);
    }
    
    // Current month days
    for (let i = 1; i <= daysInMonth; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day';
        if (isCurrentMonth && i === today.getDate()) {
            day.classList.add('today');
        }
        day.textContent = i;
        grid.appendChild(day);
    }
    
    // Next month days
    const totalCells = grid.children.length;
    const remaining = 42 - totalCells; // 6 rows x 7 days
    for (let i = 1; i <= remaining; i++) {
        const day = document.createElement('div');
        day.className = 'calendar-day other-month';
        day.textContent = i;
        grid.appendChild(day);
    }
}

// Close calendar when clicking outside
document.addEventListener('click', function(e) {
    const calendar = document.getElementById('calendar-popup');
    const clock = document.getElementById('clock');
    if (calendar && !calendar.contains(e.target) && e.target !== clock) {
        calendar.style.display = 'none';
    }
});

// Desktop Selection Box
let isSelecting = false;
let justFinishedSelecting = false;
let selectionStart = { x: 0, y: 0 };
let selectionBox = null;

document.addEventListener('DOMContentLoaded', function() {
    const desktop = document.querySelector('.desktop');
    const desktopIcons = document.querySelector('.desktop-icons');
    selectionBox = document.getElementById('selection-box');
    
    desktop.addEventListener('mousedown', startSelection);
    document.addEventListener('mousemove', updateSelection);
    document.addEventListener('mouseup', endSelection);
});

function startSelection(e) {
    // Only start selection on desktop background, not on icons or windows
    if (e.target.classList.contains('desktop') || e.target.classList.contains('desktop-icons')) {
        isSelecting = true;
        selectionStart = { x: e.clientX, y: e.clientY };
        
        selectionBox.style.left = e.clientX + 'px';
        selectionBox.style.top = e.clientY + 'px';
        selectionBox.style.width = '0px';
        selectionBox.style.height = '0px';
        selectionBox.style.display = 'block';
        
        deselectAllIcons();
    }
}

function updateSelection(e) {
    if (!isSelecting) return;
    
    const currentX = e.clientX;
    const currentY = e.clientY;
    
    const left = Math.min(selectionStart.x, currentX);
    const top = Math.min(selectionStart.y, currentY);
    const width = Math.abs(currentX - selectionStart.x);
    const height = Math.abs(currentY - selectionStart.y);
    
    selectionBox.style.left = left + 'px';
    selectionBox.style.top = top + 'px';
    selectionBox.style.width = width + 'px';
    selectionBox.style.height = height + 'px';
    
    // Check which icons are inside the selection box
    const boxRect = {
        left: left,
        top: top,
        right: left + width,
        bottom: top + height
    };
    
    document.querySelectorAll('.icon').forEach(icon => {
        const iconRect = icon.getBoundingClientRect();
        const isIntersecting = !(
            iconRect.right < boxRect.left ||
            iconRect.left > boxRect.right ||
            iconRect.bottom < boxRect.top ||
            iconRect.top > boxRect.bottom
        );
        
        if (isIntersecting) {
            icon.classList.add('selected');
        } else {
            icon.classList.remove('selected');
        }
    });
}

function endSelection() {
    if (isSelecting) {
        isSelecting = false;
        selectionBox.style.display = 'none';
        
        // Check if any icons are selected after the drag
        const selectedIcons = document.querySelectorAll('.icon.selected');
        if (selectedIcons.length > 0) {
            justFinishedSelecting = true;
        }
    }
}

// Context Menu
function initContextMenu() {
    const desktop = document.querySelector('.desktop');
    const contextMenu = document.getElementById('context-menu');
    
    // Right click on desktop
    desktop.addEventListener('contextmenu', function(e) {
        // Only show context menu if clicking on desktop background or desktop-icons container
        if (e.target === desktop || e.target.classList.contains('desktop-icons')) {
            e.preventDefault();
            showContextMenu(e.clientX, e.clientY);
        }
    });
    
    // Hide context menu on click anywhere
    document.addEventListener('click', function(e) {
        if (!contextMenu.contains(e.target)) {
            hideContextMenu();
        }
    });
    
    // Hide context menu on scroll
    document.addEventListener('scroll', hideContextMenu);
}

function showContextMenu(x, y) {
    const contextMenu = document.getElementById('context-menu');
    
    // Adjust position if menu would go off screen
    const menuWidth = 180;
    const menuHeight = 320;
    
    if (x + menuWidth > window.innerWidth) {
        x = window.innerWidth - menuWidth - 5;
    }
    if (y + menuHeight > window.innerHeight - 30) {
        y = window.innerHeight - menuHeight - 35;
    }
    
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
}

function hideContextMenu() {
    const contextMenu = document.getElementById('context-menu');
    if (contextMenu) {
        contextMenu.style.display = 'none';
    }
    const taskbarContextMenu = document.getElementById('taskbar-context-menu');
    if (taskbarContextMenu) {
        taskbarContextMenu.style.display = 'none';
    }
}

// Taskbar context menu
let taskbarContextWindowId = null;

function initTaskbarContextMenu() {
    const taskbarPrograms = document.getElementById('taskbar-programs');
    
    taskbarPrograms.addEventListener('contextmenu', function(e) {
        const programBtn = e.target.closest('.taskbar-program');
        if (programBtn) {
            e.preventDefault();
            const index = Array.from(taskbarPrograms.children).indexOf(programBtn);
            if (index >= 0 && openWindows[index]) {
                taskbarContextWindowId = openWindows[index];
                showTaskbarContextMenu(e.clientX, e.clientY);
            }
        }
    });
}

function showTaskbarContextMenu(x, y) {
    hideContextMenu();
    const contextMenu = document.getElementById('taskbar-context-menu');
    
    // Position above the taskbar
    const menuHeight = 100;
    y = window.innerHeight - 30 - menuHeight;
    
    if (x + 150 > window.innerWidth) {
        x = window.innerWidth - 155;
    }
    
    contextMenu.style.left = x + 'px';
    contextMenu.style.top = y + 'px';
    contextMenu.style.display = 'block';
}

function restoreTaskbarWindow() {
    if (taskbarContextWindowId) {
        const windowEl = document.getElementById(taskbarContextWindowId);
        if (windowEl) {
            windowEl.style.display = 'flex';
            windowEl.classList.remove('maximized');
            bringToFront(windowEl);
        }
    }
    hideContextMenu();
}

function minimizeTaskbarWindow() {
    if (taskbarContextWindowId) {
        minimizeWindow(taskbarContextWindowId);
    }
    hideContextMenu();
}

function maximizeTaskbarWindow() {
    if (taskbarContextWindowId) {
        const windowEl = document.getElementById(taskbarContextWindowId);
        if (windowEl) {
            windowEl.style.display = 'flex';
            windowEl.classList.add('maximized');
            bringToFront(windowEl);
        }
    }
    hideContextMenu();
}

function closeTaskbarWindow() {
    if (taskbarContextWindowId) {
        closeWindow(taskbarContextWindowId);
    }
    hideContextMenu();
}

// Initialize taskbar context menu on page load
document.addEventListener('DOMContentLoaded', function() {
    initTaskbarContextMenu();
});

function refreshDesktop() {
    hideContextMenu();
    // Simple refresh animation
    document.querySelector('.desktop').style.opacity = '0.8';
    setTimeout(() => {
        document.querySelector('.desktop').style.opacity = '1';
    }, 100);
}

function arrangeIconsByName() {
    hideContextMenu();
    // Icons are already in a fixed arrangement
}

// Initialize context menu on page load
document.addEventListener('DOMContentLoaded', function() {
    initContextMenu();
});

// Command Prompt functionality
let cmdCurrentPath = 'C:\\Users\\Sidharth\\Desktop';

// File system structure for navigation
// Desktop contains Documents folder, Documents has Resume and Projects
const fileSystem = {
    'C:\\': ['Users', 'Windows', 'Program Files'],
    'C:\\Users': ['Sidharth', 'Public'],
    'C:\\Users\\Sidharth': ['Documents', 'Desktop', 'Downloads'],
    'C:\\Users\\Sidharth\\Desktop': ['Documents', 'cmd.exe', 'Control Panel', 'Internet Explorer', 'Recycle Bin'],
    'C:\\Users\\Sidharth\\Desktop\\Documents': ['Projects', 'Resume.txt'],
    'C:\\Users\\Sidharth\\Desktop\\Documents\\Projects': ['OS', 'Storage Optimizer', 'Umbra_'],
    'C:\\Users\\Sidharth\\Documents': ['Projects', 'Resume.txt'],
    'C:\\Users\\Sidharth\\Documents\\Projects': ['OS', 'Storage Optimizer', 'Umbra_'],
    'C:\\Users\\Sidharth\\Downloads': []
};

// Available commands for autocomplete
const availableCommands = ['help', 'cls', 'dir', 'ls', 'cd', 'echo', 'about', 'skills', 'projects', 'github', 'linkedin', 'resume', 'exit'];

function updateCmdPrompt() {
    document.getElementById('cmd-prompt').textContent = cmdCurrentPath + '>';
}

// Tab autocomplete handler
function handleCmdKeydown(event) {
    if (event.key === 'Tab') {
        event.preventDefault();
        const input = document.getElementById('cmd-input');
        const value = input.value.trim();
        
        // Check if it's a cd command
        if (value.toLowerCase().startsWith('cd ')) {
            const partial = value.substring(3);
            const contents = fileSystem[cmdCurrentPath] || [];
            const dirs = contents.filter(item => !item.includes('.'));
            const matches = dirs.filter(dir => dir.toLowerCase().startsWith(partial.toLowerCase()));
            
            if (matches.length === 1) {
                input.value = 'cd ' + matches[0];
            } else if (matches.length > 1) {
                // Show possible completions
                const output = document.getElementById('cmd-output');
                const cmdLine = document.createElement('div');
                cmdLine.textContent = cmdCurrentPath + '>' + input.value;
                output.appendChild(cmdLine);
                const matchLine = document.createElement('div');
                matchLine.textContent = matches.join('  ');
                output.appendChild(matchLine);
                output.scrollTop = output.scrollHeight;
            }
        } else if (!value.includes(' ')) {
            // Autocomplete commands
            const matches = availableCommands.filter(cmd => cmd.startsWith(value.toLowerCase()));
            
            if (matches.length === 1) {
                input.value = matches[0];
            } else if (matches.length > 1 && value.length > 0) {
                // Show possible completions
                const output = document.getElementById('cmd-output');
                const cmdLine = document.createElement('div');
                cmdLine.textContent = cmdCurrentPath + '>' + input.value;
                output.appendChild(cmdLine);
                const matchLine = document.createElement('div');
                matchLine.textContent = matches.join('  ');
                output.appendChild(matchLine);
                output.scrollTop = output.scrollHeight;
            }
        }
    }
}

function handleCmdEnter(event) {
    if (event.key === 'Enter') {
        const input = document.getElementById('cmd-input');
        const output = document.getElementById('cmd-output');
        const command = input.value.trim();
        const cmdLower = command.toLowerCase();
        
        // Add the command to output
        const cmdLine = document.createElement('div');
        cmdLine.textContent = cmdCurrentPath + '>' + input.value;
        output.appendChild(cmdLine);
        
        // Process command
        const result = processCommand(cmdLower, command);
        if (result) {
            const resultLine = document.createElement('div');
            resultLine.innerHTML = result;
            output.appendChild(resultLine);
        }
        
        // Add blank line
        const blankLine = document.createElement('div');
        blankLine.innerHTML = '&nbsp;';
        output.appendChild(blankLine);
        
        // Clear input and scroll to bottom
        input.value = '';
        output.scrollTop = output.scrollHeight;
    }
}

function processCommand(cmd, originalCmd) {
    const commands = {
        'help': `Available commands:
  help      - Show this help message
  cls       - Clear the screen
  dir       - List directory contents
  ls        - List directory contents (alias)
  cd        - Change directory (cd &lt;folder&gt; or cd ..)
  echo      - Display a message
  about     - About me
  skills    - My technical skills
  projects  - View my projects
  github    - Open my GitHub
  linkedin  - Open my LinkedIn
  resume    - Open my resume
  exit      - Close command prompt`,
        'about': `  Name: Sidharth Chilakamarri
  Role: Computer Science Student
  Focus: Software Development, Operating Systems, Game Development`,
        'skills': `  Languages: Python, Java, C#, JavaScript, C, SQL
  Frameworks: Unity, Node.js, React
  Tools: Git, Linux, VS Code`,
        'projects': `  1. Operating System - Custom x86 kernel with memory management
  2. Storage Optimizer - Cross-platform backup solution
  3. 2D Game - Unity game with procedural generation
  Type 'resume' to view full details`,
        'cls': 'CLEAR',
        'exit': 'EXIT',
    };
    
    // Handle dir and ls commands
    if (cmd === 'dir' || cmd === 'ls') {
        return getDirListing();
    }
    
    // Handle cd command
    if (cmd === 'cd..' || cmd === 'cd ..') {
        return changeDirectoryUp();
    }
    
    if (cmd.startsWith('cd ')) {
        const targetDir = originalCmd.substring(3).trim();
        return changeDirectory(targetDir);
    }
    
    if (cmd === 'cd') {
        return cmdCurrentPath;
    }
    
    if (cmd === 'cls') {
        document.getElementById('cmd-output').innerHTML = '';
        return null;
    }
    
    if (cmd === 'exit') {
        closeWindow('cmd-window');
        return null;
    }
    
    if (cmd === 'github') {
        window.open('https://github.com/sidc43', '_blank');
        return 'Opening GitHub...';
    }
    
    if (cmd === 'linkedin') {
        window.open('https://www.linkedin.com/in/sidharth-chilakamarri-6656aa213/', '_blank');
        return 'Opening LinkedIn...';
    }
    
    if (cmd === 'resume') {
        openWindow('resume-window');
        return 'Opening resume...';
    }
    
    if (cmd.startsWith('echo ')) {
        return originalCmd.substring(5);
    }
    
    if (commands[cmd]) {
        return commands[cmd];
    }
    
    if (cmd === '') {
        return null;
    }
    
    return `'${originalCmd}' is not recognized as an internal or external command,
operable program or batch file.`;
}

function getDirListing() {
    const contents = fileSystem[cmdCurrentPath] || [];
    const date = '12/05/2024  10:00 AM';
    
    let output = `
 Volume in drive C has no label.
 Directory of ${cmdCurrentPath}

${date}    &lt;DIR&gt;          .
${date}    &lt;DIR&gt;          ..`;
    
    contents.forEach(item => {
        if (item.includes('.')) {
            // It's a file
            output += `\n${date}             2,048 ${item}`;
        } else {
            // It's a directory
            output += `\n${date}    &lt;DIR&gt;          ${item}`;
        }
    });
    
    const fileCount = contents.filter(i => i.includes('.')).length;
    const dirCount = contents.filter(i => !i.includes('.')).length + 2; // +2 for . and ..
    
    output += `\n               ${fileCount} File(s)          ${fileCount * 2048} bytes`;
    output += `\n               ${dirCount} Dir(s)   free space`;
    
    return output;
}

function changeDirectoryUp() {
    if (cmdCurrentPath === 'C:\\') {
        return 'Already at root directory';
    }
    
    const parts = cmdCurrentPath.split('\\');
    parts.pop();
    cmdCurrentPath = parts.length === 1 ? 'C:\\' : parts.join('\\');
    updateCmdPrompt();
    return null;
}

function changeDirectory(targetDir) {
    // Handle absolute paths
    if (targetDir.match(/^[A-Za-z]:\\/)) {
        if (fileSystem[targetDir] !== undefined) {
            cmdCurrentPath = targetDir;
            updateCmdPrompt();
            return null;
        }
        return `The system cannot find the path specified.`;
    }
    
    // Handle relative paths
    const contents = fileSystem[cmdCurrentPath] || [];
    const matchingDir = contents.find(item => 
        item.toLowerCase() === targetDir.toLowerCase() && !item.includes('.')
    );
    
    if (matchingDir) {
        const newPath = cmdCurrentPath === 'C:\\' 
            ? cmdCurrentPath + matchingDir 
            : cmdCurrentPath + '\\' + matchingDir;
        
        if (fileSystem[newPath] !== undefined) {
            cmdCurrentPath = newPath;
            updateCmdPrompt();
            return null;
        }
    }
    
    return `The system cannot find the path specified.`;
}

// Explorer Navigation State
let explorerCurrentPath = 'desktop'; // 'desktop', 'documents', or 'projects'

// Open Documents folder (from desktop icon)
function openDocumentsFolder() {
    openWindow('explorer-window');
    navigateToDocuments();
}

// Open Projects folder (from inside Documents)
function openProjectsFolder() {
    openWindow('explorer-window');
    navigateToProjects();
}

// Open File Explorer to Desktop (reset to default view)
function openExplorerToDocuments() {
    openWindow('explorer-window');
    // Always reset to Desktop when opening from File Explorer icon
    navigateToDesktop();
}

// Navigate to Desktop (root level)
function navigateToDesktop() {
    explorerCurrentPath = 'desktop';
    
    // Update address bar
    document.getElementById('explorer-address-path').textContent = 'C:\\Users\\Sidharth\\Desktop';
    document.getElementById('explorer-address-icon').src = 'https://win98icons.alexmeub.com/icons/png/desktop-2.png';
    
    // Update title bar
    document.querySelector('#explorer-window .title-bar-text').innerHTML = `
        <img src="https://win98icons.alexmeub.com/icons/png/desktop-2.png" alt="" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
        Desktop
    `;
    
    // Update taskbar
    updateTaskbar();
    
    // Update files
    document.getElementById('explorer-files').innerHTML = `
        <div class="explorer-file" ondblclick="navigateToDocuments()">
            <img src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png" alt="Documents">
            <span>Documents</span>
        </div>
        <div class="explorer-file" ondblclick="openWindow('cmd-window')">
            <img src="public/commandprompt.ico" alt="Command Prompt">
            <span>cmd.exe</span>
        </div>
        <div class="explorer-file" ondblclick="openWindow('control-panel-window')">
            <img src="public/controlpanel.ico" alt="Control Panel">
            <span>Control Panel</span>
        </div>
        <div class="explorer-file" ondblclick="openWindow('app-window')">
            <img src="public/internetexplorer.ico" alt="Internet Explorer">
            <span>Internet Explorer</span>
        </div>
        <div class="explorer-file">
            <img src="public/recyclebin.ico" alt="Recycle Bin">
            <span>Recycle Bin</span>
        </div>
    `;
    
    // Update status bar
    document.getElementById('explorer-status').textContent = '5 object(s)';
    
    // Update details
    document.getElementById('explorer-details').innerHTML = `
        <p><strong>Desktop</strong></p>
        <p>File Folder</p>
        <p>5 objects</p>
    `;
}

// Navigate to Documents folder
function navigateToDocuments() {
    explorerCurrentPath = 'documents';
    
    // Update address bar
    document.getElementById('explorer-address-path').textContent = 'C:\\Users\\Sidharth\\Desktop\\Documents';
    document.getElementById('explorer-address-icon').src = 'https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png';
    
    // Update title bar
    document.querySelector('#explorer-window .title-bar-text').innerHTML = `
        <img src="https://win98icons.alexmeub.com/icons/png/directory_open_file_mydocs-4.png" alt="" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
        Documents
    `;
    
    // Update taskbar
    updateTaskbar();
    
    // Update files
    document.getElementById('explorer-files').innerHTML = `
        <div class="explorer-file" ondblclick="navigateToProjects()">
            <img src="https://win98icons.alexmeub.com/icons/png/directory_closed-4.png" alt="Projects">
            <span>Projects</span>
        </div>
        <div class="explorer-file" ondblclick="openWindow('resume-window');">
            <img src="public/resume.ico" alt="Resume">
            <span>Resume.txt</span>
        </div>
    `;
    
    // Update status bar
    document.getElementById('explorer-status').textContent = '2 object(s)';
    
    // Update details
    document.getElementById('explorer-details').innerHTML = `
        <p><strong>Documents</strong></p>
        <p>File Folder</p>
        <p>2 objects</p>
    `;
}

// Navigate to Projects folder in explorer
function navigateToProjects() {
    explorerCurrentPath = 'projects';
    
    // Update address bar
    document.getElementById('explorer-address-path').textContent = 'C:\\Users\\Sidharth\\Desktop\\Documents\\Projects';
    document.getElementById('explorer-address-icon').src = 'https://win98icons.alexmeub.com/icons/png/directory_closed-4.png';
    
    // Update title bar
    document.querySelector('#explorer-window .title-bar-text').innerHTML = `
        <img src="https://win98icons.alexmeub.com/icons/png/directory_closed-4.png" alt="" style="width: 16px; height: 16px; vertical-align: middle; margin-right: 4px;">
        Projects
    `;
    
    // Update taskbar
    updateTaskbar();
    
    // Update files
    document.getElementById('explorer-files').innerHTML = `
        <div class="explorer-file" ondblclick="openWindow('os-window');">
            <img src="https://win98icons.alexmeub.com/icons/png/computer_explorer-5.png" alt="OS Project">
            <span>OS Project</span>
        </div>
        <div class="explorer-file" ondblclick="openWindow('storage-window');">
            <img src="https://win98icons.alexmeub.com/icons/png/hard_disk_drive-3.png" alt="Storage Optimizer">
            <span>Storage Optimizer</span>
        </div>
        <div class="explorer-file" ondblclick="openWindow('game-window');">
            <img src="https://win98icons.alexmeub.com/icons/png/joystick-2.png" alt="Umbra_">
            <span>Umbra_</span>
        </div>
    `;
    
    // Update status bar
    document.getElementById('explorer-status').textContent = '3 object(s)';
    
    // Update details
    document.getElementById('explorer-details').innerHTML = `
        <p><strong>Projects</strong></p>
        <p>File Folder</p>
        <p>3 objects</p>
    `;
}

// Navigate back (Projects -> Documents -> Desktop)
function navigateExplorerBack() {
    if (explorerCurrentPath === 'projects') {
        navigateToDocuments();
    } else if (explorerCurrentPath === 'documents') {
        navigateToDesktop();
    }
}

// Login Screen Functions
function showLoginScreen() {
    toggleStartMenu(); // Close the start menu
    document.getElementById('login-screen').style.display = 'flex';
    document.querySelector('.desktop').style.display = 'none';
    document.querySelector('.taskbar').style.display = 'none';
    
    // Hide any open windows
    document.querySelectorAll('.window').forEach(win => {
        win.style.visibility = 'hidden';
    });
}

function hideLoginScreen() {
    document.getElementById('login-screen').style.display = 'none';
    document.querySelector('.desktop').style.display = 'grid';
    document.querySelector('.taskbar').style.display = 'flex';
    
    // Restore window visibility
    document.querySelectorAll('.window').forEach(win => {
        win.style.visibility = 'visible';
    });
}

// Shutdown Screen Function
function showShutdownScreen() {
    toggleStartMenu(); // Close the start menu
    document.getElementById('shutdown-screen').style.display = 'flex';
    document.querySelector('.desktop').style.display = 'none';
    document.querySelector('.taskbar').style.display = 'none';
    
    // Hide any open windows
    document.querySelectorAll('.window').forEach(win => {
        win.style.visibility = 'hidden';
    });
    
    // After 2 seconds, try to close the tab or show login screen as fallback
    setTimeout(() => {
        window.close();
        // If window.close() doesn't work (blocked by browser), show login screen
        setTimeout(() => {
            document.getElementById('shutdown-screen').style.display = 'none';
            showLoginScreen();
        }, 500);
    }, 2000);
}

// Alias for backwards compatibility
function login() {
    hideLoginScreen();
}

// ============================================
// Control Panel Functionality
// ============================================

// Settings state]
let siteSettings = {
    darkMode: false,
    soundEnabled: true,
    soundVolume: 50,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
};

// Load settings from localStorage
function loadSettings() {
    const saved = localStorage.getItem('siteSettings');
    if (saved) {
        siteSettings = { ...siteSettings, ...JSON.parse(saved) };
        applySettings();
    }
}

// Save settings to localStorage
function saveSettings() {
    localStorage.setItem('siteSettings', JSON.stringify(siteSettings));
}

// Apply current settings
function applySettings() {
    // Apply dark mode
    if (siteSettings.darkMode) {
        document.body.classList.add('dark-mode');
    } else {
        document.body.classList.remove('dark-mode');
    }
    
    // Update clock with timezone
    updateClock();
}

// Initialize settings on load
document.addEventListener('DOMContentLoaded', loadSettings);

// Control Panel Navigation
let controlPanelView = 'home'; // 'home', 'appearance', 'sounds', 'datetime'

function showControlPanelHome() {
    controlPanelView = 'home';
    document.getElementById('control-panel-address').textContent = 'Control Panel';
    
    document.getElementById('control-panel-content').innerHTML = `
        <div class="control-panel-header">
            <h2>Pick a category</h2>
        </div>
        <div class="control-panel-categories" id="control-panel-categories">
            <div class="control-panel-category" onclick="openAppearanceSettings()">
                <img src="https://win98icons.alexmeub.com/icons/png/themes-4.png" alt="Appearance">
                <div class="category-text">
                    <span class="category-title">Appearance and Themes</span>
                    <span class="category-desc">Change the computer's theme, desktop background, or screen saver</span>
                </div>
            </div>
            <div class="control-panel-category" onclick="openSoundSettings()">
                <img src="https://win98icons.alexmeub.com/icons/png/loudspeaker_rays-0.png" alt="Sounds">
                <div class="category-text">
                    <span class="category-title">Sounds, Speech, and Audio Devices</span>
                    <span class="category-desc">Change the computer's sound scheme, or configure speaker settings</span>
                </div>
            </div>
            <div class="control-panel-category" onclick="openDateTimeSettings()">
                <img src="https://win98icons.alexmeub.com/icons/png/time_and_date-0.png" alt="Date Time">
                <div class="category-text">
                    <span class="category-title">Date, Time, Language, and Regional Options</span>
                    <span class="category-desc">Change date, time, timezone, or language settings</span>
                </div>
            </div>
        </div>
    `;
}

function openAppearanceSettings() {
    controlPanelView = 'appearance';
    document.getElementById('control-panel-address').textContent = 'Control Panel\\Appearance and Themes';
    
    document.getElementById('control-panel-content').innerHTML = `
        <div class="control-panel-settings">
            <div class="settings-header">
                <img src="https://win98icons.alexmeub.com/icons/png/themes-4.png" alt="Appearance" style="width: 48px; height: 48px;">
                <h2>Appearance and Themes</h2>
            </div>
            <div class="settings-section">
                <h3>Pick a task...</h3>
                <div class="settings-task" onclick="toggleDarkMode()">
                    <img src="https://win98icons.alexmeub.com/icons/png/display_properties-0.png" alt="" style="width: 32px; height: 32px;">
                    <span>${siteSettings.darkMode ? 'Disable Dark Mode' : 'Enable Dark Mode'}</span>
                </div>
            </div>
        </div>
    `;
}

function openSoundSettings() {
    controlPanelView = 'sounds';
    document.getElementById('control-panel-address').textContent = 'Control Panel\\Sounds and Audio Devices';
    
    document.getElementById('control-panel-content').innerHTML = `
        <div class="control-panel-settings">
            <div class="settings-header">
                <img src="https://win98icons.alexmeub.com/icons/png/loudspeaker_rays-0.png" alt="Sounds" style="width: 48px; height: 48px;">
                <h2>Sounds, Speech, and Audio Devices</h2>
            </div>
            <div class="settings-section">
                <h3>Pick a task...</h3>
                <div class="settings-task" onclick="toggleSound()">
                    <img src="https://win98icons.alexmeub.com/icons/png/loudspeaker_muted-0.png" alt="" style="width: 32px; height: 32px;">
                    <span>${siteSettings.soundEnabled ? 'Mute All Sounds' : 'Unmute All Sounds'}</span>
                </div>
            </div>
            <div class="settings-section">
                <div class="volume-mixer">
                    <div class="volume-mixer-label">Master Volume:</div>
                    <div class="volume-mixer-track">
                        <input type="range" id="volume-slider" class="xp-slider" min="0" max="100" value="${siteSettings.soundVolume}" oninput="updateVolume(this.value)" ${!siteSettings.soundEnabled ? 'disabled' : ''}>
                        <span id="volume-value" class="volume-percent">${siteSettings.soundVolume}%</span>
                    </div>
                    <label class="mute-checkbox">
                        <input type="checkbox" id="mute-toggle" ${!siteSettings.soundEnabled ? 'checked' : ''} onchange="toggleMute(this.checked)">
                        <span>Mute</span>
                    </label>
                </div>
            </div>
        </div>
    `;
}

function toggleMute(isMuted) {
    siteSettings.soundEnabled = !isMuted;
    saveSettings();
    
    const volumeSlider = document.getElementById('volume-slider');
    if (volumeSlider) {
        volumeSlider.disabled = isMuted;
    }
    
    // Update the task text
    const taskSpan = document.querySelector('.settings-task span');
    if (taskSpan) {
        taskSpan.textContent = siteSettings.soundEnabled ? 'Mute All Sounds' : 'Unmute All Sounds';
    }
}

function openDateTimeSettings() {
    controlPanelView = 'datetime';
    document.getElementById('control-panel-address').textContent = 'Control Panel\\Date and Time';
    
    const timezones = [
        'America/New_York',
        'America/Chicago',
        'America/Denver',
        'America/Los_Angeles',
        'America/Anchorage',
        'Pacific/Honolulu',
        'Europe/London',
        'Europe/Paris',
        'Europe/Berlin',
        'Asia/Tokyo',
        'Asia/Shanghai',
        'Asia/Kolkata',
        'Australia/Sydney',
        'UTC'
    ];
    
    const timezoneOptions = timezones.map(tz => 
        `<option value="${tz}" ${siteSettings.timezone === tz ? 'selected' : ''}>${tz.replace(/_/g, ' ')}</option>`
    ).join('');
    
    document.getElementById('control-panel-content').innerHTML = `
        <div class="control-panel-settings">
            <div class="settings-header">
                <img src="https://win98icons.alexmeub.com/icons/png/time_and_date-0.png" alt="Date Time" style="width: 48px; height: 48px;">
                <h2>Date, Time, Language, and Regional Options</h2>
            </div>
            <div class="settings-section">
                <h3>Pick a task...</h3>
                <div class="settings-task" onclick="document.getElementById('timezone-select').focus()">
                    <img src="https://win98icons.alexmeub.com/icons/png/world-0.png" alt="" style="width: 32px; height: 32px;">
                    <span>Change the time zone</span>
                </div>
            </div>
            <div class="settings-section">
                <div class="datetime-panel">
                    <div class="datetime-group">
                        <label class="datetime-label">Current Time:</label>
                        <div class="datetime-display" id="settings-current-time"></div>
                    </div>
                    <div class="datetime-group">
                        <label class="datetime-label">Time Zone:</label>
                        <select id="timezone-select" class="xp-select" onchange="updateTimezone(this.value)">
                            ${timezoneOptions}
                        </select>
                    </div>
                </div>
            </div>
        </div>
    `;
    
    // Start updating the time display
    updateSettingsTime();
    setInterval(updateSettingsTime, 1000);
}

function updateSettingsTime() {
    const timeDisplay = document.getElementById('settings-current-time');
    if (timeDisplay) {
        const now = new Date();
        const options = {
            timeZone: siteSettings.timezone,
            hour: '2-digit',
            minute: '2-digit',
            second: '2-digit',
            hour12: true,
            weekday: 'long',
            year: 'numeric',
            month: 'long',
            day: 'numeric'
        };
        timeDisplay.textContent = now.toLocaleString('en-US', options);
    }
}

function toggleDarkMode() {
    siteSettings.darkMode = !siteSettings.darkMode;
    applySettings();
    saveSettings();
    
    // Update the appearance settings panel if open
    if (controlPanelView === 'appearance') {
        openAppearanceSettings();
    }
}

function toggleSound() {
    siteSettings.soundEnabled = !siteSettings.soundEnabled;
    saveSettings();
    
    // Update the sound settings panel if open
    if (controlPanelView === 'sounds') {
        openSoundSettings();
    }
}

function updateVolume(value) {
    siteSettings.soundVolume = parseInt(value);
    saveSettings();
    
    const volumeValue = document.getElementById('volume-value');
    if (volumeValue) {
        volumeValue.textContent = value + '%';
    }
}

function updateTimezone(timezone) {
    siteSettings.timezone = timezone;
    saveSettings();
    updateClock();
    updateSettingsTime();
}

// Override updateClock to use timezone setting
const originalUpdateClock = updateClock;
updateClock = function() {
    const now = new Date();
    const options = {
        timeZone: siteSettings.timezone,
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
    };
    const timeStr = now.toLocaleString('en-US', options);
    document.getElementById('clock').textContent = timeStr;
};
