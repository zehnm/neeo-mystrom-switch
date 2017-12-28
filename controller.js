'use strict';
/*
 * Device Controller
 * Events on that device from the Brain will be forwarded here for handling.
 */

const debug = require('debug')('zehnm:mystrom:controller');
const neeoapi = require('neeo-sdk');
const BluePromise = require('bluebird');
const MyStromService = require('./myStromLocalService');
const constants = require('./constants');

const DEVICE_POLL_TIME_MS = 4000;

const deviceState = neeoapi.buildDeviceState();

let myStromService;
let sendComponentUpdate;
let pollingIntervalId;

/**
 * One button handler for each registered button.
 * Note: return value is ignored... Is the brain smart enough to consider an Error a failed button press?
 */
module.exports.onButtonPressed = function(name, deviceId) {
  console.log(`[CONTROLLER] ${name} button pressed on ${deviceId}`);
  switch (name) {
    case constants.MACRO_POWER_ON:
      return myStromService.setPowerState(deviceId, true);
    case constants.MACRO_POWER_OFF:
      return myStromService.setPowerState(deviceId, false);
    case constants.MACRO_POWER_TOGGLE:
      return myStromService.powerToggle(deviceId);
    default:
      debug(`Unsupported button: ${name} for ${deviceId}`);
      return Promise.resolve(false);
  }
};

module.exports.powerSwitchCallback = {
  setter: setPowerState,
  getter: getPowerState,
};

module.exports.powerConsumptionSensorCallback = {
  getter: getPowerConsumption
};

module.exports.powerConsumption = function(deviceId) {
  return getPowerConsumption(deviceId)
};

function setPowerState(deviceId, value) {
  return myStromService.setPowerState(deviceId, value);
}

function getPowerState(deviceId) {
  return myStromService.getPowerState(deviceId)
}

function getPowerConsumption(deviceId) {
  console.log('[CONTROLLER] get power consumption from', deviceId);
  return new BluePromise((resolve, reject) => {
    myStromService
    .getStateForPolling(deviceId)
    .then((deviceState) => {
      resolve(deviceState.powerConsumption);
    })
    .catch((error) => {
      console.log('[CONTROLLER] get power consumption failed', error.message);
      resolve(0);
    });  
  });
}


module.exports.discoverDevices = function() {
  console.log('[CONTROLLER] discover devices call');
  myStromService.discoverDevices();
  const allDevices = deviceState.getAllDevices();
  return allDevices
    .map((deviceEntry) => {
      return {
        id: deviceEntry.id,
        name: deviceEntry.clientObject.getName(),
        reachable: deviceEntry.reachable
      };
    });
};

/**
 * Sending updates to Brain:
 * If the device value can change, the updated values should be sent to the Brain.
 *
 * - Upon registration the SDK will provide an update callback to the adapter.
 * - That function can be called with sensor updates
 */
module.exports.registerStateUpdateCallback = function(updateFunction) {
  console.log('[CONTROLLER] register update state for switch device');
  sendComponentUpdate = updateFunction;
};

module.exports.initialize = function() {
  if (pollingIntervalId) {
    debug('already initialized, ignore call');
    return false;
  }

  console.log('[CONTROLLER] initialize myStrom service, start polling');
  myStromService = new MyStromService(deviceState);
  pollingIntervalId = setInterval(pollAllDevices, DEVICE_POLL_TIME_MS);
};

function sendNotificationToBrain(uniqueDeviceId, component, value) {
  sendComponentUpdate({ uniqueDeviceId, component, value })
    .catch((error) => {
      debug('NOTIFICATION_FAILED', error.message);
    });
}

function pollAllDevices() {
  debug('Polling all switch devices...');
  // TODO only poll devices which are in use by NEEO
  deviceState.getAllDevices()
    .forEach((device) => {
      if (!device.reachable) {
        return;
      }
      myStromService
        .getStateForPolling(device.id)
        .then((deviceState) => {
          sendNotificationToBrain(device.id, constants.COMPONENT_POWER_SWITCH, deviceState.power);
          sendNotificationToBrain(device.id, constants.COMPONENT_POWER_SENSOR, deviceState.powerConsumption);
          sendNotificationToBrain(device.id, constants.COMPONENT_POWER_LABEL,  deviceState.powerConsumption + ' W');
        })
        .catch((error) => {
          console.log('[CONTROLLER] polling failed:', error.message);
        });
    });
}
