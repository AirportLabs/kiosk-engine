var request = require('request');
var express = require('express');
var app = express();

var flightstatsUrl = 'https://api.flightstats.com';

app.set('port', (process.env.PORT || 5000));
app.use(express.static(__dirname + '/public'));

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

app.get('/', function(request, response) {
  response.send('Hello World');
});

// app.get('/', function(req, res, next) {
//   request('http://www.mwaa.com/net/data/departures_reagan.json', function(error, response, body) {
//     if (!error && response.statusCode == 200) {
//       var json = JSON.parse(body);
//       res.json(json);
//     }
//   })
// });

app.get('*', function(req, res) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "X-Requested-With");

  request.get(flightstatsUrl + req.originalUrl, function(err, r_res, body) {
    if (err) res.send(500);
    else if (r_res.statusCode === 200) res.send(JSON.parse(body));
    else res.send(body);
  });
});

app.listen(app.get('port'), function() {
  console.log("Node app is running at localhost:" + app.get('port'));
});
