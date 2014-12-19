var mongoose = require('mongoose');
var Schema = mongoose.Schema;

var types = ['boss', 'loot', 'other'];

var dkpSchema = new Schema({
  value: Number,
  date: Date,
  playerId: String,
  raidId: String,
  type: { type: String, enum: types },
  attachment: String, // Loot Name, or Boss Name.
  note: String // Optional additional note.
});

module.exports = mongoose.model('DKP', dkpSchema);