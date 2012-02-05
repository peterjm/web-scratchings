var _ = require('underscore');

function LineSet(k, redis) {
  this.key = 'points_' + k;
  this.redis = redis;

  var that = this;
  that.redis.zrevrank(that.constructor.key, k, function(err, rank) {
    if (rank == null) {
      that.redis.zadd(that.constructor.key, Date.now(), k, function() {
        that.redis.llen(that.key, function(err, len) {
          if (len <= 0) {
            that.clear_line();
          }
        });
      });
    }
  });
}

LineSet.prototype.points = function(callback) {
  var that = this;
  that.redis.llen(that.key, function(err, len) {
    that.redis.lrange(that.key, 0, len, function(err, points) {
      callback(points);
    });
  });
};
LineSet.prototype.append = function(vals) {
  var that = this;
  if (vals instanceof Array) {
    _.each(vals, function(i) { that.append(i); });
    that.clear_line();
  }
  else {
    that.redis.rpush(that.key, vals);
  }
  return this;
};
LineSet.prototype.clear_line = function() {
  return this.append(null).append(null);
};
LineSet.prototype.clear = function() {
  this.redis.del(this.key);
  this.redis.zrem(this.constructor.key, this.key);
};
LineSet.prototype.equals = function(other) {
  return this.key == other.key;
};

LineSet.key = 'points_keys';
LineSet.clear = function(redis) {
  this.all(null, redis, function(linesets) {
    _.each(linesets, function(s){
      s.clear();
    });
  });
  redis.del(this.key);
};
LineSet.all_keys = function(n, redis, callback) {
  var MAX_KEYS = 100;
  var that = this;
  n = (n==null) ? MAX_KEYS : n;
  if (n > 0) {
    redis.zrange(that.key, 0, n-1, function(err, keys) {
      callback(keys);
    });
  }
  else {
    callback([]);
  }
};
LineSet.all = function(n, redis, callback) {
  this.all_keys(n, redis, function(keys) {
    var linesets = _.map(keys, function(k) { return new LineSet(k, redis); });
    callback(linesets);
  });
};

exports.LineSet = LineSet;
