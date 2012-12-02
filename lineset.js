var _ = require('underscore')._;

function parallel_each(arr, operation, after) {
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

  var self = this;
  self.redis.zrevrank(self.constructor.key, k, function(err, rank) {
    if (rank == null) {
      self.redis.zadd(self.constructor.key, Date.now(), k, function() {
        if (!skip_clear_line) {
          self.redis.llen(self.key, function(err, len) {
            if (len <= 0) {
              self.clear_line();
            }
          });
        }
      });
    }
  });
}

LineSet.prototype.points = function(callback) {
  var self = this;
  self.redis.llen(self.key, function(err, len) {
    self.redis.lrange(self.key, 0, len, function(err, points) {
      callback(points);
    });
  });
};
LineSet.prototype.append = function(vals, callback) {
  var self = this;
  //self.redis.rpush(self.key, vals, function(err, reply) {
  //  if (err) {
  //    LineSet.oldest(function(o) {
  //      o.clear(function() {
  //        self.append(vals, callback);
  //      });
  //    });
  //  } else {
  //    if (callback) { callback(); }
  //  }
  //});
  if (vals instanceof Array) {
    _.each(vals, function(i) { self.append(i); });
    self.clear_line();
  }
  else {
    self.redis.rpush(self.key, vals, function(){});
  }
  return this;
};
LineSet.prototype.clear_line = function() {
  //var self = this;
  //return self.append(null, function() { self.append(null); });
  return this.append(null).append(null);
};
LineSet.prototype.clear = function(callback) {
  //var self = this;
  //self.redis.zrem(self.constructor.key, self.k, function(err, response) {
  //  self.redis.del(self.key, function(err, response) {
  //    if (callback) { callback(); }
  //  });
  //});
  this.redis.del(this.key);
  this.redis.zrem(this.constructor.key, this.k);
};
LineSet.prototype.equals = function(other) {
  return this.key === other.key;
};

LineSet.key = 'points_keys';
LineSet.redis = null;
LineSet.clear = function() {
  //var self = this;
  //self.all(function(linesets) {
  //  parallel_each(linesets, function(s, c) { s.clear(c); }, function() { self.redis.del(self.key); })
  //});
  this.all(function(linesets) {
    _.each(linesets, function(s){
      s.clear();
    });
  });
  this.redis.del(this.key);
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
