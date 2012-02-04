var connection,
    context,
    oldMouseX = 0,
    oldMouseY = 0,
    old_points = [],
    current_points = [],
    new_points = [],
    config,
    canvas;

function to_url(path) {
  return '/' + path;
}

function setup() {
  insert_canvas();

  $.getJSON(to_url('config.json'), function(data) {
    if (data) {
      config = data;
      setup_canvas();

      $.getJSON(to_url('lines.json'), function(data) {
        if (data) {
          current_points = data.current;
          old_points = data.rest;
          redraw();
        }
      });
    }
  });

  $(document).mousemove(function(event) {
    if (!config) return;

    var mouseX = event.clientX - canvas.offsetLeft,
        mouseY = event.clientY - canvas.offsetTop;

    draw_line(oldMouseX, oldMouseY, mouseX, mouseY, config.current_thickness);

    current_points.push(mouseX);
    current_points.push(mouseY);
    new_points.push(mouseX);
    new_points.push(mouseY);

    oldMouseX = mouseX;
    oldMouseY = mouseY;
  });

  $(window).resize(function(event) {
    setup_canvas();
    redraw();
  });

  setInterval(upload_points, 1000);
}

function redraw() {
  draw_all_lines(current_points, config.current_thickness);
  var thickness = config.old_thickness;
  for(var i = 0; i < old_points.length; i++) {
    if (thickness <= 0) { break; }

    draw_all_lines(old_points[i], thickness);
    thickness -= config.decay;
  }
}

function draw_all_lines(points, thickness) {
  if (!points.length) { return; }

  oldX = points[0];
  oldY = points[1];
  for(var i = 0; i < points.length; i+=2) {
    x = points[i], y = points[i+1]
    draw_line(oldX, oldY, x, y, thickness);
    oldX = x, oldY = y;
  }
}

function draw_line(x1, y1, x2, y2, thickness) {
  if (!valid(x1) || !valid(y1) || !valid(x2) || !valid(y2)) { return; }

  var dx = x2 - x1,
      dy = y2 - y1,
      d = Math.sqrt(dx * dx + dy * dy) * 0.02;

  context.lineWidth = thickness;
  context.strokeStyle = 'rgba(0, 0, 0, ' + (0.7 - d) + ')';
  context.beginPath();
  context.moveTo(x1, y1);
  context.lineTo(x2, y2);
  context.closePath();
  context.stroke();
}

function insert_canvas() {
  var $canvas = $('<canvas id="canvas"></canvas>');
  $('body').append($canvas);
  $($canvas).css({ position: 'fixed', top: 0, left: 0, 'pointer-events': 'none' });

  canvas = document.getElementById('canvas');
}

function setup_canvas() {
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  context = canvas.getContext('2d');
}

function upload_points() {
  if (!new_points.length) { return; }

  $.post(to_url('lines.json'), {points: JSON.stringify(new_points)}, function(){});
  new_points = [];
}

function valid(p) {
  return p != null && p != '';
}

$(function() { setup(); });
