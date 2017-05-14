# evl-mqtt-bridge

This project/module provides a bridge between an
envisalink alarm module and mqtt.  It allows the
alarm to be monitored and controlled.  In addition, it can send
sms messages when events are reported by the alarm.

When the envisalink module reports events this micro-app
can translate those events to messages posted on configured
topics. It also provide functions that can be used to send
commands to the alarm by posting mqtt messages on an
configured mqtt topic.

My initial use case is to use with with this project
[AlexaMqttBridge](https://github.com/mhdawson/AlexaMqttBridge)
in order to allow me to disable the alarm though Alexa.  It also
allows me to get arm/disarm sms messages as the envisalnk service
did not seem to be able to send sms messages to my voip phone number.

## Installation

Install by running:

```
npm install evl-mqtt-bridge
```

or

```
npm install https://github.com/mhdawson/evl-mqtt-bridge.git
```

then copy lib/config.json.sample to lib/config.json and fill
in the configuration for the envisalink, mqtt and sms setup
as described in configuration section.

## Configuration

The configuration file has the following main sections:

* **evlConfig**
* **mqtt**
* **sms**
* **notify**

### evlConfig

This section is used in order to configure the connection
to the alarm system. The bridge uses this project to do the
communication with the envialink board:
[NodeAlarmProxy](https://github.com/entrocode/NodeAlarmProxy).

The evlConfig section is simply passed to that project so the
configuration values are as defined in that project.

### mqtt

This section is used to configure the mqtt server and how events
will be bridged to mqtt topics.

The parameters are as follows:

* **mqttServerUrl** - url of the mqtt server to connect to.  This can
  either start with tcp:// or mqtts://. If it starts with mqtts://
  there must be a subdirectory in the lib directory called mqttclient
  which contains ca.cert, client.cert, client.key which contain the
  key and associated certificates for a client which is authorized
  to connect to the mqtt server.
* **controlTopic** - the mqtt topic on which the bridge will listen for
  commands to be sent to the alarm.  
* **rawZoneTopic** - the mqtt topic on which a message is posted for
  each zone update sent by the alarm.  The message is simply the zone
  followed by the code sent by the alarm in the format of ```zone:code```.
  For example ```6:650```
* **rawPartTopic** - the mqtt topic on which a message is posted for
  each partition update sent by the alarm.  The message is simply the
  code sent by the alarm in the format of ```code```.
* **topicMap** - The topic map is an object with one or more fields. The
  name of each field is either a string in the form of ```X-code```
  (where X is the zone nubmer) or    ```part-code```.  The value for
  the field is an object with a topic and
  message field which are the topic to which the message is posted to when
  zone or partition update is received that matches the field name.
  By adding entries to the topicMap you can
  configure the bridge to post a specific message on a specific topic when an update is received from the alarm. For example:

  ```
  "topicMap": { "6-609": {"topic": "house/alarm/zone/6", "message": "on"},
                          "6-610": {"topic": "house/alarm/zone/6", "message": "off"},
                          "part-655": {"topic": "house/alarm/part", "message": "disarmed"}
                        }
  ```

Raw commands can be sent to the alarm by posting the string for the command on the ```controlTopic```.  In addition the brige supports the following 'friendly name' commands:

* **arm** - arms the alarm.  The bridge includes a work around to
  wake the panel if an error occurs while arming.  This is necessary if panel blanking is enabled.

* **disarm** - disarms the alarm.  Requires a user code following the
  string 'disarm'. For example: ```disarm1234```.

### sms

The bridge can be configured to send sms messages when the
alarm reports partition events.  

The sms configuration entry is an object with one or more fields.
The name of the field is the event reported by the alarm or one
of the friendly names ```alarm```, ```arm``` or ```disarm```. If
the value for the field is ```true``` then an sms message will
be sent when that partition event is reported by the alarm.

For example:

```
"sms": { "arm": true,
         "alarm": true,
         "disarm": true }
```

### notify

This section configures the information required to send
notification messages. The fields are:

* **mqttSmsBridge** - element with the following sub-elements:
  * enabled - set to true if you want notifications to
    be sent using this provider.
  * serverUrl - url for the mqtt server to which the
    bridge is connected.
  * topic - topic on which the bridge listens for
    notification requests.
  * certs - directory which contains the keys/certs
    required to connect to the mqtt server if the
    url is of type `mqtts`.
* **voipms** - element with the following sub-elements:
  * enabled - set to true if you want notifications to
    be sent using this provider.
  * user - voip.ms API userid.
  * password - voip.ms API password.
  * did - voip.ms did(number) from which the SMS will be sent.
  * dst - number to which the SMS will be sent.
* **twilio** - element with the following sub-elements:
  * enabled - set to true if you want notifications to
    be sent using this provider.
  * accountSID - twilio account ID.
  * accountAuthToken - twilio auth token.
  * toNumber - number to which the SMS will be sent.
  * fromNumber - number from which the SMS will be sent.

For example:

```json
"notify": {
  "mqttSmsBridge": { "enabled": true,
                     "serverUrl": "mqtt:10.1.1.186:1883",
                     "topic": "house/sms" }
}
```

## TODO

I have not yet hooked up the micro-app UI.  Likely just to be a simple UI
to allow you to observe the events flowing through the bridge.
