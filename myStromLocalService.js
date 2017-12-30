'use strict';

const MyStromSwitch = require('./myStromLocalSwitch');
const BluePromise = require('bluebird');
const request = require('request');
const fs = require("fs");

class MyStromLocalService {

  constructor(deviceState) {
    this.deviceState = deviceState;

    this.discoverDevices();
  }

  discoverDevices() {
    // reload configured devices
    const config = JSON.parse(fs.readFileSync("config-mystrom.json"));

    config.mystrom.devices.filter((device) => device.type === 'switch').forEach((device) => {

      var switchDevice = new MyStromSwitch(device.host, device.id, device.name);
      // no need to filter already existing devices: addDevice uses a map 
      this.deviceState.addDevice(switchDevice.getId(), switchDevice);
      // TODO deviceState lacks a removeDevice operation. Set reachable to false for all devices no longer existing in the configuration file.
      // TODO use connectivity test to set reachable
      this.deviceState.updateReachable(switchDevice.getId(), true);
    });
  }

  invalidateCache(deviceId) {
    this.deviceState
      .getCachePromise(deviceId)
      .invalidate();
  }

  getState(deviceId) {
    const device = this.deviceState.getClientObjectIfReachable(deviceId);
    if (!device) {
      return BluePromise.reject(new Error('NOT_REACHABLE'));
    }

    function getSwitchState() {
      return new BluePromise((resolve, reject) => {
        device.getState().then((state) => {
          if (!state || !state.hasOwnProperty('relay')) {
            reject(new Error('INVALID_ANSWER'));
          }
          resolve(state);
        }).catch((error) => {
          reject(error);
        });
      });
    }

    return this.deviceState
      .getCachePromise(deviceId)
      .getValue(getSwitchState);
  }


  getPowerState(deviceId) {
    return this.getState(deviceId)
      .then((state) => {
        return state.relay;
      });
  }

  setPowerState(deviceId, value) {
    // TODO use proxy instead of copy paste
    return new BluePromise((resolve, reject) => {
      const device = this.deviceState.getClientObjectIfReachable(deviceId);
      if (!device) {
        return reject(new Error('NOT_REACHABLE'));
      }
      device.setPowerState(value)
        .then((state) => {
          this.invalidateCache(deviceId);
          resolve(state);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  powerToggle(deviceId) {
    // TODO use proxy instead of copy paste
    return new BluePromise((resolve, reject) => {
      const device = this.deviceState.getClientObjectIfReachable(deviceId);
      if (!device) {
        return reject(new Error('NOT_REACHABLE'));
      }
      device.powerToggle()
        .then((state) => {
          this.invalidateCache(deviceId);
          resolve(state);
        })
        .catch((error) => {
          reject(error);
        });
    });
  }

  getStateForPolling(deviceId) {
    return this.getState(deviceId)
      .then((state) => {
        return {
          power: state.relay,
          powerConsumption: state.power
        };
      });
  }

}

module.exports = MyStromLocalService;
