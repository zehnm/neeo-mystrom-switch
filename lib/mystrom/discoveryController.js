'use strict';

const logger = require('winston');
const EventEmitter = require('events').EventEmitter;
const myStrom = require('./myStrom');

/**
 * myStrom device discovery controller.
 * 
 * Manages the discovery of myStrom devices:
 * - filters device types: for now we're only interested in WiFi switches (configurable with `options.deviceTypeFilter`)
 * - filters repeating `discover` events: initial event is treated as a new device discovery and re-emits the 
 *   `discover` event. The following `discover` events are treated as "device is still alive" events.
 * 
 * @param {class} discoveryService The device discovery service which must support functions `start` and `stop` and emit events `discover`, `start`, `stop`.
 * @see DiscoveryAggregator
 * @see MyStromConfigFileDiscovery
 * @see MyStromLocalDiscovery
 * @param {object} options Configuration object with the following optional properties:
 * @property {number} reachableTimeout Integer value of after how many seconds a device is considered unreachable if no new `discover` event has been received.
 * @property {Array} deviceTypeFilter  Array of all enabled myStrom device types. All other types are ignored and event `filter` is sent.
 * @event start
 * @event discover
 * @event filter
 * @event reachable
 * @event unreachable
 * @event stop
 * @event error
 */
module.exports = (discoveryService, options) => {
  const reachableTimeout = options.hasOwnProperty('reachableTimeout') ? options.reachableTimeout * 1000 : 30000;
  const deviceTypeFilter = new Set(options.hasOwnProperty('deviceTypeFilter') ? options.deviceTypeFilter : myStrom.DEVICE_TYPES);
  const deviceMap = new Map();
  const controller = new EventEmitter();

  /** Start discovery service */
  controller.startDiscovery = () => {
    discoveryService.start();
  }

  /** Stop discovery service */
  controller.stopDiscovery = () => {
    discoveryService.stop();
  }

  controller.handleDiscovery = (device) => {
    let oldDevice = deviceMap.get(device.id);

    if (!oldDevice) {
      controller.emit('discover', device);
    } else if (oldDevice.reachable === false) {
      controller.emit('reachable', device);
    }

    deviceMap.set(device.id, device);
  };

  /**
   * Clear all discovered devices.
   */
  controller.clearDiscoveredDevices = () => deviceMap.clear();

  /**
   * Returns the device configuration object with the given `key`.
   * 
   * @param {string} key Device identifier matching the `id` of a discovered device.
   * @return {object} Device configuration object or `undefined`. Object contains properties `id`, `type`, `ip`, `reachable`, `lastActivity` and optionally `name`.
   * @example get('30aea400112233') returns:
   *     {
   *       "id": "30aea400112233",
   *       "type": "WS2",
   *       "ip": "192.168.1.180",
   *       "reachable": true,
   *       "lastActivity": 1515862633821
   *     }
   */
  controller.getDevice = (key) => deviceMap.get(key);

  /** 
   * Retrieve all discovered devices.
   * 
   * @returns Array of device discovery objects
   * @example getAllDevices() returns:
   *   [
   *     {
   *       "id": "30aea400112233",
   *       "type": "WS2",
   *       "ip": "192.168.1.180"
   *       "reachable": true,
   *       "lastActivity": 1515862633821
   *     },
   *     {
   *       "id": "rpi-switch",
   *       "name": "Printer",
   *       "type": "WS2"
   *       "ip": "OfficePi.local:8080"
   *       "reachable": true,
   *       "lastActivity": 1515862833913
   *     }
   *   ]
   */
  controller.getAllDevices = () => Array.from(deviceMap.values());

  discoveryService.on('discover', device => {
    if (!deviceTypeFilter.has(device.type)) {
      return controller.emit('filter', device);
    }

    controller.handleDiscovery(device);
  })
    .on('error', err => {
      logger.error('Error stopping discovery service:', err.message);
      discoveryService.stop();
      controller.emit('error', err);
    })
    .on('start', () => controller.emit('start'))
    .on('stop', () => controller.emit('stop'));

  setInterval(() => {
    deviceMap.forEach((device, key) => {
      if (device.reachable === true && device.lastActivity + reachableTimeout < Date.now()) {
        device.reachable = false;
        controller.emit('unreachable', device);
      }
    })
  }, 1000);

  return controller;
};