'use strict';

const EventEmitter = require('events').EventEmitter;

/**
 * A simple device discovery aggregator. Bundles multiple discoveries as a single event emitter.
 * 
 * A device discovery must support the functions `start()` and `stop()`.
 */
class DiscoveryAggregator extends EventEmitter {
  constructor() {
    super();
    this.deviceDiscoveries = new Array();
  }

  /**
   * Adds a device discovery to the aggregator. This function must be called before {@link start}.
   * 
   * @param {deviceDiscovery} deviceDiscovery The device discovery to add
   * @see MyStromConfigFileDiscovery
   * @see MyStromLocalDiscovery
   */
  addDeviceDiscovery(deviceDiscovery) {
    deviceDiscovery.on('discover', device => this.emit('discover', device));
    deviceDiscovery.on('error', err => this.emit('error', err));
    // start and stop events are only used for log statements: therefore just use first device for event propagation
    if (this.deviceDiscoveries.length == 0) {
      deviceDiscovery.on('start', () => this.emit('start'));
      deviceDiscovery.on('stop', () => this.emit('stop'));
    }
    this.deviceDiscoveries.push(deviceDiscovery);
  }

  /**
   * Starts all discoveries which were added with {@link addDeviceDiscovery}.
   */
  start() {
    this.deviceDiscoveries.forEach((discovery) => discovery.start());
  }

  /**
   * Stops all discoveries which were added with {@link addDeviceDiscovery}.
   */
  stop() {
    this.deviceDiscoveries.forEach((discovery) => discovery.stop());
  }
}

module.exports = DiscoveryAggregator;