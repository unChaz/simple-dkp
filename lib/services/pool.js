var Player = require('../models/player');
var Raid = require('../models/raid');
var User = require('../models/user');
var Pool = require('../models/pool');

module.exports = {
  create: function(body, user, callback) {
    var name = body.name;
    if(!name) {
      return callback('name required');
    } else {
      var pool = new Pool();
      pool.name = name;
      pool.ownerId = user._id;
      pool.save(function(err) {
        if (err) {
          return callback('unexpected server error');
        } else {
          return callback(null, pool);
        }
      });
    }
  }
}
