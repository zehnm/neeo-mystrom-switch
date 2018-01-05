'use strict';

/**
 * Map device id / MAC to a descriptive device name.
 * The mapping uses the specified configuration class.
 * @example Structure:
 * {
 *  "mystrom": {
 *   "devices": [
 *     {
 *       "id": "30aea400112233",
 *       "name": "Office"
 *     },
 *     {
 *       "id": "30aea400112244",
 *       "name": "TV"
 *     }
 *   ]
 *  }
 * }
 */
class DeviceIdMapper {

  constructor(configuration) {
    this.deviceCfg = configuration;
  }

  /**
   * @description Gets the descriptive name of the id in deviceProperties. 
   * - If deviceProperties already contains a name then its value is returned. 
   * - If no mapped name exists the returned name is composed of the device property's type and id.
   * @param {object} deviceProperties An object which contains **id** (identifier of the device), **type** (device type), **name** (optional, predefined name)
   * @returns {string} Mapped name
   */
  getName(deviceProperties) {
    if (deviceProperties.name) {
      return deviceProperties.name;
    }

    let device = this.deviceCfg.get(deviceProperties.id);
    if (device && device.name) {
      return device.name;
    }
    return deviceProperties.type + ' ' + deviceProperties.id;
  }
}

module.exports = DeviceIdMapper