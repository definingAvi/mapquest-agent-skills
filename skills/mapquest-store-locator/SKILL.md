---
name: mapquest-store-locator
description: Building store locators and location finders using MapQuest APIs. Covers the full pattern from geocoding user input to displaying nearby locations, calculating distances, and routing to a selected destination.
---

# MapQuest Store Locator Patterns

## Overview

A store locator involves chaining multiple MapQuest APIs:
1. **Search Ahead** — autocomplete the user's location input
2. **Geocoding** — convert the input to coordinates
3. **Radius Search / Distance Calculation** — find nearby stores
4. **Static or Interactive Map** — display results
5. **Directions API** — route to selected store

---

## Full Architecture

```
User types address
  → Search Ahead (autocomplete suggestions)
    → User selects suggestion
      → Geocode to get coordinates
        → Calculate distances to all stores
          → Sort & filter results
            → Display on map + list
              → User clicks store
                → Get directions
```

---

## Step 1: Geocode User Input

```js
async function getUserLocation(address, apiKey) {
  const response = await fetch(
    `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&location=${encodeURIComponent(address)}&thumbMaps=false`
  );
  const data = await response.json();

  if (data.info.statuscode !== 0 || !data.results[0].locations.length) {
    throw new Error('Address not found. Please try again.');
  }

  const { lat, lng } = data.results[0].locations[0].latLng;
  const quality = data.results[0].locations[0].geocodeQuality;

  // Reject if quality is too low
  if (['COUNTRY', 'STATE'].includes(quality)) {
    throw new Error('Please enter a more specific address.');
  }

  return { lat, lng };
}
```

---

## Step 2: Haversine Distance Calculation

Calculate distance between two lat/lng points without an API call:

```js
function haversineDistance(lat1, lng1, lat2, lng2, unit = 'miles') {
  const R = unit === 'miles' ? 3958.8 : 6371; // Earth radius
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function toRad(deg) { return deg * (Math.PI / 180); }
```

---

## Step 3: Find and Sort Nearby Stores

```js
function findNearbyStores(userLat, userLng, stores, radiusMiles = 25, maxResults = 10) {
  return stores
    .map(store => ({
      ...store,
      distance: haversineDistance(userLat, userLng, store.lat, store.lng)
    }))
    .filter(store => store.distance <= radiusMiles)
    .sort((a, b) => a.distance - b.distance)
    .slice(0, maxResults);
}
```

---

## Step 4: Display on Map

```js
function displayStoreLocator(map, userLocation, stores) {
  // Clear existing layers
  markerLayer.clearLayers();

  // User location marker (distinct style)
  L.marker([userLocation.lat, userLocation.lng], {
    icon: L.icon({
      iconUrl: '/icons/user-location.png',
      iconSize: [24, 24],
      iconAnchor: [12, 12],
    })
  }).addTo(markerLayer).bindPopup('Your location');

  // Store markers
  stores.forEach((store, index) => {
    const marker = L.marker([store.lat, store.lng])
      .addTo(markerLayer)
      .bindPopup(`
        <strong>${store.name}</strong><br>
        ${store.address}<br>
        ${store.distance.toFixed(1)} miles away<br>
        <a href="#" onclick="getDirectionsTo(${store.lat}, ${store.lng})">Get Directions</a>
      `);

    // Sync with list: highlight marker when list item is hovered
    marker.on('click', () => highlightListItem(index));
  });

  // Fit map to show user + all stores
  const allPoints = [
    [userLocation.lat, userLocation.lng],
    ...stores.map(s => [s.lat, s.lng])
  ];
  map.fitBounds(L.latLngBounds(allPoints), { padding: [30, 30] });
}
```

---

## Step 5: Get Directions to Selected Store

```js
async function getDirectionsToStore(userLocation, store, apiKey) {
  const response = await fetch(
    `https://www.mapquestapi.com/directions/v2/route?key=${apiKey}&from=${userLocation.lat},${userLocation.lng}&to=${store.lat},${store.lng}&routeType=fastest&unit=m&narrativeType=text`
  );
  const data = await response.json();
  const route = data.route;

  // Draw route on map
  const shapePoints = route.shape.shapePoints;
  const latLngs = [];
  for (let i = 0; i < shapePoints.length; i += 2) {
    latLngs.push([shapePoints[i], shapePoints[i + 1]]);
  }

  routeLayer.clearLayers();
  L.polyline(latLngs, { color: '#1a73e8', weight: 4 }).addTo(routeLayer);

  // Show summary
  return {
    distance: `${route.distance.toFixed(1)} mi`,
    time: formatDuration(route.time),
    maneuvers: route.legs[0].maneuvers.map(m => m.narrative),
  };
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  return h > 0 ? `${h} hr ${m} min` : `${m} min`;
}
```

---

## Complete Store Locator Data Structure

```js
// Your store data format
const stores = [
  {
    id: 'store-001',
    name: 'Downtown Denver',
    address: '1234 Main St, Denver, CO 80202',
    lat: 39.7392,
    lng: -104.9847,
    phone: '(303) 555-0100',
    hours: 'Mon–Sat 9am–8pm, Sun 10am–6pm',
    categories: ['flagship', 'service-center'],
  },
  // ...
];
```

---

## Marker Count Decision Guide

| Number of Stores | Strategy |
|---|---|
| < 50 | Individual `L.marker()` calls |
| 50–500 | `L.markerClusterGroup()` from leaflet.markercluster |
| 500+ | Server-side clustering or tile-based approach |

---

## Search Radius UX Patterns

```js
// Auto-expand radius if too few results
async function findStoresWithFallback(userLoc, stores, apiKey) {
  const radii = [10, 25, 50, 100]; // miles

  for (const radius of radii) {
    const results = findNearbyStores(userLoc.lat, userLoc.lng, stores, radius);
    if (results.length >= 3) return { results, radius };
  }

  return { results: [], radius: null }; // No stores found
}
```

---

## Common Mistakes to Avoid

❌ **Don't** call the Directions API to calculate distance to 50 stores — use Haversine distance instead. Only call Directions for the selected destination.

❌ **Don't** geocode on every keystroke of the location input — use Search Ahead for autocomplete, then geocode only on submission.

❌ **Don't** zoom too close after fitting bounds when there's only one result — set a max zoom:
```js
map.fitBounds(bounds, { padding: [30, 30], maxZoom: 14 });
```

✅ **Do** handle the zero-results state gracefully: suggest expanding the search radius.

✅ **Do** show the distance in the store list, sorted ascending.

✅ **Do** sync the map and list — clicking a list item should open that marker's popup, and clicking a marker should highlight the list item.
