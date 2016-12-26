// Copyright 2016 the project authors as listed in the AUTHORS file.
// All rights reserved. Use of this source code is governed by the
// license that can be found in the LICENSE file.
"use strict";

var nap = require('nodealarmproxy');
const mqtt = require('mqtt');

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


var disarm = function(code, callback) {
  executeCommand('0401' + code, {'action': 'partitionupdate', code: '655' }, callback);
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

  var mqttOptions;
  if (config.mqtt.serverUrl.indexOf('mqtts') > -1) {
    mqttOptions = { key: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.key')),
                    cert: fs.readFileSync(path.join(__dirname, 'mqttclient', '/client.cert')),
                    ca: fs.readFileSync(path.join(__dirname, 'mqttclient', '/ca.cert')),
                    checkServerIdentity: function() { return undefined }
    }
  }
  const mqttClient = mqtt.connect(config.mqtt.serverUrl, mqttOptions);

  mqttClient.on('connect',function() {
    mqttClient.subscribe(config.mqtt.controlTopic);
  });

  // allow alarm to be turned on/off through mqtt.  To turn off
  // you must provide the alarm code as disarmXXXX where XXXX
  // is the code for the alarm
  mqttClient.on('message', function(topic, message) {
    message = message.toString();
    if (message === 'arm') {
      arm(function() {});
    } else if (message.startsWith('disarm')) {
      disarm(message.substr('disarm'.length), function() {});
    }
  });

  // listen for zone updates and pass on to mqtt
  alarm.on('zoneupdate', function(data) {
    if (config.mqtt.rawZoneTopic) {
      mqttClient.publish(config.mqtt.rawZoneTopic, data.zone + ':' + data.code);
    }
  });
}


if (require.main === module) {
  var path = require('path');
  var microAppFramework = require('micro-app-framework');
  microAppFramework(path.join(__dirname), Server);
}

module.exports = Server;
