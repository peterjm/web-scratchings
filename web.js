var express = require('express');

var app = express.createServer();

app.set('view options', { layout: false });
app.use(express.bodyParser());
app.use(express.methodOverride());

app.configure('development', function() {
  app.use(express.static(__dirname + '/public'));
  app.use(express.errorHandler({ dumpExceptions: true, showStack: true }));

  process.env['ARTSY_CURRENT_THICKNESS'] = 0.7
  process.env['ARTSY_OLD_THICKNESS'] = 0.3
  process.env['ARTSY_THICKNESS_DECAY'] = 0.0
});

app.configure('production', function() {
  var oneYear = 365 * 24 * 3600 * 1000; // milliseconds
  app.use(express.static(__dirname + '/public', { maxAge: oneYear }));
  app.use(express.errorHandler());
});

app.get('/', function(req, res) {
  res.render('index.html.ejs');
});

app.get('/config', function(req, res) {
  res.render('config.html.ejs');
});

app.put('/config', function(req, res) {
  process.env['ARTSY_CURRENT_THICKNESS'] = parseFloat(req.body.current_thickness) || 0;
  process.env['ARTSY_OLD_THICKNESS'] = parseFloat(req.body.old_thickness) || 0;
  process.env['ARTSY_THICKNESS_DECAY'] = parseFloat(req.body.decay) || 0;
  res.redirect('/config');
});

app.get('/config.json', function(req, res) {
  res.contentType('json');
  res.send({
    current_thickness: process.env['ARTSY_CURRENT_THICKNESS'],
    old_thickness: process.env['ARTSY_OLD_THICKNESS'],
    decay: process.env['ARTSY_THICKNESS_DECAY']
  });
});

app.get('/lines.json', function(req, res) {
  res.contentType('json');
  res.send({
    current: [],//current_line_set,
    rest: [[]]//LineSet.all.without(current_line_set)
  });
});

//post '/lines.json' do
//  current_line_set.append JSON.parse(params[:points])
//  ''
//end

//delete '/lines' do
//  LineSet.clear!
//  ''
//end

var port = process.env.PORT || 3000;
app.listen(port, function() {
  console.log("Listening on " + port);
});

