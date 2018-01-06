'use strict';
/*
 * Device Controller
 * Events on that device from the Brain will be forwarded here for handling.
 */

const logger = require('winston');
const BluePromise = require('bluebird');
const constants = require('./constants');

const DEVICE_POLL_TIME_MS = 4000; // TODO make configurable

module.exports = (myStromService, discoveryController) => {
  let sendComponentUpdate = undefined;
  let pollingIntervalId = undefined;
  const controller = {};


  controller.getAllDevices = () => {
    return myStromService.getAllDevices();
  }

  /**
   * One button handler for each registered button.
   * Note: return value is ignored... Is the brain smart enough to consider an Error a failed button press?
   */
  controller.onButtonPressed = (name, deviceId) => {
    logger.info(`[CONTROLLER] ${name} button pressed on ${deviceId}`);
    switch (name) {
      case constants.MACRO_POWER_ON:
        return myStromService.setPowerState(deviceId, true);
      case constants.MACRO_POWER_OFF:
        return myStromService.setPowerState(deviceId, false);
      case constants.MACRO_POWER_TOGGLE:
        return myStromService.powerToggle(deviceId);
      default:
        logger.debug(`[CONTROLLER] Unsupported button: ${name} for ${deviceId}`);
        return Promise.resolve(false);
    }
  };

  controller.powerConsumption = (deviceId) => {
    return controller.getPowerConsumption(deviceId)
  };

  controller.setPowerState = (deviceId, value) => {
    logger.verbose('[CONTROLLER] Set power state request:', deviceId, value);
    return myStromService.setPowerState(deviceId, value);
  }

  controller.getPowerState = (deviceId) => {
    logger.verbose('[CONTROLLER] Get power state request:', deviceId);
    return myStromService.getPowerState(deviceId)
  }

  controller.getPowerConsumption = (deviceId) => {
    logger.verbose('[CONTROLLER] Get power consumption request:', deviceId);
    return new BluePromise((resolve, reject) => {
      myStromService
        .getStateForPolling(deviceId)
        .then((state) => {
          resolve(state.powerConsumption);
        })
        .catch((error) => {
          logger.error('[CONTROLLER] Get power consumption failed:', error.message);
          resolve(0);
        });
    });
  }

  controller.discoverDevices = () => {
    logger.info('[CONTROLLER] Discover devices request');
    const allDevices = myStromService.getAllDevices();
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
  controller.registerStateUpdateCallback = (updateFunction) => {
    logger.verbose('[CONTROLLER] Register state update callback');
    sendComponentUpdate = updateFunction;
  };

  controller.initialize = () => {
    discoveryController.startDiscovery();

    if (pollingIntervalId) {
      logger.debug('[CONTROLLER] Already initialized, ignore call');
      return false;
    }

    logger.info('[CONTROLLER] Initialize myStrom service, start polling devices every %d ms', DEVICE_POLL_TIME_MS);
    pollingIntervalId = setInterval(pollAllDevices, DEVICE_POLL_TIME_MS);
  };

  function sendNotificationToBrain(deviceId, component, value) {
    logger.debug('[CONTROLLER] Send notification to brain:', deviceId, component, value);
    sendComponentUpdate({ uniqueDeviceId: deviceId, component, value })
      .catch((error) => {
        // filter spam errors:
        // DUPLICATE_MESSAGE: if value didn't change since last update. SDK keeps the last value and only sends changed data to the brain.
        // COMPONENTNAME_NOT_FOUND: sent if device is not yet add in NEEO
        const level = (error.message === 'DUPLICATE_MESSAGE'
          || error.message.startsWith('COMPONENTNAME_NOT_FOUND')) ? 'silly' : 'warn';
        logger.log(level, '[CONTROLLER] Sending notification to brain failed:', deviceId, error.message);
      });
  }

  function pollAllDevices() {
    logger.debug('[CONTROLLER] Polling all switch devices...');
    // TODO only poll devices which are in use by NEEO
    myStromService.getAllDevices()
      .forEach((device) => {
        if (!device.reachable) {
          return;
        }
        myStromService
          .getStateForPolling(device.id)
          .then((state) => {
            sendNotificationToBrain(device.id, constants.COMPONENT_POWER_SWITCH, state.power);
            if (state.powerConsumption != undefined) {
              sendNotificationToBrain(device.id, constants.COMPONENT_POWER_SENSOR, state.powerConsumption);
              sendNotificationToBrain(device.id, constants.COMPONENT_POWER_LABEL, state.powerConsumption + ' W');
            }
          })
          .catch((error) => {
            logger.warn('[CONTROLLER] Polling failed:', error.message);
          });
      });
  }

  return controller;
}
