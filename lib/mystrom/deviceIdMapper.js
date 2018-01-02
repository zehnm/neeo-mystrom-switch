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

  getName(deviceProperties) {
    let device = this.deviceCfg.get(deviceProperties.id);
    if (device && device.name) {
      return device.name;
    }
    return deviceProperties.type + ' ' + deviceProperties.id;
  }
}

module.exports = DeviceIdMapper