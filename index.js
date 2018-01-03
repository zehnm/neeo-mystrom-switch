'use strict';

/*
 * NEEO driver for myStrom WiFi Switch device
 * https://github.com/zehnm/neeo-mystrom-switch
 *
 * Control local myStrom WiFi switches with NEEO.
 * WiFi Switch v2 devices are auto-discovered on local subnet. 
 * Manual configuration is possible in config/mystrom.json.
 * 
 * Attention: it works BUT it's far from production ready!
 * Needs some improvements:
 * - clean up of poc code, better modularization
 * - error & auto retry handling
 * - option to use myStrom cloud (either for initial discovery only or for full device access)
 * - setting device reachability flag with connectivity test
 * - more efficient polling
 * ... and I don't like Java Script, so certain things are probably not best practice :/
 * 
 * Tested with:
 * - Node.js v8.9.1
 * - NEEO SDK 0.48.13 https://github.com/NEEOInc/neeo-sdk
 * - myStrom WiFi Switch v2 (firmware 3.60) https://www.mystrom.ch/
 */

const neeoapi = require('neeo-sdk');
const logger = require('winston');
const NeeoDevice = require('./lib/neeoDevice');

logger.level = process.env.LOG_LEVEL ? process.env.LOG_LEVEL : 'info';

// default configuration with required parameters. Customize in driver.json
// Optional: neeo.brainIp, neeo.callbackIp
var config = {
  "neeo": {
    "callbackPort": 6336
  },
  "mystrom": {
    "discoveryModes": {
      "configFile": false,  // read devices from configration file
      "local": true         // local discovery mode (listen for UDP broadcast)
    },
    "localDiscovery": {
      "listenAddress": "0.0.0.0", // listen address for UDP broadcast. 0.0.0.0 = all interfaces
      "reachableTimeout": 30,     // timeout in seconds to consider a device offline if no discovery message received
      "deviceTypeFilter": ["WS2"] // only consider the specified myStrom device types
    }
  }
};

console.log('NEEO device "myStrom WiFi Switch"');
console.log('------------------------------------------');

// Config file is optional
try {
  config = require(__dirname + '/config/driver.json');
} catch (e) {
  logger.warn('Cannot find or load config.json! Using default values.');
}

const neeoDevices = [];
const neeoSwitchDevice = new NeeoDevice(config);

neeoDevices.push(neeoSwitchDevice.buildDevice('WiFi Switch', 'myStrom'));

var brainIp = process.env.BRAINIP;
var baseurl = undefined;

if (brainIp) {
  logger.info('[NEEO] Using NEEO Brain IP from env variable:', brainIp);
} else if (config.neeo.brainIp) {
  brainIp = config.neeo.brainIp;
  logger.info('[NEEO] Using NEEO Brain IP from configuration:', brainIp);
}

// baseurl must be set for certain network setup (i.e. Windows with Hyper-V) until SDK is fixed.
// See forum and related issue with auto-discovery: https://github.com/NEEOInc/neeo-sdk/issues/36
if (config.neeo.callbackIp) {
  baseurl = 'http://' + config.neeo.callbackIp + ':' + config.neeo.callbackPort;
}

if (brainIp) {
  startDeviceServer(brainIp, config.neeo.callbackPort, baseurl, neeoDevices);
} else {
  logger.info('[NEEO] discover one NEEO Brain...');
  neeoapi.discoverOneBrain()
    .then((brain) => {
      logger.info('[NEEO] Brain discovered:', brain.name);
      startDeviceServer(brain, config.neeo.callbackPort, baseurl, neeoDevices);
    });
}

function startDeviceServer(brain, port, callbackBaseurl, neeoDevices) {
  logger.info('[NEEO] Starting server on port %d ...', port);
  neeoapi.startServer({
    brain,
    port,
    baseurl: callbackBaseurl,
    name: 'mystrom-wifi-switch',
    devices: neeoDevices
  })
    .then(() => {
      logger.info('[NEEO] API server ready! Use the NEEO app to search for "myStrom WiFi Switch".');
    })
    .catch((error) => {
      logger.error('[NEEO] Error starting device server!', error.message);
      process.exit(9);
    });
}
