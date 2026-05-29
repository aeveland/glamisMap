# Glamis Map

An interactive map of Glamis, California, featuring notable points of interest like China Wall, Vendor Row, and more. Built with Mapbox and hosted on GitHub Pages.

## 🌍 Live Map
**[View Live Map](https://aeveland.github.io/glamisMap/)**

## 🆕 What's New
### May 29, 2026 — Major update
A large round of new features, reliability fixes, and an automated test suite.

#### 📱 Mobile experience (Apple Maps-style)
- New **persistent bottom panel** with the search field pinned at the top — loads at half height, expands to full height when the search field is tapped, and reduces to mid height when a location is selected.
- **Location card** in the panel: symbol icon (matching the map marker), name, side-by-side **Directions** (labeled with live distance) and **Share** buttons, image carousel, and collapsible Lat/Lng (with copy), Elevation, and Description. Includes a close button.

#### 🔎 Search
- Search locations by name; each result shows its **icon, name, and distance** from your current location (nearest first, updating live as you move).
- Selecting a result flies to the point and opens its card (mobile) or its popover on the map (desktop).

#### 🖥️ Desktop
- Persistent **left-hand search panel** that can't be closed or resized. Selecting a result opens that location's popover on the map.

#### 🧭 Navigation & location
- **"Blue dot"** live location (Mapbox GeolocateControl) driven by a custom glass button: tap to center & follow, tap again for device-heading/compass mode.
- **Directions** to any point: a dashed straight-line route (works offline and reaches off-road dune points), an Apple-style banner with live distance + heading, a frame-then-follow camera with a Recenter button, and arrival detection.

#### 🗺️ Map
- **Clustering** of nearby points — tap a cluster to zoom in and expand it.
- **Collapsible map tools** — one button collapses the whole control stack to save screen space.
- Basemap selector now opens to the side so it no longer overlaps the other controls.

#### 📥 Offline & installable (PWA)
- The app is now an **installable PWA** (web manifest + app icons, standalone display).
- A **service worker** precaches the app shell, point data, and symbols, and runtime-caches the map tiles/photos you view so previously-seen areas work offline.
- A **"Download for offline"** button warms map imagery for the Glamis area at the current basemap (opt-in for ~37 MB of location photos), with a storage estimate, a **"Last downloaded {date}"** status, and a Clear option.
- An **Install app** entry in the download modal: one-tap install on Android/Chromium, or Add-to-Home-Screen instructions on iOS (hidden once installed).
- An offline indicator and a "you've left the downloaded area" notice.

#### 🛠️ Reliability & fixes
- Fixed custom pin symbols disappearing after switching basemaps (icons are reloaded on every style change).
- Removed duplicate map event handlers that accumulated on each basemap switch.
- Escaped all point text rendered in popups/cards (prevents broken layout and injection).
- Defined the missing `--text-primary` color variable, added a clipboard fallback for non-secure contexts, and added `lang` + a meta description.
- Added an automated static **test suite** (`tests/validate.mjs`, run with `node tests/validate.mjs`) covering data/asset integrity, HTML escaping, and the wiring for every feature above (123 checks).

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
├── script.js                   # Map, search, navigation, offline & UI logic
├── admin.js                    # Admin interface functionality
├── style.css                   # Styles for the map and UI
├── sw.js                       # Service worker (offline caching)
├── manifest.webmanifest        # PWA manifest (installable app)
├── LICENSE                     # Legal restrictions and ownership info
├── README.md                   # Project description and usage
├── data/
│   └── glamis_tileset.geojson  # Point data in GeoJSON format
├── images/                     # Marker icons and other assets
│   ├── default.png             # Default pin image
│   ├── selected.png            # Selected pin image
│   └── <sym>.png / <sym>Selected.png  # Per-symbol marker icons
├── icons/                      # PWA app icons (192/512/maskable + apple-touch)
├── popupImages/                # Photos shown in location popups/cards
├── tests/
│   └── validate.mjs            # Static test suite (run: node tests/validate.mjs)
└── js/
    ├── map.js                  # (legacy/unused) earlier clustering helpers
    └── ui.js                   # (legacy/unused) earlier UI helpers
```

## Admin Workflow
1. Visit [admin.html](admin.html) 
2. Load your local `glamis_tileset.geojson` file
3. Edit points using the map and forms
4. Download the updated GeoJSON
5. Replace the POI-8oc448 on [console.mapbox.com/studio/tilesets](https://console.mapbox.com/studio/tilesets)

## 📦 Tools Used
- Mapbox GL JS (incl. GeolocateControl for live location)
- [POI.gpx GPX file](data/POI.gpx)
- Vanilla JavaScript
- Progressive Web App: service worker + web manifest (offline + installable)
- Node.js for the static test suite (`node tests/validate.mjs`)
- Material Icons

## ✅ To Do
- Upload edited GeoJSON back to server or cloud storage
- (Optional) Self-hosted public-domain (NAIP) satellite tiles for fully-sanctioned offline imagery
- (Optional) Switch the service worker to network-first for HTML/JS/CSS so updates appear without a hard reload

## 🧪 Testing

### Automated
Run the static test suite (data/asset integrity, HTML escaping, and feature wiring):
```
node tests/validate.mjs
```

### Manual checklist

### Core Features
- [ ] **Point Display**: All location pins appear correctly on the map
- [ ] **Point Interaction**: Clicking on points shows detailed popup information
- [ ] **Popup Content**: Popups display name, coordinates, elevation, and description
- [ ] **Copy Coordinates**: Copy-to-clipboard functionality works for coordinates
- [ ] **Image Display**: Location images (if available) display correctly in popups
- [ ] **Map Controls**: Compass, basemap switcher, and other controls function properly
- [ ] **Mobile Responsive**: Map and panel work well on mobile devices
- [ ] **Keyboard Navigation**: All interactive elements accessible via keyboard
- [ ] **Screen Reader**: Proper ARIA labels and announcements for accessibility

### Today's Features
- [ ] **Search**: Filtering by name shows icon, name, and live distance; tapping a result opens the location
- [ ] **Persistent Panel**: Mobile panel half → full (search) → mid (location); desktop left panel always visible
- [ ] **Clustering**: Nearby points cluster; tapping a cluster zooms in to expand
- [ ] **Location**: Blue dot centers/follows; second tap enables compass heading
- [ ] **Directions**: Route line + live distance/heading; Recenter; arrival
- [ ] **Clustering survives basemap switch**: Pins/clusters reappear after changing basemaps
- [ ] **Offline**: Download for offline, "Last downloaded" status, offline indicator, app loads offline
- [ ] **Install**: Android one-tap install / iOS Add-to-Home-Screen; entry hidden once installed

## 🚀 Hosting
This site is hosted via GitHub Pages. You can fork it and publish your own version easily.
