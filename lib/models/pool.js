var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Player = require('./player');
var User = require('./user');

var poolSchema = new Schema({
  players: [Player],
  ownerId: String 
});

module.exports = mongoose.model('Pool', poolSchema);