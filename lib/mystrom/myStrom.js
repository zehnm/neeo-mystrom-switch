'use strict';

/**
 * myStrom device type constants
 */
const devices = new Map([
    /** WiFi Switch v1 */
    [101, "WSW"],
    /** WiFi Bulb */
    [102, "WRB"],
    /** WiFi Button Plus */
    [103, "WBP"],
    /** WiFi Button */
    [104, "WBS"],
    /** unkown */
    [105, "WRS"],
    /** WiFi Switch v2 */
    [106, "WS2"],
    /** unkown */
    [107, "WSE"]
]);

module.exports = Object.freeze({
    /** Map of technical device id in UDP discovery message to device type */
    DEVICE_ID_MAP: devices,
    /** Array of all myStrom device types*/
    DEVICE_TYPES: [...devices.values()]
});
