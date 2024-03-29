var bodyParser = require('body-parser');
var Dkp        = require('../models/dkp');
var Player     = require('../models/player');
var Pool       = require('../models/pool');
var Raid       = require('../models/raid');
var User       = require('../models/user.js');

var DkpService        = require('../services/dkp');
var PlayerService     = require('../services/player');
var PoolService       = require('../services/pool');
var RaidService       = require('../services/raid');

var api = {};

var resources = [
  {
    name: 'players',
    model: Player,
    service: PlayerService,

  },
  {
    name: 'pools',
    model: Pool,
    service: PoolService,
  },
  {
    name: 'raids',
    model: Raid,
    service: RaidService,
  },
  {
    name: 'dkp',
    model: Dkp,
    service: DkpService,
  },
];

var getUser = function(req, callback) {
  var passport = req.session.passport;
  if(!passport || !passport.user) {
    return callback({ error: "not logged in" });
  }

  User.find({_id: passport.user}, function(err, user) {
    if(!err && user) {
      return callback(null, user);
    } else {
      return callback({ error: "user not found" });
    }
  });
}

api.route = function(app) {

  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));

  resources.forEach(function(resource) {
    var name = resource.name;
    var Model = resource.model;
    var Service = resource.service;

    app.get('/api/' + name + '/:id', function(req, res, next) {
      var id = req.params.id;
      if(!id) {
        return res.send({ error: 'Missing ' + name + ' ID'});
      } else {
        Model.findOne({ _id: id }, function(err, obj) {
          if(err || !obj) {
            return res.send({ error: name + ' not found'});
          } else {
            obj.expand(function(err, expanded) {
              if(err) {
                return res.send(500);
              }
              return res.send(expanded);
            });
          }
        });
      }
    });

    app.get('/api/' + name, function(req, res, next) {
      getUser(req, function(err, user) {
        if(err) {
          return res.send(err);
        } else {
          Model.find({ ownerId: user._id }, function(err, obj) {
            if(err || !obj) {
              console.log("Mongo Error: ", err);
              return res.send(500);
            } else {
              return res.send(obj);
            }
          });
        }
      });
    });

    app.post('/api/' + name, function(req, res, next) {
      getUser(req, function(err, user) {
        if(err) {
          return res.send(err);
        } else {
          Service.create(req.body, user, function(err, obj) {
            if(err) {
              return res.send({ error: err});
            } else {
              return res.send(obj);
            }
          });
        }
      });
    });
  });
};

module.exports = api;
