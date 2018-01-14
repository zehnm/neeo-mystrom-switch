'use strict';
/*
 * NEEO Device Controller.
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

  /**
   * One button handler for each registered button.
   * Note: return value is ignored... Is the brain smart enough to consider an Error a failed button press?
   * 
   * @param {string} name button name.
   * @param {string} deviceId unique device identifier.
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

  /**
   * Callback function for the power consumption text label.
   * 
   * @param {string} deviceId unique device identifier.
   * @return {Promise} power consumption with unit suffix, e.g. "52.3 W".
   */
  controller.getPowerConsumptionLabelValue = (deviceId) => {
    return new BluePromise((resolve, reject) => {
      myStromService
        .getPowerConsumption(deviceId)
        .then((powerConsumption) => {
          resolve(powerConsumption + ' W');
        })
        .catch((error) => {
          logger.error('[CONTROLLER] Get power consumption failed:', error.message);
          resolve(0);
        });
    });
  };

  /**
   * Callback function for the power switch element to set the state.
   * 
   * @param {string} deviceId unique device identifier.
   * @param {boolean} value   true = power on, false = power off
   */
  controller.setPowerState = (deviceId, value) => {
    logger.verbose('[CONTROLLER] Set power state request:', deviceId, value);
    return myStromService.setPowerState(deviceId, value);
  }

  /**
   * Callback function for the power switch element to retrieve the current state.
   * 
   * @param {string} deviceId unique device identifier.
   * @return {Promise} boolean value: true if switch is on, false if off
   */
  controller.getPowerState = (deviceId) => {
    logger.verbose('[CONTROLLER] Get power state request:', deviceId);
    return myStromService.getPowerState(deviceId)
  }

  /**
   * Callback function for the power consumption sensor value.
   * 
   * @param {string} deviceId unique device identifier.
   * @return {Promise} fixed length number as string with on decimal place, e.g. "52.3".
   */
  controller.getPowerConsumption = (deviceId) => {
    logger.verbose('[CONTROLLER] Get power consumption request:', deviceId);
    return myStromService.getPowerConsumption(deviceId);
  }

  /**
   * Callback function which will be called when the NEEO brain search your device.
   * 
   * @return {Array} Found devices, each object with an id attribute (unique device identifier), name (display name)
   *                 and the optional reachable attribute (true: device is reachable, false: device is not reachable)
   */
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

  /**
   * Callback function which will be called from NEEO when the device should be initialized. 
   */
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

    return true;
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
