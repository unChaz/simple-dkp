var mongoose = require('mongoose');
var Schema   = mongoose.Schema;
var DKP      = require('./dkp');

var playerSchema = new Schema({
  name: String,
  alias: String,
  poolId: String,
  dkp: Number,
  server: String,
  race: String,
  class: String,
  specializations: [String]
});

playerSchema.methods.expand = function(callback) {
  var self = this;
  DKP.find({ playerId: this._id }, function(err, dkp) {
    if(err) {
      console.log(err);
    }
    var json = self.toJSON();
    json.dkp = dkp;
    return callback(null, json);
  });
};

module.exports = mongoose.model('Player', playerSchema);
