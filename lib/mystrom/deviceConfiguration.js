'use strict';

const logger = require('winston');
const fs = require('fs');
const path = require('path');

/**
 * Device configuration based on the specified myStrom device configration file.
 * Configuration is automatically reloaded if the configuration file changes.
 * @example File structure:
 * {
 *  "mystrom": {
 *   "devices": [
 *     {
 *       "id": "30aea400112233",
 *       "name": "Office",
 *       "type": "switch",
 *       "host": "192.168.1.180"
 *     },
 *     {
 *       "id": "30aea400112244",
 *       "name": "TV",
 *       "type": "switch"
 *     }
 *   ]
 *  }
 * }
 */
class DeviceConfiguration {

  /**
   * Constructs a new DeviceConfiguration from the given `fileName`.
   * A file watcher will auto reload the configuration if the file changes.
   * 
   * @param {string} fileName The file name to load the device configuration from.
   */
  constructor(fileName) {
    this.fileName = fileName;
    this.deviceMap = loadConfig(fileName);

    fs.watch(fileName, (event, file) => {
      // TODO filter multiple events after file change
      logger.info('Reloading device configuration');
      this.deviceMap = loadConfig(path.format({ dir: path.dirname(this.fileName), base: file }));
    });
  }

  /**
   * Returns the device configuration object of the given `deviceId`.
   * 
   * @param {string} deviceId Device identifier matching the `id` property.
   * @return {object} Device configuration object.
   * @example get('30aea400112233') returns:
   *     {
   *       "id": "30aea400112233",
   *       "name": "Office",
   *       "type": "switch",
   *       "host": "192.168.1.180"
   *     }
   */
  get(deviceId) {
    return this.deviceMap.get(deviceId);
  }

  /**
   * @return {Array} All devices
   * @example getAll() returns:
   *   [
   *     {
   *       "id": "30aea400112233",
   *       "name": "Office",
   *       "type": "switch",
   *       "host": "192.168.1.180"
   *     },
   *     {
   *       "id": "30aea400112244",
   *       "name": "TV",
   *       "type": "switch"
   *     }
   *   ]
   */
  getAll() {
    return [...this.deviceMap.values()];
  }
}

/**
 * Reloads the configuration from the given configuration file in `fileName` and returns a map of the defined devices
 * which have property `type` set to "switch".
 * 
 * @param {string} fileName configuration file name.
 * @return {Map}  Device map from `mystrom.devices` with the `id` as key.
 */
function loadConfig(fileName) {
  let config = JSON.parse(fs.readFileSync(fileName));
  if (config.mystrom && config.mystrom.devices instanceof Array) {
    let devices = config.mystrom.devices.filter((device) => device.type === 'switch');
    return new Map(devices.map((device) => [device.id, device]));
  }

  return new Map();
}

module.exports = DeviceConfiguration