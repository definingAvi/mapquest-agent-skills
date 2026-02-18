# Example: Store Locator with Live Traffic

This shows an AI assistant using MapQuest Agent Skills to build a store locator.

---

**User:** I need to build a store locator for our 200 retail locations. Users type their address, see the nearest stores on a map, and can get directions to the one they choose.

**AI Assistant:** [Uses `mapquest-store-locator`, `mapquest-geocoding-patterns`, `mapquest-search-ahead`, `mapquest-web-integration`, `mapquest-directions-routing` skills]

Great — for 200 locations, here's the pattern I'll use:

- **Search Ahead** for address autocomplete as the user types
- **Geocoding API** to convert their selected address to coordinates
- **Haversine distance** (no API needed) to find and sort the 10 nearest stores
- **Leaflet.markercluster** for the 200 markers (above the 50-marker threshold where individual markers cause performance issues)
- **Directions API** only when the user clicks "Get Directions" on a specific store

Here's the implementation...

[Generates complete working code following all skill patterns]

---

**User:** Should I show traffic on the map?

**AI Assistant:** [Uses `mapquest-traffic-data` skill]

It depends on your use case:

- **Yes** if your users are making same-day decisions about which store to visit — live traffic helps them pick the fastest route
- **Skip it** if users are planning ahead or if your stores are in suburban/rural areas where traffic matters less

If you add it: scope the traffic API calls to the visible map bounds, poll no faster than every 2 minutes, and give users a toggle to show/hide it. Here's how...
