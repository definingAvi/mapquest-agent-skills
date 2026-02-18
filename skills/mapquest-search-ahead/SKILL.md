---
name: mapquest-search-ahead
description: Typeahead and autocomplete using the MapQuest Search Ahead API. Covers debouncing, result categories, geographic bias, collection types, and chaining with the Geocoding API.
---

# MapQuest Search Ahead Patterns

## Overview

The Search Ahead API powers autocomplete/typeahead address and POI search. Base URL: `https://www.mapquestapi.com/search/v3/prediction`

Use this for live search inputs, not for batch geocoding or one-shot address resolution. For a single definitive address lookup, use the Geocoding API.

---

## Basic Search Ahead Request

```js
const response = await fetch(
  `https://www.mapquestapi.com/search/v3/prediction?key=${apiKey}&q=${encodeURIComponent(query)}&collection=address,adminArea,poi`
);
const data = await response.json();
// data.results is an array of prediction objects
```

---

## Collection Types

The `collection` parameter controls what types of results are returned. Always specify what you need — don't request everything.

| Collection | Description | Use When |
|---|---|---|
| `address` | Street addresses | Address entry forms |
| `adminArea` | Cities, states, countries | Location pickers |
| `airport` | Airport names + IATA codes | Travel apps |
| `category` | Category labels (e.g., "restaurants") | Search-by-type UIs |
| `franchise` | Chain business names (e.g., "Starbucks") | Store locators |
| `poi` | Individual points of interest | General search |

```js
// Address-only (fastest, most relevant for delivery/shipping forms)
collection=address

// Address + city for flexible location search
collection=address,adminArea

// Full search (POI + address + city)
collection=poi,address,adminArea
```

---

## Geographic Bias

Bias results toward a location to get more relevant suggestions:

```js
const params = new URLSearchParams({
  key: apiKey,
  q: query,
  collection: 'address,poi',
  location: `${userLng},${userLat}`,  // NOTE: lng,lat order (not lat,lng!)
  limit: 5,
});
```

**Critical:** The `location` parameter uses **longitude, latitude** order (opposite of most MapQuest parameters).

---

## Debouncing — Required

Always debounce Search Ahead requests. Fire no more than once per 300–500ms. Never call the API on every keystroke.

```js
// Vanilla JS debounce
function debounce(fn, delay) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const searchInput = document.getElementById('search');
const resultsContainer = document.getElementById('results');

const handleSearch = debounce(async (query) => {
  if (query.length < 2) {
    resultsContainer.innerHTML = '';
    return;
  }

  const data = await searchAhead(query);
  renderResults(data.results);
}, 300);

searchInput.addEventListener('input', e => handleSearch(e.target.value));
```

```js
// React hook with debounce
import { useState, useEffect } from 'react';

function useSearchAhead(apiKey, debounceMs = 300) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (query.length < 2) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        const data = await fetchPredictions(query, apiKey);
        setResults(data.results || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    }, debounceMs);

    return () => clearTimeout(timer);
  }, [query, apiKey, debounceMs]);

  return { query, setQuery, results, loading };
}
```

---

## Parsing Results

```js
function parsePrediction(result) {
  return {
    id: result.id,
    displayString: result.displayString,   // Human-readable label
    place: result.place,                   // Detailed place info
    collection: result.collection,         // 'address', 'poi', etc.
    // For addresses:
    street: result.place?.properties?.street,
    city: result.place?.properties?.city,
    state: result.place?.properties?.stateCode,
    zip: result.place?.properties?.postalCode,
    country: result.place?.properties?.countryCode,
    // Coordinates (if available in result):
    lat: result.place?.geometry?.coordinates?.[1],
    lng: result.place?.geometry?.coordinates?.[0],
  };
}
```

---

## Chaining Search Ahead → Geocoding

Search Ahead results often don't include precise lat/lng coordinates. Chain with the Geocoding API to resolve:

```js
async function selectPrediction(prediction, apiKey) {
  // Some predictions include coordinates directly
  if (prediction.place?.geometry?.coordinates) {
    const [lng, lat] = prediction.place.geometry.coordinates;
    return { lat, lng, label: prediction.displayString };
  }

  // Otherwise, geocode the display string
  const geoResult = await geocodeAddress(prediction.displayString, apiKey);
  return {
    lat: geoResult.lat,
    lng: geoResult.lng,
    label: prediction.displayString,
  };
}
```

---

## Full Autocomplete Component (Vanilla JS)

```js
class MapQuestAutocomplete {
  constructor(inputEl, apiKey, onSelect) {
    this.input = inputEl;
    this.apiKey = apiKey;
    this.onSelect = onSelect;
    this.dropdown = this.createDropdown();
    this.debounceTimer = null;

    this.input.addEventListener('input', () => this.handleInput());
    this.input.addEventListener('blur', () => setTimeout(() => this.hide(), 200));
    document.addEventListener('click', e => {
      if (!this.input.contains(e.target)) this.hide();
    });
  }

  createDropdown() {
    const el = document.createElement('ul');
    el.style.cssText = 'position:absolute;background:#fff;border:1px solid #ccc;list-style:none;margin:0;padding:0;width:100%;z-index:1000;display:none';
    this.input.parentElement.style.position = 'relative';
    this.input.parentElement.appendChild(el);
    return el;
  }

  handleInput() {
    clearTimeout(this.debounceTimer);
    const q = this.input.value.trim();
    if (q.length < 2) { this.hide(); return; }
    this.debounceTimer = setTimeout(() => this.search(q), 300);
  }

  async search(q) {
    const url = `https://www.mapquestapi.com/search/v3/prediction?key=${this.apiKey}&q=${encodeURIComponent(q)}&collection=address,adminArea,poi&limit=5`;
    const res = await fetch(url);
    const data = await res.json();
    this.show(data.results || []);
  }

  show(results) {
    this.dropdown.innerHTML = '';
    results.forEach(r => {
      const li = document.createElement('li');
      li.textContent = r.displayString;
      li.style.cssText = 'padding:8px 12px;cursor:pointer';
      li.addEventListener('mouseover', () => li.style.background = '#f0f0f0');
      li.addEventListener('mouseout', () => li.style.background = '');
      li.addEventListener('click', () => {
        this.input.value = r.displayString;
        this.hide();
        this.onSelect(r);
      });
      this.dropdown.appendChild(li);
    });
    this.dropdown.style.display = results.length ? 'block' : 'none';
  }

  hide() { this.dropdown.style.display = 'none'; }
}

// Usage:
const autocomplete = new MapQuestAutocomplete(
  document.getElementById('address-input'),
  'YOUR_API_KEY',
  async (prediction) => {
    const location = await selectPrediction(prediction, 'YOUR_API_KEY');
    map.setCenter([location.lat, location.lng]);
  }
);
```

---

## Common Mistakes to Avoid

❌ **Don't** fire Search Ahead on every keypress — always debounce.

❌ **Don't** set `limit` higher than needed (max 10). Larger result sets are slower and rarely improve UX.

❌ **Don't** confuse `location` parameter order. Search Ahead uses **lng,lat**. Geocoding API uses **lat,lng**. Always double-check.

❌ **Don't** assume Search Ahead results include coordinates. They may not — always check before using and fall back to geocoding.

✅ **Do** set a minimum character threshold (2–3 chars) before calling the API.

✅ **Do** cancel in-flight requests when a newer query supersedes them (use AbortController).

```js
let controller;

async function fetchPredictions(q, apiKey) {
  if (controller) controller.abort();
  controller = new AbortController();

  const res = await fetch(url, { signal: controller.signal });
  return res.json();
}
```

✅ **Do** handle network errors gracefully — the dropdown should fail silently, not crash the page.
