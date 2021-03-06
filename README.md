# NEEO driver for myStrom WiFi Switch
Control [myStrom WiFi Switches](https://mystrom.ch/wifi-switch/) with [NEEO remote](https://neeo.com).

WiFi Switch v2 devices are auto-discovered on local subnet. Manual configuration is possible in config/mystrom.json.

Tested with:
 - Node.js v8.9.1
 - NEEO SDK 0.48.13 https://github.com/NEEOInc/neeo-sdk
 
## Features
 - Device type: Accessory

   If you prefer 'NEEO light style recipes' for the power switches: change ./lib/neeoDevice.js to .setType('LIGHT')

 - Auto discovery of v2 WiFi switches
 - Optional manual configuration for v1 WiFi switches or different networks 
 - Power on / off / toggle buttons, power switch
 - Power consumption is exposed as sensor value and text field
 - Local mode only: driver communicates directly with WiFi switch.
 - Also works with my [Raspberry Pi power switch](https://github.com/zehnm/pi-power-switch)
 - Available as ready to use docker image

### TODO
 - auto discovery of v1 WiFi switches (the ones without temperature sensor)
 - option to use myStrom cloud (either for initial discovery only or for full device access)
 - setting device reachability flag with connectivity test
 - improved error & auto retry handling

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
### Driver settings
The driver can be configured in the optional configuration file `./config/driver.json`.
Default values are used if the file is missing (device server port 6336, auto discovery enabled).

Configuration options:
 - neeo
   - brainIp : IP address of the NEEO brain (optional).

     Auto discovery is active if not specified. 
     See issue: https://github.com/NEEOInc/neeo-sdk/issues/36

   - callbackIp : IP address of machine running the driver (optional).

     Most likely required if auto discovery doesn't work.

   - callbackPort : local port number for device server
 - mystrom.discoveryModes : specify which device discovery modes are active (at least one mode must be active)
   - configFile : true = read devices from configuration file which have a `host` property defined
   - local : true = local discovery mode (listen for UDP broadcast)
 - mystrom.localDiscovery : configuration section if mystrom.discoveryModes.local = true
   - listenAddress    : listen address for UDP broadcast. 0.0.0.0 = all interfaces
   - reachableTimeout : timeout in seconds to consider a device offline if no discovery message received
   - deviceTypeFilter : only consider the specified myStrom device types (at the moment only "WS2" is supported)
 - mystrom.polling : device polling configuration. Polling is not required but useful if you also control the devices with the myStrom app and would like a faster synchronization with NEEO.
   - interval : optional polling interval in seconds. 0 = disable device polling, default = 4
   - duration : optional time duration in seconds to perform polling after activity has been detected. default = 60

     Note: to perform a single status update withouth further polling after NEEO requests the device state, set duration < interval. E.g. duration = 1

#### Example: Default Configuration
 - auto discover NEEO brain
 - run device driver on port 6336
 - auto discover myStrom WiFi switches v2 on all network interfaces

```json
{
  "neeo": {
    "callbackPort": 6336
  },
  "mystrom": {
    "discoveryModes": {
      "configFile": false,
      "local": true
    },
    "localDiscovery": {
      "listenAddress": "0.0.0.0",
      "reachableTimeout": 30,
      "deviceTypeFilter": ["WS2"]
    }
  }
}
```
#### Example: Manual Configuration
 - specify IP address of NEEO brain
 - specify IP address and port of device driver
 - auto discover myStrom WiFi switches v2 on specified network interface
 - also read manually configured WiFi switches from device configuration file

```json
{
  "neeo": {
    "brainIp": "192.168.1.172",
    "callbackIp": "192.168.1.165",
    "callbackPort": 6338
  },
  "mystrom": {
    "discoveryModes": {
      "configFile": true,
      "local": true
    },
    "localDiscovery": {
      "listenAddress": "192.168.1.0",
      "reachableTimeout": 30,
      "deviceTypeFilter": ["WS2"]
    }
  }
}
```

### Device configuration
myStrom devices can be configured in `./config/mystrom.json`:
 - manually configure myStrom devices with MAC address, name and IP address
   - required for v1 WiFi switches which cannot yet be auto discovered
   - optional for v2 WiFi switches where auto discovery doesn't work (other subnets, virtualization etc.)
 - MAC address to device name mapping in auto-discovery mode if you'd like to display a human readable name within NEEO app

Configuration format:
 - mystrom.devices : array of WiFi Switch configurations:
   - id : MAC address (e.g. 30aea400112233)
   - name : displayed name in NEEO
   - type : static value "switch"

     Every other value will be ignored, i.e. setting another name disables the device.

   - host : IP or host name with optional port number

     Only required if auto-discovery is not used.

     Assigning a static IP lease in your router is recommended.

**Attention:** once a device is used in NEEO the id is stored in the brain and cannot be changed anymore. I.e. the device must be deleted and re-added again.

#### Example:
 - WiFi Switch MAC address mapping to device names
 - Manual configuration of a WiFi switch on another network
 - Manual configuration of a [Raspberry Pi power switch](https://github.com/zehnm/pi-power-switch)

```json
{
  "mystrom": {
    "devices": [
      {
        "id": "30aea400112233",
        "name": "Office",
        "type": "switch"
      },
      {
        "id": "30aea400112244",
        "name": "TV",
        "type": "switch"
      },
      {
        "id": "30aea400112255",
        "name": "Cellar",
        "type": "switch",
        "host": "172.16.16.16"
      },
      {
        "id": "rpi-switch",
        "name": "Printer",
        "type": "switch",
        "host": "OfficePi.local:8080"
      }
    ]
  }
}
```

## Start the driver

```
node index.js 
```

### Logging Level
The logging level can be specified in the environment variable `LOG_LEVEL`. Valid values are: error, warn, info, debug, silly. The default level is info.

```
LOG_LEVEL=debug node index.js 
```

## Docker
 - Based on `node:9-alpine`
 - Auto-discovery only works on Linux with host networking 

```
docker run --rm --network=host zehnm/neeo-mystrom-switch:latest
```

 - Docker on OSX and Windows requires manual NEEO brain and myStrom device configuration with port mapping: `-p 6336:6336`
 - Custom `driver.json` and `mystrom.json` files can be mapped in a local configuration directory with: `-v /MyDirectory/config:/neeo-driver-mystrom/config`
 - `LOG_LEVEL` environment variable is also supported. E.g. `--env LOG_LEVEL=debug`

```
docker run --rm -p 6336:6336 --env LOG_LEVEL=debug -v ${CFG_PATH}/config:/neeo-driver-mystrom/config zehnm/neeo-mystrom-switch:latest
```
