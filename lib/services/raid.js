var Player = require('../models/player');
var DKP = require('../models/dkp');
var Pool = require('../models/pool');
var Raid = require('../models/raid');

module.exports = {
  create: function(body, user, callback) {
    if(!body.title) {
      return callback('title required');
    } else if(!body.poolId) {
      return callback('poolId required');
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
            if(err) {
              return callback('unexpected server error');
            }
            return callback(null, raid);
          });
        };
      });
    };
  }
}
