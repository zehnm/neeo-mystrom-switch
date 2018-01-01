'use strict';
/**
 * Config file based 'discovery' of myStrom devices.
 */
const EventEmitter = require('events').EventEmitter;
const fs = require('fs');

class MyStromConfigFileDiscovery extends EventEmitter {

  constructor(fileName) {
    super();
    this.fileName = fileName;
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
      // reload configured devices
      const config = JSON.parse(fs.readFileSync(this.fileName));

      config.mystrom.devices.filter((device) => device.type === 'switch').forEach((device) => {
        this.emit('discover', { id: device.id, ip: device.host, type: 'WS2', lastActivity: Date.now(), reachable: true, name: device.name });

        // TODO use connectivity test to set reachable
      });
    }, 5000); // interval read every 5 seconds

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