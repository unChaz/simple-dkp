var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var types = ['boss', 'loot', 'correction', 'other'];

var dkpSchema = new Schema({
  playerId: String,
  raidId: String,
  value: Number,
  date: Date,
  type: { type: String, enum: types },
  attachment: String, // Loot Name, or Boss Name.
  note: String // Optional additional note.
});

dkpSchema.methods.expand = function(callback) {
  return callback(null, this);
};

dkpSchema.statics.types = types;

module.exports = mongoose.model('DKP', dkpSchema);
