// ==============================================

var request = require('request');
var async = require('async');
var moment = require('moment');
var _ = require('lodash');
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

  // request('https://api.flightstats.com/flex/ratings/rest/v1/json/flight/' + req.flight + '/' + req.airline + '?appId=63121b9c&appKey=510908f052a4f6b24ab9515c6609225d', function(error, response, body) {
  //     if (!error && response.statusCode == 200) {
  //       var weather = JSON.parse(body);
  //       var ratings = results.ratings[0];
  //       // percent on-time
  //       var ontimePercent = numeral(ratings.ontimePercent).format('0.0%');
  //       $("#ontimePercent").text(ontimePercent);
  //       // star rating
  //       var allOntimeStars = numeral(ratings.allOntimeStars).format('0.0');
  //       $("#allOntimeStars").rating('update', allOntimeStars);
  //     }
  //   })

  // res.send(req.airline + ' ' + req.flight);

  async.waterfall([
    // get core flight status information from FlightStats.com
    function(callback) {
      var year = moment().year();
      var month = moment().month() + 1;
      var date = moment().date();
      request('http://localhost:8080/mock/statusAPI', function(error, response, body) {
        // request('https://api.flightstats.com/flex/flightstatus/rest/v2/json/flight/status/' + req.airline + '/' + req.flight + '/dep/' + year + '/' + month + '/' + date + '?appId=63121b9c&appKey=510908f052a4f6b24ab9515c6609225d&utc=false&airport=DCA', function(error, response, body) {
        if (!error && response.statusCode == 200) {

          var compiledStats = {};

          var results = JSON.parse(body);
          var airlines = results.appendix.airlines[0];

          // The name of the carrier (String).
          compiledStats.airlineName = airlines.name;

          // The flight number (as served in function request)
          compiledStats.flightNumber = req.flight;

          // The primary customer service phone number for the carrier (String).
          compiledStats.phoneNumber = airlines.phoneNumber;

          var flightStats = results.flightStatuses[0];
          var operationalTimes = flightStats.operationalTimes;

          // The published departure time for the flight provided by the airline's published operating schedule.
          var publishedDeparture = moment(operationalTimes.publishedDeparture.dateLocal).format("LT");
          compiledStats.publishedDeparture = publishedDeparture;

          // An estimated gate arrival time based on current observations
          var dateLocal;
          dateLocal = operationalTimes.scheduledGateArrival.dateLocal;
          var estimatedGateArrival = moment(dateLocal).format("LT");
          compiledStats.estimatedGateArrival = estimatedGateArrival;

          var departureAirport = results.appendix.airports[0];

          // The name of the departure airport (String).
          compiledStats.departureAirport = departureAirport.name;

          // Gate departing from
          compiledStats.departureGate = flightStats.airportResources.departureTerminal + "-" + flightStats.airportResources.departureGate;

          // send gate information to load food & dining options
          var gate = flightStats.airportResources.departureGate;
          if (gate > 34 || gate === "35X") {
            var gateLocation = 'Terminal C'
          } else if (gate > 22 && gate < 35) {
            var gateLocation = 'Terminal B/C'
          } else if (gate > 9 && gate < 23) {
            var gateLocation = 'Terminal B'
          } else if (gate < 10) {
            var gateLocation = 'Terminal A'
          };
          compiledStats.gateLocation = gateLocation;

          var destinationAirport = results.appendix.airports[1];

          // The name of the destination airport (String).
          compiledStats.destinationAirport = destinationAirport.name;

          var arrivingTerminal = flightStats.airportResources.arrivalTerminal;
          var arrivingGate = flightStats.airportResources.arrivalGate;

          // Gate arriving at
          if (arrivingTerminal != undefined) {
            compiledStats.destinationGate = arrivingTerminal + "-" + arrivingGate;
          } else {
            compiledStats.destinationGate = arrivingGate;
          }

          // Baggage claim at destination airport
          var baggageClaim = flightStats.airportResources.baggage;
          if (baggageClaim === "") {
            var baggageClaim = "Not known at this time"
          };
          compiledStats.baggageClaim = baggageClaim;

          var equipments = results.appendix.equipments[0]

          // The descriptive name for the equipment type. (String)
          var equipment = _.trimRight(equipments.name, ' Passenger');
          compiledStats.equipment = equipment;

          // Tail number for flight
          compiledStats.tailNumber = flightStats.flightEquipment.tailNumber;

          // // The current status of the flight.
          // // [A] Active
          // // [C]	Canceled
          // // [D]	Diverted
          // // [DN] Data source needed
          // // [L]	Landed
          // // [NO] Not Operational
          // // [R]	Redirected
          // // [S] Scheduled
          // // [U]	Unknown

          // IATA service classes offered for the flight. (String)
          // [F] first class
          // [J] business class
          // [W] premium economy
          // [Y] economy class

          var serviceClasses = flightStats.schedule.serviceClasses;
          var firstClass = _.includes(serviceClasses, 'F');
          var businessClass = _.includes(serviceClasses, 'J');
          var premiumEconomyClass = _.includes(serviceClasses, 'W');
          var economyClass = _.includes(serviceClasses, 'Y');

          if (firstClass === true) {
            firstClass = 'Yes'
          } else {
            firstClass = 'No'
          };
          compiledStats.firstClass = firstClass;

          if (businessClass === true) {
            businessClass = 'Yes'
          } else {
            businessClass = 'No'
          };
          compiledStats.businessClass = businessClass;

          if (premiumEconomyClass === true) {
            premiumEconomyClass = 'Yes'
          } else {
            premiumEconomyClass = 'No'
          };
          compiledStats.premiumEconomyClass = premiumEconomyClass;

          if (economyClass === true) {
            economyClass = 'Yes'
          } else {
            economyClass = 'No'
          };
          compiledStats.economyClass = economyClass;

          var flightDurations = flightStats.flightDurations;

          // The calculated scheduled time between blocks (gate to gate) in whole minutes (Integer)
          compiledStats.scheduledBlockMinutes = flightDurations.scheduledBlockMinutes

          // The calculated scheduled time in the air (runway to runway) in whole minutes (Integer)
          compiledStats.scheduledAirMinutes = flightDurations.scheduledAirMinutes;
          compiledStats.scheduledAirMinutesStats = (flightDurations.scheduledAirMinutes / flightDurations.scheduledBlockMinutes) * 100;
          compiledStats.scheduledTaxiOutMinutesStats = (flightDurations.scheduledTaxiOutMinutes / flightDurations.scheduledBlockMinutes) * 100;
          compiledStats.scheduledTaxiInMinutesStats = (flightDurations.scheduledTaxiInMinutes / flightDurations.scheduledBlockMinutes) * 100;

          // get flight route
          compiledStats.flightId = flightStats.flightId;

          callback(null, compiledStats);

        }
      })
    },
    // now that we have the assigned (from FlightStats.com) flightID, we switch to async.parallel
    function(compiledStats, callback) {

      async.parallel({
          // get local (airport) weather using FAA's API
          weather: function(callback) {
            request('http://services.faa.gov/airport/status/' + req.airline + '?format=application/json', function(error, response, body) {
              if (!error && response.statusCode == 200) {
                var FAA = JSON.parse(body);
                var weather = {};
                weather.visibility = FAA.weather.visibility;
                weather.type = FAA.weather.weather;
                weather.temp = FAA.weather.temp;
                weather.wind = FAA.weather.wind;
                weather.delayReason = FAA.status.reason;
                weather.delayType = FAA.status.type;
                weather.XXX = FAA.XXX;
                weather.XXX = FAA.XXX;
                weather.XXX = FAA.XXX;
                callback(null, weather);
              }
            })
          },
          two: function(callback) {
            setTimeout(function() {
              callback(null, 2);
            }, 100);
          }
        },
        function(err, results) {
          // results is now equals to: {one: 1, two: 2}
        });

      // console.log(compiledStats);
      // callback(null, 'three');

    },
    function(arg1, callback) {
      // arg1 now equals 'three'
      callback(null, 'done');
    }
  ], function(err, result) {
    // result now equals 'done'
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
