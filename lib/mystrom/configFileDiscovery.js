'use strict';

const logger = require('winston');
const EventEmitter = require('events').EventEmitter;

/**
 * Config file based 'discovery' of myStrom devices.
 */
class MyStromConfigFileDiscovery extends EventEmitter {

  constructor(configuration) {
    super();
    this.deviceCfg = configuration;
    this.started = false;
    this.timeout = undefined;
  }

  start() {
    if (this.started === true) {
      return;
    }

    this.started = true;
    this.emit('start');

    // obey asynchronous behaviour as MyStromLocalDiscovery
    this.timeout = setInterval(() => {

      this.deviceCfg.getAll().filter((device) => device.host).forEach((device) => {
        this.emit('discover', { id: device.id, ip: device.host, type: 'WS2', lastActivity: Date.now(), reachable: true, name: device.name });

        // TODO use connectivity test to set reachable
      });
    }, 5000); // simulate device discovery every 5 seconds as the original myStrom UDP discovery

    logger.info('Reading myStrom devices from configuration file', this.deviceCfg.fileName);
  }

  stop() {
    if (this.started === false) {
      return;
    }

    if (this.timeout) {
      clearInterval(this.timeout);
      this.timeout = undefined;
    }
    this.started = false;
    this.emit('stop');
  }

}

module.exports = MyStromConfigFileDiscovery;