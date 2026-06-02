// PebbleKit JS — fetches real-time BART departures for 19th St Oakland

var BART_URL = "https://api.bart.gov/api/etd.aspx?cmd=etd&orig=19TH&key=MW9S-E7SL-26DU-VV8V&json=y";

var MSG_TYPE = 0;
var TRAIN_INDEX = 1;
var TRAIN_COUNT = 2;
var TRAIN_DEST = 3;
var TRAIN_MINS = 4;
var TRAIN_COLOR = 5;
var TRAIN_IDX = 6;

var TYPE_TRAIN_ITEM = 0;
var TYPE_DONE = 1;
var TYPE_REFRESH = 2;

var sendQueue = [];

function fetchDepartures() {
  var req = new XMLHttpRequest();
  req.open("GET", BART_URL, true);
  req.onload = function () {
    if (req.status === 200) {
      var data = JSON.parse(req.responseText);
      var trains = parseDepartures(data);
      console.log("Fetched " + trains.length + " departures");
      sendTrainsToWatch(trains);
    } else {
      console.log("BART API returned " + req.status);
      sendDone(0);
    }
  };
  req.onerror = function () {
    console.log("Fetch failed");
    sendDone(0);
  };
  req.send();
}

function parseDepartures(data) {
  var trains = [];
  var etds = data.root.station[0].etd;

  for (var i = 0; i < etds.length; i++) {
    var dest = etds[i].destination;
    var estimates = etds[i].estimate;
    var color = estimates[0].color;

    for (var j = 0; j < estimates.length; j++) {
      var mins = estimates[j].minutes;
      trains.push({
        dest: dest,
        mins: mins,
        color: color
      });
    }
  }

  // Sort by departure time (Leaving first, then by minutes)
  trains.sort(function (a, b) {
    if (a.mins === "Leaving") return -1;
    if (b.mins === "Leaving") return 1;
    return parseInt(a.mins, 10) - parseInt(b.mins, 10);
  });

  // Cap at 20
  if (trains.length > 20) trains.length = 20;

  return trains;
}

function sendTrainsToWatch(trains) {
  if (trains.length === 0) {
    sendDone(0);
    return;
  }

  for (var i = 0; i < trains.length; i++) {
    var msg = {};
    msg[MSG_TYPE] = TYPE_TRAIN_ITEM;
    msg[TRAIN_COUNT] = trains.length;
    msg[TRAIN_IDX] = i;
    msg[TRAIN_DEST] = trains[i].dest.substring(0, 30);
    msg[TRAIN_MINS] = trains[i].mins === "Leaving" ? "Now" : trains[i].mins + " min";
    msg[TRAIN_COLOR] = trains[i].color.substring(0, 12);
    sendQueue.push(msg);
  }

  var done = {};
  done[MSG_TYPE] = TYPE_DONE;
  done[TRAIN_COUNT] = trains.length;
  sendQueue.push(done);

  sendNext();
}

function sendDone(count) {
  var msg = {};
  msg[MSG_TYPE] = TYPE_DONE;
  msg[TRAIN_COUNT] = count;
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
  fetchDepartures();
});

// Watch can request a refresh
Pebble.addEventListener("appmessage", function (e) {
  var payload = e.payload;
  if (payload[MSG_TYPE] === TYPE_REFRESH) {
    console.log("Refresh requested");
    fetchDepartures();
  }
});
