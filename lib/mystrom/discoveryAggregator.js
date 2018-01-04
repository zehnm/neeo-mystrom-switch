'use strict';

const EventEmitter = require('events').EventEmitter;

/**
 * Device discovery aggregator. Bundles multiple discoveries as a single event emitter.
 */
class DiscoveryAggregator extends EventEmitter {
  constructor() {
    super();
    this.deviceDiscoveries = new Array();
  }

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

  start() {
    this.deviceDiscoveries.forEach((discovery) => discovery.start());
  }

  stop() {
    this.deviceDiscoveries.forEach((discovery) => discovery.stop());
  }
}

module.exports = DiscoveryAggregator;