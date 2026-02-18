---
name: mapquest-directions-routing
description: Turn-by-turn directions, multi-stop routing, and route optimization using the MapQuest Directions API. Covers route types, narrative maneuvers, response parsing, and common pitfalls.
---

# MapQuest Directions & Routing Patterns

## Overview

The MapQuest Directions API provides turn-by-turn directions between two or more locations. Base URL: `https://www.mapquestapi.com/directions/v2`

---

## Route Types

Choose the right `routeType` for the use case:

| routeType | Description | Use When |
|---|---|---|
| `fastest` | Minimize travel time (default) | Standard driving |
| `shortest` | Minimize distance | Fuel efficiency priority |
| `pedestrian` | Walking paths | Walking directions |
| `bicycle` | Bike-friendly routes | Cycling apps |
| `multimodal` | Mix of transit + walking | Urban transit apps |

---

## Basic Directions Request

```js
async function getDirections(from, to, apiKey, options = {}) {
  const params = new URLSearchParams({
    key: apiKey,
    from,
    to,
    routeType: options.routeType || 'fastest',
    unit: options.unit || 'm',         // 'm' = miles, 'k' = kilometers
    narrativeType: 'text',             // 'text', 'microformat', 'none'
    enhancedNarrative: false,
    avoidTimedConditions: false,
  });

  const response = await fetch(
    `https://www.mapquestapi.com/directions/v2/route?${params}`
  );
  const data = await response.json();

  if (data.info.statuscode !== 0) {
    throw new Error(`Directions error: ${data.info.messages.join(', ')}`);
  }

  return data.route;
}
```

---

## Multi-Stop Routing

For routes with 3+ stops, use the `from`/`to` + multiple `to` parameters, or POST with a locations array:

```js
async function getMultiStopRoute(locations, apiKey) {
  // locations: array of address strings or {lat, lng} objects
  const response = await fetch(
    `https://www.mapquestapi.com/directions/v2/route?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: locations,
        options: {
          routeType: 'fastest',
          unit: 'm',
          narrativeType: 'text',
          avoids: [],               // e.g. ['Toll Road', 'Ferry', 'Unpaved']
          doReverseGeocode: false,  // Skip reverse geocoding stops (faster)
        }
      })
    }
  );

  const data = await response.json();
  return data.route;
}

// Example with lat/lng objects (avoid geocoding overhead)
const stops = [
  { latLng: { lat: 34.0522, lng: -118.2437 } },  // Los Angeles
  { latLng: { lat: 36.1699, lng: -115.1398 } },  // Las Vegas
  { latLng: { lat: 33.4484, lng: -112.0740 } },  // Phoenix
];
```

---

## Parsing the Route Response

```js
function parseRoute(route) {
  return {
    // Overall trip summary
    distance: route.distance,          // in chosen unit (miles or km)
    time: route.time,                  // seconds
    formattedTime: route.formattedTime, // 'h:mm:ss'

    // Route shape (encoded polyline)
    shape: route.shape?.shapePoints,   // flat array [lat, lng, lat, lng, ...]

    // Per-leg details (one leg per stop-to-stop segment)
    legs: route.legs.map(leg => ({
      distance: leg.distance,
      time: leg.time,
      maneuvers: leg.maneuvers.map(m => ({
        narrative: m.narrative,        // Human-readable instruction
        distance: m.distance,
        time: m.time,
        turnType: m.turnType,          // 0=straight, 1=slight right, etc.
        startPoint: m.startPoint,      // {lat, lng}
        signs: m.signs,                // Road signs
        iconUrl: m.iconUrl,
      }))
    })),

    // Bounding box for fitting map view
    boundingBox: route.boundingBox,    // {ul: {lat,lng}, lr: {lat,lng}}

    // Status
    hasTollRoad: route.hasTollRoad,
    hasHighway: route.hasHighway,
    hasFerry: route.hasFerry,
  };
}
```

---

## Route Avoidances

```js
const avoidOptions = [
  'Toll Road',
  'Limited Access',
  'Ferry',
  'Unpaved',
  'Seasonal Closure',
  'Country Border Crossing',
];

// In request options:
options: {
  avoids: ['Toll Road', 'Ferry']
}
```

---

## Optimized Route (Traveling Salesman)

For store locators or delivery apps needing to reorder stops optimally:

```js
async function getOptimizedRoute(locations, apiKey) {
  const response = await fetch(
    `https://www.mapquestapi.com/directions/v2/optimizedroute?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations,
        options: { routeType: 'fastest', unit: 'm' }
      })
    }
  );
  const data = await response.json();
  // data.route.locationSequence shows optimized stop order
  return data;
}
```

---

## Decoding the Shape Polyline

The route shape comes as a flat array of alternating lat/lng values:

```js
function shapeToLatLngs(shapePoints) {
  const latLngs = [];
  for (let i = 0; i < shapePoints.length; i += 2) {
    latLngs.push([shapePoints[i], shapePoints[i + 1]]);
  }
  return latLngs;
}

// Draw on Leaflet/MapQuest JS:
const latLngs = shapeToLatLngs(route.shape.shapePoints);
L.polyline(latLngs, { color: '#1a73e8', weight: 4 }).addTo(map);
```

---

## Displaying Formatted Distance & Time

```js
function formatDistance(miles) {
  if (miles < 0.1) return `${Math.round(miles * 5280)} ft`;
  return `${miles.toFixed(1)} mi`;
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  if (h === 0) return `${m} min`;
  return `${h} hr ${m} min`;
}
```

---

## Turn Type Icons

MapQuest returns numeric `turnType` codes. Map them to icons/labels:

```js
const TURN_TYPES = {
  0: 'Straight',
  1: 'Slight Right', 2: 'Right', 3: 'Sharp Right',
  4: 'Reverse', 5: 'Sharp Left', 6: 'Left', 7: 'Slight Left',
  8: 'Right U-Turn', 9: 'Left U-Turn',
  11: 'Becomes', 12: 'Merge', 13: 'Fork Keep Right', 14: 'Fork Keep Left',
  15: 'First Exit', 16: 'Second Exit', 17: 'Third Exit',
  18: 'Exit Right', 19: 'Exit Left',
  20: 'Right Ramp', 21: 'Left Ramp',
  22: 'Right on Ramp', 23: 'Left on Ramp',
  24: 'Take Ferry',
  27: 'Roundabout 1st Exit', 28: 'Roundabout 2nd Exit', 29: 'Roundabout 3rd Exit',
};
```

---

## Common Mistakes to Avoid

❌ **Don't** send raw address strings with unencoded special characters. Always `encodeURIComponent()`.

❌ **Don't** use `pedestrian` routes for long distances (API may return an error or empty result).

❌ **Don't** ignore `statuscode`. Possible values:
- `0` = Success
- `402` = Invalid key
- `403` = Forbidden (key disabled)
- `500` = Route not found

❌ **Don't** request narrative for apps that only need the shape/distance — set `narrativeType: 'none'` for faster responses.

✅ **Do** use lat/lng objects instead of address strings when you already have coordinates — avoids extra geocoding cost.

✅ **Do** cache direction results for common origin/destination pairs.

✅ **Do** fit the map to `route.boundingBox` after rendering so the full route is visible.
