'use strict';

/**
 * myStrom device constants
 */

const devices = new Map([
    [101, "WSW"],
    [102, "WRB"],
    [103, "WBP"],
    [104, "WBS"],
    [105, "WRS"],
    [106, "WS2"],
    [107, "WSE"]
]);

module.exports = Object.freeze({
    /** Map of technical device id in discovery message to device type */
    DEVICE_ID_MAP: devices,
    /** Array of all myStrom device types*/
    DEVICE_TYPES: [...devices.values()]
});
