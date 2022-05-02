/**********************************************************************
 * Copyright 2022 Paul Reeve <preeve@pdjr.eu>
 *
 * Licensed under the Apache License, Version 2.0 (the "License"); you
 * may not use this file except in compliance with the License. You may
 * obtain a copy of the License at
 *
 *     http://www.apache.org/licenses/LICENSE-2.0
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS,
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or
 * implied. See the License for the specific language governing
 * permissions and limitations under the License.
 */

const bacon = require('baconjs');
const Log = require("./lib/signalk-liblog/Log.js");
const Schema = require("./lib/signalk-libschema/Schema.js");
const Notification = require("./lib/signalk-libnotification/Notification.js");
const Delta = require("./lib/signalk-libdelta/Delta.js");

const PLUGIN_ID = "solarhotwater";
const PLUGIN_NAME = "Controller for solar hot water generation";
const PLUGIN_DESCRIPTION = "Controller for solar hot water generation";

const PLUGIN_SCHEMA_FILE = __dirname + "/schema.json";
const PLUGIN_UISCHEMA_FILE = __dirname + "/uischema.json";

module.exports = function(app) {
  var plugin = {};
  var unsubscribes = [];

  plugin.id = PLUGIN_ID;
  plugin.name = PLUGIN_NAME;
  plugin.description = PLUGIN_DESCRIPTION;

  const bacon = require('baconjs');
  const log = new Log(plugin.id, { ncallback: app.setPluginStatus, ecallback: app.setPluginError });
  const notification = new Notification(app, plugin.id, { "state": "alarm", "method": [ ] });
  const delta = new Delta(app, plugin.id);

  plugin.schema = function() {
    var schema = Schema.createSchema(PLUGIN_SCHEMA_FILE);
    return(schema.getSchema());
  };

  plugin.uiSchema = function() {
    var schema = Schema.createSchema(PLUGIN_UISCHEMA_FILE);
    return(schema.getSchema());
  }

  plugin.start = function(options) {
    var batterysocstream, solarpowerstream;
    var heaterChargeState = 0;
    var heaterState = 0;


    if (options) {
      delta.clear().addValue(options.heatercontrolpath, heaterState).commit();
      batterysocstream = app.streambundle.getSelfStream(options.batterysocpath);
      if (batterysocstream) {
        solarpowerstream = app.streambundle.getSelfStream(options.solarpowerpath);
        if (solarpowerstream) {
          unsubscribes.push(bacon.combineAsArray(batterysocstream.skipDuplicates(), solarpowerstream.skipDuplicates()).onValue(([soc, power]) => {
            log.N("SOC = %f, power = %d", soc, power);

            if ((heaterChargeState == 0) && (soc >= options.batterysocstartthreshold)) {
              log.N("enabling heater operation (battery soc above start threshold)");
	      heaterChargeState = 1;
	    }

            if ((heaterChargeState == 1) && (soc <= options.batterysocstopthreshold)) {
	      log.N("disabling heater operation (battery soc below stop threshold)");
	      heaterChargeState = 0;
	      heaterState = 0;
	    }

            if (heaterChargeState == 1) {
	      heaterState = (power > options.solarpowerthreshold)?1:0;
	    }

            delta.clear().addValue(options.heatercontrolpath, heaterState).commit();
	    
          }));
        } else {
          log.N("cannot connect to solar power stream on '%s'", options.solarpowerpath);
        }
      } else {
        log.N("cannot connect to batter soc stream on '%s'", options.batterysocpath);
      }
    }
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
    unsubscribes = [];
  }

  return(plugin);
}

