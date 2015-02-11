var Dkp    = require('../models/dkp');
var Pool   = require('../models/pool');
var Player = require('../models/player');

module.exports = {
  create: function(body, user, callback) {
    if(!body.name) {
      return callback('character name required');
    } else if(!body.poolId) {
      return callback('pool id required');
    } else if(!body.server) {
      return callback('character server required');
    } else if(!body.race) {
      return callback('character race required');
    } else if(!body.class) {
      return callback('character class required');
    } else {
      Pool.find({ _id: body.poolId }, function(err, pool) {
        if(err) console.log(err);
        if(!pool || pool.ownerId != user._id) {
          return callback('invalid pool id');
        } else {
          var player = new Player();
          player.name = body.name;
          player.poolId = body.poolId;
          player.server = body.server;
          player.race = body.race;
          player.class = body.class;
          player.alias = body.alias;
          player.save(function(err) {
            if (err) {
              return callback('unexpected server error');
            } else {
              return callback(null, player);
            }
          });
        }
      })
    }
  }
}
