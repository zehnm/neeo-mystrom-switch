'use strict';
/**
 * Map device id / MAC to a descriptive device name.
 * The mapping is read from the specified myStrom device configuration file. Structure:
 * {
 *  "mystrom": {
 *   "devices": [
 *     {
 *       "id": "30aea400112233",
 *       "name": "Office",
 *       "type": "switch"
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

const fs = require('fs');
const path = require('path');

class DeviceIdMapper {

  constructor(fileName, deviceType) {
    this.fileName = fileName;
    this.deviceType = deviceType;
    this.deviceMap = loadConfig(fileName, deviceType);

    fs.watch(fileName, (event, file) => {
      console.log('Reloading device id mapper configuration');
      this.devices = loadConfig(path.format({ dir: path.dirname(this.fileName), base: file }), this.deviceType);
    });
  }

  getName(deviceProperties) {
    let device = this.deviceMap.get(deviceProperties.id);
    if (device && device.name) {
      return device.name;
    }
    return deviceProperties.type + ' ' + deviceProperties.id;
  }
}

function loadConfig(fileName, deviceType) {
  let config = JSON.parse(fs.readFileSync(fileName));
  if (config.mystrom && config.mystrom.devices instanceof Array) {
    let devices = config.mystrom.devices.filter((device) => device.type === deviceType);
    return new Map(devices.map((device) => [device.id, device]));
  }

  return new Map();
}

module.exports = DeviceIdMapper