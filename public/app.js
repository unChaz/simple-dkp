
/**
 * Require the given path.
 *
 * @param {String} path
 * @return {Object} exports
 * @api public
 */

function require(path, parent, orig) {
  var resolved = require.resolve(path);

  // lookup failed
  if (null == resolved) {
    orig = orig || path;
    parent = parent || 'root';
    var err = new Error('Failed to require "' + orig + '" from "' + parent + '"');
    err.path = orig;
    err.parent = parent;
    err.require = true;
    throw err;
  }

  var module = require.modules[resolved];

  // perform real require()
  // by invoking the module's
  // registered function
  if (!module._resolving && !module.exports) {
    var mod = {};
    mod.exports = {};
    mod.client = mod.component = true;
    module._resolving = true;
    module.call(this, mod.exports, require.relative(resolved), mod);
    delete module._resolving;
    module.exports = mod.exports;
  }

  return module.exports;
}

/**
 * Registered modules.
 */

require.modules = {};

/**
 * Registered aliases.
 */

require.aliases = {};

/**
 * Resolve `path`.
 *
 * Lookup:
 *
 *   - PATH/index.js
 *   - PATH.js
 *   - PATH
 *
 * @param {String} path
 * @return {String} path or null
 * @api private
 */

require.resolve = function(path) {
  if (path.charAt(0) === '/') path = path.slice(1);

  var paths = [
    path,
    path + '.js',
    path + '.json',
    path + '/index.js',
    path + '/index.json'
  ];

  for (var i = 0; i < paths.length; i++) {
    var path = paths[i];
    if (require.modules.hasOwnProperty(path)) return path;
    if (require.aliases.hasOwnProperty(path)) return require.aliases[path];
  }
};

/**
 * Normalize `path` relative to the current path.
 *
 * @param {String} curr
 * @param {String} path
 * @return {String}
 * @api private
 */

require.normalize = function(curr, path) {
  var segs = [];

  if ('.' != path.charAt(0)) return path;

  curr = curr.split('/');
  path = path.split('/');

  for (var i = 0; i < path.length; ++i) {
    if ('..' == path[i]) {
      curr.pop();
    } else if ('.' != path[i] && '' != path[i]) {
      segs.push(path[i]);
    }
  }

  return curr.concat(segs).join('/');
};

/**
 * Register module at `path` with callback `definition`.
 *
 * @param {String} path
 * @param {Function} definition
 * @api private
 */

require.register = function(path, definition) {
  require.modules[path] = definition;
};

/**
 * Alias a module definition.
 *
 * @param {String} from
 * @param {String} to
 * @api private
 */

require.alias = function(from, to) {
  if (!require.modules.hasOwnProperty(from)) {
    throw new Error('Failed to alias "' + from + '", it does not exist');
  }
  require.aliases[to] = from;
};

/**
 * Return a require function relative to the `parent` path.
 *
 * @param {String} parent
 * @return {Function}
 * @api private
 */

require.relative = function(parent) {
  var p = require.normalize(parent, '..');

  /**
   * lastIndexOf helper.
   */

  function lastIndexOf(arr, obj) {
    var i = arr.length;
    while (i--) {
      if (arr[i] === obj) return i;
    }
    return -1;
  }

  /**
   * The relative require() itself.
   */

  function localRequire(path) {
    var resolved = localRequire.resolve(path);
    return require(resolved, parent, path);
  }

  /**
   * Resolve relative to the parent.
   */

  localRequire.resolve = function(path) {
    var c = path.charAt(0);
    if ('/' == c) return path.slice(1);
    if ('.' == c) return require.normalize(p, path);

    // resolve deps by returning
    // the dep in the nearest "deps"
    // directory
    var segs = parent.split('/');
    var i = lastIndexOf(segs, 'deps') + 1;
    if (!i) i = 0;
    path = segs.slice(0, i + 1).join('/') + '/deps/' + path;
    return path;
  };

  /**
   * Check if module is defined at `path`.
   */

  localRequire.exists = function(path) {
    return require.modules.hasOwnProperty(localRequire.resolve(path));
  };

  return localRequire;
};
require.register("visionmedia-page.js/index.js", function(exports, require, module){

;(function(){

  /**
   * Perform initial dispatch.
   */

  var dispatch = true;

  /**
   * Base path.
   */

  var base = '';

  /**
   * Running flag.
   */

  var running;

  /**
   * Register `path` with callback `fn()`,
   * or route `path`, or `page.start()`.
   *
   *   page(fn);
   *   page('*', fn);
   *   page('/user/:id', load, user);
   *   page('/user/' + user.id, { some: 'thing' });
   *   page('/user/' + user.id);
   *   page();
   *
   * @param {String|Function} path
   * @param {Function} fn...
   * @api public
   */

  function page(path, fn) {
    // <callback>
    if ('function' == typeof path) {
      return page('*', path);
    }

    // route <path> to <callback ...>
    if ('function' == typeof fn) {
      var route = new Route(path);
      for (var i = 1; i < arguments.length; ++i) {
        page.callbacks.push(route.middleware(arguments[i]));
      }
    // show <path> with [state]
    } else if ('string' == typeof path) {
      page.show(path, fn);
    // start [options]
    } else {
      page.start(path);
    }
  }

  /**
   * Callback functions.
   */

  page.callbacks = [];

  /**
   * Get or set basepath to `path`.
   *
   * @param {String} path
   * @api public
   */

  page.base = function(path){
    if (0 == arguments.length) return base;
    base = path;
  };

  /**
   * Bind with the given `options`.
   *
   * Options:
   *
   *    - `click` bind to click events [true]
   *    - `popstate` bind to popstate [true]
   *    - `dispatch` perform initial dispatch [true]
   *
   * @param {Object} options
   * @api public
   */

  page.start = function(options){
    options = options || {};
    if (running) return;
    running = true;
    if (false === options.dispatch) dispatch = false;
    if (false !== options.popstate) window.addEventListener('popstate', onpopstate, false);
    if (false !== options.click) window.addEventListener('click', onclick, false);
    if (!dispatch) return;
    var url = location.pathname + location.search + location.hash;
    page.replace(url, null, true, dispatch);
  };

  /**
   * Unbind click and popstate event handlers.
   *
   * @api public
   */

  page.stop = function(){
    running = false;
    removeEventListener('click', onclick, false);
    removeEventListener('popstate', onpopstate, false);
  };

  /**
   * Show `path` with optional `state` object.
   *
   * @param {String} path
   * @param {Object} state
   * @param {Boolean} dispatch
   * @return {Context}
   * @api public
   */

  page.show = function(path, state, dispatch){
    var ctx = new Context(path, state);
    if (false !== dispatch) page.dispatch(ctx);
    if (!ctx.unhandled) ctx.pushState();
    return ctx;
  };

  /**
   * Replace `path` with optional `state` object.
   *
   * @param {String} path
   * @param {Object} state
   * @return {Context}
   * @api public
   */

  page.replace = function(path, state, init, dispatch){
    var ctx = new Context(path, state);
    ctx.init = init;
    if (null == dispatch) dispatch = true;
    if (dispatch) page.dispatch(ctx);
    ctx.save();
    return ctx;
  };

  /**
   * Dispatch the given `ctx`.
   *
   * @param {Object} ctx
   * @api private
   */

  page.dispatch = function(ctx){
    var i = 0;

    function next() {
      var fn = page.callbacks[i++];
      if (!fn) return unhandled(ctx);
      fn(ctx, next);
    }

    next();
  };

  /**
   * Unhandled `ctx`. When it's not the initial
   * popstate then redirect. If you wish to handle
   * 404s on your own use `page('*', callback)`.
   *
   * @param {Context} ctx
   * @api private
   */

  function unhandled(ctx) {
    var current = window.location.pathname + window.location.search;
    if (current == ctx.canonicalPath) return;
    page.stop();
    ctx.unhandled = true;
    window.location = ctx.canonicalPath;
  }

  /**
   * Initialize a new "request" `Context`
   * with the given `path` and optional initial `state`.
   *
   * @param {String} path
   * @param {Object} state
   * @api public
   */

  function Context(path, state) {
    if ('/' == path[0] && 0 != path.indexOf(base)) path = base + path;
    var i = path.indexOf('?');

    this.canonicalPath = path;
    this.path = path.replace(base, '') || '/';

    this.title = document.title;
    this.state = state || {};
    this.state.path = path;
    this.querystring = ~i ? path.slice(i + 1) : '';
    this.pathname = ~i ? path.slice(0, i) : path;
    this.params = [];

    // fragment
    this.hash = '';
    if (!~this.path.indexOf('#')) return;
    var parts = this.path.split('#');
    this.path = parts[0];
    this.hash = parts[1] || '';
    this.querystring = this.querystring.split('#')[0];
  }

  /**
   * Expose `Context`.
   */

  page.Context = Context;

  /**
   * Push state.
   *
   * @api private
   */

  Context.prototype.pushState = function(){
    history.pushState(this.state, this.title, this.canonicalPath);
  };

  /**
   * Save the context state.
   *
   * @api public
   */

  Context.prototype.save = function(){
    history.replaceState(this.state, this.title, this.canonicalPath);
  };

  /**
   * Initialize `Route` with the given HTTP `path`,
   * and an array of `callbacks` and `options`.
   *
   * Options:
   *
   *   - `sensitive`    enable case-sensitive routes
   *   - `strict`       enable strict matching for trailing slashes
   *
   * @param {String} path
   * @param {Object} options.
   * @api private
   */

  function Route(path, options) {
    options = options || {};
    this.path = path;
    this.method = 'GET';
    this.regexp = pathtoRegexp(path
      , this.keys = []
      , options.sensitive
      , options.strict);
  }

  /**
   * Expose `Route`.
   */

  page.Route = Route;

  /**
   * Return route middleware with
   * the given callback `fn()`.
   *
   * @param {Function} fn
   * @return {Function}
   * @api public
   */

  Route.prototype.middleware = function(fn){
    var self = this;
    return function(ctx, next){
      if (self.match(ctx.path, ctx.params)) return fn(ctx, next);
      next();
    };
  };

  /**
   * Check if this route matches `path`, if so
   * populate `params`.
   *
   * @param {String} path
   * @param {Array} params
   * @return {Boolean}
   * @api private
   */

  Route.prototype.match = function(path, params){
    var keys = this.keys
      , qsIndex = path.indexOf('?')
      , pathname = ~qsIndex ? path.slice(0, qsIndex) : path
      , m = this.regexp.exec(pathname);

    if (!m) return false;

    for (var i = 1, len = m.length; i < len; ++i) {
      var key = keys[i - 1];

      var val = 'string' == typeof m[i]
        ? decodeURIComponent(m[i])
        : m[i];

      if (key) {
        params[key.name] = undefined !== params[key.name]
          ? params[key.name]
          : val;
      } else {
        params.push(val);
      }
    }

    return true;
  };

  /**
   * Normalize the given path string,
   * returning a regular expression.
   *
   * An empty array should be passed,
   * which will contain the placeholder
   * key names. For example "/user/:id" will
   * then contain ["id"].
   *
   * @param  {String|RegExp|Array} path
   * @param  {Array} keys
   * @param  {Boolean} sensitive
   * @param  {Boolean} strict
   * @return {RegExp}
   * @api private
   */

  function pathtoRegexp(path, keys, sensitive, strict) {
    if (path instanceof RegExp) return path;
    if (path instanceof Array) path = '(' + path.join('|') + ')';
    path = path
      .concat(strict ? '' : '/?')
      .replace(/\/\(/g, '(?:/')
      .replace(/(\/)?(\.)?:(\w+)(?:(\(.*?\)))?(\?)?/g, function(_, slash, format, key, capture, optional){
        keys.push({ name: key, optional: !! optional });
        slash = slash || '';
        return ''
          + (optional ? '' : slash)
          + '(?:'
          + (optional ? slash : '')
          + (format || '') + (capture || (format && '([^/.]+?)' || '([^/]+?)')) + ')'
          + (optional || '');
      })
      .replace(/([\/.])/g, '\\$1')
      .replace(/\*/g, '(.*)');
    return new RegExp('^' + path + '$', sensitive ? '' : 'i');
  }

  /**
   * Handle "populate" events.
   */

  function onpopstate(e) {
    if (e.state) {
      var path = e.state.path;
      page.replace(path, e.state);
    }
  }

  /**
   * Handle "click" events.
   */

  function onclick(e) {
    if (1 != which(e)) return;
    if (e.metaKey || e.ctrlKey || e.shiftKey) return;
    if (e.defaultPrevented) return;

    // ensure link
    var el = e.target;
    while (el && 'A' != el.nodeName) el = el.parentNode;
    if (!el || 'A' != el.nodeName) return;

    // ensure non-hash for the same path
    var link = el.getAttribute('href');
    if (el.pathname == location.pathname && (el.hash || '#' == link)) return;

    // check target
    if (el.target) return;

    // x-origin
    if (!sameOrigin(el.href)) return;

    // rebuild path
    var path = el.pathname + el.search + (el.hash || '');

    // same page
    var orig = path + el.hash;

    path = path.replace(base, '');
    if (base && orig == path) return;

    e.preventDefault();
    page.show(orig);
  }

  /**
   * Event button.
   */

  function which(e) {
    e = e || window.event;
    return null == e.which
      ? e.button
      : e.which;
  }

  /**
   * Check if `href` is the same origin.
   */

  function sameOrigin(href) {
    var origin = location.protocol + '//' + location.hostname;
    if (location.port) origin += ':' + location.port;
    return 0 == href.indexOf(origin);
  }

  /**
   * Expose `page`.
   */

  if ('undefined' == typeof module) {
    window.page = page;
  } else {
    module.exports = page;
  }

})();

});
require.register("component-domify/index.js", function(exports, require, module){

/**
 * Expose `parse`.
 */

module.exports = parse;

/**
 * Wrap map from jquery.
 */

var map = {
  legend: [1, '<fieldset>', '</fieldset>'],
  tr: [2, '<table><tbody>', '</tbody></table>'],
  col: [2, '<table><tbody></tbody><colgroup>', '</colgroup></table>'],
  _default: [0, '', '']
};

map.td =
map.th = [3, '<table><tbody><tr>', '</tr></tbody></table>'];

map.option =
map.optgroup = [1, '<select multiple="multiple">', '</select>'];

map.thead =
map.tbody =
map.colgroup =
map.caption =
map.tfoot = [1, '<table>', '</table>'];

map.text =
map.circle =
map.ellipse =
map.line =
map.path =
map.polygon =
map.polyline =
map.rect = [1, '<svg xmlns="http://www.w3.org/2000/svg" version="1.1">','</svg>'];

/**
 * Parse `html` and return the children.
 *
 * @param {String} html
 * @return {Array}
 * @api private
 */

function parse(html) {
  if ('string' != typeof html) throw new TypeError('String expected');
  
  // tag name
  var m = /<([\w:]+)/.exec(html);
  if (!m) return document.createTextNode(html);

  html = html.replace(/^\s+|\s+$/g, ''); // Remove leading/trailing whitespace

  var tag = m[1];

  // body support
  if (tag == 'body') {
    var el = document.createElement('html');
    el.innerHTML = html;
    return el.removeChild(el.lastChild);
  }

  // wrap map
  var wrap = map[tag] || map._default;
  var depth = wrap[0];
  var prefix = wrap[1];
  var suffix = wrap[2];
  var el = document.createElement('div');
  el.innerHTML = prefix + html + suffix;
  while (depth--) el = el.lastChild;

  // one element
  if (el.firstChild == el.lastChild) {
    return el.removeChild(el.firstChild);
  }

  // several elements
  var fragment = document.createDocumentFragment();
  while (el.firstChild) {
    fragment.appendChild(el.removeChild(el.firstChild));
  }

  return fragment;
}

});
require.register("visionmedia-jade/lib/runtime.js", function(exports, require, module){
'use strict';

/**
 * Merge two attribute objects giving precedence
 * to values in object `b`. Classes are special-cased
 * allowing for arrays and merging/joining appropriately
 * resulting in a string.
 *
 * @param {Object} a
 * @param {Object} b
 * @return {Object} a
 * @api private
 */

exports.merge = function merge(a, b) {
  if (arguments.length === 1) {
    var attrs = a[0];
    for (var i = 1; i < a.length; i++) {
      attrs = merge(attrs, a[i]);
    }
    return attrs;
  }
  var ac = a['class'];
  var bc = b['class'];

  if (ac || bc) {
    ac = ac || [];
    bc = bc || [];
    if (!Array.isArray(ac)) ac = [ac];
    if (!Array.isArray(bc)) bc = [bc];
    a['class'] = ac.concat(bc).filter(nulls);
  }

  for (var key in b) {
    if (key != 'class') {
      a[key] = b[key];
    }
  }

  return a;
};

/**
 * Filter null `val`s.
 *
 * @param {*} val
 * @return {Boolean}
 * @api private
 */

function nulls(val) {
  return val != null && val !== '';
}

/**
 * join array as classes.
 *
 * @param {*} val
 * @return {String}
 */
exports.joinClasses = joinClasses;
function joinClasses(val) {
  return Array.isArray(val) ? val.map(joinClasses).filter(nulls).join(' ') : val;
}

/**
 * Render the given classes.
 *
 * @param {Array} classes
 * @param {Array.<Boolean>} escaped
 * @return {String}
 */
exports.cls = function cls(classes, escaped) {
  var buf = [];
  for (var i = 0; i < classes.length; i++) {
    if (escaped && escaped[i]) {
      buf.push(exports.escape(joinClasses([classes[i]])));
    } else {
      buf.push(joinClasses(classes[i]));
    }
  }
  var text = joinClasses(buf);
  if (text.length) {
    return ' class="' + text + '"';
  } else {
    return '';
  }
};

/**
 * Render the given attribute.
 *
 * @param {String} key
 * @param {String} val
 * @param {Boolean} escaped
 * @param {Boolean} terse
 * @return {String}
 */
exports.attr = function attr(key, val, escaped, terse) {
  if ('boolean' == typeof val || null == val) {
    if (val) {
      return ' ' + (terse ? key : key + '="' + key + '"');
    } else {
      return '';
    }
  } else if (0 == key.indexOf('data') && 'string' != typeof val) {
    return ' ' + key + "='" + JSON.stringify(val).replace(/'/g, '&apos;') + "'";
  } else if (escaped) {
    return ' ' + key + '="' + exports.escape(val) + '"';
  } else {
    return ' ' + key + '="' + val + '"';
  }
};

/**
 * Render the given attributes object.
 *
 * @param {Object} obj
 * @param {Object} escaped
 * @return {String}
 */
exports.attrs = function attrs(obj, terse){
  var buf = [];

  var keys = Object.keys(obj);

  if (keys.length) {
    for (var i = 0; i < keys.length; ++i) {
      var key = keys[i]
        , val = obj[key];

      if ('class' == key) {
        if (val = joinClasses(val)) {
          buf.push(' ' + key + '="' + val + '"');
        }
      } else {
        buf.push(exports.attr(key, val, false, terse));
      }
    }
  }

  return buf.join('');
};

/**
 * Escape the given string of `html`.
 *
 * @param {String} html
 * @return {String}
 * @api private
 */

exports.escape = function escape(html){
  var result = String(html)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
  if (result === '' + html) return html;
  else return result;
};

/**
 * Re-throw the given `err` in context to the
 * the jade in `filename` at the given `lineno`.
 *
 * @param {Error} err
 * @param {String} filename
 * @param {String} lineno
 * @api private
 */

exports.rethrow = function rethrow(err, filename, lineno, str){
  if (!(err instanceof Error)) throw err;
  if ((typeof window != 'undefined' || !filename) && !str) {
    err.message += ' on line ' + lineno;
    throw err;
  }
  try {
    str =  str || require('fs').readFileSync(filename, 'utf8')
  } catch (ex) {
    rethrow(err, null, lineno)
  }
  var context = 3
    , lines = str.split('\n')
    , start = Math.max(lineno - context, 0)
    , end = Math.min(lines.length, lineno + context);

  // Error context
  var context = lines.slice(start, end).map(function(line, i){
    var curr = i + start + 1;
    return (curr == lineno ? '  > ' : '    ')
      + curr
      + '| '
      + line;
  }).join('\n');

  // Alter exception message
  err.path = filename;
  err.message = (filename || 'Jade') + ':' + lineno
    + '\n' + context + '\n\n' + err.message;
  throw err;
};

});
require.register("yields-empty/index.js", function(exports, require, module){

/**
 * Empty the given `el`.
 * 
 * @param {Element} el
 * @return {Element}
 */

module.exports = function(el, node){
  while (node = el.firstChild) el.removeChild(node);
  return el;
};

});
require.register("homepage/homepage-controller.js", function(exports, require, module){
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
});
require.register("homepage/homepage-template.js", function(exports, require, module){
var jade = require("jade");
module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

var jade_indent = [];
buf.push("\n<header>\n  <h1>Discord DKP</h1>\n  <p class=\"description\">Simple and Discord DKP Management. </p>\n</header>\n<p class=\"social-login\"><a href=\"/auth/twitter\" class=\"btn btn-primary\"> login with Twitter</a><a href=\"/auth/facebook\" class=\"btn btn-primary\"> login with Facebook</a></p>");;return buf.join("");
}
});
require.register("dashboard/dashboard-controller.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var page = require('page');
var domify = require('domify');
var user = require('user');
var empty = require('empty');
var template = require('./dashboard-template');

/**
 * Define dashboard's dashboard route
 */

page('/dashboard', user.required, function(ctx, next) {
  var container = document.querySelector('section.site-content');

  empty(container)
    .appendChild(domify(template({
      user: user
    })));
});

});
require.register("dashboard/dashboard-template.js", function(exports, require, module){
var jade = require("jade");
module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

var jade_indent = [];
buf.push("\n<ul class=\"nav nav-tabs\">\n  <li role=\"presentation\" class=\"active\"><a href=\"/dashboard\">Dashboard</a></li>\n  <li role=\"presentation\" class=\"navbar-right\"><a href=\"/logout\">signout</a></li>\n</ul>\n<div class=\"row\">\n  <div class=\"col-md-6\">\n    <h1>My Pools</h1>\n    <table class=\"table\">\n      <thead>\n        <tr>\n          <th>Name</th>\n          <th>Players\n            <tbody>\n              <tr>\n                <td> <a href=\"/pool\">Discord Guild</a></td>\n                <td>25</td>\n              </tr>\n              <tr>\n                <td> <a href=\"/pool\">PUG</a></td>\n                <td>43</td>\n              </tr>\n            </tbody>\n          </th>\n        </tr>\n      </thead>\n    </table>\n    <form>\n      <input type=\"text\" placeholder=\"name\"/>\n      <input type=\"submit\" value=\"create\" class=\"btn btn-xs btn-primary\"/>\n    </form>\n  </div>\n</div>");;return buf.join("");
}
});
require.register("component-emitter/index.js", function(exports, require, module){

/**
 * Expose `Emitter`.
 */

module.exports = Emitter;

/**
 * Initialize a new `Emitter`.
 *
 * @api public
 */

function Emitter(obj) {
  if (obj) return mixin(obj);
};

/**
 * Mixin the emitter properties.
 *
 * @param {Object} obj
 * @return {Object}
 * @api private
 */

function mixin(obj) {
  for (var key in Emitter.prototype) {
    obj[key] = Emitter.prototype[key];
  }
  return obj;
}

/**
 * Listen on the given `event` with `fn`.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.on =
Emitter.prototype.addEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};
  (this._callbacks[event] = this._callbacks[event] || [])
    .push(fn);
  return this;
};

/**
 * Adds an `event` listener that will be invoked a single
 * time then automatically removed.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.once = function(event, fn){
  var self = this;
  this._callbacks = this._callbacks || {};

  function on() {
    self.off(event, on);
    fn.apply(this, arguments);
  }

  on.fn = fn;
  this.on(event, on);
  return this;
};

/**
 * Remove the given callback for `event` or all
 * registered callbacks.
 *
 * @param {String} event
 * @param {Function} fn
 * @return {Emitter}
 * @api public
 */

Emitter.prototype.off =
Emitter.prototype.removeListener =
Emitter.prototype.removeAllListeners =
Emitter.prototype.removeEventListener = function(event, fn){
  this._callbacks = this._callbacks || {};

  // all
  if (0 == arguments.length) {
    this._callbacks = {};
    return this;
  }

  // specific event
  var callbacks = this._callbacks[event];
  if (!callbacks) return this;

  // remove all handlers
  if (1 == arguments.length) {
    delete this._callbacks[event];
    return this;
  }

  // remove specific handler
  var cb;
  for (var i = 0; i < callbacks.length; i++) {
    cb = callbacks[i];
    if (cb === fn || cb.fn === fn) {
      callbacks.splice(i, 1);
      break;
    }
  }
  return this;
};

/**
 * Emit `event` with the given args.
 *
 * @param {String} event
 * @param {Mixed} ...
 * @return {Emitter}
 */

Emitter.prototype.emit = function(event){
  this._callbacks = this._callbacks || {};
  var args = [].slice.call(arguments, 1)
    , callbacks = this._callbacks[event];

  if (callbacks) {
    callbacks = callbacks.slice(0);
    for (var i = 0, len = callbacks.length; i < len; ++i) {
      callbacks[i].apply(this, args);
    }
  }

  return this;
};

/**
 * Return array of callbacks for `event`.
 *
 * @param {String} event
 * @return {Array}
 * @api public
 */

Emitter.prototype.listeners = function(event){
  this._callbacks = this._callbacks || {};
  return this._callbacks[event] || [];
};

/**
 * Check if this emitter has `event` handlers.
 *
 * @param {String} event
 * @return {Boolean}
 * @api public
 */

Emitter.prototype.hasListeners = function(event){
  return !! this.listeners(event).length;
};

});
require.register("component-reduce/index.js", function(exports, require, module){

/**
 * Reduce `arr` with `fn`.
 *
 * @param {Array} arr
 * @param {Function} fn
 * @param {Mixed} initial
 *
 * TODO: combatible error handling?
 */

module.exports = function(arr, fn, initial){  
  var idx = 0;
  var len = arr.length;
  var curr = arguments.length == 3
    ? initial
    : arr[idx++];

  while (idx < len) {
    curr = fn.call(null, curr, arr[idx], ++idx, arr);
  }
  
  return curr;
};
});
require.register("visionmedia-superagent/lib/client.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var Emitter = require('emitter');
var reduce = require('reduce');

/**
 * Root reference for iframes.
 */

var root = 'undefined' == typeof window
  ? this
  : window;

/**
 * Noop.
 */

function noop(){};

/**
 * Check if `obj` is a host object,
 * we don't want to serialize these :)
 *
 * TODO: future proof, move to compoent land
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isHost(obj) {
  var str = {}.toString.call(obj);

  switch (str) {
    case '[object File]':
    case '[object Blob]':
    case '[object FormData]':
      return true;
    default:
      return false;
  }
}

/**
 * Determine XHR.
 */

function getXHR() {
  if (root.XMLHttpRequest
    && ('file:' != root.location.protocol || !root.ActiveXObject)) {
    return new XMLHttpRequest;
  } else {
    try { return new ActiveXObject('Microsoft.XMLHTTP'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.6.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP.3.0'); } catch(e) {}
    try { return new ActiveXObject('Msxml2.XMLHTTP'); } catch(e) {}
  }
  return false;
}

/**
 * Removes leading and trailing whitespace, added to support IE.
 *
 * @param {String} s
 * @return {String}
 * @api private
 */

var trim = ''.trim
  ? function(s) { return s.trim(); }
  : function(s) { return s.replace(/(^\s*|\s*$)/g, ''); };

/**
 * Check if `obj` is an object.
 *
 * @param {Object} obj
 * @return {Boolean}
 * @api private
 */

function isObject(obj) {
  return obj === Object(obj);
}

/**
 * Serialize the given `obj`.
 *
 * @param {Object} obj
 * @return {String}
 * @api private
 */

function serialize(obj) {
  if (!isObject(obj)) return obj;
  var pairs = [];
  for (var key in obj) {
    if (null != obj[key]) {
      pairs.push(encodeURIComponent(key)
        + '=' + encodeURIComponent(obj[key]));
    }
  }
  return pairs.join('&');
}

/**
 * Expose serialization method.
 */

 request.serializeObject = serialize;

 /**
  * Parse the given x-www-form-urlencoded `str`.
  *
  * @param {String} str
  * @return {Object}
  * @api private
  */

function parseString(str) {
  var obj = {};
  var pairs = str.split('&');
  var parts;
  var pair;

  for (var i = 0, len = pairs.length; i < len; ++i) {
    pair = pairs[i];
    parts = pair.split('=');
    obj[decodeURIComponent(parts[0])] = decodeURIComponent(parts[1]);
  }

  return obj;
}

/**
 * Expose parser.
 */

request.parseString = parseString;

/**
 * Default MIME type map.
 *
 *     superagent.types.xml = 'application/xml';
 *
 */

request.types = {
  html: 'text/html',
  json: 'application/json',
  xml: 'application/xml',
  urlencoded: 'application/x-www-form-urlencoded',
  'form': 'application/x-www-form-urlencoded',
  'form-data': 'application/x-www-form-urlencoded'
};

/**
 * Default serialization map.
 *
 *     superagent.serialize['application/xml'] = function(obj){
 *       return 'generated xml here';
 *     };
 *
 */

 request.serialize = {
   'application/x-www-form-urlencoded': serialize,
   'application/json': JSON.stringify
 };

 /**
  * Default parsers.
  *
  *     superagent.parse['application/xml'] = function(str){
  *       return { object parsed from str };
  *     };
  *
  */

request.parse = {
  'application/x-www-form-urlencoded': parseString,
  'application/json': JSON.parse
};

/**
 * Parse the given header `str` into
 * an object containing the mapped fields.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function parseHeader(str) {
  var lines = str.split(/\r?\n/);
  var fields = {};
  var index;
  var line;
  var field;
  var val;

  lines.pop(); // trailing CRLF

  for (var i = 0, len = lines.length; i < len; ++i) {
    line = lines[i];
    index = line.indexOf(':');
    field = line.slice(0, index).toLowerCase();
    val = trim(line.slice(index + 1));
    fields[field] = val;
  }

  return fields;
}

/**
 * Return the mime type for the given `str`.
 *
 * @param {String} str
 * @return {String}
 * @api private
 */

function type(str){
  return str.split(/ *; */).shift();
};

/**
 * Return header field parameters.
 *
 * @param {String} str
 * @return {Object}
 * @api private
 */

function params(str){
  return reduce(str.split(/ *; */), function(obj, str){
    var parts = str.split(/ *= */)
      , key = parts.shift()
      , val = parts.shift();

    if (key && val) obj[key] = val;
    return obj;
  }, {});
};

/**
 * Initialize a new `Response` with the given `xhr`.
 *
 *  - set flags (.ok, .error, etc)
 *  - parse header
 *
 * Examples:
 *
 *  Aliasing `superagent` as `request` is nice:
 *
 *      request = superagent;
 *
 *  We can use the promise-like API, or pass callbacks:
 *
 *      request.get('/').end(function(res){});
 *      request.get('/', function(res){});
 *
 *  Sending data can be chained:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' })
 *        .end(function(res){});
 *
 *  Or passed to `.send()`:
 *
 *      request
 *        .post('/user')
 *        .send({ name: 'tj' }, function(res){});
 *
 *  Or passed to `.post()`:
 *
 *      request
 *        .post('/user', { name: 'tj' })
 *        .end(function(res){});
 *
 * Or further reduced to a single call for simple cases:
 *
 *      request
 *        .post('/user', { name: 'tj' }, function(res){});
 *
 * @param {XMLHTTPRequest} xhr
 * @param {Object} options
 * @api private
 */

function Response(req, options) {
  options = options || {};
  this.req = req;
  this.xhr = this.req.xhr;
  this.text = this.xhr.responseText;
  this.setStatusProperties(this.xhr.status);
  this.header = this.headers = parseHeader(this.xhr.getAllResponseHeaders());
  // getAllResponseHeaders sometimes falsely returns "" for CORS requests, but
  // getResponseHeader still works. so we get content-type even if getting
  // other headers fails.
  this.header['content-type'] = this.xhr.getResponseHeader('content-type');
  this.setHeaderProperties(this.header);
  this.body = this.req.method != 'HEAD'
    ? this.parseBody(this.text)
    : null;
}

/**
 * Get case-insensitive `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api public
 */

Response.prototype.get = function(field){
  return this.header[field.toLowerCase()];
};

/**
 * Set header related properties:
 *
 *   - `.type` the content type without params
 *
 * A response of "Content-Type: text/plain; charset=utf-8"
 * will provide you with a `.type` of "text/plain".
 *
 * @param {Object} header
 * @api private
 */

Response.prototype.setHeaderProperties = function(header){
  // content-type
  var ct = this.header['content-type'] || '';
  this.type = type(ct);

  // params
  var obj = params(ct);
  for (var key in obj) this[key] = obj[key];
};

/**
 * Parse the given body `str`.
 *
 * Used for auto-parsing of bodies. Parsers
 * are defined on the `superagent.parse` object.
 *
 * @param {String} str
 * @return {Mixed}
 * @api private
 */

Response.prototype.parseBody = function(str){
  var parse = request.parse[this.type];
  return parse
    ? parse(str)
    : null;
};

/**
 * Set flags such as `.ok` based on `status`.
 *
 * For example a 2xx response will give you a `.ok` of __true__
 * whereas 5xx will be __false__ and `.error` will be __true__. The
 * `.clientError` and `.serverError` are also available to be more
 * specific, and `.statusType` is the class of error ranging from 1..5
 * sometimes useful for mapping respond colors etc.
 *
 * "sugar" properties are also defined for common cases. Currently providing:
 *
 *   - .noContent
 *   - .badRequest
 *   - .unauthorized
 *   - .notAcceptable
 *   - .notFound
 *
 * @param {Number} status
 * @api private
 */

Response.prototype.setStatusProperties = function(status){
  var type = status / 100 | 0;

  // status / class
  this.status = status;
  this.statusType = type;

  // basics
  this.info = 1 == type;
  this.ok = 2 == type;
  this.clientError = 4 == type;
  this.serverError = 5 == type;
  this.error = (4 == type || 5 == type)
    ? this.toError()
    : false;

  // sugar
  this.accepted = 202 == status;
  this.noContent = 204 == status || 1223 == status;
  this.badRequest = 400 == status;
  this.unauthorized = 401 == status;
  this.notAcceptable = 406 == status;
  this.notFound = 404 == status;
  this.forbidden = 403 == status;
};

/**
 * Return an `Error` representative of this response.
 *
 * @return {Error}
 * @api public
 */

Response.prototype.toError = function(){
  var req = this.req;
  var method = req.method;
  var url = req.url;

  var msg = 'cannot ' + method + ' ' + url + ' (' + this.status + ')';
  var err = new Error(msg);
  err.status = this.status;
  err.method = method;
  err.url = url;

  return err;
};

/**
 * Expose `Response`.
 */

request.Response = Response;

/**
 * Initialize a new `Request` with the given `method` and `url`.
 *
 * @param {String} method
 * @param {String} url
 * @api public
 */

function Request(method, url) {
  var self = this;
  Emitter.call(this);
  this._query = this._query || [];
  this.method = method;
  this.url = url;
  this.header = {};
  this._header = {};
  this.on('end', function(){
    var res = new Response(self);
    if ('HEAD' == method) res.text = null;
    self.callback(null, res);
  });
}

/**
 * Mixin `Emitter`.
 */

Emitter(Request.prototype);

/**
 * Allow for extension
 */

Request.prototype.use = function(fn) {
  fn(this);
  return this;
}

/**
 * Set timeout to `ms`.
 *
 * @param {Number} ms
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.timeout = function(ms){
  this._timeout = ms;
  return this;
};

/**
 * Clear previous timeout.
 *
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.clearTimeout = function(){
  this._timeout = 0;
  clearTimeout(this._timer);
  return this;
};

/**
 * Abort the request, and clear potential timeout.
 *
 * @return {Request}
 * @api public
 */

Request.prototype.abort = function(){
  if (this.aborted) return;
  this.aborted = true;
  this.xhr.abort();
  this.clearTimeout();
  this.emit('abort');
  return this;
};

/**
 * Set header `field` to `val`, or multiple fields with one object.
 *
 * Examples:
 *
 *      req.get('/')
 *        .set('Accept', 'application/json')
 *        .set('X-API-Key', 'foobar')
 *        .end(callback);
 *
 *      req.get('/')
 *        .set({ Accept: 'application/json', 'X-API-Key': 'foobar' })
 *        .end(callback);
 *
 * @param {String|Object} field
 * @param {String} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.set = function(field, val){
  if (isObject(field)) {
    for (var key in field) {
      this.set(key, field[key]);
    }
    return this;
  }
  this._header[field.toLowerCase()] = val;
  this.header[field] = val;
  return this;
};

/**
 * Get case-insensitive header `field` value.
 *
 * @param {String} field
 * @return {String}
 * @api private
 */

Request.prototype.getHeader = function(field){
  return this._header[field.toLowerCase()];
};

/**
 * Set Content-Type to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.xml = 'application/xml';
 *
 *      request.post('/')
 *        .type('xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 *      request.post('/')
 *        .type('application/xml')
 *        .send(xmlstring)
 *        .end(callback);
 *
 * @param {String} type
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.type = function(type){
  this.set('Content-Type', request.types[type] || type);
  return this;
};

/**
 * Set Accept to `type`, mapping values from `request.types`.
 *
 * Examples:
 *
 *      superagent.types.json = 'application/json';
 *
 *      request.get('/agent')
 *        .accept('json')
 *        .end(callback);
 *
 *      request.get('/agent')
 *        .accept('application/json')
 *        .end(callback);
 *
 * @param {String} accept
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.accept = function(type){
  this.set('Accept', request.types[type] || type);
  return this;
};

/**
 * Set Authorization field value with `user` and `pass`.
 *
 * @param {String} user
 * @param {String} pass
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.auth = function(user, pass){
  var str = btoa(user + ':' + pass);
  this.set('Authorization', 'Basic ' + str);
  return this;
};

/**
* Add query-string `val`.
*
* Examples:
*
*   request.get('/shoes')
*     .query('size=10')
*     .query({ color: 'blue' })
*
* @param {Object|String} val
* @return {Request} for chaining
* @api public
*/

Request.prototype.query = function(val){
  if ('string' != typeof val) val = serialize(val);
  if (val) this._query.push(val);
  return this;
};

/**
 * Write the field `name` and `val` for "multipart/form-data"
 * request bodies.
 *
 * ``` js
 * request.post('/upload')
 *   .field('foo', 'bar')
 *   .end(callback);
 * ```
 *
 * @param {String} name
 * @param {String|Blob|File} val
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.field = function(name, val){
  if (!this._formData) this._formData = new FormData();
  this._formData.append(name, val);
  return this;
};

/**
 * Queue the given `file` as an attachment to the specified `field`,
 * with optional `filename`.
 *
 * ``` js
 * request.post('/upload')
 *   .attach(new Blob(['<a id="a"><b id="b">hey!</b></a>'], { type: "text/html"}))
 *   .end(callback);
 * ```
 *
 * @param {String} field
 * @param {Blob|File} file
 * @param {String} filename
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.attach = function(field, file, filename){
  if (!this._formData) this._formData = new FormData();
  this._formData.append(field, file, filename);
  return this;
};

/**
 * Send `data`, defaulting the `.type()` to "json" when
 * an object is given.
 *
 * Examples:
 *
 *       // querystring
 *       request.get('/search')
 *         .end(callback)
 *
 *       // multiple data "writes"
 *       request.get('/search')
 *         .send({ search: 'query' })
 *         .send({ range: '1..5' })
 *         .send({ order: 'desc' })
 *         .end(callback)
 *
 *       // manual json
 *       request.post('/user')
 *         .type('json')
 *         .send('{"name":"tj"})
 *         .end(callback)
 *
 *       // auto json
 *       request.post('/user')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // manual x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send('name=tj')
 *         .end(callback)
 *
 *       // auto x-www-form-urlencoded
 *       request.post('/user')
 *         .type('form')
 *         .send({ name: 'tj' })
 *         .end(callback)
 *
 *       // defaults to x-www-form-urlencoded
  *      request.post('/user')
  *        .send('name=tobi')
  *        .send('species=ferret')
  *        .end(callback)
 *
 * @param {String|Object} data
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.send = function(data){
  var obj = isObject(data);
  var type = this.getHeader('Content-Type');

  // merge
  if (obj && isObject(this._data)) {
    for (var key in data) {
      this._data[key] = data[key];
    }
  } else if ('string' == typeof data) {
    if (!type) this.type('form');
    type = this.getHeader('Content-Type');
    if ('application/x-www-form-urlencoded' == type) {
      this._data = this._data
        ? this._data + '&' + data
        : data;
    } else {
      this._data = (this._data || '') + data;
    }
  } else {
    this._data = data;
  }

  if (!obj) return this;
  if (!type) this.type('json');
  return this;
};

/**
 * Invoke the callback with `err` and `res`
 * and handle arity check.
 *
 * @param {Error} err
 * @param {Response} res
 * @api private
 */

Request.prototype.callback = function(err, res){
  var fn = this._callback;
  if (2 == fn.length) return fn(err, res);
  if (err) return this.emit('error', err);
  fn(res);
};

/**
 * Invoke callback with x-domain error.
 *
 * @api private
 */

Request.prototype.crossDomainError = function(){
  var err = new Error('Origin is not allowed by Access-Control-Allow-Origin');
  err.crossDomain = true;
  this.callback(err);
};

/**
 * Invoke callback with timeout error.
 *
 * @api private
 */

Request.prototype.timeoutError = function(){
  var timeout = this._timeout;
  var err = new Error('timeout of ' + timeout + 'ms exceeded');
  err.timeout = timeout;
  this.callback(err);
};

/**
 * Enable transmission of cookies with x-domain requests.
 *
 * Note that for this to work the origin must not be
 * using "Access-Control-Allow-Origin" with a wildcard,
 * and also must set "Access-Control-Allow-Credentials"
 * to "true".
 *
 * @api public
 */

Request.prototype.withCredentials = function(){
  this._withCredentials = true;
  return this;
};

/**
 * Initiate request, invoking callback `fn(res)`
 * with an instanceof `Response`.
 *
 * @param {Function} fn
 * @return {Request} for chaining
 * @api public
 */

Request.prototype.end = function(fn){
  var self = this;
  var xhr = this.xhr = getXHR();
  var query = this._query.join('&');
  var timeout = this._timeout;
  var data = this._formData || this._data;

  // store callback
  this._callback = fn || noop;

  // state change
  xhr.onreadystatechange = function(){
    if (4 != xhr.readyState) return;
    if (0 == xhr.status) {
      if (self.aborted) return self.timeoutError();
      return self.crossDomainError();
    }
    self.emit('end');
  };

  // progress
  if (xhr.upload) {
    xhr.upload.onprogress = function(e){
      e.percent = e.loaded / e.total * 100;
      self.emit('progress', e);
    };
  }

  // timeout
  if (timeout && !this._timer) {
    this._timer = setTimeout(function(){
      self.abort();
    }, timeout);
  }

  // querystring
  if (query) {
    query = request.serializeObject(query);
    this.url += ~this.url.indexOf('?')
      ? '&' + query
      : '?' + query;
  }

  // initiate request
  xhr.open(this.method, this.url, true);

  // CORS
  if (this._withCredentials) xhr.withCredentials = true;

  // body
  if ('GET' != this.method && 'HEAD' != this.method && 'string' != typeof data && !isHost(data)) {
    // serialize stuff
    var serialize = request.serialize[this.getHeader('Content-Type')];
    if (serialize) data = serialize(data);
  }

  // set header fields
  for (var field in this.header) {
    if (null == this.header[field]) continue;
    xhr.setRequestHeader(field, this.header[field]);
  }

  // send stuff
  this.emit('request', this);
  xhr.send(data);
  return this;
};

/**
 * Expose `Request`.
 */

request.Request = Request;

/**
 * Issue a request:
 *
 * Examples:
 *
 *    request('GET', '/users').end(callback)
 *    request('/users').end(callback)
 *    request('/users', callback)
 *
 * @param {String} method
 * @param {String|Function} url or callback
 * @return {Request}
 * @api public
 */

function request(method, url) {
  // callback
  if ('function' == typeof url) {
    return new Request('GET', method).end(url);
  }

  // url first
  if (1 == arguments.length) {
    return new Request('GET', method);
  }

  return new Request(method, url);
}

/**
 * GET `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.get = function(url, data, fn){
  var req = request('GET', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.query(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * HEAD `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.head = function(url, data, fn){
  var req = request('HEAD', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * DELETE `url` with optional callback `fn(res)`.
 *
 * @param {String} url
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.del = function(url, fn){
  var req = request('DELETE', url);
  if (fn) req.end(fn);
  return req;
};

/**
 * PATCH `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.patch = function(url, data, fn){
  var req = request('PATCH', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * POST `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed} data
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.post = function(url, data, fn){
  var req = request('POST', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * PUT `url` with optional `data` and callback `fn(res)`.
 *
 * @param {String} url
 * @param {Mixed|Function} data or fn
 * @param {Function} fn
 * @return {Request}
 * @api public
 */

request.put = function(url, data, fn){
  var req = request('PUT', url);
  if ('function' == typeof data) fn = data, data = null;
  if (data) req.send(data);
  if (fn) req.end(fn);
  return req;
};

/**
 * Expose `request`.
 */

module.exports = request;

});
require.register("user-model/model.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var request = require('superagent');
var Emitter = require('emitter');

/**
 * Expose user model
 */

module.exports = User;

/**
 * User
 *
 * @param {String} path user's load path
 * @return {User} `User` instance
 * @api public
 */

function User (path) {
  if (!(this instanceof User)) {
    return new User(path);
  };

  this.$_path = path;
  this.$_ready = "unloaded";
}

/**
 * Inherit from `Emitter`
 */

Emitter(User.prototype);

/**
 * Loads user from path
 *
 * @param {String} path user's load path
 * @return {User} `User` instance.
 * @api public
 */

User.prototype.load = function(path) {
  var _this = this;
  this.$_path = path || this.$_path;
  this.$_ready = "loading";

  request
  .get('/api/users/'.concat(this.$_path))
  .set('Accept', 'application/json')
  .on('error', _handleRequestError.bind(this))
  .end(function(res) {
    var u = res.body;

    if (!res.ok) {
      return _handleRequestError.bind(_this)(res.error);
    };

    if (!(u.id || u._id)) {
      return _handleRequestError.bind(_this)('User not found');
    };

    for (var prop in u) {
      if (u.hasOwnProperty(prop)) {
        _this[prop] = u[prop]
      }
    }
    _this.$_ready = "loaded";
    _this.emit('ready');
  });

  return this;
}

/**
 * Call `fn` once User is
 * ready from loading
 *
 * @param {Function} fn callback fired on ready
 * @return {User} `User` instance
 * @api public
 */

User.prototype.ready = function(fn) {
  var _this = this;

  function done() {
    if ("loaded" === _this.state()) {
      return fn();
    }
  }

  if ("loaded" === this.state()) {
    setTimeout(done, 0);
  } else {
    this.once("ready", done);
  }

  return this;
}

/**
 * Get $_ready state
 *
 * @return {String}
 * @api public
 */

User.prototype.state = function() {
  return this.$_ready;
}

/**
 * Handle error from requests
 *
 * @param {Object} err from request
 * @api private
 */

function _handleRequestError (err) {
  this.$_ready = "unloaded";
  this.emit('error', err);
}
});
require.register("user/user.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var page = require('page');
var User = require('user-model');

/**
 * Instantiate and expose user
 */
var user = module.exports = new User();

user.load("me");

user.required = function(ctx, next) {
  if ("unloaded" === user.state()) {
    setTimeout(loggedout, 0);
  } else if ("loading" === user.state()) {
    user.once('error', loggedout);
  }
  user.ready(function() {
    user.off('error', loggedout);
    next();
  });
};

function loggedout () {
  console.log('user logged out');
  page('/')
}

});
require.register("pool/pool-controller.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var page = require('page');
var domify = require('domify');
var user = require('user');
var empty = require('empty');
var template = require('./pool-template');

/**
 * Define dashboard's dashboard route
 */

page('/pool', user.required, function(ctx, next) {
  var container = document.querySelector('section.site-content');

  empty(container)
    .appendChild(domify(template({
      user: user
    })));
});

});
require.register("pool/pool-template.js", function(exports, require, module){
var jade = require("jade");
module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

var jade_indent = [];
buf.push("\n<ul class=\"nav nav-tabs\">\n  <li role=\"presentation\"><a href=\"/dashboard\">Dashboard</a></li>\n  <li role=\"presentation\" class=\"active\"><a href=\"#\">Discord Guild</a></li>\n  <li role=\"presentation\" class=\"navbar-right\"><a href=\"/logout\">signout</a></li>\n</ul>\n<div class=\"row\">\n  <div class=\"col-md-6\">\n    <h2>Players <a class=\"btn btn-default btn-sm\"><span class=\"glyphicon glyphicon-plus\"></span></a></h2>\n    <table class=\"table\">\n      <thead>\n        <tr>\n          <th>Player</th>\n          <th>DKP\n            <tbody>\n              <tr>\n                <td> <a href=\"/player\">Muse</a></td>\n                <td>234</td>\n              </tr>\n              <tr>\n                <td> <a href=\"/player\">Yvayne</a></td>\n                <td>434</td>\n              </tr>\n            </tbody>\n          </th>\n        </tr>\n      </thead>\n    </table>\n    <h2>Import DKP</h2>\n    <p>With this tool you can import DKP standings from several WoW Addons.</p>\n    <div class=\"center-block\">\n      <form role=\"form\">\n        <input type=\"file\"/><br/>\n        <select>\n          <option value=\"Quick DKP\">Quick DKP</option>\n          <option value=\"epgp\">epgp</option>\n        </select><br/><br/>\n        <button type=\"sumbit\" class=\"btn btn-primary\">Import</button>\n      </form>\n    </div>\n  </div>\n  <div class=\"col-md-6\">\n    <h2>Raids <a class=\"btn btn-default btn-sm\"><span class=\"glyphicon glyphicon-plus\"></span></a></h2>\n    <table class=\"table\">\n      <thead>\n        <tr>\n          <th>Name</th>\n          <th>Date</th>\n          <th>Net DKP</th>\n        </tr>\n        <tbody>\n          <tr>\n            <td> <a href=\"/raid\">Tuesday Progression</a></td>\n            <td>12/16/2014</td>\n            <td>-98</td>\n          </tr>\n          <tr>\n            <td> <a href=\"/raid\">Thursday Progression</a></td>\n            <td>12/18/2014</td>\n            <td>23</td>\n          </tr>\n        </tbody>\n      </thead>\n    </table>\n  </div>\n</div>");;return buf.join("");
}
});
require.register("player/player-controller.js", function(exports, require, module){
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

});
require.register("player/player-template.js", function(exports, require, module){
var jade = require("jade");
module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

var jade_indent = [];
buf.push("\n<ul class=\"nav nav-tabs\">\n  <li role=\"presentation\"><a href=\"/dashboard\">Dashboard</a></li>\n  <li role=\"presentation\"><a href=\"/pool\">Discord Guild</a></li>\n  <li role=\"presentation\" class=\"active\"><a href=\"#\">Muse</a></li>\n  <li role=\"presentation\" class=\"navbar-right\"><a href=\"/logout\">signout</a></li>\n</ul>\n<div class=\"row\">\n  <div class=\"col-md-6\">\n    <h1>Muse</h1>\n    <table class=\"table table-striped\">\n      <tbody>\n        <tr>\n          <th><strong>Class</strong></th>\n          <th>Shaman</th>\n        </tr>\n        <tr>\n          <th> <strong>Specialization</strong></th>\n          <th>Restoration</th>\n        </tr>\n        <tr>\n          <th><strong>Race</strong></th>\n          <th>Draenei</th>\n        </tr>\n        <tr>\n          <th><strong>Bosses Downed</strong></th>\n          <th>25</th>\n        </tr>\n        <tr>\n          <th><strong>DKP Spent</strong></th>\n          <th>356</th>\n        </tr>\n        <tr>\n          <th><strong>DKP Earned</strong></th>\n          <th>420</th>\n        </tr>\n        <tr>\n          <th><strong>Net DKP</strong></th>\n          <th>64</th>\n        </tr>\n      </tbody>\n    </table>\n  </div>\n  <div class=\"col-md-6\">\n    <h2>Latest Raids</h2>\n    <table class=\"table\">\n      <thead>\n        <tr>\n          <th>Name</th>\n          <th>Date</th>\n          <th>Net DKP</th>\n        </tr>\n        <tbody>\n          <tr>\n            <td> <a href=\"/raid\">Tuesday Progression</a></td>\n            <td>12/16/2014</td>\n            <td>-98</td>\n          </tr>\n          <tr>\n            <td> <a href=\"/raid\">Thursday Progression</a></td>\n            <td>12/18/2014</td>\n            <td>23</td>\n          </tr>\n        </tbody>\n      </thead>\n    </table>\n  </div>\n</div>\n<h2>Ledger </h2>\n<table class=\"table\">\n  <thead>\n    <tr>\n      <th>Raid</th>\n      <th>Type</th>\n      <th>DKP</th>\n      <th>Note\n        <tbody>\n          <tr>\n            <td> <a href=\"/raid\">Tuesday Progression</a></td>\n            <td>other</td>\n            <td>2</td>\n            <td>Showed up early</td>\n          </tr>\n          <tr>\n            <td> <a href=\"/raid\">Tuesday Progression</a></td>\n            <td>Boss Kill</td>\n            <td>15</td>\n            <td>Korgath: Normal</td>\n          </tr>\n          <tr>\n            <td> <a href=\"/raid\">Tuesday Progression</a></td>\n            <td>Loot</td>\n            <td>-115</td>\n            <td>[Hood of Dispassionate Execution]</td>\n          </tr>\n        </tbody>\n      </th>\n    </tr>\n  </thead>\n</table>");;return buf.join("");
}
});
require.register("raid/raid-controller.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var page = require('page');
var domify = require('domify');
var user = require('user');
var empty = require('empty');
var template = require('./raid-template');

/**
 * Define dashboard's dashboard route
 */

page('/raid', user.required, function(ctx, next) {
  var container = document.querySelector('section.site-content');

  empty(container)
    .appendChild(domify(template({
      user: user
    })));
});

});
require.register("raid/raid-template.js", function(exports, require, module){
var jade = require("jade");
module.exports = function template(locals) {
var buf = [];
var jade_mixins = {};
var jade_interp;

var jade_indent = [];
buf.push("\n<ul class=\"nav nav-tabs\">\n  <li role=\"presentation\"><a href=\"/dashboard\">Dashboard</a></li>\n  <li role=\"presentation\"><a href=\"/pool\">Discord Guild</a></li>\n  <li role=\"presentation\" class=\"active\"><a href=\"#\">Tuesday Night Raid</a></li>\n  <li role=\"presentation\" class=\"navbar-right\"><a href=\"/logout\">signout</a></li>\n</ul>\n<h1>Thursday Highmaul Progression</h1>\n<table class=\"table table-striped\">\n  <tbody>\n    <tr>\n      <th><strong>Date</strong></th>\n      <th>12/18/2014</th>\n    </tr>\n    <tr>\n      <th> <strong>Pool</strong></th>\n      <th>Discord Guild</th>\n    </tr>\n    <tr>\n      <th><strong>DKP Distributed</strong></th>\n      <th>230</th>\n    </tr>\n    <tr>\n      <th><strong>DKP Spent</strong></th>\n      <th>214</th>\n    </tr>\n    <tr>\n      <th><strong># Players</strong></th>\n      <th>16</th>\n    </tr>\n    <tr>\n      <th><strong>Bosses Downed</strong></th>\n      <th>6</th>\n    </tr>\n  </tbody>\n</table>\n<div class=\"row\">\n  <div class=\"col-md-6\">\n    <h2>Players</h2>\n    <table class=\"table\">\n      <thead>\n        <tr>\n          <th> \n            <input type=\"checkbox\"/>\n          </th>\n          <th>Name</th>\n          <th>Role</th>\n          <th>&Delta; DKP</th>\n        </tr>\n      </thead>\n      <tbody>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Muse</a></th>\n          <th>Healer</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Yvayne</a></th>\n          <th>Healer</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Cabanaboy</a></th>\n          <th>Tank</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Bigdcamtowin</a></th>\n          <th>DPS</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Omnath</a></th>\n          <th>DPS</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Aquila</a></th>\n          <th>DPS</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Coleo</a></th>\n          <th>Healer</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Earthmuffins</a></th>\n          <th>Tank</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Natzumi</a></th>\n          <th>DPS</th>\n          <th>23</th>\n        </tr>\n        <tr>\n          <th>\n            <input type=\"checkbox\"/>\n          </th>\n          <th> <a href=\"/player\">Sharatmonk</a></th>\n          <th>DPS</th>\n          <th>23</th>\n        </tr>\n      </tbody>\n    </table>\n    <div class=\"center-block\">\n      <select>\n        <option value=\"Boss Kill\">Boss Kill</option>\n        <option value=\"Loot\">Loot</option>\n        <option value=\"Other\">Other</option>\n      </select>\n      <input type=\"number\" placeholder=\"DKP\" style=\"width:50px;\"/>\n      <input type=\"text\" placeholder=\"notes\"/>\n      <button type=\"submit\" class=\"btn btn-default btn-sm\">Add</button>\n    </div>\n  </div>\n  <div class=\"col-md-6\">    \n    <h2>Ledger</h2>\n    <table class=\"table\">\n      <thead>\n        <tr>\n          <th style=\"text-align:center;\">Player</th>\n          <th style=\"text-align:center;\">Type</th>\n          <th style=\"text-align:center;\">DKP</th>\n          <th style=\"text-align:center;\">Note</th>\n        </tr>\n      </thead>\n      <tbody>\n        <tr>\n          <td style=\"text-align:center;\"> <a href=\"/player\">Muse</a></td>\n          <td style=\"text-align:center;\">other</td>\n          <td style=\"text-align:center;\">2</td>\n          <td style=\"text-align:center;\">Showed up early</td>\n        </tr>\n        <tr>\n          <td style=\"text-align:center;\"> <a href=\"/player\">Muse</a></td>\n          <td style=\"text-align:center;\">Boss Kill</td>\n          <td style=\"text-align:center;\">15</td>\n          <td style=\"text-align:center;\">Korgath: Normal</td>\n        </tr>\n        <tr>\n          <td style=\"text-align:center;\"> <a href=\"/player\">Muse</a></td>\n          <td style=\"text-align:center;\">Loot</td>\n          <td style=\"text-align:center;\">-115</td>\n          <td style=\"text-align:center;\">[Hood of Dispassionate Execution]</td>\n        </tr>\n      </tbody>\n    </table>\n  </div>\n</div>");;return buf.join("");
}
});
require.register("boot/boot.js", function(exports, require, module){
/**
 * Module dependencies.
 */

var page = require('page');
var user = require('user');

/**
 * Boot components
 * and pages.
 */

require('homepage');
require('dashboard');
require('pool');
require('player');
require('raid');

/**
 * Boot page.js
 */

page();
});




















require.alias("boot/boot.js", "nodejs-starter/deps/boot/boot.js");
require.alias("boot/boot.js", "nodejs-starter/deps/boot/index.js");
require.alias("boot/boot.js", "boot/index.js");
require.alias("visionmedia-page.js/index.js", "boot/deps/page/index.js");

require.alias("homepage/homepage-controller.js", "boot/deps/homepage/homepage-controller.js");
require.alias("homepage/homepage-controller.js", "boot/deps/homepage/index.js");
require.alias("component-domify/index.js", "homepage/deps/domify/index.js");

require.alias("visionmedia-page.js/index.js", "homepage/deps/page/index.js");

require.alias("visionmedia-jade/lib/runtime.js", "homepage/deps/jade/lib/runtime.js");
require.alias("visionmedia-jade/lib/runtime.js", "homepage/deps/jade/index.js");
require.alias("visionmedia-jade/lib/runtime.js", "visionmedia-jade/index.js");
require.alias("yields-empty/index.js", "homepage/deps/empty/index.js");
require.alias("yields-empty/index.js", "homepage/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("homepage/homepage-controller.js", "homepage/index.js");
require.alias("dashboard/dashboard-controller.js", "boot/deps/dashboard/dashboard-controller.js");
require.alias("dashboard/dashboard-controller.js", "boot/deps/dashboard/index.js");
require.alias("component-domify/index.js", "dashboard/deps/domify/index.js");

require.alias("visionmedia-page.js/index.js", "dashboard/deps/page/index.js");

require.alias("visionmedia-jade/lib/runtime.js", "dashboard/deps/jade/lib/runtime.js");
require.alias("visionmedia-jade/lib/runtime.js", "dashboard/deps/jade/index.js");
require.alias("visionmedia-jade/lib/runtime.js", "visionmedia-jade/index.js");
require.alias("yields-empty/index.js", "dashboard/deps/empty/index.js");
require.alias("yields-empty/index.js", "dashboard/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("user/user.js", "dashboard/deps/user/user.js");
require.alias("user/user.js", "dashboard/deps/user/index.js");
require.alias("visionmedia-page.js/index.js", "user/deps/page/index.js");

require.alias("user-model/model.js", "user/deps/user-model/model.js");
require.alias("user-model/model.js", "user/deps/user-model/index.js");
require.alias("component-emitter/index.js", "user-model/deps/emitter/index.js");

require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("user-model/model.js", "user-model/index.js");
require.alias("user/user.js", "user/index.js");
require.alias("dashboard/dashboard-controller.js", "dashboard/index.js");
require.alias("user/user.js", "boot/deps/user/user.js");
require.alias("user/user.js", "boot/deps/user/index.js");
require.alias("visionmedia-page.js/index.js", "user/deps/page/index.js");

require.alias("user-model/model.js", "user/deps/user-model/model.js");
require.alias("user-model/model.js", "user/deps/user-model/index.js");
require.alias("component-emitter/index.js", "user-model/deps/emitter/index.js");

require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("user-model/model.js", "user-model/index.js");
require.alias("user/user.js", "user/index.js");
require.alias("pool/pool-controller.js", "boot/deps/pool/pool-controller.js");
require.alias("pool/pool-controller.js", "boot/deps/pool/index.js");
require.alias("component-domify/index.js", "pool/deps/domify/index.js");

require.alias("visionmedia-page.js/index.js", "pool/deps/page/index.js");

require.alias("visionmedia-jade/lib/runtime.js", "pool/deps/jade/lib/runtime.js");
require.alias("visionmedia-jade/lib/runtime.js", "pool/deps/jade/index.js");
require.alias("visionmedia-jade/lib/runtime.js", "visionmedia-jade/index.js");
require.alias("yields-empty/index.js", "pool/deps/empty/index.js");
require.alias("yields-empty/index.js", "pool/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("user/user.js", "pool/deps/user/user.js");
require.alias("user/user.js", "pool/deps/user/index.js");
require.alias("visionmedia-page.js/index.js", "user/deps/page/index.js");

require.alias("user-model/model.js", "user/deps/user-model/model.js");
require.alias("user-model/model.js", "user/deps/user-model/index.js");
require.alias("component-emitter/index.js", "user-model/deps/emitter/index.js");

require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("user-model/model.js", "user-model/index.js");
require.alias("user/user.js", "user/index.js");
require.alias("pool/pool-controller.js", "pool/index.js");
require.alias("player/player-controller.js", "boot/deps/player/player-controller.js");
require.alias("player/player-controller.js", "boot/deps/player/index.js");
require.alias("component-domify/index.js", "player/deps/domify/index.js");

require.alias("visionmedia-page.js/index.js", "player/deps/page/index.js");

require.alias("visionmedia-jade/lib/runtime.js", "player/deps/jade/lib/runtime.js");
require.alias("visionmedia-jade/lib/runtime.js", "player/deps/jade/index.js");
require.alias("visionmedia-jade/lib/runtime.js", "visionmedia-jade/index.js");
require.alias("yields-empty/index.js", "player/deps/empty/index.js");
require.alias("yields-empty/index.js", "player/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("user/user.js", "player/deps/user/user.js");
require.alias("user/user.js", "player/deps/user/index.js");
require.alias("visionmedia-page.js/index.js", "user/deps/page/index.js");

require.alias("user-model/model.js", "user/deps/user-model/model.js");
require.alias("user-model/model.js", "user/deps/user-model/index.js");
require.alias("component-emitter/index.js", "user-model/deps/emitter/index.js");

require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("user-model/model.js", "user-model/index.js");
require.alias("user/user.js", "user/index.js");
require.alias("player/player-controller.js", "player/index.js");
require.alias("raid/raid-controller.js", "boot/deps/raid/raid-controller.js");
require.alias("raid/raid-controller.js", "boot/deps/raid/index.js");
require.alias("component-domify/index.js", "raid/deps/domify/index.js");

require.alias("visionmedia-page.js/index.js", "raid/deps/page/index.js");

require.alias("visionmedia-jade/lib/runtime.js", "raid/deps/jade/lib/runtime.js");
require.alias("visionmedia-jade/lib/runtime.js", "raid/deps/jade/index.js");
require.alias("visionmedia-jade/lib/runtime.js", "visionmedia-jade/index.js");
require.alias("yields-empty/index.js", "raid/deps/empty/index.js");
require.alias("yields-empty/index.js", "raid/deps/empty/index.js");
require.alias("yields-empty/index.js", "yields-empty/index.js");
require.alias("user/user.js", "raid/deps/user/user.js");
require.alias("user/user.js", "raid/deps/user/index.js");
require.alias("visionmedia-page.js/index.js", "user/deps/page/index.js");

require.alias("user-model/model.js", "user/deps/user-model/model.js");
require.alias("user-model/model.js", "user/deps/user-model/index.js");
require.alias("component-emitter/index.js", "user-model/deps/emitter/index.js");

require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/lib/client.js");
require.alias("visionmedia-superagent/lib/client.js", "user-model/deps/superagent/index.js");
require.alias("component-emitter/index.js", "visionmedia-superagent/deps/emitter/index.js");

require.alias("component-reduce/index.js", "visionmedia-superagent/deps/reduce/index.js");

require.alias("visionmedia-superagent/lib/client.js", "visionmedia-superagent/index.js");
require.alias("user-model/model.js", "user-model/index.js");
require.alias("user/user.js", "user/index.js");
require.alias("raid/raid-controller.js", "raid/index.js");
require.alias("boot/boot.js", "boot/index.js");