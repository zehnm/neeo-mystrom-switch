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
 * - clean up of poc code, better modularization, slim down index.js
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
const Controller = require('./lib/controller');
const constants = require('./lib/constants');
const MyStromLocalDiscovery = require('./lib/mystrom/local/discovery');
const MyStromConfigFileDiscovery = require('./lib/mystrom/configFileDiscovery');
const discoveryControllerFactory = require('./lib/mystrom/discoveryController');
const MyStromService = require('./lib/mystrom/service');
const MyStromLocalSwitch = require('./lib/mystrom/local/switch');

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

console.log('NEEO device "myStrom WiFi Switch" PoC');
console.log('------------------------------------------');

// Config file is optional
try {
  config = require(__dirname + '/config/driver.json');
} catch (e) {
  console.warn('WARNING: Cannot find config.json! Using default values.');
}

const controller = buildController(config);

const discoveryInstructions = {
  headerText: 'Device Discovery',
  description: config.mystrom.discoveryModes.local === true ?
    'myStrom WiFi switches v2 are auto discovered on local subnet. Device discovery broadcast is every 5 seconds. Press Next when ready!'
    : 'Auto discovery is not enabled... myStrom WiFi switches must be specified in the configuration file config/mystrom.json of the driver. Press Next when ready!'
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

  .addSwitch({ name: constants.COMPONENT_POWER_SWITCH, label: 'Power switch' }, {
    setter: controller.setPowerState,
    getter: controller.getPowerState,
  })
  .addTextLabel({ name: constants.COMPONENT_POWER_LABEL, label: 'Current consumption' }, controller.powerConsumption)
  .addSensor(powerConsumptionSensor, {
    getter: controller.getPowerConsumption
  })

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

// FIXME quick and dirty builder
function buildController(config) {
  let discovery = undefined;
  let deviceBuilder = undefined;

  // TODO allow mixed discovery (auto-discovery & config file)
  if (config.mystrom.discoveryModes.local === true) {
    discovery = new MyStromLocalDiscovery(config.mystrom.localDiscovery.listenAddress);
    deviceBuilder = (device) => {
      // TODO device name resolution from config file (id (MAC) -> name)
      return MyStromLocalSwitch.buildInstance(device.id, device.ip, device.type + ' ' + device.id);
    }
  } else if (config.mystrom.discoveryModes.configFile === true) {
    discovery = new MyStromConfigFileDiscovery(__dirname + '/config/mystrom.json');
    deviceBuilder = (device) => {
      return MyStromLocalSwitch.buildInstance(device.id, device.ip, device.name);
    }
  } else {
    console.error('FATAL Invalid configuration! One of mystrom.discoveryModes.local or mystrom.discoveryModes.configFile must be enabled.');
    process.exit(1);
  }

  const discoveryController = discoveryControllerFactory(discovery, config.mystrom.localDiscovery);
  const myStromService = new MyStromService(discoveryController, deviceBuilder);
  const controller = Controller(myStromService, discoveryController, {});
  discoveryController.startDiscovery();

  return controller;
}