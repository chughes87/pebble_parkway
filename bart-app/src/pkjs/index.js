// PebbleKit JS — fetches real-time BART departures

var BART_API = "https://api.bart.gov/api/etd.aspx?cmd=etd&key=MW9S-E7SL-26DU-VV8V&json=y&orig=";
var DEFAULT_STATION = null;

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

function getStation() {
  return localStorage.getItem("bartStation") || DEFAULT_STATION;
}

function fetchDepartures() {
  var station = getStation();
  if (!station) {
    sendNoStation();
    return;
  }
  var req = new XMLHttpRequest();
  req.open("GET", BART_API + station, true);
  req.onload = function () {
    if (req.status === 200) {
      var data = JSON.parse(req.responseText);
      var trains = parseDepartures(data);
      console.log("Fetched " + trains.length + " departures for " + station);
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

  trains.sort(function (a, b) {
    if (a.mins === "Leaving") return -1;
    if (b.mins === "Leaving") return 1;
    return parseInt(a.mins, 10) - parseInt(b.mins, 10);
  });

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

function sendNoStation() {
  var msg = {};
  msg[MSG_TYPE] = TYPE_TRAIN_ITEM;
  msg[TRAIN_COUNT] = 1;
  msg[TRAIN_IDX] = 0;
  msg[TRAIN_DEST] = "Open settings to";
  msg[TRAIN_MINS] = "pick a station";
  msg[TRAIN_COLOR] = "";
  sendQueue.push(msg);
  var done = {};
  done[MSG_TYPE] = TYPE_DONE;
  done[TRAIN_COUNT] = 1;
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

// Config page as a data URI
var CONFIG_HTML = [
  '<!DOCTYPE html><html><head>',
  '<meta name="viewport" content="width=device-width,initial-scale=1">',
  '<style>',
  'body{font-family:-apple-system,sans-serif;margin:0;padding:16px;background:#1a1a1a;color:#fff}',
  'h1{font-size:20px;margin:0 0 16px}',
  'select{width:100%;padding:12px;font-size:16px;border-radius:8px;border:1px solid #444;background:#333;color:#fff;margin-bottom:16px}',
  'button{width:100%;padding:14px;font-size:16px;border:none;border-radius:8px;background:#0a84ff;color:#fff;font-weight:600}',
  '</style></head><body>',
  '<h1>BART Station</h1>',
  '<select id="station">',
  '<option value="12TH">12th St. Oakland City Center</option>',
  '<option value="16TH">16th St. Mission</option>',
  '<option value="19TH">19th St. Oakland</option>',
  '<option value="24TH">24th St. Mission</option>',
  '<option value="ANTC">Antioch</option>',
  '<option value="ASHB">Ashby</option>',
  '<option value="BALB">Balboa Park</option>',
  '<option value="BAYF">Bay Fair</option>',
  '<option value="BERY">Berryessa/North San Jose</option>',
  '<option value="CAST">Castro Valley</option>',
  '<option value="CIVC">Civic Center/UN Plaza</option>',
  '<option value="COLS">Coliseum</option>',
  '<option value="COLM">Colma</option>',
  '<option value="CONC">Concord</option>',
  '<option value="DALY">Daly City</option>',
  '<option value="DBRK">Downtown Berkeley</option>',
  '<option value="DUBL">Dublin/Pleasanton</option>',
  '<option value="DELN">El Cerrito del Norte</option>',
  '<option value="PLZA">El Cerrito Plaza</option>',
  '<option value="EMBR">Embarcadero</option>',
  '<option value="FRMT">Fremont</option>',
  '<option value="FTVL">Fruitvale</option>',
  '<option value="GLEN">Glen Park</option>',
  '<option value="HAYW">Hayward</option>',
  '<option value="LAFY">Lafayette</option>',
  '<option value="LAKE">Lake Merritt</option>',
  '<option value="MCAR">MacArthur</option>',
  '<option value="MLBR">Millbrae</option>',
  '<option value="MLPT">Milpitas</option>',
  '<option value="MONT">Montgomery St.</option>',
  '<option value="NBRK">North Berkeley</option>',
  '<option value="NCON">North Concord/Martinez</option>',
  '<option value="OAKL">Oakland International Airport</option>',
  '<option value="ORIN">Orinda</option>',
  '<option value="PITT">Pittsburg/Bay Point</option>',
  '<option value="PCTR">Pittsburg Center</option>',
  '<option value="PHIL">Pleasant Hill/Contra Costa Centre</option>',
  '<option value="POWL">Powell St.</option>',
  '<option value="RICH">Richmond</option>',
  '<option value="ROCK">Rockridge</option>',
  '<option value="SBRN">San Bruno</option>',
  '<option value="SFIA">San Francisco International Airport</option>',
  '<option value="SANL">San Leandro</option>',
  '<option value="SHAY">South Hayward</option>',
  '<option value="SSAN">South San Francisco</option>',
  '<option value="UCTY">Union City</option>',
  '<option value="WCRK">Walnut Creek</option>',
  '<option value="WARM">Warm Springs/South Fremont</option>',
  '<option value="WDUB">West Dublin/Pleasanton</option>',
  '<option value="WOAK">West Oakland</option>',
  '</select>',
  '<button onclick="save()">Save</button>',
  '<script>',
  'var sel=document.getElementById("station");',
  'var curr="__CURRENT__";',
  'if(curr)for(var i=0;i<sel.options.length;i++){if(sel.options[i].value===curr){sel.selectedIndex=i;break}}',
  'function save(){',
  'var s=sel.value;',
  'document.location="pebblejs://close#"+encodeURIComponent(JSON.stringify({station:s}));',
  '}',
  '</script></body></html>'
].join('');

Pebble.addEventListener("ready", function () {
  console.log("PebbleKit JS ready");
  fetchDepartures();
});

Pebble.addEventListener("appmessage", function (e) {
  var payload = e.payload;
  if (payload[MSG_TYPE] === TYPE_REFRESH) {
    console.log("Refresh requested");
    fetchDepartures();
  }
});

Pebble.addEventListener("showConfiguration", function () {
  var html = CONFIG_HTML.replace('__CURRENT__', getStation());
  var url = 'data:text/html,' + encodeURIComponent(html);
  Pebble.openURL(url);
});

Pebble.addEventListener("webviewclosed", function (e) {
  if (e && e.response) {
    var config = JSON.parse(decodeURIComponent(e.response));
    if (config.station) {
      localStorage.setItem("bartStation", config.station);
      console.log("Station set to " + config.station);
      fetchDepartures();
    }
  }
});
