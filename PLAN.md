# New Parkway Pebble App — Project Plan

A Pebble smartwatch app that shows today's showtimes at The New Parkway Theater
in Oakland, lets you scroll through films, and opens an IMDb page on your phone
with a button press.

---

## Architecture Overview

```
[Pebble Watch C App]
        ↕  AppMessage (Bluetooth)
[PebbleKit JS — runs on phone]
        ↕  HTTP fetch
[Proxy Server — Node/Express, hosted on Vercel/Railway]
        ↕  HTTP GET
[thenewparkway.com — WordPress + The Events Calendar plugin]
```

Three distinct pieces, each in its own folder.

---

## Repository Structure

```
new-parkway-pebble/
├── pebble-app/              # C watchapp (compiled with pebble SDK)
│   ├── src/
│   │   ├── main.c           # App entry, window stack
│   │   ├── showtime_list.c  # MenuLayer rendering films
│   │   ├── showtime_list.h
│   │   ├── messaging.c      # AppMessage send/receive
│   │   └── messaging.h
│   ├── resources/
│   │   └── fonts/           # If using a custom font (optional)
│   ├── appinfo.json         # Pebble app metadata, UUID, permissions
│   └── wscript
│
├── pebble-app/src/pkjs/     # PebbleKit JS (runs on phone, inside pebble-app)
│   └── index.js             # Fetches proxy, sends to watch, handles openURL
│
└── proxy/                   # Node/Express server
    ├── index.js             # Single endpoint: GET /showtimes?date=YYYY-MM-DD
    ├── package.json
    └── vercel.json          # Zero-config deploy (or Railway/Render equivalent)
```

---

## Phase 1 — Proxy Server

**Goal:** A single API endpoint that returns today's films as clean JSON.

### Step 1.1 — Test the WordPress REST API

The New Parkway runs WordPress + The Events Calendar plugin, which exposes a
built-in REST API. Try this first — no scraping needed if it works:

```
GET https://www.thenewparkway.com/wp-json/tribe/events/v1/events
      ?start_date=YYYY-MM-DD
      &end_date=YYYY-MM-DD
      &per_page=20
```

Expected response shape (if the endpoint is open):
```json
{
  "events": [
    {
      "title": "Marty Supreme",
      "url": "https://www.thenewparkway.com/event/marty-supreme/",
      "start_date": "2026-06-01 18:00:00",
      "description": "...",
      ...
    }
  ]
}
```

**If the REST API is locked down** (returns 401 or 403), fall back to scraping
the homepage HTML. The homepage renders today's events server-side and already
includes IMDb links in anchor tags — a cheerio scrape of the homepage is a
reliable fallback.

### Step 1.2 — Build the proxy endpoint

```
GET /showtimes?date=YYYY-MM-DD   (defaults to today if omitted)
```

Response the proxy returns to PebbleKit JS:
```json
{
  "date": "2026-06-01",
  "films": [
    {
      "title": "Marty Supreme",
      "time": "6:00 PM",
      "imdb_url": "https://www.imdb.com/title/tt1234567/"
    },
    {
      "title": "The Running Man",
      "time": "8:30 PM",
      "imdb_url": "https://www.imdb.com/title/tt0093894/"
    }
  ]
}
```

Implementation notes:
- Use Node 18+ with `node-fetch` or native fetch
- Use `cheerio` for HTML scraping fallback
- Filter out non-film events (board game nights, Melee tournaments, etc.) by
  checking whether an IMDb link is present — only real movies have one
- Cache the response in memory for 30 minutes to be a polite scraper
- Deploy to Vercel (free tier, zero config for Node)

### Step 1.3 — Deploy & smoke test

Confirm the endpoint works from a browser and from `curl` before touching
Pebble at all.

---

## Phase 2 — PebbleKit JS (phone-side)

**File:** `pebble-app/src/pkjs/index.js`

This is JavaScript that runs on the phone inside the Pebble app. Your web
experience transfers directly here.

### Responsibilities

1. **On `ready` event** — fetch today's showtimes from the proxy
2. **Send film list to watch** — via `Pebble.sendAppMessage()`, one film at a
   time (AppMessage has a small payload limit, ~100 bytes per message)
3. **Listen for "open IMDb" message** from the watch — call
   `Pebble.openURL(imdb_url)` to launch the browser on the phone

### Message Protocol (keys defined in appinfo.json)

| Key | Direction | Type | Meaning |
|-----|-----------|------|---------|
| `MSG_TYPE` | both | uint8 | 0=film_item, 1=open_imdb, 2=done |
| `FILM_INDEX` | watch→phone | uint8 | Which film to open |
| `FILM_COUNT` | phone→watch | uint8 | Total number of films |
| `FILM_TITLE` | phone→watch | cstring | Film title (truncated to 30 chars) |
| `FILM_TIME` | phone→watch | cstring | Showtime string e.g. "6:00 PM" |
| `FILM_IDX` | phone→watch | uint8 | Index of this film in the list |

Because AppMessage is small, send films one at a time in a loop, waiting for
ACK before sending the next. Build a simple queue on the JS side.

---

## Phase 3 — Pebble C App

### Step 3.1 — App skeleton

- Single `Window` with a `MenuLayer` (the built-in scrollable list widget)
- On load, show a "Loading…" placeholder row
- Send an `AppMessage` to JS side to trigger a fetch (or JS auto-fetches on
  `ready` and pushes data immediately)

### Step 3.2 — Receive and display films

As film messages arrive from PebbleKit JS:
- Store titles and times in a fixed-size array (cap at 20 films)
- Call `menu_layer_reload_data()` after each new film arrives
- Show title on the main row, showtime as the subtitle

### Step 3.3 — Button handling

When the user presses SELECT on a highlighted film:
- Send an AppMessage to JS: `{ MSG_TYPE: 1, FILM_INDEX: selected_index }`
- JS receives it and calls `Pebble.openURL(films[index].imdb_url)`
- Optional: vibrate once as confirmation

### Step 3.4 — Error states

- No films found → show "No shows today"
- Fetch failed → show "Couldn't load" with a hint to check phone connection
- Use `app_timer` for a 10-second timeout if no data arrives

### Key Pebble APIs used

| API | Used for |
|-----|----------|
| `MenuLayer` | Scrollable film list |
| `AppMessage` | Watch ↔ phone communication |
| `app_message_open()` | Open the inbox/outbox |
| `vibes_short_pulse()` | Confirm button press |
| `persist_write_*` | Optional: cache last showtimes in watch storage |

---

## Phase 4 — Polish

- **Persist last-known showtimes** in watch storage (`persist_write_string`)
  so the app shows something instantly on launch even before the fetch completes
- **Status bar** at top: show today's date so it's obvious the data is fresh
- **Font choice**: `FONT_KEY_GOTHIC_18_BOLD` for title, `FONT_KEY_GOTHIC_14`
  for time — clean and readable at arm's length
- **Scroll indicator**: enable `menu_layer_set_click_config_onto_window` so
  up/down buttons scroll naturally

---

## Development Order

1. [ ] Set up `pebble` SDK locally, confirm `pebble build` works on a hello-world
2. [ ] Build & deploy proxy server — test endpoint in browser
3. [ ] Write PebbleKit JS — log fetched data to console, confirm it reaches phone
4. [ ] Wire AppMessage: JS → watch, confirm titles appear in Pebble emulator
5. [ ] Build MenuLayer UI with real data
6. [ ] Add SELECT button → openURL flow
7. [ ] Error states and loading indicator
8. [ ] Persist cache
9. [ ] Test on real hardware

---

## Key Resources

- [Pebble Developer Docs](https://developer.rebble.io/developer.pebble.com/docs/index.html) (archived on Rebble)
- [AppMessage Guide](https://developer.rebble.io/developer.pebble.com/guides/communication/sending-and-receiving-data/index.html)
- [MenuLayer API](https://developer.rebble.io/developer.pebble.com/docs/c/User_Interface/Layers/MenuLayer/index.html)
- [PebbleKit JS Guide](https://developer.rebble.io/developer.pebble.com/guides/communication/using-pebblekit-js/index.html)
- [The Events Calendar REST API](https://theeventscalendar.com/knowledgebase/introduction-to-the-events-calendar-rest-api/)
- New Parkway WP REST endpoint to test first:
  `https://www.thenewparkway.com/wp-json/tribe/events/v1/events`

---

## Open Questions

- Does the New Parkway's REST API respond without auth? (Test this first in
  Phase 1 — it changes whether you scrape or call the API directly)
- Does the site include IMDb links for every film in the Events Calendar data,
  or only on the homepage HTML? (Affects whether REST API gives you IMDb URLs
  or whether you need to scrape/match them separately)
- Pebble SDK: are you using the original Pebble SDK or the Rebble-maintained
  toolchain? Either works but setup differs slightly.
