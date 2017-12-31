'use strict';

/**
 * Test client for myStrom device discovery feature
 */
const myStromDiscovery = require('./lib/mystrom/local/discovery');
const discoveryControllerFactory = require('./lib/mystrom/discoveryController');


let discovery = new myStromDiscovery("0.0.0.0");
const discoveryController = discoveryControllerFactory(discovery, { reachableTimeout: 10, deviceTypeFilter: ['WS2'] });

discoveryController.startDiscovery();

discoveryController.on('discover', device => console.log('Discovered myStrom device %s: MAC=%s, IP=%s', device.type, device.id, device.ip))
  .on('filter', device => console.log('Ignoring filtered myStrom device %s: MAC=%s, IP=%s', device.type, device.id, device.ip))
  .on('error', err => console.error('Error:', err.message))
  .on('start', () => console.log('Discovery service started'))
  .on('stop', () => console.log('Discovery service stopped'))
  .on('unreachable', device => console.log('Device %s no longer reachable!', device.id))
  .on('reachable', device => console.log('Device %s reachable again!', device.id))
  ;

// just for fun / testing: continuously start and stop discovery service 
setInterval(() => {
  // let's see what we got
  discoveryController.stopDiscovery();
  console.log('Discovered the following devices:');
  discoveryController.getAllDevices().forEach(device => {
    console.log(device);
  });
  // up to a fresh start...
  console.log('Restarting discovery in 5 seconds...')
  discoveryController.clearDiscoveredDevices();
  setTimeout(() => discoveryController.startDiscovery(), 5000);
}, 30000);
