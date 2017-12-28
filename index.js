'use strict';

/*
 * NEEO driver for myStrom WiFi Switch device
 * https://github.com/zehnm/neeo-mystrom-switch
 *
 * Control local myStrom WiFi switches with NEEO.
 * Devices must be configured in config-mystrom.json. Auto-discovery and cloud
 * connectivity are not yet implemented.
 * 
 * Attention: it works BUT it's far from production ready!
 * Needs some improvements:
 * - error & auto retry handling
 * - auto discovery feature
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
const controller = require('./controller');
const constants = require('./constants');

// default configuration with required parameters. Customize in config.json
// Optional: neeo.brainIp, neeo.callbackIp
var config = {
  "neeo": {
    "callbackPort": 6336
  }
};

console.log('NEEO device "myStrom WiFi Switch" PoC');
console.log('------------------------------------------');

// Config file is optional
try {
  config = require(__dirname + '/config.json');
} catch (e) {
  console.warn('WARNING: Cannot find config.json! Using default values.');
}

const discoveryInstructions = {
  headerText: 'Device Discovery',
  description: 'Auto discovery not yet implemented... myStrom WiFi switches must be specified in the configuration file config-mystrom.json of the driver. Press Next when ready!'
};
const powerConsumptionSensor = {
  name: constants.COMPONENT_POWER_SENSOR,
  label: 'Current consumption',
  range: [0, 2250],
  unit: 'Watt'
};

const switchDevice = neeoapi.buildDevice('WiFi Switch')
  .setManufacturer('myStrom')
  .addAdditionalSearchToken('zehnm')
  .addAdditionalSearchToken('SDK')
  .setType('ACCESSORY')  // NEEO needs to come up with more device types! ACCESSORY doesn't have view and LIGHT is misleading and cannot be renamed :(
  .addButtonGroup('Power')
  .addButton({ name: constants.MACRO_POWER_TOGGLE, label: 'Power Toggle' })
  .addButtonHandler(controller.onButtonPressed)

  .addSwitch({ name: constants.COMPONENT_POWER_SWITCH, label: 'Power switch' }, controller.powerSwitchCallback)
  .addTextLabel({ name: constants.COMPONENT_POWER_LABEL, label: 'Current consumption' }, controller.powerConsumption)
  .addSensor(powerConsumptionSensor, controller.powerConsumptionSensorCallback)

  .enableDiscovery(discoveryInstructions, controller.discoverDevices)
  .registerSubscriptionFunction(controller.registerStateUpdateCallback)
  .registerInitialiseFunction(controller.initialize);


var brainIp = process.env.BRAINIP;
var baseurl = undefined;

if (brainIp) {
  console.log('[NEEO] Using NEEO Brain IP from env variable: ', brainIp);
} else if (config.neeo.brainIp) {
  brainIp = config.neeo.brainIp;
  console.log('[NEEO] Using NEEO Brain IP from configuration: ', brainIp);
}

// baseurl must be set for certain network setup (i.e. Windows with Hyper-V) until SDK is fixed.
// See forum and related issue with auto-discovery: https://github.com/NEEOInc/neeo-sdk/issues/36
if (config.neeo.callbackIp) {
  baseurl = 'http://' + config.neeo.callbackIp + ':' + config.neeo.callbackPort;
}

if (brainIp) {
  startDeviceServer(brainIp, config.neeo.callbackPort, baseurl);
} else {
  console.log('[NEEO] discover one NEEO Brain...');
  neeoapi.discoverOneBrain()
    .then((brain) => {
      console.log('[NEEO] Brain discovered:', brain.name, baseurl);
      startDeviceServer(brain, config.neeo.callbackPort, baseurl);
    });
}


function startDeviceServer(brain, port, callbackBaseurl) {
  console.log('[NEEO] Starting server on port %d ...', port);
  neeoapi.startServer({
    brain,
    port,
    baseurl: callbackBaseurl,
    name: 'mystrom-wifi-switch',
    devices: [switchDevice]
  })
    .then(() => {
      console.log('[NEEO] API server ready! Use the NEEO app to search for "myStrom WiFi Switch".');
    })
    .catch((error) => {
      console.error('FATAL [NEEO] Error starting device server!', error.message);
      process.exit(9);
    });
}
