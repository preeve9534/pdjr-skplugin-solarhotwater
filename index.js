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
    var batterySocPermits = 0, heaterState = 0;
    var lastEnabled = -1, lastBatterySocPermits = -1, lastHeaterState = -1;

    // Switch off the heater...
    delta.clear().addValue(options.outputpath, heaterState).commit();

    if (options) {
      // Check availability of enabling control...
      var enablestream = app.streambundle.getSelfStream(options.enablepath);
      if (enablestream) {
        // Check availability of battery SOC data...
        var batterysocstream = app.streambundle.getSelfStream(options.batterysocpath);
        if (batterysocstream) {
          // Check availability of solar power data...
          var solarpowerstream = app.streambundle.getSelfStream(options.solarpowerpath);
          if (solarpowerstream) {
            // Subscribe to data streams...
            unsubscribes.push(bacon.combineAsArray(enablestream.skipDuplicates(), batterysocstream.skipDuplicates(), solarpowerstream.skipDuplicates()).onValue(([enabled, soc, power]) => {
              enabled = parseInt(enabled);
              if (enabled) {
                soc = parseInt(soc * 100);
                power = parseInt(power);
                // Use SOC to determine if heating is viable whilst maintaining battery state...
                if (batterySocPermits == 0) {
                  if (soc >= options.batterysocstartthreshold) {
                    batterySocPermits = 1;
                  }
                } else {
                  if (soc <= options.batterysocstopthreshold) {
                    batterySocPermits = 0;
                    heaterState = 0;
                  }
                }

                // If heating is enabled switch heating on and off dependent upon solar power output... 
                if (batterySocPermits === 1) {
                  heaterState = (power > options.solarpowerthreshold)?1:0;
                }
                if (heaterState === 1) {
                  if ((enabled != lastEnabled) || (heaterState != lastHeaterState)) log.N("solar water heating is enabled and ON");
                } else {
                  if ((enabled != lastEnabled) || (batterySocPermits != lastBatterySocPermits) || (heaterState != lastHeaterState)) log.N("solar water heating is enabled and OFF (%s)", (batterySocPermits === 1)?"solar power too low":"battery SOC too low")
                }
                delta.clear().addValue(options.outputpath, heaterState).commit();
              } else {
                if (enabled != lastEnabled) log.N("solar water heating is disabled")
                heaterState = 0;
              }
              if (heaterstate != lastHeaterState) delta.clear().addValue(options.outputpath, heaterState).commit();
              lastEnabled = enabled; lastBatterySocPermits = batterySocPermits; lastHeaterState = heaterState;
            }));
          } else {
            log.E("cannot connect to solar power stream on '%s'", options.solarpowerpath);
          }
        } else {
          log.E("cannot connect to battery SOC stream on '%s'", options.batterysocpath);
        }
      } else {
        log.E("cannot connect to plugin control stream");
      }
    } else {
      log.E("bad or missing configuration");
    }
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
    unsubscribes = [];
  }
  
  return(plugin);
}

