# NEEO driver for myStrom WiFi Switch
Control [myStrom WiFi Switches](https://mystrom.ch/wifi-switch/) with [NEEO remote](https://neeo.com).
Devices must be configured in config-mystrom.json. Auto-discovery and cloud connectivity are not yet implemented.

Tested with:
 - Node.js v8.9.1
 - NEEO SDK 0.48.13 https://github.com/NEEOInc/neeo-sdk
 
## Features
 - Device type: Accessory

   If you prefer 'NEEO light style recipes' for the power switches: change index.js to .setType('LIGHT')

 - Power on / off / toggle buttons, power switch
 - Power consumption is exposed as sensor value and text field.
 - Local mode only: driver communicates directly with WiFi switch.
 - Also works with my [Raspberry Pi power switch](https://github.com/zehnm/pi-power-switch)

### TODO
 - auto discovery feature - will be implemented soon™
 - option to use myStrom cloud (either for initial discovery only or for full device access)
 - setting device reachability flag with connectivity test
 - improved error & auto retry handling
 - more efficient polling

## Requirements
 - Node.js >= v6.12 (https://nodejs.org)

## Installation
Download or clone the code from github.
```
git clone https://github.com/zehnm/neeo-mystrom-switch.git
```
Install required packages with npm
```
cd neeo-mystrom-switch
npm install
```

## Configuration
**Edit the config.json file to adjust the driver settings** 
 - neeo.brainIp : IP address of the NEEO brain (optional).

   Auto discovery is active if not specified. 
   See issue: https://github.com/NEEOInc/neeo-sdk/issues/36

 - neeo.callbackIp : IP address of machine running the driver (optional).

   Most likely required if auto discovery doesn't work.

 - neeo.callbackPort : local port number for device server

**Edit the config-mystrom.json file to configure myStrom devices**
 - mystrom.devices : array of WiFi Switch configurations:
   - id : unique device ID

     MAC address should be used for future auto-discovery feature (e.g. 30aea400112233) to support id -> name mapping

   - name : displayed name in NEEO
   - type : static value "switch"

     Every other value will be ignored, i.e. setting another name disables the device.

   - host : IP or host name with optional port number

     Assigning a static IP lease in your router is recommended.

## Start the driver

```
node index.js 
```
