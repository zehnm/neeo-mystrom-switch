'use strict';

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

  constructor(fileName) {
    this.fileName = fileName;
    this.deviceMap = loadConfig(fileName);

    fs.watch(fileName, (event, file) => {
      // TODO filter multiple events after file change
      console.log('Reloading device configuration');
      this.deviceMap = loadConfig(path.format({ dir: path.dirname(this.fileName), base: file }));
    });
  }

  get(deviceId) {
    return this.deviceMap.get(deviceId);
  }

  getAll() {
    return [...this.deviceMap.values()];
  }
}

function loadConfig(fileName) {
  let config = JSON.parse(fs.readFileSync(fileName));
  if (config.mystrom && config.mystrom.devices instanceof Array) {
    let devices = config.mystrom.devices.filter((device) => device.type === 'switch');
    return new Map(devices.map((device) => [device.id, device]));
  }

  return new Map();
}

module.exports = DeviceConfiguration