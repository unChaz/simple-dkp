var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Player = require('./player');
var Raid = require('./raid');
var User = require('./user');

var poolSchema = new Schema({
  players: [Player],
  raids: [Raid],
  name: String,
  ownerId: String
});

poolSchema.methods.expand = function(callback) {
  var expandedPlayers = [];
  this.players.forEach(function(player) {
    player.expand(function(err, expanded) {
      if(!err && expanded) {
        expandedPlayers.push(expanded);
      }
    });
  });
  this.players = expandedPlayers;
  return callback(null, this);
};

poolSchema.statics.new = function(body, user, callback) {
  var Pool = this.model('Pool');
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
};

module.exports = mongoose.model('Pool', poolSchema);
