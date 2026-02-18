---
name: mapquest-web-integration
description: Integrating the MapQuest JavaScript SDK (Leaflet-based) into web applications. Covers SDK loading, map initialization, tile layers, markers, popups, event handling, React and Vue patterns, and cleanup.
---

# MapQuest Web Integration Patterns

## Overview

The MapQuest JS SDK wraps Leaflet with MapQuest tile layers and services. Load via CDN:

```html
<link rel="stylesheet" href="https://api.mqcdn.com/sdk/mapquest-js/v1.3.2/mapquest.css" />
<script src="https://api.mqcdn.com/sdk/mapquest-js/v1.3.2/mapquest.js"></script>
```

**Alternative:** Use the Leaflet library directly with MapQuest tile URLs (gives you more control).

---

## Basic Map Setup

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="https://api.mqcdn.com/sdk/mapquest-js/v1.3.2/mapquest.css" />
  <style>
    #map { height: 500px; width: 100%; }
  </style>
</head>
<body>
  <div id="map"></div>
  <script src="https://api.mqcdn.com/sdk/mapquest-js/v1.3.2/mapquest.js"></script>
  <script>
    L.mapquest.key = 'YOUR_API_KEY';

    const map = L.mapquest.map('map', {
      center: [39.7392, -104.9847],  // lat, lng
      layers: L.mapquest.tileLayer('map'),
      zoom: 12,
    });

    // Add default controls
    map.addControl(L.mapquest.control());
  </script>
</body>
</html>
```

---

## Tile Layer Types

```js
L.mapquest.tileLayer('map')       // Standard road map
L.mapquest.tileLayer('sat')       // Satellite
L.mapquest.tileLayer('hyb')       // Hybrid (satellite + labels)
L.mapquest.tileLayer('light')     // Light/minimal
L.mapquest.tileLayer('dark')      // Dark
```

Switch tile layers dynamically:

```js
let currentLayer = L.mapquest.tileLayer('map').addTo(map);

function switchToSatellite() {
  map.removeLayer(currentLayer);
  currentLayer = L.mapquest.tileLayer('sat').addTo(map);
}
```

---

## Markers

```js
// Simple marker
L.marker([39.7392, -104.9847]).addTo(map);

// Marker with popup
L.marker([39.7392, -104.9847])
  .addTo(map)
  .bindPopup('<strong>Denver, CO</strong><br>Mile High City')
  .openPopup();

// Custom icon
const customIcon = L.icon({
  iconUrl: '/icons/store-pin.png',
  iconSize: [32, 32],
  iconAnchor: [16, 32],  // Point of the icon that corresponds to marker location
  popupAnchor: [0, -32], // Where popup opens relative to iconAnchor
});

L.marker([39.7392, -104.9847], { icon: customIcon }).addTo(map);
```

### Marker Clusters (for 50+ markers)

Use the Leaflet.markercluster plugin:

```html
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.css" />
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/MarkerCluster.Default.css" />
<script src="https://cdnjs.cloudflare.com/ajax/libs/leaflet.markercluster/1.5.3/leaflet.markercluster.js"></script>
```

```js
const markers = L.markerClusterGroup();

locations.forEach(loc => {
  const marker = L.marker([loc.lat, loc.lng]).bindPopup(loc.name);
  markers.addLayer(marker);
});

map.addLayer(markers);
```

**Marker thresholds:**
- **< 50 markers**: Individual `L.marker()` calls are fine
- **50–500 markers**: Use `markerClusterGroup()`
- **500+ markers**: Consider server-side clustering or GeoJSON with tile rendering

---

## Drawing Shapes

```js
// Polyline (route)
L.polyline([[39.7392, -104.9847], [40.0150, -105.2705]], {
  color: '#1a73e8',
  weight: 4,
  opacity: 0.8
}).addTo(map);

// Polygon
L.polygon([
  [39.7392, -104.9847],
  [39.7500, -104.9700],
  [39.7300, -104.9700],
], {
  color: '#e53935',
  fillColor: '#ef9a9a',
  fillOpacity: 0.4
}).addTo(map);

// Circle (radius in meters)
L.circle([39.7392, -104.9847], {
  radius: 1000,  // 1km
  color: '#1565c0',
  fillOpacity: 0.2
}).addTo(map);
```

---

## Event Handling

```js
// Map click
map.on('click', (e) => {
  const { lat, lng } = e.latlng;
  console.log(`Clicked at ${lat}, ${lng}`);
});

// Map move/zoom (throttle for performance)
let moveTimer;
map.on('moveend', () => {
  clearTimeout(moveTimer);
  moveTimer = setTimeout(() => {
    const center = map.getCenter();
    const zoom = map.getZoom();
    const bounds = map.getBounds();
    loadMarkersInBounds(bounds);
  }, 200);
});

// Marker click
const marker = L.marker([39.7392, -104.9847]).addTo(map);
marker.on('click', (e) => {
  console.log('Marker clicked');
});
```

---

## React Integration

```jsx
import { useEffect, useRef } from 'react';

function MapQuestMap({ center, zoom = 13, markers = [] }) {
  const mapRef = useRef(null);
  const mapInstanceRef = useRef(null);

  useEffect(() => {
    // Initialize only once
    if (mapInstanceRef.current) return;

    // Set API key (load from env, never hardcode)
    window.L.mapquest.key = import.meta.env.VITE_MAPQUEST_API_KEY;

    mapInstanceRef.current = window.L.mapquest.map(mapRef.current, {
      center,
      layers: window.L.mapquest.tileLayer('map'),
      zoom,
    });

    // Cleanup on unmount
    return () => {
      if (mapInstanceRef.current) {
        mapInstanceRef.current.remove();
        mapInstanceRef.current = null;
      }
    };
  }, []); // Empty deps — initialize once

  // Update center when prop changes
  useEffect(() => {
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setView(center, zoom);
    }
  }, [center, zoom]);

  // Add/update markers when prop changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    // Clear old markers and re-add
    // (For production, use a layer group and manage it properly)
    markers.forEach(m => {
      window.L.marker([m.lat, m.lng])
        .addTo(mapInstanceRef.current)
        .bindPopup(m.label || '');
    });
  }, [markers]);

  return <div ref={mapRef} style={{ height: '500px', width: '100%' }} />;
}
```

**Critical React rules:**
- Always initialize map in `useEffect` — never in the render function
- Always return a cleanup function that calls `map.remove()`
- Use `useRef` for the map instance — not `useState`
- The map container `<div>` must have explicit height/width — it won't render otherwise

---

## Vue Integration

```vue
<template>
  <div ref="mapContainer" style="height: 500px; width: 100%"></div>
</template>

<script setup>
import { ref, onMounted, onUnmounted } from 'vue';

const mapContainer = ref(null);
let map = null;

onMounted(() => {
  window.L.mapquest.key = import.meta.env.VITE_MAPQUEST_API_KEY;

  map = window.L.mapquest.map(mapContainer.value, {
    center: [39.7392, -104.9847],
    layers: window.L.mapquest.tileLayer('map'),
    zoom: 12,
  });
});

onUnmounted(() => {
  if (map) {
    map.remove();
    map = null;
  }
});
</script>
```

---

## Fit Map to Bounds

Always fit the map to show all markers after adding them:

```js
const group = L.featureGroup(markerArray);
map.fitBounds(group.getBounds(), { padding: [20, 20] });
```

---

## Common Mistakes to Avoid

❌ **Don't** set the map container height in CSS `%` without a parent having a fixed height — the map will render as 0px.

❌ **Don't** initialize the map before the container DOM element is ready.

❌ **Don't** forget `map.remove()` on cleanup — memory leaks in SPA routing.

❌ **Don't** call `map.invalidateSize()` unnecessarily — only needed if the container's size changes after initialization (e.g., from display:none to visible).

✅ **Do** call `map.invalidateSize()` if the map was hidden and then shown:
```js
// After showing a hidden map container:
map.invalidateSize();
```

✅ **Do** use layer groups to manage sets of markers so you can clear and re-add efficiently:
```js
const markerLayer = L.layerGroup().addTo(map);
// Clear all markers:
markerLayer.clearLayers();
// Add new ones:
markerLayer.addLayer(L.marker([lat, lng]));
```
