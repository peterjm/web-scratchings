var _ = require('underscore')._;

function LineSet(k, skip_clear_line) {
  this.k = k;
  this.key = 'points_' + k;
  this.redis = this.constructor.redis;

  var that = this;
  that.redis.zrevrank(that.constructor.key, k, function(err, rank) {
    if (rank == null) {
      that.redis.zadd(that.constructor.key, Date.now(), k, function() {
        if (!skip_clear_line) {
          that.redis.llen(that.key, function(err, len) {
            if (len <= 0) {
              that.clear_line();
            }
          });
        }
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
    that.redis.rpush(that.key, vals, LineSet.printError);
  }
  return this;
};
LineSet.prototype.clear_line = function() {
  return this.append(null).append(null);
};
LineSet.prototype.clear = function() {
  this.redis.del(this.key);
  this.redis.zrem(this.constructor.key, this.k);
};
LineSet.prototype.equals = function(other) {
  return this.key === other.key;
};

LineSet.key = 'points_keys';
LineSet.redis = null;
LineSet.clear = function() {
  this.all(null, function(linesets) {
    _.each(linesets, function(s){
      s.clear();
    });
  });
  this.redis.del(this.key);
};
LineSet.all_keys = function(n, callback) {
  n = (n==null) ? -1 : n;
  this.redis.zrevrange(this.key, 0, n, function(err, keys) {
    callback(keys);
  });
};
LineSet.all = function(n, callback) {
  this.all_keys(n, function(keys) {
    var linesets = _.map(keys, function(k) { return new LineSet(k, true); });
    callback(linesets);
  });
};
LineSet.printError = function(err, reply) {
  if (err) {
    console.log("LineSet error: "+err);
  }
};

exports.LineSet = LineSet;
