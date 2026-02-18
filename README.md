# MapQuest Agent Skills

**8 comprehensive Agent Skills** that teach AI assistants how to build fast, reliable, production-ready MapQuest applications. Covers geocoding, routing, static maps, search-ahead, web integration, key security, store locators, and real-time traffic data.

## Quick Start

Install all MapQuest Agent Skills:

```bash
npx add-skill definingAvi/mapquest-agent-skills
```

Install specific skills:

```bash
npx add-skill definingAvi/mapquest-agent-skills --skill mapquest-geocoding-patterns
```

List available skills:

```bash
npx add-skill definingAvi/mapquest-agent-skills --list
```

## What Are Agent Skills?

Agent Skills are folders containing instructions and resources that AI assistants (like Claude Code, Cursor, GitHub Copilot) can discover and use to perform tasks more effectively. Unlike tools (which provide actions) or prompts (which provide workflows), skills provide **domain expertise** — the "know-how" that helps AI make informed decisions when working with MapQuest APIs.

## Available Skills

---

### 📍 mapquest-geocoding-patterns
**Address ↔ coordinate conversion using the MapQuest Geocoding API.**

Covers forward geocoding, reverse geocoding, batch geocoding, quality codes, and response parsing. Teaches the AI to choose the right geocoding mode, handle partial/ambiguous addresses, and interpret `geocodeQuality` scores correctly.

[View skill →](./skills/mapquest-geocoding-patterns/SKILL.md)

---

### 🗺️ mapquest-directions-routing
**Turn-by-turn directions, route optimization, and multi-stop routing.**

Covers the Directions API, route types (fastest/shortest/pedestrian/bicycle), narrative maneuvers, distance/time formatting, and common mistakes like ignoring `statusCode` or mixing up lat/lng order.

[View skill →](./skills/mapquest-directions-routing/SKILL.md)

---

### 🖼️ mapquest-static-maps
**Generating and embedding static map images via the Static Map API.**

Covers center/zoom, markers, shape overlays, image sizing, map types (map/sat/hyb/light/dark), and URL construction patterns. Includes when to use static vs. interactive maps.

[View skill →](./skills/mapquest-static-maps/SKILL.md)

---

### 🔍 mapquest-search-ahead
**Typeahead/autocomplete using the Search Ahead API.**

Covers debouncing, result categories, geographic bias, collection types (address, adminArea, airport, category, franchise, poi), and how to chain Search Ahead with Geocoding for full address resolution.

[View skill →](./skills/mapquest-search-ahead/SKILL.md)

---

### 🌐 mapquest-web-integration
**Integrating the MapQuest JavaScript SDK (Leaflet-based) into web applications.**

Covers SDK loading, map initialization, tile layers, markers, popups, event handling, and framework integration patterns for React, Vue, and plain HTML/JS.

[View skill →](./skills/mapquest-web-integration/SKILL.md)

---

### 🔐 mapquest-key-security
**Best practices for handling MapQuest API keys securely.**

Covers environment variable storage, referrer restrictions in the MapQuest developer portal, server-side proxying, key rotation, and what to do when a key is exposed.

[View skill →](./skills/mapquest-key-security/SKILL.md)

---

### 🏪 mapquest-store-locator
**Building store locators and POI finders with MapQuest APIs.**

Covers the full pattern: geocode user input → find nearby locations → display on map → calculate routes to selected location. Includes distance calculations, result sorting, and marker clustering strategies.

[View skill →](./skills/mapquest-store-locator/SKILL.md)

---

### 🚦 mapquest-traffic-data
**Integrating real-time traffic data and incidents.**

Covers the Traffic API, incident severity codes, flow segments, how to overlay traffic on maps, and when to factor traffic into routing requests.

[View skill →](./skills/mapquest-traffic-data/SKILL.md)

---

## How Skills Work

### With Claude Code

```bash
npx add-skill definingAvi/mapquest-agent-skills -a claude-code
```

### With Cursor

```bash
npx add-skill definingAvi/mapquest-agent-skills -a cursor
```

### With VS Code (GitHub Copilot)

```bash
npx add-skill definingAvi/mapquest-agent-skills -a vscode
```

## Repository Structure

```
mapquest-agent-skills/
├── skills/
│   ├── mapquest-geocoding-patterns/SKILL.md
│   ├── mapquest-directions-routing/SKILL.md
│   ├── mapquest-static-maps/SKILL.md
│   ├── mapquest-search-ahead/SKILL.md
│   ├── mapquest-web-integration/SKILL.md
│   ├── mapquest-key-security/SKILL.md
│   ├── mapquest-store-locator/SKILL.md
│   └── mapquest-traffic-data/SKILL.md
├── examples/
│   └── conversations/
├── README.md
└── package.json
```

## Resources

- [MapQuest Developer Portal](https://developer.mapquest.com)
- [MapQuest API Documentation](https://developer.mapquest.com/documentation)
- [MapQuest Geocoding API](https://developer.mapquest.com/documentation/geocoding-api/)
- [MapQuest Directions API](https://developer.mapquest.com/documentation/directions-api/)
- [MapQuest Static Map API](https://developer.mapquest.com/documentation/static-map-api/v5/)
- [MapQuest Search Ahead API](https://developer.mapquest.com/documentation/searchahead-api/)
- [Agent Skills Specification](https://agentskills.io)

## License

MIT
