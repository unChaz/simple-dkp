var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Player = require('./player');
var DKP = require('./dkp');

var raidSchema = new Schema({
  dkp: Number, //Total DKP Distributed
  date: Date,
  players: [Player],
  dkp: [DKP],
  ownerId: String,
  poolId: String
});

module.exports = mongoose.model('Raid', raidSchema);