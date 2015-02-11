var Raid = require('../models/raid');
var Pool = require('../models/pool');
var DKP = require('../models/dkp');
var Player = require('../models/player');

module.exports = {
  create: function(body, user, callback) {
    if(!body.value) {
      return callback('dkp point value required');
    } else if(!body.raidId) {
      return callback('raid id required');
    } else if(!body.playerId) {
      return callback('player id required');
    } else if(!body.type || DKP.types.indexOf(body.type) == -1) {
      return callback('valid dkp type required: ' + DKP.types);
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
                } else if (player.poolId != raid.poolId) {
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
                      Player.findOneAndUpdate({_id: body.playerId},{ $inc: { dkp: dkp.value }})
                      .exec(function(err) {
                        if(err) {
                          return callback('unexpected server error')
                        }
                        return callback(null, dkp);
                      });
                    }
                  });
                }
              });
            }
          });
        }
      });
    }
  }
}
