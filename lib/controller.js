'use strict';
/*
 * Device Controller
 * Events on that device from the Brain will be forwarded here for handling.
 */

const logger = require('winston');
const BluePromise = require('bluebird');
const constants = require('./constants');

const DEVICE_POLL_TIME_MS = 4000;

module.exports = (myStromService, discoveryController, options) => {
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
        logger.debug(`Unsupported button: ${name} for ${deviceId}`);
        return Promise.resolve(false);
    }
  };

  controller.powerConsumption = (deviceId) => {
    return controller.getPowerConsumption(deviceId)
  };

  controller.setPowerState = (deviceId, value) => {
    return myStromService.setPowerState(deviceId, value);
  }

  controller.getPowerState = (deviceId) => {
    return myStromService.getPowerState(deviceId)
  }

  controller.getPowerConsumption = (deviceId) => {
    logger.info('[CONTROLLER] get power consumption from', deviceId);
    return new BluePromise((resolve, reject) => {
      myStromService
        .getStateForPolling(deviceId)
        .then((state) => {
          resolve(state.powerConsumption);
        })
        .catch((error) => {
          logger.error('[CONTROLLER] get power consumption failed:', error.message);
          resolve(0);
        });
    });
  }


  controller.discoverDevices = () => {
    logger.info('[CONTROLLER] discover devices call');
    //myStromService.discoverDevices();
    // FIXME
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
    logger.debug('[CONTROLLER] register update state for switch device');
    sendComponentUpdate = updateFunction;
  };

  controller.initialize = () => {
    discoveryController.startDiscovery();

    if (pollingIntervalId) {
      logger.debug('already initialized, ignore call');
      return false;
    }

    logger.info('[CONTROLLER] initialize myStrom service, start polling');
    pollingIntervalId = setInterval(pollAllDevices, DEVICE_POLL_TIME_MS);
  };

  function sendNotificationToBrain(uniqueDeviceId, component, value) {
    sendComponentUpdate({ uniqueDeviceId, component, value })
      .catch((error) => {
        logger.debug('NOTIFICATION_FAILED', error.message);
      });
  }

  function pollAllDevices() {
    logger.debug('Polling all switch devices...');
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
            sendNotificationToBrain(device.id, constants.COMPONENT_POWER_SENSOR, state.powerConsumption);
            sendNotificationToBrain(device.id, constants.COMPONENT_POWER_LABEL, state.powerConsumption + ' W');
          })
          .catch((error) => {
            logger.warn('[CONTROLLER] polling failed:', error.message);
          });
      });
  }

  return controller;
}
