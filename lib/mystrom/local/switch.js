'use strict';

const BluePromise = require('bluebird');
const request = require('request');

class MyStromLocalSwitch {
  constructor(host, id, name) {
    this.host = host;
    this.id = id;
    this.name = name;
    console.log('[MyStromSwitch] New device: %s / %s / %s', this.id, this.name, this.host);
  }

  getId() {
    return this.id;
  }

  getName() {
    return this.name;
  }

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

  powerOn() {
    return sendRequest("http://" + this.host + "/relay?state=1", this.id);
  }

  powerOff() {
    return sendRequest("http://" + this.host + "/relay?state=0", this.id);
  }

  powerToggle() {
    return sendRequest("http://" + this.host + "/toggle", this.id);
  }

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

module.exports = MyStromLocalSwitch;