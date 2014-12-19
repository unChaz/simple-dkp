/**
 * Module dependencies.
 */

var page = require('page');
var domify = require('domify');
var user = require('user');
var empty = require('empty');
var template = require('./player-template');

/**
 * Define dashboard's dashboard route
 */

page('/player', user.required, function(ctx, next) {
  var container = document.querySelector('section.site-content');

  empty(container)
    .appendChild(domify(template({
      user: user
    })));
});
