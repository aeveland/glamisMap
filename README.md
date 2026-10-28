# Glamis Map

An interactive map of the Imperial Sand Dunes (Glamis, California) for Glamis.com. It shows 79 notable spots in the dunes, from China Wall and Vendor Row to campgrounds, landmarks, and points of interest, each with its own icon, photos, elevation, and a short description.

**Live map:** <https://aeveland.github.io/glamisMap/>

## What visitors can do

- **Browse and search locations.** Every location is listed by name. On a computer the list sits in a side panel that can be shown or hidden with the tab on its edge. On a phone it's a bottom panel that can be swiped up and down.
- **Open a location.** Tapping a pin or a list item shows its photos, elevation, and description.
- **See where they are.** The location button shows the visitor's position as a blue dot. A second tap turns on compass heading.
- **Get directions.** The **Directions** button draws a straight line from the visitor to the location, with live distance and heading. It uses a straight line rather than roads, so it can reach spots out in the dunes.
- **Share a location.** The **Share** button sends a map link to the spot.

The map uses satellite imagery and always stays flat (top-down). Visitors can zoom and rotate it but can't tilt it.

## Putting it on Glamis.com

There are two ways to do this.

### Option A: Embed it (simplest)

Paste this into the Glamis.com page where the map should appear:

```html
<iframe
  src="https://aeveland.github.io/glamisMap/"
  title="Glamis Map"
  style="width:100%; height:80vh; border:0;"
  allow="geolocation"
  loading="lazy">
</iframe>
```

- `allow="geolocation"` is required. Without it, the location button and Directions won't work inside the embed.
- Give the map plenty of height (80vh or more). Below 768px wide it switches to the phone layout.
- Updates to this repository show up on Glamis.com automatically, so nothing needs to be re-embedded.

### Option B: Host the files on Glamis.com

Copy these files and folders to a folder on the Glamis.com web server:

```text
index.html  script.js  style.css  sw.js  manifest.webmanifest  privacy.html
data/glamis_tileset.geojson
images/  icons/  popupImages/
```

- The site must be served over **HTTPS**, or browsers will block the location features.
- The map tiles come from **Mapbox** using an access token near the top of `script.js`. That token belongs to Andy's Mapbox account. If the token is restricted to certain websites, glamis.com has to be added to its allowed URLs. Glamis.com can also create its own free Mapbox account and replace the token.
- Future updates mean copying the changed files to the server again.

## Updating locations

All locations live in one file: `data/glamis_tileset.geojson`. Each location is a block like this:

```json
{
  "type": "Feature",
  "id": "america-canal-ohv-bridge",
  "geometry": { "type": "Point", "coordinates": [-114.8694, 32.7499] },
  "properties": {
    "name": "America Canal OHV Bridge",
    "desc": "A key crossing point over the American Canal...",
    "sym": "flyover",
    "images": "popupImages/photo1.jpeg, popupImages/photo2.jpeg"
  }
}
```

- **coordinates** are **longitude first, then latitude**, which is the reverse of how Google Maps shows them.
- **sym** chooses the icon. It must match a pair of files in `images/`: `<sym>.png` for the normal icon and `<sym>Selected.png` for the highlighted one.
- **images** is an optional list of photos, separated by commas, stored in `popupImages/`.
- Elevation is filled in automatically from terrain data.
- To **remove** a location, delete its whole block, including the comma that separates it from its neighbour.

To check the file for mistakes before publishing, run this from the project folder. It needs [Node.js](https://nodejs.org):

```text
node tests/validate.mjs
```

It reports broken data, missing icons, and similar problems.

## Files

```text
index.html                  The map page
script.js                   Map behaviour (pins, search, panels, directions)
style.css                   Look and layout
data/glamis_tileset.geojson All locations
images/                     Location icons
popupImages/                Location photos
icons/                      App icon
privacy.html                Privacy policy
tests/validate.mjs          Checks the data and code for problems
```

## Ownership

© Glamis Guide. All rights reserved. See [LICENSE](LICENSE). For questions about the map, contact Andy Eveland.
