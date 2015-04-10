# kiosk-engine

## Routes

`/departures` is a CORS-enabled repeater feed for MWAA's Reagan (DCA) departures web service  

`/flightstats/:airline/:flight` returns a JSON array of flight-specific information  

`/sample` serves a sample response for `/flightstats/:airline/:flight`  

## Running Locally

Make sure you have [Node.js](http://nodejs.org/) and the [Heroku Toolbelt](https://toolbelt.heroku.com/) installed.

```
$ npm install
$ npm start
```

The app should now be running on [localhost:8080](http://localhost:8080/).

## Deploying to Heroku

```
$ git add .
$ git commit -m "Commit"
$ git push heroku master
$ heroku open
```

## Documentation

For more information about using Node.js on Heroku, see these Dev Center articles:

- [Getting Started with Node.js on Heroku](https://devcenter.heroku.com/articles/getting-started-with-nodejs)
- [Heroku Node.js Support](https://devcenter.heroku.com/articles/nodejs-support)
- [Node.js on Heroku](https://devcenter.heroku.com/categories/nodejs)
- [Best Practices for Node.js Development](https://devcenter.heroku.com/articles/node-best-practices)
- [Using WebSockets on Heroku with Node.js](https://devcenter.heroku.com/articles/node-websockets)
