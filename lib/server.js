var nap = require('nodealarmproxy');
var alarm;


// function to execute commands.  In an error occurs
// the first parameter of the callback will be an
// error object. The command to be executed is 
// passed in command, and expectedAction is an
// object with the action (ex partitionupdate) and
// the code (ex '656') which is expected in response
// to the command
var executeCommand = function(command, expectedAction, callback) {
  var waitAction = function(data) {
    if (data.code === expectedAction.code) {
      alarm.removeListener(expectedAction.action, waitAction);
      callback();
    }
  }

  alarm.on(expectedAction.action, waitAction);
  nap.manualCommand(command, function(err) {
    if (err) {
      alarm.removeListener(expectedAction.action, waitAction);
      callback(err);
    }
  });
}

var arm = function(callback) {
  var attempts = 0;
  executeCommand('0301', { action: 'partitionupdate', code: '656' }, function(err) {
    if (err === '024') {
      if (attempts === 0) {
        // get get the panel busy error if the panal has blanked.  
        // wake up the panel with a # keystroke and then try again
        attempts++;
        executeCommand('070#', {action: 'partitionupdate', code: '650'},
          arm.bind(this, callback));
      } else {
        callback(err);
      }
    } else {
      callback();
    }
  });
}

var disarm = function(callback) {
  executeCommand('04011965', {'action': 'partitionupdate', code: '655' }, callback);
}

///////////////////////////////////////////////
// micro-app framework methods
///////////////////////////////////////////////
var Server = function() {
}

Server.getDefaults = function() {
  return { 'title': 'Alarm Console' };
}


var replacements;
Server.getTemplateReplacments = function() {
  if (replacements === undefined) {
    var config = Server.config;
    replacements = [{ 'key': '<DASHBOARD_TITLE>', 'value': config.title },
                    { 'key': '<UNIQUE_WINDOW_ID>', 'value': config.title },
                    { 'key': '<PAGE_WIDTH>', 'value': PAGE_WIDTH },
                    { 'key': '<PAGE_HEIGHT>', 'value': PAGE_HEIGHT }];

  }
  return replacements;
}


Server.startServer = function(server) {
  const config = Server.config;
  alarm = nap.initConfig(config.evlConfig);

  setTimeout(arm.bind(this, setTimeout.bind(this, disarm.bind(this, function() {
     console.log('Sequence complete');
  }), 5000)), 5000);
}


if (require.main === module) {
  var path = require('path');
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}

module.exports = Server;
