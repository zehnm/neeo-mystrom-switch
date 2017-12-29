'use strict';

/*
 * Auto discovery of myStrom devices - proof of concept
 * 
 * WiFi Switch v1 broadcasts itself over UPNP but I don't have such a device...
 */

const dgram = require('dgram');
const socket = dgram.createSocket('udp4');

const deviceTypes = new Map();
deviceTypes.set(101, "WSW");
deviceTypes.set(102, "WRB");
deviceTypes.set(103, "WBP");
deviceTypes.set(104, "WBS");
deviceTypes.set(105, "WRS");
deviceTypes.set(106, "WS2");
deviceTypes.set(107, "WSE");

socket.on('error', (err) => {
  console.log(`Server error:\n${err.stack}`);
  socket.close();
});

socket.on('message', (msg, rinfo) => {
  if (rinfo.size !== 8) {
    console.log('Invalid message size received: %d. Message:', rinfo.size, msg.toString('hex'));
    return;
  }

  let mac = msg.slice(0, 6);
  let deviceType = msg[6];
  //let flags = msg[7];

  console.log('myStrom device %s with MAC address %s and IP %s', deviceTypes.get(deviceType), mac.toString('hex'), rinfo.address);
});

socket.on('listening', () => {
  const address = socket.address();
  console.log(`Listening for myStrom UDP broadcast on ${address.address}:${address.port}`);
});

let address = "0.0.0.0"; // or set to specific host adapter address
socket.bind(7979, address);