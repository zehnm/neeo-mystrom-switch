'use strict';

const logger = require('winston');
const EventEmitter = require('events').EventEmitter;

/**
 * Config file based 'discovery' of myStrom devices.
 */
class MyStromConfigFileDiscovery extends EventEmitter {

  /**
   * Constructs a new MyStromConfigFileDiscovery
   * 
   * @param {DeviceConfiguration} configuration  The device configuration from where to retrieve the devices from
   */
  constructor(configuration) {
    super();
    this.deviceCfg = configuration;
    this.started = false;
    this.timeout = undefined;
  }

  /**
   * Starts the discovery process: retrieves every 5 seconds all defined devices from the given
   * configuration which contain a `host` property and emits them as `discover` events. 
   * If the discovery is already running the function simply returns.
   * 
   * @event start
   * @event discover
   * @type {object}
   * @property {string} id - MAC address as unique device identifier
   * @property {string} ip - IP address
   * @property {string} type - device type: hardcoded to 'WS2' (WiFi Switch v2)
   * @property {number} lastActivity - timestamp of last device access, initialized to current time
   * @property {boolean} reachable - indicates if device is reachable, initialized to true
   * @property {string} name - specified name of the device in the configuration file
   */
  start() {
    if (this.started === true) {
      return;
    }

    this.started = true;
    this.emit('start');

    // obey asynchronous behaviour as MyStromLocalDiscovery
    this.timeout = setInterval(() => {
      this.getAll().forEach((device) => {
        this.emit('discover', { id: device.id, ip: device.host, type: 'WS2', lastActivity: Date.now(), reachable: true, name: device.name });

        // TODO use connectivity test to set reachable
      });
    }, 5000); // simulate device discovery every 5 seconds as the original myStrom UDP discovery

    logger.info('Reading myStrom devices from configuration file', this.deviceCfg.fileName);

    if (this.getAll().length === 0) {
      logger.warn("Device configuration file doesn't define any devices with a host property");
    }
  }

  /**
   * Stops the discovery process if it is currently running.
   * 
   * @event stop
   */
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

  /**
   * @return {Array} All devices containing a host property
   */
  getAll() {
    return this.deviceCfg.getAll().filter((device) => device.host);
  }

}

module.exports = MyStromConfigFileDiscovery;