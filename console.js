function setup_redis(redis_url) {
  return require('redis-url').createClient(redis_url);
  redis.on("error", function(err) {
    console.log("Redis Error: "+err)
  }).on("reply error", function(err) {
    console.log("Redis Reply Error: "+err)
  });
  return redis;
}

var _ = require('underscore')._;
var LineSet = require('./lineset').LineSet;
var redis = setup_redis('redis://localhost:6379');
LineSet.redis = redis;

exports.LineSet = LineSet;
