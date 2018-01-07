'use strict';

const neeoapi = require('neeo-sdk');
const Controller = require('./controller');
const Constants = require('./constants');
const DiscoveryAggregator = require('./mystrom/discoveryAggregator');
const MyStromLocalDiscovery = require('./mystrom/local/discovery');
const MyStromConfigFileDiscovery = require('./mystrom/configFileDiscovery');
const DiscoveryControllerFactory = require('./mystrom/discoveryController');
const MyStromService = require('./mystrom/service');
const MyStromLocalSwitch = require('./mystrom/local/switch');
const DeviceConfiguration = require('./mystrom/deviceConfiguration');
const DeviceIdMapper = require('./mystrom/deviceIdMapper');

/**
 * NEEO device builder for myStrom WiFi switch devices
 */
class NeeoDevice {
  constructor(config) {
    this.config = config;
  }

  buildDevice(adaptername, manufacturer) {
    const discoveryInstructions = {
      headerText: 'Device Discovery',
      description: this.config.mystrom.discoveryModes.local === true ?
        'myStrom WiFi switches v2 are auto discovered on local subnet. Device discovery broadcast is every 5 seconds. Press Next when ready!'
        : 'Auto discovery is not enabled: myStrom WiFi switches must be specified in the configuration file config/mystrom.json of the driver. Press Next when ready!'
    };

    const powerConsumptionSensor = {
      name: Constants.COMPONENT_POWER_SENSOR,
      label: 'Current consumption',
      range: [0, 2250],
      unit: 'Watt'
    };

    const controller = buildController(this.config);

    // Note: neeoapi.buildDevice supports a second parameter uniqueString which prevents the inclusion of the hostname in the driver identification.
    //       Unfortunately it's still not possible to move a once registered device driver to another host :-(
    //       Example: neeoapi.buildDevice(adaptername, 'neeo-deviceserver')
    const switchDevice = neeoapi.buildDevice(adaptername)
      .setManufacturer(manufacturer)
      .addAdditionalSearchToken('zehnm')
      .addAdditionalSearchToken('SDK')
      .setType('ACCESSORY')  // NEEO needs to come up with more device types! ACCESSORY doesn't have a device view and LIGHT is misleading and cannot be renamed :(
      .addButtonGroup('Power')
      .addButton({ name: Constants.MACRO_POWER_TOGGLE, label: 'Power Toggle' })
      .addButtonHandler(controller.onButtonPressed)
      .addSwitch({ name: Constants.COMPONENT_POWER_SWITCH, label: 'Power switch' }, {
        setter: controller.setPowerState,
        getter: controller.getPowerState,
      })
      .addTextLabel({ name: Constants.COMPONENT_POWER_LABEL, label: 'Current consumption' }, controller.powerConsumption)
      .addSensor(powerConsumptionSensor, {
        getter: controller.getPowerConsumption
      })
      .enableDiscovery(discoveryInstructions, controller.discoverDevices)
      .registerSubscriptionFunction(controller.registerStateUpdateCallback)
      .registerInitialiseFunction(controller.initialize);

    return switchDevice;
  }

};

// FIXME quick and dirty builder
function buildController(config) {
  const discovery = new DiscoveryAggregator();
  const deviceCfg = new DeviceConfiguration(__dirname + '/../config/mystrom.json');
  const nameMapper = new DeviceIdMapper(deviceCfg);
  const deviceBuilder = (device) => {
    return MyStromLocalSwitch.buildInstance(device.id, device.ip, nameMapper.getName(device));
  };

  if (!(config.mystrom && config.mystrom.discoveryModes && (config.mystrom.discoveryModes.local || config.mystrom.discoveryModes.configFil))) {
    console.error('FATAL Invalid configuration! At least one of mystrom.discoveryModes.local or mystrom.discoveryModes.configFile must be enabled.');
    process.exit(1);
  }

  if (config.mystrom.discoveryModes.local === true) {
    discovery.addDeviceDiscovery(new MyStromLocalDiscovery(config.mystrom.localDiscovery.listenAddress));
  }
  if (config.mystrom.discoveryModes.configFile === true) {
    discovery.addDeviceDiscovery(new MyStromConfigFileDiscovery(deviceCfg));
  }

  const discoveryController = DiscoveryControllerFactory(discovery, config.mystrom.localDiscovery);
  const myStromService = new MyStromService(discoveryController, deviceBuilder);
  const controller = Controller(config, myStromService, discoveryController);
  discoveryController.startDiscovery();

  return controller;
}

module.exports = NeeoDevice;