var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var Dkp      = require('./dkp');
var Pool     = require('./pool');
console.log(JSON.stringify(Pool));

var playerSchema = new Schema({
  name: String,
  poolId: String,
  dkp: Number,
  server: String,
  race: String,
  class: String,
  specializations: [String]
});

playerSchema.methods.expand = function(callback) {
  Dkp.find({ playerId: this._id }, function(err, dkp) {
    if(err) {
      console.log(err);
    } else {
      this.ledger = dkp;
    }
    return callback(null, this);
  });
};

playerSchema.statics.new = function(body, user, callback) {
  var Player = this.model('Player');
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
        player.save(function(err) {
          if (err) {
            return callback('unexpected server error');
          } else {
            if(!pool.players) pool.players = [];
            pool.players.push(player);
            pool.save(function(err) {
              if (err) {
                return callback('unexpected server error');
              } else {
                return callback(null, player);
              }
            });
          }
        });
      }
    })
  }
};

module.exports = mongoose.model('Player', playerSchema);
