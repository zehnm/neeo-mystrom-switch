'use strict';

const logger = require('winston');
const BluePromise = require('bluebird');
const neeoapi = require('neeo-sdk');

/**
 * myStrom service class. 
 * The interaction is based on the device id which is usually the MAC address.
 * New devices are announced by the specified `deviceController` with a `discover` event.
 * 
 * Every device read access is cached for 2s with NEEO's `DeviceState`.
 */
class MyStromService {

  /**
   * Constructs a new myStrom service to interact with myStrom devices.
   * 
   * @param {DiscoveryController} discoveryController DiscoveryController instance for listening on `discover`, `unreachable`, and `reachable` events.
   * @param {DeviceBuilder} deviceBuilder A device builder which returns a suitable myStrom device driver based on the `discover` object.
   */
  constructor(discoveryController, deviceBuilder) {
    this.discoveryController = discoveryController;
    this.deviceBuilder = deviceBuilder;
    this.deviceState = neeoapi.buildDeviceState(); // DeviceState supports an optional timeout. Default = 2000.

    this.discoveryController.on('discover', device => {
      logger.debug('Discovered myStrom device %s: MAC=%s, IP=%s', device.type, device.id, device.ip);
      let switchDevice = this.deviceBuilder(device);
      // inject last use date property to control polling
      switchDevice.lastUseDate = undefined;
      this.deviceState.addDevice(switchDevice.getId(), switchDevice);
    })
      .on('filter', device => logger.debug('Ignoring filtered myStrom device %s: MAC=%s, IP=%s', device.type, device.id, device.ip))
      .on('error', err => logger.error('Discovery error:', err.message))
      .on('start', () => logger.debug('Discovery service started'))
      .on('stop', () => logger.debug('Discovery service stopped'))
      .on('unreachable', device => {
        this.deviceState.updateReachable(device.id, false);
        logger.info('Device %s no longer reachable!', device.id);
      })
      .on('reachable', device => {
        this.deviceState.updateReachable(device.id, true);
        logger.info('Device %s reachable again!', device.id)
      })
      ;  
  }

 /**
  * @function getAllDevices
  * @return {Array} Returns all known devices (device instance, id, reachable state).
  */
  getAllDevices() {
    return this.deviceState.getAllDevices();
  }

 /**
  * @function getAllReachableDevices
  * @return {Array} Returns all known devices which are reachable (device instance, id, reachable state).
  */
  getAllReachableDevices() {
    return this.deviceState.getAllDevices().filter((device) => { return device.reachable });
  }

  /**
   * @function removeDevice
   * @description Removes the given device from the known devices.
   * @param {string} deviceId  unique device identifier.
   */
  removeDevice(deviceId) {
    this.deviceState.deviceMap.delete();
  }

  /**
   * @function removeAllDevices
   * @description Removes all known devices.
   */
  removeAllDevices() {
    this.deviceState.deviceMap.clear();
  }

  /**
   * @function getState
   * @description Retrieves the state of the given device in `deviceId` if it's reachable.
   * @param {string} deviceId unique device identifier.
   * @param {boolean} updateLastUseDate true = updates the device property `lastUseDate` with the current timestamp
   * @return {Promise} will be resolved after a successful device call and contains the report JSON object with the **relay** and **power** properties.
   *                   Rejected if device is unreachable or responds with an invalid message.
   */
  getState(deviceId, updateLastUseDate = true) {
    const device = this.deviceState.getClientObjectIfReachable(deviceId);
    if (!device) {
      return BluePromise.reject(new Error('NOT_REACHABLE ' + deviceId));
    }

    function getSwitchState() {
      return new BluePromise((resolve, reject) => {
        device.getState().then((state) => {
          if (!state || !state.hasOwnProperty('relay')) {
            reject(new Error('INVALID_ANSWER'));
          }
          if (updateLastUseDate) {
            device.lastUseDate = Date.now();
          }
          resolve(state);
        }).catch((error) => {
          reject(error);
        });
      });
    }

    return this.deviceState
      .getCachePromise(deviceId)
      .getValue(getSwitchState);
  }

  /**
   * @function getPowerState
   * @description Retrieves the power state of the given device in `deviceId` if it's reachable and updates the device property `lastUseDate` with the current timestamp.
   * @param {string} deviceId unique device identifier.
   * @return {Promise} boolean value: true if switch is on, false if off
   */
  getPowerState(deviceId) {
    return this.getState(deviceId)
      .then((state) => {
        return state.relay;
      });
  }

  /**
   * @function getPowerConsumption
   * @description Retrieves the power consumption in watt of the given device in `deviceId` if it's reachable and updates the device property `lastUseDate` with the current timestamp.
   * @param {string} deviceId unique device identifier.
   * @return {Promise} fixed length number as string with on decimal place
   */
  getPowerConsumption(deviceId) {
    return this.getState(deviceId)
      .then((state) => {
        return state.power;
      });
  }

  /**
   * @function setPowerState
   * @description Switches the device off or on and updates the device property `lastUseDate` with the current timestamp.
   * @param {string} deviceId unique device identifier.
   * @param {boolean} value the power state 
   * @return {Promise} will be resolved after a successful API call.
   */
  setPowerState(deviceId, value) {
    // TODO use proxy instead of copy paste
    return new BluePromise((resolve, reject) => {
      const device = this.deviceState.getClientObjectIfReachable(deviceId);
      if (!device) {
        return reject(new Error('NOT_REACHABLE ' + deviceId));
      }
      device.setPowerState(value)
        .then((state) => {
          device.lastUseDate = Date.now();
          this.deviceState.getCachePromise(deviceId).invalidate();
          resolve(state);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * @function powerToggle
   * @description Toggles the power state of the device and updates the device property `lastUseDate` with the current timestamp.
   * @param {string} deviceId unique device identifier.
   * @return {Promise} will be resolved after a successful API call.
   */
  powerToggle(deviceId) {
    // TODO use proxy instead of copy paste
    return new BluePromise((resolve, reject) => {
      const device = this.deviceState.getClientObjectIfReachable(deviceId);
      if (!device) {
        return reject(new Error('NOT_REACHABLE ' + deviceId));
      }
      device.powerToggle()
        .then((state) => {
          device.lastUseDate = Date.now();
          this.deviceState.getCachePromise(deviceId).invalidate();
          resolve(state);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  /**
   * @function getStateForPolling
   * @description Special state retrieval function for device polling without 
   * setting a new timestamp in the device access (device property `lastUseDate`).
   * @param {String} deviceId  unique device identifier.
   * @returns {object} Object which contains **power** and **powerConsumption** 
   */
  getStateForPolling(deviceId) {
    return this.getState(deviceId, false)
      .then((state) => {
        return {
          power: state.relay,
          powerConsumption: state.power
        };
      });
  }

}

module.exports = MyStromService;
