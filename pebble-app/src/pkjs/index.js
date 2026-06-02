// PebbleKit JS — runs on the phone, scrapes showtimes directly

var TNP_URL = "https://www.thenewparkway.com/upcomingevents/calendar/";

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

function decodeEntities(str) {
  return str.replace(/&#8212;/g, '-').replace(/&#8211;/g, '-').replace(/&#038;/g, '&').replace(/&amp;/g, '&');
}

function getTodayHeader() {
  var now = new Date();
  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var months = ['January','February','March','April','May','June','July','August','September','October','November','December'];
  return days[now.getDay()] + ', ' + months[now.getMonth()] + ' ' + (now.getDate() < 10 ? '0' : '') + now.getDate();
}

function parseShowtimes(html) {
  var results = [];
  var seen = {};

  // Find today's section by splitting on h2 date headers
  var todayStr = getTodayHeader();
  var sections = html.split(/<h2[^>]*>/);
  var todaySection = null;
  for (var i = 0; i < sections.length; i++) {
    if (sections[i].indexOf(todayStr) >= 0 && sections[i].indexOf(todayStr) < 30) {
      todaySection = sections[i];
      break;
    }
  }
  if (!todaySection) return results;

  // Parse events from today's section using .sktime and .sktitle classes
  var blocks = todaySection.split('type-tribe_events');
  for (var i = 1; i < blocks.length; i++) {
    var block = blocks[i];

    var imdbMatch = block.match(/href="(https?:\/\/www\.imdb\.com\/title\/[^"]+)"/);
    if (!imdbMatch) continue;

    var titleMatch = block.match(/sktitle">([^<]+)</);
    if (!titleMatch) continue;
    var title = decodeEntities(titleMatch[1].trim());

    // Skip cancelled events
    if (title.indexOf('CANCELLED') >= 0) continue;

    var timeMatch = block.match(/sktime">([^<]+)</);
    if (!timeMatch) continue;
    var time = timeMatch[1].trim().toUpperCase();

    var key = title + '|' + time;
    if (seen[key]) continue;
    seen[key] = true;

    results.push({ title: title, time: time, imdb_url: imdbMatch[1] });
  }

  // Filter to only future showtimes
  var now = new Date();
  results = results.filter(function (film) {
    var parts = film.time.match(/(\d{1,2}):(\d{2})\s*(AM|PM)/i);
    if (!parts) return true;
    var hours = parseInt(parts[1], 10);
    var minutes = parseInt(parts[2], 10);
    var isPM = parts[3].toUpperCase() === 'PM';
    if (isPM && hours !== 12) hours += 12;
    if (!isPM && hours === 12) hours = 0;
    var showtime = new Date(now.getFullYear(), now.getMonth(), now.getDate(), hours, minutes);
    return showtime > now;
  });

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
