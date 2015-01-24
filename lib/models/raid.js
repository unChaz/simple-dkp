var mongoose = require('mongoose');
var Schema = mongoose.Schema;
var Player = require('./player');
var DKP = require('./dkp');
var Pool = require('./pool');

var raidSchema = new Schema({
  title: String,
  date: Date,
  players: [Player],
  ledger: [DKP],
  ownerId: String,
  poolId: String
});

raidSchema.methods.expand = function(callback) {
  return callback(null, this);
};

raidSchema.statics.new = function(body, user, callback) {
  var Raid = this.model('raid');
  if(!body.title) {
    return callback('title required');
  } else if(!body.poolId) {
    return callback('pool id required');
  } else {
    Pool.find({ _id: body.poolId}, function(err, pool) {
      if(err || !pool) {
        return callback('pool not found');
      } else {
        var raid = new Raid();
        raid.title = body.title;
        raid.poolId = body.poolId;
        raid.ownerId = user._id;
        raid.save(function(err) {
          if (err) {
            return callback('unexpected server error');
          } else {
            pool.raids.push(raid);
            pool.save(function(err) {
              if (err) {
                return callback('unexpected server error');
              } else {
                return callback(null, raid);
              }
            });
          }
        });
      }
    });
  }
};

module.exports = mongoose.model('Raid', raidSchema);
