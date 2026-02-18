---
name: mapquest-geocoding-patterns
description: Address-to-coordinate and coordinate-to-address conversion using the MapQuest Geocoding API. Covers forward geocoding, reverse geocoding, batch geocoding, quality codes, and response parsing.
---

# MapQuest Geocoding Patterns

## Overview

The MapQuest Geocoding API converts between addresses and geographic coordinates. Base URL: `https://www.mapquestapi.com/geocoding/v1`

Always append `?key=YOUR_API_KEY` to every request. Never hardcode the key — use environment variables (`MAPQUEST_API_KEY` or `VITE_MAPQUEST_API_KEY` for Vite projects).

---

## Geocoding Modes

### 1. Forward Geocoding (Address → Lat/Lng)

**Endpoint:** `GET /geocoding/v1/address`

```js
const response = await fetch(
  `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&location=${encodeURIComponent(address)}`
);
const data = await response.json();
const { lat, lng } = data.results[0].locations[0].latLng;
```

**Always check `geocodeQuality` before trusting the result:**

| Quality Code | Meaning | Trust Level |
|---|---|---|
| `POINT` | Rooftop/parcel level | ✅ High |
| `ADDRESS` | Interpolated street address | ✅ High |
| `INTERSECTION` | Street intersection | ✅ Medium |
| `STREET` | Street-level match | ⚠️ Medium |
| `ZIP` | ZIP code centroid | ⚠️ Low |
| `CITY` | City centroid | ❌ Low |
| `COUNTY` | County centroid | ❌ Low |
| `STATE` | State centroid | ❌ Low |
| `COUNTRY` | Country centroid | ❌ Very Low |

```js
// Always validate quality before using coords
const location = data.results[0].locations[0];
const ACCEPTABLE_QUALITY = ['POINT', 'ADDRESS', 'INTERSECTION', 'STREET'];

if (!ACCEPTABLE_QUALITY.includes(location.geocodeQuality)) {
  // Prompt user to refine their address
  showAddressRefinementPrompt();
  return;
}
```

### 2. Reverse Geocoding (Lat/Lng → Address)

**Endpoint:** `GET /geocoding/v1/reverse`

```js
const response = await fetch(
  `https://www.mapquestapi.com/geocoding/v1/reverse?key=${apiKey}&location=${lat},${lng}`
);
const data = await response.json();
const address = data.results[0].locations[0];
// address.street, address.adminArea5 (city), address.adminArea3 (state), address.postalCode
```

### 3. Batch Geocoding (Multiple Addresses)

**Endpoint:** `POST /geocoding/v1/batch`

Use batch geocoding when converting 2–100 addresses. More efficient than individual requests.

```js
const response = await fetch(
  `https://www.mapquestapi.com/geocoding/v1/batch?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      locations: [
        '1600 Pennsylvania Ave NW, Washington, DC',
        'Times Square, New York, NY',
        'Golden Gate Bridge, San Francisco, CA'
      ],
      options: { thumbMaps: false } // Set false unless you need thumbnail map images
    })
  }
);
const data = await response.json();
// data.results is an array matching input order
```

**Batch limits:** Max 100 locations per request. For larger sets, chunk the array.

```js
function chunk(arr, size) {
  return Array.from({ length: Math.ceil(arr.length / size) }, (_, i) =>
    arr.slice(i * size, i * size + size)
  );
}

async function batchGeocode(addresses) {
  const chunks = chunk(addresses, 100);
  const results = [];
  for (const batch of chunks) {
    const res = await geocodeBatch(batch);
    results.push(...res.results);
    // Add delay between batches to avoid rate limits
    await new Promise(r => setTimeout(r, 200));
  }
  return results;
}
```

---

## Request Options

```js
{
  options: {
    thumbMaps: false,        // Skip thumbnail images (saves bandwidth, faster response)
    maxResults: 1,           // Limit ambiguous address matches (default: 1)
    ignoreLatLngInput: true, // Always geocode even if lat/lng supplied in location
    boundingBox: {           // Bias results to a bounding box
      ul: { lat: 40.9, lng: -74.3 },
      lr: { lat: 40.4, lng: -73.6 }
    }
  }
}
```

---

## Response Parsing

```js
// Safe response parser with fallbacks
function parseGeocodingResult(data) {
  if (!data?.results?.[0]?.locations?.[0]) {
    return null;
  }
  const loc = data.results[0].locations[0];
  return {
    lat: loc.latLng.lat,
    lng: loc.latLng.lng,
    quality: loc.geocodeQuality,
    qualityCode: loc.geocodeQualityCode,
    street: loc.street,
    city: loc.adminArea5,
    county: loc.adminArea4,
    state: loc.adminArea3,
    country: loc.adminArea1,
    zip: loc.postalCode,
    formatted: [loc.street, loc.adminArea5, loc.adminArea3, loc.postalCode]
      .filter(Boolean)
      .join(', ')
  };
}
```

---

## Common Mistakes to Avoid

❌ **Don't** use coordinates from a CITY or ZIP quality result for precise operations like routing or distance calculations — the coords are just the centroid.

❌ **Don't** geocode on every keystroke. Debounce or wait for form submission.

❌ **Don't** ignore the `info.statuscode` field. `0` = success. Any other value is an error.

```js
if (data.info.statuscode !== 0) {
  console.error('Geocoding error:', data.info.messages);
}
```

❌ **Don't** expose your API key in client-side code for production apps. Use a backend proxy.

✅ **Do** set `thumbMaps: false` unless you actually need the thumbnail — it speeds up responses.

✅ **Do** cache geocoding results for addresses you'll look up repeatedly.

---

## Structured Address Input (More Accurate)

Instead of a raw string, pass a structured location object for higher accuracy:

```js
const response = await fetch(
  `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}`,
  {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      location: {
        street: '1090 N Charlotte St',
        city: 'Lancaster',
        state: 'PA',
        postalCode: '17603',
        country: 'US'
      },
      options: { thumbMaps: false }
    })
  }
);
```

---

## Error Handling Template

```js
async function geocodeAddress(address, apiKey) {
  try {
    const url = `https://www.mapquestapi.com/geocoding/v1/address?key=${apiKey}&location=${encodeURIComponent(address)}&thumbMaps=false`;
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`HTTP error: ${response.status}`);
    }

    const data = await response.json();

    if (data.info.statuscode !== 0) {
      throw new Error(`MapQuest error: ${data.info.messages.join(', ')}`);
    }

    const result = parseGeocodingResult(data);
    if (!result) {
      throw new Error('No results found for this address');
    }

    return result;
  } catch (error) {
    console.error('Geocoding failed:', error);
    throw error;
  }
}
```
