'use strict';
/**
 * myStrom WiFi Switch device using local device API.
 */
const BluePromise = require('bluebird');
const request = require('request');

class MyStromLocalSwitch {
  constructor(id, host, name) {
    this.id = id;
    this.host = host;
    this.name = name;
    console.log('[MyStromSwitch] New device: %s / %s / %s', this.id, this.name, this.host);
  }

  /**
   * @function getId
   * @return {String} Returns the unique device identifier which is usually the MAC address.
   */
  getId() {
    return this.id;
  }

  /**
   * @function getName
   * @return {String} Returns the assigned device name.
   */
  getName() {
    return this.name;
  }

  /**
   * @function getState
   * @description Retrieves the state of the device.
   * @return {Promise} will be resolved after a successful API call and contains the report JSON object with the **relay** and **power** properties. 
   */
  getState() {
    return new BluePromise((resolve, reject) => {
      var self = this;
      request("http://" + this.host + "/report", function (error, response, body) {
        if (error) {
          console.log('[MyStromSwitch] Error getting state %s: %s', self.id, error);
          reject(error);
        } else if (response.statusCode !== 200) {
          reject(new Error('INVALID_ANSWER from ' + self.id + ': ' + response.statusCode + ' ' + response.statusMessage));
        } else {
          var result = JSON.parse(body);
          if (result.hasOwnProperty('power') && result.power != 0) {
            result.power = result.power.toFixed(1);
          }
          console.log('[MyStromSwitch] %s state: %s, %s W', self.id, result.relay === true ? 'On' : 'Off', result.power);
          resolve(result);
        }
      });
    });
  }

  /**
   * @function powerOn
   * @description Switches the device on.
   * @return {Promise} will be resolved after a successful API call.
   */
  powerOn() {
    return sendRequest("http://" + this.host + "/relay?state=1", this.id);
  }

  /**
   * @function powerOff
   * @description Switches the device off.
   * @return {Promise} will be resolved after a successful API call.
   */
  powerOff() {
    return sendRequest("http://" + this.host + "/relay?state=0", this.id);
  }

  /**
   * @function powerToggle
   * @description Toggles the power state of the device.
   * @return {Promise} will be resolved after a successful API call.
   */
  powerToggle() {
    return sendRequest("http://" + this.host + "/toggle", this.id);
  }

  /**
   * @function buildInstance
   * @description Builds a new instance of MyStromLocalSwitch.
   * @param {object} discoveredDevice 
   * @return {MyStromLocalSwitch} MyStromLocalSwitch object.
   */
  setPowerState(value) {
    if (value === true || value === 'true') {
      return this.powerOn();
    } else {
      return this.powerOff();
    }
  }
};

function sendRequest(url, deviceId) {
  return new BluePromise((resolve, reject) => {
    request(url, function (error, response, body) {
      if (error) {
        reject(error);
      } else if (response.statusCode !== 200) {
        reject(new Error('INVALID_ANSWER from ' + deviceId + ': ' + response.statusCode + ' ' + response.statusMessage));
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * @function buildInstance
 * @description Builds a new instance of MyStromLocalSwitch.
 * @param {String} id unique device identifier, usually the MAC address.
 * @param {String} host hostname or IP address with optional port number
 * @param {String} name assigned device name
 * @return {MyStromLocalSwitch} MyStromLocalSwitch object.
 */
function buildInstance(id, host, name) {
  return new MyStromLocalSwitch(id, host, name);
}

module.exports = {
  buildInstance
};