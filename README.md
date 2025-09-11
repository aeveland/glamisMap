# Glamis Map

An interactive map of Glamis, California, featuring notable points of interest like China Wall, Vendor Row, and more. Built with Mapbox and hosted on GitHub Pages.

## 🌍 Live Map
**[View Live Map](https://aeveland.github.io/glamisMap/)**

## 🗺️ Features
- Interactive Mapbox map with custom points
- Satellite imagery by default
- Custom pin markers for locations
- Full keyboard navigation support
- Screen reader accessibility

## 🆕 What's New

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
├── index.html         # Main interactive map
├── script.js          # Map initialization and interaction logic
├── style.css          # Styles for the map and UI
├── LICENSE            # Legal restrictions and ownership info
├── README.md          # Project description and usage
├── data/
│   └── POI.gpx        # Waypoint data in GPX format
├── images/            # Marker icons and other assets
│   └── pin.png        # Waypoint pin image
├── popupImages/       # Directory for popup images
│   └── IMG_3058.jpeg  # Test image 1 China Wall
│   └── IMG_3065.jpeg  # Test image 2 China Wall
```

## 📦 Tools Used
- Mapbox GL JS
- [POI.gpx GPX file](data/POI.gpx)
- Vanilla JavaScript
- Shoelace UI Library

## ✅ To Do
- Add custom markers for individual locations
- Hover and click to reveal names of landmarks
- Optimized for web and mobile browsers
- Map tools
- Add search and filtering
- Upload edited GeoJSON back to server or cloud storage
- Image attachments for each landmark

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
