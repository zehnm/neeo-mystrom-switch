'use strict';

const myStrom = require('./myStrom');
const EventEmitter = require('events').EventEmitter;

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

  controller.getDevice = (key) => deviceMap.get(key);

  /** 
   * Retrieve all discovered devices.
   * @returns Array of device discovery objects
   */
  controller.getAllDevices = () => Array.from(deviceMap.values());

  discoveryService.on('discover', device => {
    if (!deviceTypeFilter.has(device.type)) {
      return controller.emit('filter', device);
    }

    controller.handleDiscovery(device);
  })
    .on('error', err => {
      console.log('Error, stopping discovery service:', err.message);
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