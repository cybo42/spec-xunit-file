/**
 * Module dependencies.
 */

var mocha = require("mocha")
  , Base = mocha.reporters.Base
  , Spec = mocha.reporters.Spec
  , utils = mocha.utils
  , escape = utils.escape
  , config = {
    "file": "xunit.xml",
    "consoleOutput": {
      "suite": false,
      "test": false,
      "fail": false
    }
  }
  , fs = require("fs")
  , consoleOutput = config.consoleOutput || {};

/**
 * Save timer references to avoid Sinon interfering (see GH-237).
 */


/* global Date: true */
var Date = global.Date
/* global setTimeout: true */
  , setTimeout = global.setTimeout
/* global setInterval: true */
  , setInterval = global.setInterval
/* global clearTimeout: true */
  , clearTimeout = global.clearTimeout
/* global clearInterval: true */
  , clearInterval = global.clearInterval;



function appendLine(fd, line) {
  if (process.env.LOG_XUNIT) {
    console.log(line);
  }
  fs.writeSync(fd, line + "\n", null, 'utf8');
}


/**
 * Return cdata escaped CDATA `str`.
 */

function cdata(str) {
  return '<![CDATA[' + escape(str) + ']]>';
}

/**
 * HTML tag helper.
 */

function writeTag(name, attrs, close, content) {
  var end = close ? '/>' : '>'
    , pairs = []
    , tag;

  for (var key in attrs) {
    pairs.push(key + '="' + escape(attrs[key]) + '"');
  }
  tag = '<' + name + (pairs.length ? ' ' + pairs.join(' ') : '') + end;

  if (content){
    tag += content + '</' + name + end;
  }
  return tag;
}

/**
 * Output tag for the given `test.`
 */

function writeTest(fd, test) {
  var attrs = {
    classname: test.parent.fullTitle()
    , name: test.title
    // , time: test.duration / 1000 //old
    ,time: test.duration ? test.duration / 1000 : 0 //new
  };

  if ('failed' === test.state) {
    var err = test.err;
    appendLine(fd, writeTag('testcase', attrs, false, writeTag('failure', { message: escape(err.message) }, false, cdata(err.stack))));
  } else if (test.pending) {
    delete attrs.time;
    appendLine(fd, writeTag('testcase', attrs, false, writeTag('skipped', {}, true)));
  } else {
    appendLine(fd, writeTag('testcase', attrs, true) );
  }
}

/**
 * Initialize a new `SpecXUnitFile` reporter.
 *
 * @param {Runner} runner
 * @api public
 */

function SpecXUnitFile(runner) {
  var spec = new Spec(runner);
  Base.call(this, runner);
  var stats = this.stats
    , tests = []
    , self = this;
  runner.on('suite', function(suite){
    if(consoleOutput.suite){
      console.log('  ' + suite.title);
    }
  });

  runner.on('test', function(test){
    if(consoleOutput.test){
      console.log('  ◦ ' + test.title);
    }
  });

  runner.on('pass', function(test){
    tests.push(test);
  });

  runner.on('fail', function(test){
    if(consoleOutput.fail){
      console.log('  - ' + test.title);
    }
    tests.push(test);
  });

  runner.on('pending', function(test) {
    tests.push(test);
  });

  runner.on('end', function(){

    var filePath = process.env.XUNIT_FILE || config.file || process.cwd() + "/xunit.xml"
      , fd = fs.openSync(filePath, 'w', 0755)
      ;
    appendLine(fd, writeTag('testsuite', {
      name: 'Mocha Tests'
      , tests: stats.tests
      , failures: stats.failures
      , errors: stats.failures
      , skipped: stats.tests - stats.failures - stats.passes
      , timestamp: (new Date()).toUTCString()
      , time: stats.duration / 1000
    }, false));

    tests.forEach(function(test){
      writeTest(fd, test);

    });
    appendLine(fd, '</testsuite>');
    fs.closeSync(fd);
  });

}
/**
 * Inherit from `Base.prototype`.
 */

SpecXUnitFile.prototype = Base.prototype;

// ============ Begin Exports ====================

exports = module.exports = SpecXUnitFile;
