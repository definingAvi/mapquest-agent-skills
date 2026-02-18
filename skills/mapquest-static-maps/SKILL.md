---
name: mapquest-static-maps
description: Generating and embedding static map images using the MapQuest Static Map API v5. Covers URL construction, markers, shapes, map types, sizing, and when to use static vs. interactive maps.
---

# MapQuest Static Map Patterns

## Overview

The MapQuest Static Map API generates map images via a URL — no JavaScript SDK required. Base URL: `https://www.mapquestapi.com/staticmap/v5/map`

Ideal for emails, PDFs, thumbnails, server-side image generation, and any context where interactive maps are overkill.

---

## When to Use Static vs. Interactive Maps

| Use Case | Recommendation |
|---|---|
| Email / PDF | ✅ Static |
| Thumbnail preview | ✅ Static |
| Social share card | ✅ Static |
| High marker count, no interaction | ✅ Static |
| User panning / zooming | ❌ Use interactive (SDK) |
| Real-time data / live updates | ❌ Use interactive |
| User needs to click on map | ❌ Use interactive |

---

## URL Construction

```
https://www.mapquestapi.com/staticmap/v5/map?key=API_KEY&[parameters]
```

### Required Parameters

| Parameter | Description | Example |
|---|---|---|
| `key` | Your API key | `key=abc123` |
| `center` | Map center `lat,lng` or address | `center=39.7392,-104.9847` |
| `zoom` | Zoom level 1–20 | `zoom=13` |
| `size` | Image size `WxH` | `size=600,400` |

### Optional Parameters

| Parameter | Description | Example |
|---|---|---|
| `type` | Map style | `type=map` (see below) |
| `format` | Image format | `format=png` or `jpeg` |
| `scalebar` | Show scale bar | `scalebar=true` |
| `traffic` | Show traffic overlay | `traffic=flow,inc` |

---

## Map Types

```
type=map        # Standard road map (default)
type=sat        # Satellite imagery
type=hyb        # Hybrid (satellite + road labels)
type=light      # Light/minimal style
type=dark       # Dark style
```

---

## Adding Markers

Markers are added via the `locations` parameter. Format: `lat,lng|options`

```
# Single marker (default red pin)
locations=39.7392,-104.9847

# Marker with label
locations=39.7392,-104.9847|marker-md-red-{A}

# Marker with custom color
locations=39.7392,-104.9847|marker-md-blue

# Multiple markers (comma-separated)
locations=39.7392,-104.9847||40.0150,-105.2705
```

### Marker Size Options
- `marker-sm` — small
- `marker-md` — medium (default)
- `marker-lg` — large

### Marker Colors
`red`, `blue`, `green`, `yellow`, `orange`, `purple`, `black`, `white`

### Marker Labels (A–Z, 0–9)
`marker-md-red-{A}`, `marker-md-blue-{1}`

---

## Complete URL Examples

```js
const apiKey = process.env.MAPQUEST_API_KEY;

// Simple center + zoom
const simpleMap = `https://www.mapquestapi.com/staticmap/v5/map?key=${apiKey}&center=39.7392,-104.9847&zoom=12&size=600,400&type=map`;

// Multiple markers — fit map to markers automatically
const multiMarkerMap = `https://www.mapquestapi.com/staticmap/v5/map?key=${apiKey}&locations=39.7392,-104.9847||40.0150,-105.2705&size=600,400&type=map`;

// Route/directions visualization
const routeMap = `https://www.mapquestapi.com/staticmap/v5/map?key=${apiKey}&start=39.7392,-104.9847&end=40.0150,-105.2705&size=800,400&type=map`;
```

---

## Building Map URLs in JavaScript

```js
function buildStaticMapUrl({
  apiKey,
  center,       // 'lat,lng' string
  zoom = 13,
  width = 600,
  height = 400,
  type = 'map', // 'map', 'sat', 'hyb', 'light', 'dark'
  markers = [],  // array of {lat, lng, color?, label?, size?}
  format = 'png',
}) {
  const params = new URLSearchParams({
    key: apiKey,
    size: `${width},${height}`,
    type,
    format,
  });

  if (center) {
    params.set('center', center);
    params.set('zoom', zoom);
  }

  if (markers.length > 0) {
    const locationStrings = markers.map(m => {
      const color = m.color || 'red';
      const size = m.size || 'md';
      const label = m.label ? `-{${m.label}}` : '';
      const markerStr = `marker-${size}-${color}${label}`;
      return `${m.lat},${m.lng}|${markerStr}`;
    });
    params.set('locations', locationStrings.join('||'));
  }

  return `https://www.mapquestapi.com/staticmap/v5/map?${params}`;
}

// Usage:
const url = buildStaticMapUrl({
  apiKey: process.env.MAPQUEST_API_KEY,
  markers: [
    { lat: 39.7392, lng: -104.9847, color: 'red', label: 'A' },
    { lat: 40.0150, lng: -105.2705, color: 'blue', label: 'B' },
  ],
  width: 800,
  height: 500,
  type: 'map',
});
```

---

## Embedding in HTML

```html
<!-- Direct img tag -->
<img
  src="https://www.mapquestapi.com/staticmap/v5/map?key=API_KEY&center=39.7392,-104.9847&zoom=13&size=600,400"
  alt="Map of Denver, CO"
  width="600"
  height="400"
/>
```

```jsx
// React component
function StaticMap({ lat, lng, zoom = 13, width = 600, height = 400 }) {
  const apiKey = import.meta.env.VITE_MAPQUEST_API_KEY;
  const src = `https://www.mapquestapi.com/staticmap/v5/map?key=${apiKey}&center=${lat},${lng}&zoom=${zoom}&size=${width},${height}`;
  return <img src={src} alt="Map" width={width} height={height} />;
}
```

---

## Server-Side: Download and Cache the Image

For apps that need to cache maps or serve them through your backend:

```js
const https = require('https');
const fs = require('fs');

async function downloadStaticMap(url, filepath) {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(filepath);
    https.get(url, res => {
      res.pipe(file);
      file.on('finish', () => file.close(resolve));
    }).on('error', err => {
      fs.unlink(filepath, () => {});
      reject(err);
    });
  });
}
```

---

## Image Size Guidelines

| Use Case | Recommended Size |
|---|---|
| Email thumbnail | `300,200` |
| Card / preview | `400,300` |
| Full-width embed | `800,450` |
| Print / PDF | `1200,800` |

Max size: `3840x2400` pixels.

---

## Common Mistakes to Avoid

❌ **Don't** expose your API key in static map URLs on public-facing pages — anyone can see it in the `src` attribute. Use a server-side proxy or apply referrer restrictions in the MapQuest developer portal.

❌ **Don't** set image dimensions larger than necessary — larger images = slower load + more API usage.

❌ **Don't** use static maps when users need to interact with the map. Use the MapQuest JS SDK instead.

✅ **Do** set explicit `width` and `height` on the `<img>` tag to prevent layout shift (CLS).

✅ **Do** always provide a meaningful `alt` attribute for accessibility.

✅ **Do** cache static map URLs/images when possible — they're deterministic given the same parameters.
