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

const PLUGIN_ID = "dse4510";
const PLUGIN_NAME = "Signal K interface activity watchdog";
const PLUGIN_DESCRIPTION = "Monitor a Signal K interface for anomalous drops in activity";

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

  plugin.schema = function() {
    var schema = Schema.createSchema(PLUGIN_SCHEMA_FILE);
    return(schema.getSchema());
  };

  plugin.uiSchema = function() {
    var schema = Schema.createSchema(PLUGIN_UISCHEMA_FILE);
    return(schema.getSchema());
  }

  plugin.start = function(options) {
    var restore = 0;

    if (options) {
      log.N("Started (switch path = '%s')", options.triggerpath);
      if (options.triggerpath) {
        unsubscribes.push(app.streamBundle.getSelfStream(options.triggerpath + ".state").onValue(action => {
	 switch  (action) {
           case 0: // Relay has turned off...
	     if (restore) app.putSelfPath(options.triggerpath + ".state", 1, (d) => app.debug("put response: %s", d.message));
	     break;
           case 1: // Relay has turned on...
	     if (restore == 0) {
	       log.N("sending second pulse");
               restore = 1;
               app.putSelfPath(options.triggerpath + ".state", 0, (d) => app.debug("put response: %s", d.message));
	     } else {
               restore = 0;
             }
             break;
	   default:
	     break;
	  }
	}));
      }
    }
  }

  plugin.stop = function() {
    unsubscribes.forEach(f => f());
    unsubscribes = [];
  }

  return(plugin);
}

