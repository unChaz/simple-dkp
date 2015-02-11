var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Player = require('./player');
var DKP = require('./dkp');
var async = require('async');

var raidSchema = new Schema({
  title: String,
  date: Date,
  ownerId: String,
  poolId: String
});

raidSchema.methods.expand = function(callback) {
  var self = this;
  DKP.find({ raidId:  this._id}, function(err, dkps) {
    var players = {};
    var playerIds = [];
    dkps.forEach(function(dkp) {
      if(!players[dkp.playerId]) {
        players[dkp.playerId] = {};
        playerIds.push(dkp.playerId);
      }
    });
    async.forEach(playerIds, function(playerId, next) {
      Player.findOne({_id: playerId}, function(err, player) {
        if(player) {
          players[playerId] = player;
        }
        return next();
      })
    }, function(err) {
      var json = self.toJSON()
      json.players = players;
      json.dkp = dkps;
      return callback(null, json);
    });
  });
};

module.exports = mongoose.model('Raid', raidSchema);
