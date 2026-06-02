// PebbleKit JS — runs on the phone, scrapes showtimes directly

var TNP_URL = "https://www.thenewparkway.com";

// Message types (must match appinfo.json appKeys)
var MSG_TYPE = 0;
var FILM_INDEX = 1;
var FILM_COUNT = 2;
var FILM_TITLE = 3;
var FILM_TIME = 4;
var FILM_IDX = 5;

// MSG_TYPE values
var TYPE_FILM_ITEM = 0;
var TYPE_OPEN_IMDB = 1;
var TYPE_DONE = 2;

var films = [];
var sendQueue = [];

function parseShowtimes(html) {
  var results = [];
  var seen = {};

  // Split on event containers: each has class "type-tribe_events"
  var blocks = html.split('type-tribe_events');
  for (var i = 1; i < blocks.length; i++) {
    var block = blocks[i];

    // Only include events with an IMDb link (real films)
    var imdbMatch = block.match(/href="(https?:\/\/www\.imdb\.com\/title\/[^"]+)"/);
    if (!imdbMatch) continue;

    // Extract title from <h3...>...<span>TITLE</span>...</h3>
    var titleMatch = block.match(/<h3[^>]*>\s*<span>([^<]+)<\/span>/);
    if (!titleMatch) continue;
    var title = titleMatch[1].trim();

    // Extract time from .time-details: the time is plain text after the ticket link
    var timeMatch = block.match(/time-details[\s\S]*?<\/a>\s*([\d]{1,2}:[\d]{2}\s*[ap]m)/i);
    if (!timeMatch) continue;
    var time = timeMatch[1].trim().toUpperCase();

    var key = title + '|' + time;
    if (seen[key]) continue;
    seen[key] = true;

    results.push({ title: title, time: time, imdb_url: imdbMatch[1] });
  }

  return results;
}

function fetchShowtimes() {
  var req = new XMLHttpRequest();
  req.open("GET", TNP_URL, true);
  req.onload = function () {
    if (req.status === 200) {
      films = parseShowtimes(req.responseText);
      console.log("Parsed " + films.length + " films");
      sendFilmsToWatch();
    } else {
      console.log("Site returned " + req.status);
      sendDone(0);
    }
  };
  req.onerror = function () {
    console.log("Fetch failed");
    sendDone(0);
  };
  req.send();
}

function sendFilmsToWatch() {
  if (films.length === 0) {
    sendDone(0);
    return;
  }

  for (var i = 0; i < films.length; i++) {
    var msg = {};
    msg[MSG_TYPE] = TYPE_FILM_ITEM;
    msg[FILM_COUNT] = films.length;
    msg[FILM_IDX] = i;
    msg[FILM_TITLE] = films[i].title.substring(0, 30);
    msg[FILM_TIME] = films[i].time.substring(0, 12);
    sendQueue.push(msg);
  }

  var done = {};
  done[MSG_TYPE] = TYPE_DONE;
  done[FILM_COUNT] = films.length;
  sendQueue.push(done);

  sendNext();
}

function sendDone(count) {
  var msg = {};
  msg[MSG_TYPE] = TYPE_DONE;
  msg[FILM_COUNT] = count;
  Pebble.sendAppMessage(msg, function () {
    console.log("Sent done");
  }, function () {
    console.log("Failed to send done");
  });
}

function sendNext() {
  if (sendQueue.length === 0) {
    return;
  }
  var msg = sendQueue.shift();
  Pebble.sendAppMessage(msg, function () {
    sendNext();
  }, function (e) {
    console.log("Send failed, retrying");
    sendQueue.unshift(msg);
    setTimeout(sendNext, 200);
  });
}

Pebble.addEventListener("ready", function () {
  console.log("PebbleKit JS ready");
  fetchShowtimes();
});

Pebble.addEventListener("appmessage", function (e) {
  var payload = e.payload;
  if (payload[MSG_TYPE] === TYPE_OPEN_IMDB) {
    var index = payload[FILM_INDEX];
    if (index >= 0 && index < films.length) {
      console.log("Opening IMDb: " + films[index].imdb_url);
      Pebble.openURL(films[index].imdb_url);
    }
  }
});
