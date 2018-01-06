module.exports = Object.freeze({
    // found hard coded 'neeo-deviceadapter' adapter name in generateAdapterName(conf) of neeo-sdk/lib/device/index.js which avoids adding the hostname to the unique adapter id.
    // Unfortunately it's still not possible to move a once registered device driver to another host :-(
    ADAPTER_NAME : 'mystrom-wifi-switch',
    // Attention: renaming the device name changes the unique device identifier within NEEO.
    //            Already added devices in NEEO must be removed and readded!
    DEVICE_NAME : 'WiFi Switch',
    MANUFACTURER : 'myStrom',

    MACRO_POWER_ON: 'POWER ON',
    MACRO_POWER_OFF: 'POWER OFF',
    MACRO_POWER_TOGGLE: 'POWER_TOGGLE',

    COMPONENT_POWER_SWITCH: 'power-switch',
    COMPONENT_POWER_SENSOR: 'power-curr-consumption-sensor',
    COMPONENT_POWER_LABEL : 'power-curr-consumption-text',
});