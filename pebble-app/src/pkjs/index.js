// PebbleKit JS — runs on the phone, bridges proxy server and watch

var PROXY_URL = "https://pebble-parkway.vercel.app/showtimes";

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
var sending = false;

function fetchShowtimes() {
  var req = new XMLHttpRequest();
  req.open("GET", PROXY_URL, true);
  req.onload = function () {
    if (req.status === 200) {
      var data = JSON.parse(req.responseText);
      films = data.films || [];
      console.log("Fetched " + films.length + " films");
      sendFilmsToWatch();
    } else {
      console.log("Proxy returned " + req.status);
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

  // Queue up each film as a message
  for (var i = 0; i < films.length; i++) {
    var msg = {};
    msg[MSG_TYPE] = TYPE_FILM_ITEM;
    msg[FILM_COUNT] = films.length;
    msg[FILM_IDX] = i;
    msg[FILM_TITLE] = films[i].title.substring(0, 30);
    msg[FILM_TIME] = films[i].time.substring(0, 12);
    sendQueue.push(msg);
  }

  // Send "done" after all films
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
    sending = false;
    return;
  }
  sending = true;
  var msg = sendQueue.shift();
  Pebble.sendAppMessage(msg, function () {
    // ACK received, send next
    sendNext();
  }, function (e) {
    console.log("Send failed, retrying");
    sendQueue.unshift(msg);
    // Retry after a short delay
    setTimeout(sendNext, 200);
  });
}

// When the phone JS environment is ready, fetch showtimes
Pebble.addEventListener("ready", function () {
  console.log("PebbleKit JS ready");
  fetchShowtimes();
});

// Listen for messages from the watch (e.g. "open IMDb")
Pebble.addEventListener("appmessage", function (e) {
  var payload = e.payload;
  if (payload[MSG_TYPE] === TYPE_OPEN_IMDB) {
    var index = payload[FILM_INDEX];
    if (index >= 0 && index < films.length) {
      var url = films[index].imdb_url;
      console.log("Opening IMDb: " + url);
      Pebble.openURL(url);
    }
  }
});
