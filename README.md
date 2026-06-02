# Pebble Parkway

A Pebble smartwatch app that shows today's showtimes at [The New Parkway Theater](https://www.thenewparkway.com) in Oakland. Scroll through films and open their IMDb page on your phone with a button press.

## Architecture

```
Pebble Watch (C app)
    ↕ AppMessage
Phone (PebbleKit JS)
    ↕ HTTP
Proxy Server (Node/Express on Vercel)
    ↕ HTML scrape
thenewparkway.com
```

## Proxy Server

The proxy scrapes the New Parkway homepage and returns today's film showtimes as JSON.

```
GET /showtimes
```

```json
{
  "date": "2026-06-01",
  "films": [
    { "title": "I LOVE BOOSTERS", "time": "11:30 AM", "imdb_url": "https://www.imdb.com/title/tt30827810/" },
    { "title": "IS GOD IS", "time": "4:20 PM", "imdb_url": "https://www.imdb.com/title/tt34379307/" }
  ]
}
```

### Running locally

```bash
cd proxy
npm install
npm run dev
# http://localhost:3000/showtimes
```

## License

MIT
