---
name: mapquest-traffic-data
description: Integrating real-time traffic data and incidents using the MapQuest Traffic API. Covers incident retrieval, severity codes, traffic flow overlays, and factoring traffic into routing.
---

# MapQuest Traffic Data Patterns

## Overview

MapQuest provides two traffic-related capabilities:
1. **Traffic API** — real-time incident and flow data
2. **Traffic-aware routing** — Directions API with `avoidTimedConditions: true`

Base URL for Traffic API: `https://www.mapquestapi.com/traffic/v2`

---

## Traffic Incidents

Retrieve incidents within a bounding box:

```js
async function getTrafficIncidents(bounds, apiKey) {
  // bounds: { north, south, east, west } in decimal degrees
  const bbox = `${bounds.north},${bounds.west},${bounds.south},${bounds.east}`;

  const response = await fetch(
    `https://www.mapquestapi.com/traffic/v2/incidents?key=${apiKey}&boundingBox=${bbox}&filters=construction,incidents,event,congestion`
  );
  const data = await response.json();
  return data.incidents || [];
}
```

### Incident Filters

| Filter | Description |
|---|---|
| `construction` | Road construction |
| `incidents` | Accidents, hazards |
| `event` | Special events |
| `congestion` | Heavy traffic |

---

## Incident Severity Codes

```js
const SEVERITY = {
  1: { label: 'Low', color: '#4caf50' },      // Minor slowdown
  2: { label: 'Moderate', color: '#ff9800' },  // Noticeable delay
  3: { label: 'Major', color: '#f44336' },     // Significant delay
  4: { label: 'Critical', color: '#9c27b0' },  // Severe, road may be closed
};

function getSeverityInfo(incident) {
  return SEVERITY[incident.severity] || { label: 'Unknown', color: '#9e9e9e' };
}
```

---

## Parsing Incident Data

```js
function parseIncident(incident) {
  return {
    id: incident.id,
    type: incident.type,                       // 'C' = construction, 'A' = accident, etc.
    severity: incident.severity,               // 1–4
    severityLabel: SEVERITY[incident.severity]?.label,
    shortDesc: incident.shortDesc,
    fullDesc: incident.fullDesc,
    startTime: incident.startTime,
    endTime: incident.endTime,
    lat: incident.lat,
    lng: incident.lng,
    isBlocking: incident.isBlocking,           // true if road is blocked
    impactedSegments: incident.tmcs || [],
  };
}
```

---

## Display Incidents on Map

```js
function displayTrafficIncidents(map, incidents) {
  const incidentLayer = L.layerGroup().addTo(map);

  incidents.forEach(raw => {
    const incident = parseIncident(raw);
    const severity = SEVERITY[incident.severity] || SEVERITY[1];

    const icon = L.circleMarker([incident.lat, incident.lng], {
      radius: 8,
      fillColor: severity.color,
      color: '#fff',
      weight: 2,
      opacity: 1,
      fillOpacity: 0.9,
    });

    icon.bindPopup(`
      <strong>${incident.type === 'C' ? '🚧 Construction' : '⚠️ Incident'}</strong>
      <br><em>Severity: ${severity.label}</em>
      <br>${incident.shortDesc}
      ${incident.isBlocking ? '<br><strong>⛔ Road blocked</strong>' : ''}
    `);

    incidentLayer.addLayer(icon);
  });

  return incidentLayer;
}
```

---

## Traffic Tile Overlay (Interactive Maps)

Add a live traffic flow overlay to a MapQuest map:

```js
// With MapQuest JS SDK
const trafficTileLayer = L.mapquest.trafficLayer().addTo(map);

// Toggle traffic on/off
let trafficVisible = false;

function toggleTraffic() {
  if (trafficVisible) {
    map.removeLayer(trafficTileLayer);
  } else {
    trafficTileLayer.addTo(map);
  }
  trafficVisible = !trafficVisible;
}
```

---

## Traffic Overlay on Static Maps

Add `traffic=flow,inc` to a static map URL to show traffic flow and incidents:

```js
const staticMapUrl = `https://www.mapquestapi.com/staticmap/v5/map?key=${apiKey}&center=39.7392,-104.9847&zoom=13&size=800,500&type=hyb&traffic=flow,inc`;
```

Options: `flow` (traffic flow colors), `inc` (incident markers), or `flow,inc` for both.

---

## Traffic-Aware Routing

Factor real-time traffic into route calculations:

```js
async function getTrafficAwareRoute(from, to, apiKey) {
  const response = await fetch(
    `https://www.mapquestapi.com/directions/v2/route?key=${apiKey}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        locations: [from, to],
        options: {
          routeType: 'fastest',
          avoidTimedConditions: true,   // Use real-time traffic data
          unit: 'm',
          narrativeType: 'text',
        }
      })
    }
  );
  const data = await response.json();
  return data.route;
}
```

**When to use `avoidTimedConditions: true`:**
- Delivery or logistics apps where ETA accuracy matters
- Navigation apps during peak hours
- Apps showing "current" travel times

**When to skip it:**
- Pre-planning trips (days in advance)
- When you need consistent/cacheable results
- Batch route calculations for many destinations

---

## Polling for Live Traffic

Traffic data changes. Refresh it periodically for live dashboards:

```js
class TrafficMonitor {
  constructor(map, apiKey, bounds, intervalMs = 120000) {
    this.map = map;
    this.apiKey = apiKey;
    this.bounds = bounds;
    this.intervalMs = intervalMs; // 2 min default — don't poll faster
    this.layer = null;
    this.timer = null;
  }

  async refresh() {
    const incidents = await getTrafficIncidents(this.bounds, this.apiKey);
    if (this.layer) this.map.removeLayer(this.layer);
    this.layer = displayTrafficIncidents(this.map, incidents);
  }

  start() {
    this.refresh();
    this.timer = setInterval(() => this.refresh(), this.intervalMs);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
  }
}
```

**Don't poll more frequently than every 60 seconds** — traffic data doesn't change faster than that, and excessive polling burns API quota.

---

## Common Mistakes to Avoid

❌ **Don't** request traffic incidents for a giant bounding box (e.g., entire country) — scope it to the visible map area.

❌ **Don't** poll the Traffic API on every map pan/zoom — update on `moveend` with a debounce of at least 1 second.

❌ **Don't** always use `avoidTimedConditions: true` for routes calculated in advance — traffic now isn't traffic tomorrow.

✅ **Do** update the traffic bounding box when the map moves:

```js
map.on('moveend', debounce(() => {
  const bounds = map.getBounds();
  getTrafficIncidents({
    north: bounds.getNorth(),
    south: bounds.getSouth(),
    east: bounds.getEast(),
    west: bounds.getWest(),
  }, apiKey).then(incidents => displayTrafficIncidents(map, incidents));
}, 1000));
```

✅ **Do** give users a toggle to show/hide traffic — not everyone wants it on by default.
