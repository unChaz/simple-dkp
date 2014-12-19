/**
 * Module dependencies.
 */

var page = require('page');
var domify = require('domify');
var empty = require('empty');
var template = require('./homepage-template');

page('/', function(ctx, next) {
  var container = document.querySelector('section.site-content');

  empty(container)
    .appendChild(domify(template()));
});