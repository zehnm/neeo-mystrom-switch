'use strict';

const logger = require('winston');
const EventEmitter = require('events').EventEmitter;
const dgram = require('dgram');
const myStrom = require('./../myStrom');

/**
 * Auto discovery of myStrom devices on local subnet by UDP broadcasts on port 7979.
 * 
 * Attention: WiFi Switch v1 devices cannot be discovered by UDP broadcasts!
 */
class MyStromLocalDiscovery extends EventEmitter {

  /**
   * Constructs a new MyStromLocalDiscovery.
   * 
   * @param {string} listenAddress optional listen address. If undefined or '0.0.0.0', the discovery will be attempted on all addresses. 
   */
  constructor(listenAddress) {
    super();
    this.listenAddress = listenAddress;
    this.socket = undefined;
  }

  /**
   * Starts the UDP auto discovery process.
   * If the discovery is already running the function simply returns.
   * 
   * @event start
   * @event discover
   * @type {object}
   * @property {string} id - MAC address as unique device identifier
   * @property {string} ip - IP address
   * @property {string} type - device type: see ../myStrom#DEVICE_TYPES
   * @property {number} lastActivity - timestamp of last device access, initialized to current time
   * @property {boolean} reachable - indicates if device is reachable, initialized to true
   * @event error
   */
  start() {
    if (this.socket && this.socket._receiving === true) {
      return;
    }
    this.socket = dgram.createSocket('udp4');
    this.socket.bind(7979, this.listenAddress);

    this.socket.on('listening', () => {
      const address = this.socket.address();
      logger.info(`[LocalDiscovery] Listening for myStrom UDP broadcast on ${address.address}:${address.port}`);
      this.emit('start');
    });
    this.socket.on('close', () => this.emit('stop'));
    this.socket.on('error', (err) => this.emit('error', err));
    this.socket.on('message', (msg, rinfo) => {
      if (rinfo.size !== 8) {
        logger.warn('[LocalDiscovery] Ignoring invalid message of size: %d. Message:', rinfo.size, msg.toString('hex'));
        return;
      }

      let mac = msg.slice(0, 6).toString('hex');
      let deviceType = myStrom.DEVICE_ID_MAP.get(msg[6]);
      //let flags = msg[7];  // to be reverse engineered! Unfortunately it's not the power state :(

      this.emit('discover', { id: mac, ip: rinfo.address, type: deviceType, lastActivity: Date.now(), reachable: true });
    });
  }

  /**
   * Stops the auto discovery process if it is currently running.
   * 
   * @event stop
   */
  stop() {
    if (this.socket) {
      this.socket.close();
      this.socket = undefined;
    }
  }
}

module.exports = MyStromLocalDiscovery;