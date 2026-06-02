import express from "express";
import * as cheerio from "cheerio";

const app = express();

// In-memory cache: { date, films, fetchedAt }
let cache = null;
const CACHE_TTL = 30 * 60 * 1000; // 30 minutes

async function scrapeShowtimes() {
  const res = await fetch("https://www.thenewparkway.com");
  if (!res.ok) throw new Error(`Homepage returned ${res.status}`);
  const html = await res.text();
  const $ = cheerio.load(html);

  const films = [];
  const seen = new Set();

  // Events use The Events Calendar plugin: each is a .type-tribe_events div
  // containing .time-details (showtime), h3 (title), and an optional IMDb link.
  $(".type-tribe_events").each((_i, el) => {
    const container = $(el);

    // Only include events that have an IMDb link (filters out non-film events)
    const imdbAnchor = container.find('a[href*="imdb.com/title/"]');
    if (imdbAnchor.length === 0) return;

    const title = container.find("h3").first().text().trim();
    const imdbUrl = imdbAnchor.attr("href");

    // Time is plain text inside .time-details (sibling to the veezi ticket link)
    const timeDetails = container.find(".time-details");
    const timeText = timeDetails.contents()
      .filter(function () { return this.type === "text"; })
      .text()
      .trim();
    if (!timeText) return;

    const time = timeText.toUpperCase();

    // Deduplicate by title+time
    const key = `${title}|${time}`;
    if (seen.has(key)) return;
    seen.add(key);

    films.push({ title, time, imdb_url: imdbUrl });
  });

  return films;
}

async function getShowtimes() {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL) {
    return cache.films;
  }

  const films = await scrapeShowtimes();
  cache = { films, fetchedAt: now };
  return films;
}

app.get("/showtimes", async (req, res) => {
  try {
    const films = await getShowtimes();
    const today = new Date().toISOString().slice(0, 10);
    res.json({ date: today, films });
  } catch (err) {
    console.error("Scrape failed:", err);
    res.status(502).json({ error: "Failed to fetch showtimes" });
  }
});

// Health check
app.get("/", (_req, res) => {
  res.json({ status: "ok", endpoint: "/showtimes" });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Proxy listening on port ${PORT}`);
});

export default app;
