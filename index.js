// ==============================================

var request = require('request');
var async = require('async');
var express = require('express');
var app = express();
var port = process.env.PORT || 8080;
var path = require('path');

app.use(function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "Origin, X-Requested-With, Content-Type, Accept");
  next();
});

// MOCK DATA/API ROUTES
// ==============================================

// Mock MWAA web services response
app.get('/mock/departures_reagan', function(req, res) {
  res.sendFile(path.join(__dirname + '/mock/departures_reagan.json'));
});

// Mock FAA API response
app.get('/mock/FAAWeatherAPI', function(req, res) {
  res.sendFile(path.join(__dirname + '/mock/FAAWeatherAPI.json'));
});

// Mock FlightState ratings API response
app.get('/mock/ratingsAPI', function(req, res) {
  res.sendFile(path.join(__dirname + '/mock/RatingsAPI.json'));
});

// Mock FlightState status API response
app.get('/mock/statusAPI', function(req, res) {
  res.sendFile(path.join(__dirname + '/mock/FlightStatusAPI.json'));
});

// Mock FlightState tracks API response
app.get('/mock/tracksAPI', function(req, res) {
  res.sendFile(path.join(__dirname + '/mock/flightRoute.json'));
});

// ROUTES
// ==============================================

// sample route with a route the way we're used to seeing it
app.get('/sample', function(req, res) {
  res.send('this is a sample!');
});

app.get('/departures', function(req, res, next) {
  request('http://www.mwaa.com/net/data/departures_reagan.json', function(error, response, body) {
    if (!error && response.statusCode == 200) {
      var json = JSON.parse(body);
      res.json(json);
    }
  })
});

// get an instance of router
var router = express.Router();

// route middleware that will happen on every request
router.use(function(req, res, next) {

  // log each request to the console
  console.log(req.method, req.url);

  // continue doing what we were doing and go to the route
  next();
});

// home page route (http://localhost:8080)
router.get('/', function(req, res) {
  res.send('*** MWAA KIOSK ENGINE');
});

// about page route (http://localhost:8080/about)
router.get('/about', function(req, res) {
  res.send('im the about page!');
});

// route middleware to validate :airline
router.param('airline', function(req, res, next, airline) {
  // do validation on airline name here
  // blah blah validation
  // log something so we know its working
  console.log('doing airline validations on ' + airline);

  // once validation is done save the new item in the req
  req.airline = airline;
  // go to the next thing
  next();
});

// route middleware to validate :flight
router.param('flight', function(req, res, next, flight) {
  // do validation on flight number here
  // blah blah validation
  // log something so we know its working
  console.log('doing flight validations on ' + flight);

  // once validation is done save the new item in the req
  req.flight = flight;
  // go to the next thing
  next();
});

// route with parameters
router.get('/flightstats/:airline/:flight', function(req, res) {

  // res.send(req.airline + ' ' + req.flight);

  async.series({
      one: function(callback) {
        setTimeout(function() {
          callback(null, 1);
        }, 200);
      },
      two: function(callback) {
        // Utilize FAA API for local weather
        request('http://services.faa.gov/airport/status/' + req.airline + '?format=application/json', function(error, response, body) {
          if (!error && response.statusCode == 200) {
            var weather = JSON.parse(body);
            callback(null, weather);
          }
        })
      }
    },
    function(err, results) {
      // results is now equal to: {one: 1, two: 2}
      res.send(results);
    });

});

// apply the routes to our application
app.use('/', router);

// login routes
app.route('/login')

// show the form (GET http://localhost:8080/login)
.get(function(req, res) {
  res.send('this is the login form');
})

// process the form (POST http://localhost:8080/login)
.post(function(req, res) {
  console.log('processing');
  res.send('processing the login form!');
});

// START THE SERVER
// ==============================================
app.listen(port);
console.log('Magic happens on port ' + port);
