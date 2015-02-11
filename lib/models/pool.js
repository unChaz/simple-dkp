var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Player = require('./player');
var Raid = require('./raid');

var poolSchema = new Schema({
  name: String,
  ownerId: String
});

poolSchema.methods.expand = function(callback) {
  var self = this;
  Player.find({ poolId: self._id}, function(err, players) {
    console.log(players)
    if(err) return callback(500);
    Raid.find({poolId: self._id}, function(err, raids){
      if(err) return callback(500);
      var json = self.toJSON();
      json.players = players;
      json.raids = raids;
      return callback(null, json);
    });
  });
};

module.exports = mongoose.model('Pool', poolSchema);
