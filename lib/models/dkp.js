var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Raid = require('./raid');
var Pool = require('./pool');

var types = ['boss', 'loot', 'other'];

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

dkpSchema.statics.new = function(body, user, callback) {
  var DKP = this.model('dkp');
  if(!body.value) {
    return callback('dkp point value required');
  } else if(!body.raidId) {
    return callback('raid id required');
  } else if(!body.playerId) {
    return callback('player id required');
  } else if(!body.type || types.indexof(body.type) == -1) {
    return callback('valid dkp type required: ' + types);
  } else {
    Player.find({ _id: body.playerId }, function(err, player) {
      if(err) {
        console.log(err);
        return callback('player not found');
      } else if (!player){
        return callback('player not found');
      } else {
        Raid.find({ _id: body.raidId}, function(err, raid) {
          if(err || !raid) {
            return callback('raid not found');
          } else {
            Pool.find({ _id: raid.poolId}, function(err, pool) {
              if(err || !pool) {
                return callback('internal server error');
              } else if (pool._id != body.playerId) {
                return callback('player is not a member of the pool');
              } else {
                var dkp = new DKP();
                dkp.value = body.value;
                dkp.playerId = body.playerId;
                dkp.raidId = body.raidId;
                dkp.date = new Date();
                dkp.server = body.server;
                dkp.attachment = body.attachment;
                dkp.type = body.type;
                dkp.note = body.note;
                dkp.save(function(err) {
                  if (err) {
                    return callback('unexpected server error');
                  } else {
                    raid.ledger.push(dkp);
                    raid.players.push(player);
                    raid.save(function(err) {
                      if (err) {
                        return callback('unexpected server error');
                      } else {
                        return callback(null, dkp);
                      }
                    });
                  }
                });
              }
            });
          }
        });
      }
    })
  }
};

module.exports = mongoose.model('DKP', dkpSchema);
