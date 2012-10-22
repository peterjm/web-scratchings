var _ = require('underscore')._;

function each(arr, operation, after) {
  var count = 0;
  _.each(arr, function(elem) {
    count += 1;
    operation(elem, function() {
      count -= 1;
      if (count == 0) { after(); }
    });
  });
}

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
LineSet.prototype.append = function(vals, callback) {
  var that = this;
  that.redis.rpush(that.key, vals, function(err, reply) {
    if (err) {
      LineSet.oldest(function(o) {
        o.clear(function() {
          that.append(vals, callback);
        });
      });
    } else {
      if (callback) { callback(); }
    }
  });
  return this;
};
LineSet.prototype.clear_line = function() {
  var that = this;
  return that.append(null, function() { that.append(null); });
};
LineSet.prototype.clear = function(callback) {
  var that = this;
  that.redis.zrem(that.constructor.key, that.k, function(err, response) {
    that.redis.del(that.key, function(err, response) {
      if (callback) { callback(); }
    });
  });
};
LineSet.prototype.equals = function(other) {
  return this.key === other.key;
};

LineSet.key = 'points_keys';
LineSet.redis = null;
LineSet.clear = function() {
  var that = this;
  that.all(function(linesets) {
    each(linesets, function(s, c) { s.clear(c); }, function() { that.redis.del(that.key); })
  });
};
LineSet.oldest = function(callback) {
  this.redis.zrange(this.key, 0, 0, function(err, keys) {
    var lineset = new LineSet(keys[0], true);
    callback(lineset);
  });
};
LineSet.all_keys = function(n, callback) {
  if (arguments.length == 1) {
    callback = n;
    n = null;
  }
  n = (n==null) ? -1 : n;
  this.redis.zrevrange(this.key, 0, n, function(err, keys) {
    callback(keys);
  });
};
LineSet.all = function(n, callback) {
  if (arguments.length == 1) {
    callback = n;
    n = null;
  }
  this.all_keys(n, function(keys) {
    var linesets = _.map(keys, function(k) { return new LineSet(k, true); });
    callback(linesets);
  });
};

exports.LineSet = LineSet;
