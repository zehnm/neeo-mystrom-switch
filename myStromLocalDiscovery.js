'use strict';
/**
 * Auto discovery of myStrom devices
 * 
 * WiFi Switch v1 broadcasts itself over UPNP but I don't have such a device...
 */

const myStrom = require('./myStrom');
const EventEmitter = require('events').EventEmitter;
const dgram = require('dgram');

class MyStromLocalDiscovery extends EventEmitter {

  constructor(listenAddress) {
    super();
    this.listenAddress = listenAddress;
    this.socket = undefined;
  }

  start() {
    if (this.socket && this.socket._receiving === true) {
      return;
    }
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(7979, this.address);

    this.socket.on('listening', () => {
      const address = this.socket.address();
      console.log(`Listening for myStrom UDP broadcast on ${address.address}:${address.port}`);
      this.emit('start');
    });
    this.socket.on('close', () => this.emit('stop'));
    this.socket.on('error', (err) => this.emit('error', err));
    this.socket.on('message', (msg, rinfo) => {
      if (rinfo.size !== 8) {
        console.log('Ignoring invalid message of size: %d. Message:', rinfo.size, msg.toString('hex'));
        return;
      }

      let mac = msg.slice(0, 6).toString('hex');
      let deviceType = myStrom.DEVICE_ID_MAP.get(msg[6]);
      //let flags = msg[7];  // to be reverse engineered! Unfortunately it's not the power state :(

      this.emit('discover', { id: mac, ip: rinfo.address, type: deviceType, lastActivity: Date.now(), reachable: true });
    });
  }

  stop() {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}

module.exports = MyStromLocalDiscovery;