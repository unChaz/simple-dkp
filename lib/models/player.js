var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var playerSchema = new Schema({
  name: String,
  dkp: Number,
  server: String,
  race: String,
  class: String,
  specializations: [String]
});

module.exports = mongoose.model('Player', playerSchema);