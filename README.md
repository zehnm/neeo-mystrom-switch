# NEEO driver for myStrom WiFi Switch
Control [myStrom WiFi Switches](https://mystrom.ch/wifi-switch/) with [NEEO remote](https://neeo.com).

WiFi Switch v2 devices are auto-discovered on local subnet. Manual configuration is possible in config/mystrom.json.

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
 - clean up code, better modularization, slim down index.js
 - allow mixed discovery (auto-discovery & config file)
 - device name resolution from config file (id (MAC) -> name)
 - auto discovery feature of v1 WiFi switches (the ones without temperature sensor)
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
**Edit the ./config/driver.json file to adjust the driver settings** 
 - neeo
   - brainIp : IP address of the NEEO brain (optional).

     Auto discovery is active if not specified. 
     See issue: https://github.com/NEEOInc/neeo-sdk/issues/36

   - callbackIp : IP address of machine running the driver (optional).

     Most likely required if auto discovery doesn't work.

   - callbackPort : local port number for device server
 - mystrom.discoveryModes
   - configFile : true = read devices from configration file
   - local : true = local discovery mode (listen for UDP broadcast)
 - mystrom.localDiscovery : configuration section if mystrom.discoveryModes.local = true
   - listenAddress    : listen address for UDP broadcast. 0.0.0.0 = all interfaces
   - reachableTimeout : timeout in seconds to consider a device offline if no discovery message received
   - deviceTypeFilter : only consider the specified myStrom device types

**Edit the ./config/mystrom.json file to manually configure myStrom devices**
 - mystrom.devices : array of WiFi Switch configurations:
   - id : MAC address (e.g. 30aea400112233)
   - name : displayed name in NEEO
   - type : static value "switch"

     Every other value will be ignored, i.e. setting another name disables the device.

   - host : IP or host name with optional port number

     Assigning a static IP lease in your router is recommended.

## Start the driver

```
node index.js 
```
