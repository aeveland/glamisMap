# Glamis Map

An interactive map of Glamis, California, featuring notable points of interest like China Wall, Vendor Row, and more. Built with Mapbox and hosted on GitHub Pages.

## 🌍 Live Map
**[View Live Map](https://aeveland.github.io/glamisMap/)**

## 🆕 What's New
### September 12, 2025
- Created custom symbols for each location.
 
### September 11, 2025
- Interactive Mapbox map with custom points
- Satellite imagery by default
- Custom pin markers for locations
- Full keyboard navigation support
- Screen reader accessibility
- **Admin Interface**: Complete GeoJSON editor for managing map points

## 🔧 Admin Interface
**[Access Admin Panel](admin.html)**
The admin interface provides a comprehensive tool for editing map data:
- **Visual Editor**: Click-to-add points directly on the satellite map
- **Form-Based Editing**: Edit point names, descriptions, and images
- **Local File Support**: Load and edit your GeoJSON files locally
- **Mapbox Integration**: Direct workflow for updating tilesets
- **No Authentication**: Streamlined for GitHub Pages hosting


### September 7, 2025
- Implemented smooth popup animations with slide-up effects on mobile and fade transitions on desktop  
- Added comprehensive dark mode toggle with persistent localStorage preferences  
- Enhanced visual depth with improved shadows and glass-morphism styling throughout the interface  
- Integrated Material Design Icons for better visual hierarchy (place, terrain, info icons)  
- Added interactive copy-to-clipboard functionality for coordinates with visual feedback  
- Streamlined UI by removing search functionality and moving dark mode toggle to map controls  
- Fixed popup content styling consistency across all sections for uniform appearance  
- Enhanced mobile responsiveness with improved touch interactions and popup positioning
- Built complete admin interface with secure login, interactive map editor, crosshair point placement, coordinate input validation, and comprehensive point management tools  

### August 6, 2025
- Implemented Apple's liquid glass effect for a modern, blurred background UI feel  
- Styled popups to display titles and descriptions more cleanly  
- Confirmed GitHub-hosted images work for popup displays  
- Replaced dummy elevation data with actual elevation values for all GPX points  
- Added updated default location symbol  
- Added map labels for each location  

### August 4, 2025
- Replaced old GPX data with updated descriptions  

### August 3, 2025
- Created custom popup cards using Shoelace UI  


## 📁 Project Structure
```
glamisMap/
├── index.html                  # Main interactive map
├── admin.html                  # Admin interface for editing points
├── script.js                   # Map initialization and interaction logic
├── admin.js                    # Admin interface functionality
├── style.css                   # Styles for the map and UI
├── LICENSE                     # Legal restrictions and ownership info
├── README.md                   # Project description and usage
├── data/
│   └── glamis_tileset.geojson  # Point data in GeoJSON format
├── images/                     # Marker icons and other assets
│   ├── default.png             # Default pin image
│   ├── selected.png            # Selected pin image
│   └── store.png               # Camping symbol icon
│   └── storeSelected.png       # Camping symbol icon selected
├── popupImages/                # Directory for popup images
│   ├── IMG_3058.jpeg           # Test image 1 China Wall
│   └── IMG_3065.jpeg           # Test image 2 China Wall
└── js/
    ├── map.js                  # Map functionality
    └── ui.js                   # UI components
```

## Admin Workflow
1. Visit [admin.html](admin.html) 
2. Load your local `glamis_tileset.geojson` file
3. Edit points using the map and forms
4. Download the updated GeoJSON
5. Replace the POI-8oc448 on [console.mapbox.com/studio/tilesets](https://console.mapbox.com/studio/tilesets)

## 📦 Tools Used
- Mapbox GL JS
- [POI.gpx GPX file](data/POI.gpx)
- Vanilla JavaScript
- Shoelace UI Library

## ✅ To Do
- Add custom markers for individual locations
- Fix Map zoom extent
- Make the popup more opaque
- Upload edited GeoJSON back to server or cloud storage

## 🧪 Testing Checklist

### Core Features
- [ ] **Point Display**: All location pins appear correctly on the map
- [ ] **Point Interaction**: Clicking on points shows detailed popup information
- [ ] **Popup Content**: Popups display name, coordinates, elevation, and description
- [ ] **Copy Coordinates**: Copy-to-clipboard functionality works for coordinates
- [ ] **Image Display**: Location images (if available) display correctly in popups
- [ ] **Map Controls**: Compass, basemap switcher, and other controls function properly
- [ ] **Mobile Responsive**: Map and popups work well on mobile devices
- [ ] **Keyboard Navigation**: All interactive elements accessible via keyboard
- [ ] **Screen Reader**: Proper ARIA labels and announcements for accessibility

## 🚀 Hosting
This site is hosted via GitHub Pages. You can fork it and publish your own version easily.
