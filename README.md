# Glamis Map

An interactive map of Glamis, California, featuring notable points of interest like China Wall, Vendor Row, and more. Built with Mapbox and hosted on GitHub Pages.

## 🌍 Live Map
**[View Live Map](https://aeveland.github.io/glamisMap/)**

## 🗺️ Features
- Interactive Mapbox map
- Satellite imagery by default

## 🆕 What's New
September 7, 2025 — Implemented smooth popup animations with slide-up effects on mobile and fade transitions on desktop
September 7, 2025 — Added comprehensive dark mode toggle with persistent localStorage preferences
September 7, 2025 — Enhanced visual depth with improved shadows and glass-morphism styling throughout the interface
September 7, 2025 — Integrated Material Design Icons for better visual hierarchy (place, terrain, info icons)
September 7, 2025 — Added interactive copy-to-clipboard functionality for coordinates with visual feedback
September 7, 2025 — Streamlined UI by removing search functionality and moving dark mode toggle to map controls
September 7, 2025 — Fixed popup content styling consistency across all sections for uniform appearance
September 7, 2025 — Enhanced mobile responsiveness with improved touch interactions and popup positioning
August 6, 2025 — Implemented Apple's liquid glass effect for a modern, blurred background UI feel
August 6, 2025 — Styled popups to display titles and descriptions more cleanly
August 6, 2025 — Confirmed GitHub-hosted images work for popup displays
August 6, 2025 — Replaced dummy elevation data with actual elevation values for all GPX points
August 6, 2025 — Added updated default location symbol
August 6, 2025 — Added map labels for each location
August 4, 2025 — Replaced old GPX data with updated descriptions
August 3, 2025 — Created custom popup cards using Shoelace UI


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

## 🚀 Hosting
This site is hosted via GitHub Pages. You can fork it and publish your own version easily.
