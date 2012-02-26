var express = require('express');
var _ = require('underscore')._;
var LineSet = require('./lineset').LineSet;
var RedisStore = require('connect-redis')(express);

var redis;
function setup_redis(redis_url) {
  redis = require('redis-url').createClient(redis_url);
}

function current_line_set(session) {
  return new LineSet(session.id, redis);
}

function random_number(n) {
  return Math.floor(Math.random() * (n+1));
}

var app = express.createServer();

app.set('view options', { layout: false });
app.use(express.bodyParser());
app.use(express.methodOverride());
app.use(express.cookieParser());

app.configure('development', function() {
  setup_redis('redis://localhost:6379');

  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));
  app.use(express.logger());
  app.use(express.session({
    secret: "session secret",
    cookie: { path: '/', httpOnly: false, maxAge: 14400000 }
    store: new RedisStore({client: redis})
  }));

  process.env.ARTSY_CURRENT_THICKNESS = 0.7
  process.env.ARTSY_OLD_THICKNESS = 0.3
  process.env.ARTSY_THICKNESS_DECAY = 0.0
});

app.configure('production', function() {
  setup_redis(process.env.REDISTOGO_URL);

  var oneYear = 365 * 24 * 3600 * 1000; // milliseconds
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
  app.use(express.logger());
  app.use(express.session({
    secret: process.env.ARTSY_SESSION_SECRET,
    cookie: { path: '/', httpOnly: false, maxAge: 14400000 }
    store: new RedisStore({client: redis})
  }));
});

app.all('*', function(req, res, next) {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Headers", "GET, POST, PUT, DELETE, OPTIONS");
  next();
});

app.get('/', function(req, res) {
  res.contentType('html');
  res.render('index.html.ejs');
});

app.get('/drawing.js', function(req, res) {
  res.contentType('js');
  res.render('drawing.js.ejs', {host: req.header('host')});
});

app.get('/config', function(req, res) {
  res.contentType('html');
  res.render('config.html.ejs');
});

app.put('/config', function(req, res) {
  process.env.ARTSY_CURRENT_THICKNESS = parseFloat(req.body.current_thickness) || 0;
  process.env.ARTSY_OLD_THICKNESS = parseFloat(req.body.old_thickness) || 0;
  process.env.ARTSY_THICKNESS_DECAY = parseFloat(req.body.decay) || 0;
  res.redirect('/config');
});

app.get('/config.json', function(req, res) {
  res.contentType('json');
  res.send({
    current_thickness: process.env.ARTSY_CURRENT_THICKNESS,
    old_thickness: process.env.ARTSY_OLD_THICKNESS,
    decay: process.env.ARTSY_THICKNESS_DECAY
  });
});

app.get('/lines.json', function(req, res) {
  res.contentType('json');
  var cls = current_line_set(req.session);
  cls.points(function(current_points) {
    LineSet.all(null, redis, function(linesets) {
      linesets = _.reject(linesets, function(l) { return l.equals(cls); });
      if (linesets.length == 0) {
        var points = {
          current: current_points,
          rest: []
        };
        res.send(points);
      }
      else {
        var count = 0;
        var other_points = new Array(linesets.length);
        _.each(linesets, function(lineset, index) {
          lineset.points(function(points){
            other_points[index] = points;
            count++;
            if (count == linesets.length) {
              var points = {
                current: current_points,
                rest: other_points
              };
              res.send(points);
            }
          });
        });
      }
    });
  });
});

app.post('/lines.json', function(req, res) {
  var points = JSON.parse(req.body.points);
  current_line_set(req.session).append(points);
  console.log("Session: "+req.session.id);
  res.send(''); // render nothing
});

app.delete('/lines', function(req, res) {
  LineSet.clear(redis);
  res.send(''); // render nothing
});

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

