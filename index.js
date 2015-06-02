var request = require('request');
var async = require('async');
var moment = require('moment');
var numeral = require('numeral');
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
  res.send('*** MWAA KIOSK ENGINE ***');
});

// serves a sample response for /flightstats/:airline/:flight
router.get('/sample', function(req, res) {
  res.sendFile(path.join(__dirname + '/mock/sampleResponse.json'));
});

// route middleware to validate :airline
router.param('airline', function(req, res, next, airline) {
  // do validation on airline name here
  console.log('doing airline validations on ' + airline);

  // once validation is done save the new item in the req
  req.airline = airline;
  // go to the next thing
  next();
});

// route middleware to validate :flight
router.param('flight', function(req, res, next, flight) {
  // do validation on flight number here
  console.log('doing flight validations on ' + flight);

  // once validation is done save the new item in the req
  req.flight = flight;
  // go to the next thing
  next();
});

// route with parameters
router.get('/flightstats/:airline/:flight', function(req, res) {

  async.waterfall([
    // get core flight status information from FlightStats.com
    // mock data url: http://localhost:8080/mock/statusAPI
    function(callback) {
      var year = moment().year();
      var month = moment().month() + 1;
      var date = moment().date();
      request('https://api.flightstats.com/flex/flightstatus/rest/v2/json/flight/status/' + req.airline + '/' + req.flight + '/dep/' + year + '/' + month + '/' + date + '?appId=63121b9c&appKey=510908f052a4f6b24ab9515c6609225d&utc=false&airport=DCA', function(error, response, body) {
        if (!error && response.statusCode == 200) {

          var compiledStats = {};

          var results = JSON.parse(body);

          // console.log('*** compiledStats response ***');
          // console.log(results);

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

          compiledStats.destinationIata = destinationAirport.iata;

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

        } else {
          callback(null, null);
        }
      })
    },
    // now that we have the assigned (from FlightStats.com) flightID, we switch to async.parallel
    function(compiledStats, callback) {

      var flightId = compiledStats.flightId;
      console.log('flightID = ' + flightId);

      var destinationIata = compiledStats.destinationIata;
      console.log('destinationIata = ' + destinationIata);

      async.parallel({
          // get local (airport) weather using FAA's API
          // ref: http://services.faa.gov/docs/services/airport/#airportStatus
          weather: function(callback) {
            request('http://services.faa.gov/airport/status/' + destinationIata + '?format=application/json', function(error, response, body) {
              if (!error && response.statusCode == 200) {
                var FAA = JSON.parse(body);
                var weather = {};
                weather.visibility = FAA.weather.visibility;
                weather.type = FAA.weather.weather;
                weather.temp = FAA.weather.temp;
                weather.wind = FAA.weather.wind;
                weather.delayReason = FAA.status.reason;
                weather.delayType = FAA.status.type;
                weather.delayAvgDelay = FAA.status.AvgDelay;
                callback(null, weather);
                // console.log('****** weather ******');
                // console.log(weather);
              } else {
                callback(null, null);
              }
            })
          },
          // get flight performance rating from FlightStats.com
          // mock data url: http://localhost:8080/mock/ratingsAPI
          ratings: function(callback) {
            request('https://api.flightstats.com/flex/ratings/rest/v1/json/flight/' + req.airline + '/' + req.flight + '?appId=63121b9c&appKey=510908f052a4f6b24ab9515c6609225d', function(error, response, body) {
              if (!error && response.statusCode == 200) {
                var flightStatsRatings = JSON.parse(body);
                var ratings = {};
                var array = flightStatsRatings.ratings[0];
                // percent on-time
                ratings.ontimePercent = numeral(array.ontimePercent).format('0.0%');
                // star rating
                ratings.allOntimeStars = numeral(array.allOntimeStars).format('0.0');
                callback(null, ratings);
                // console.log('****** ratings ******');
                // console.log(ratings);
              } else {
                callback(null, null);
              }
            })
          },
          // get flight route from FlightStats.com
          // mock data url: http://localhost:8080/mock/tracksAPI
          route: function(callback) {
            request('https://api.flightstats.com/flex/flightstatus/rest/v2/json/flight/track/' + flightId + '?appId=63121b9c&appKey=510908f052a4f6b24ab9515c6609225d&includeFlightPlan=true&maxPositions=2', function(error, response, body) {
              if (!error && response.statusCode == 200) {
                var routeResponse = JSON.parse(body);
                console.log('****** routeResponse ******');
                console.log(routeResponse);
                var route = {};
                route.waypoints = routeResponse.flightTrack.waypoints;
                callback(null, route);
                // console.log('****** route ******');
                // console.log(route);
              } else {
                callback(null, null);
              }
            })
          },
          // add compiledStats stats to results JSON
          compiledStats: function(callback) {
            callback(null, compiledStats);
            // console.log('****** compiledStats ******');
            // console.log(compiledStats);
          }
        },
        function(err, results) {
          console.log('*** DONE ***');
          callback(null, results);
        });

    }
  ], function(err, result) {

    console.log('*** DONE, NOW SERVING JSON FILE ***');

    // now return the compiled JSON file
    res.json(result);

  });

});

// apply the routes to our application
app.use('/', router);

// login routes
app.route('/login')

// START THE SERVER
// ==============================================
app.listen(port);
console.log('Magic happens on port ' + port);
