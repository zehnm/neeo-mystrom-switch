'use strict';
/*
 * Device Controller
 * Events on that device from the Brain will be forwarded here for handling.
 */

const logger = require('winston');
const BluePromise = require('bluebird');
const constants = require('./constants');

module.exports = (config, myStromService, discoveryController) => {
  let sendComponentUpdate = undefined;
  let pollingIntervalId = undefined;
  const usedDevicesByNeeo = new Map();
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
        .getPowerConsumption(deviceId)
        .then((powerConsumption) => {
          resolve(powerConsumption);
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
    logger.info('[CONTROLLER] Initialize myStrom service');
    discoveryController.startDiscovery();

    if (pollingIntervalId) {
      logger.debug('[CONTROLLER] Already initialized, ignore call');
      return false;
    }

    const interval = config.mystrom.polling && config.mystrom.polling.interval >= 0 ?
      config.mystrom.polling.interval : constants.DEVICE_POLL_INTERVAL;
    if (interval === 0) {
      logger.verbose('[CONTROLLER] Device polling is disabled');
    } else {
      logger.info('[CONTROLLER] Start polling devices every %d seconds', interval);
      pollingIntervalId = setInterval(pollAllDevices, interval * 1000);
    }
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
    myStromService.getAllReachableDevices().filter((item) => {
      // only poll devices which are currently in use by NEEO
      const lastUseDate = item.clientObject.lastUseDate;
      const duration = config.mystrom.polling && config.mystrom.polling.duration ?
        config.mystrom.polling.duration : constants.DEVICE_POLL_DURATION;
      return lastUseDate && Date.now() - lastUseDate < duration * 1000;
    })
      .forEach((device) => {
        logger.debug('[CONTROLLER] Polling all reachable and active switch devices...');
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
