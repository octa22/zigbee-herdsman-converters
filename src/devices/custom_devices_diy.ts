import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as legacy from "../lib/legacy";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, DummyDevice, Expose, Fz, KeyValue, KeyValueAny, Tz, Zh} from "../lib/types";
import * as utils from "../lib/utils";
import {calibrateAndPrecisionRoundOptions, getFromLookup, getKey, isEndpoint, postfixWithEndpointName} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

const switchTypesList = {
    switch: 0x00,
    "multi-click": 0x02,
};

const tzLocal = {
    tirouter: {
        key: ["transmit_power"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write("genBasic", {4919: {value, type: 0x28}});
            return {state: {[key]: value}};
        },
        convertGet: async (entity, key, meta) => {
            await entity.read("genBasic", [0x1337]);
        },
    } satisfies Tz.Converter,
    multi_zig_sw_switch_type: {
        key: ["switch_type_1", "switch_type_2", "switch_type_3", "switch_type_4"],
        convertGet: async (entity, key, meta) => {
            await entity.read("genOnOffSwitchCfg", ["switchType"]);
        },
        convertSet: async (entity, key, value, meta) => {
            const data = getFromLookup(value, switchTypesList);
            const payload = {switchType: data};
            await entity.write("genOnOffSwitchCfg", payload);
            return {state: {[`${key}`]: value}};
        },
    } satisfies Tz.Converter,
    ptvo_on_off: {
        key: ["state"],
        convertSet: async (entity, key, value, meta) => {
            return await tz.on_off.convertSet(entity, key, value, meta);
        },
        convertGet: async (entity, key, meta) => {
            const cluster = "genOnOff";
            if (isEndpoint(entity) && (entity.supportsInputCluster(cluster) || entity.supportsOutputCluster(cluster))) {
                return await tz.on_off.convertGet(entity, key, meta);
            }
            return;
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    tirouter: {
        cluster: "genBasic",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const result: KeyValue = {linkquality: msg.linkquality};
            if (msg.data["4919"]) result.transmit_power = msg.data["4919"];
            return result;
        },
    } satisfies Fz.Converter,
    humidity2: {
        cluster: "msRelativeHumidity",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            // multi-endpoint version based on the stastard onverter 'fz.humidity'
            let humidity = Number.parseFloat(msg.data.measuredValue) / 100.0;
            humidity = calibrateAndPrecisionRoundOptions(humidity, options, "humidity");

            // https://github.com/Koenkk/zigbee2mqtt/issues/798
            // Sometimes the sensor publishes non-realistic vales, it should only publish message
            // in the 0 - 100 range, don't produce messages beyond these values.
            if (humidity >= 0 && humidity <= 100) {
                const multiEndpoint = model.meta?.multiEndpoint;
                const property = multiEndpoint ? postfixWithEndpointName("humidity", msg, model, meta) : "humidity";
                return {[property]: humidity};
            }
        },
    } satisfies Fz.Converter,
    illuminance2: {
        cluster: "msIlluminanceMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            // multi-endpoint version based on the stastard onverter 'fz.illuminance'
            const illuminance = msg.data.measuredValue;
            let illuminanceLux = illuminance === 0 ? 0 : 10 ** ((illuminance - 1) / 10000);
            illuminanceLux = calibrateAndPrecisionRoundOptions(illuminanceLux, options, "illuminance");
            const multiEndpoint = model.meta?.multiEndpoint;
            const property1 = multiEndpoint ? postfixWithEndpointName("illuminance", msg, model, meta) : "illuminance";
            return {[property1]: illuminanceLux};
        },
    } satisfies Fz.Converter,
    pressure2: {
        cluster: "msPressureMeasurement",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            // multi-endpoint version based on the stastard onverter 'fz.pressure'
            let pressure = 0;
            if (msg.data.scaledValue !== undefined) {
                const scale = msg.endpoint.getClusterAttributeValue("msPressureMeasurement", "scale") as number;
                pressure = msg.data.scaledValue / 10 ** scale / 100.0; // convert to hPa
            } else {
                pressure = Number.parseFloat(msg.data.measuredValue);
            }
            pressure = calibrateAndPrecisionRoundOptions(pressure, options, "pressure");
            const multiEndpoint = model.meta?.multiEndpoint;
            const property = multiEndpoint ? postfixWithEndpointName("pressure", msg, model, meta) : "pressure";
            return {[property]: pressure};
        },
    } satisfies Fz.Converter,
    multi_zig_sw_battery: {
        cluster: "genPowerCfg",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const voltage = msg.data.batteryVoltage * 100;
            const battery = (voltage - 2200) / 8;
            return {battery: battery > 100 ? 100 : battery, voltage: voltage};
        },
    } satisfies Fz.Converter,
    multi_zig_sw_switch_buttons: {
        cluster: "genMultistateInput",
        type: ["attributeReport", "readResponse"],
        convert: (model, msg, publish, options, meta) => {
            const button = getKey(model.endpoint?.(msg.device) ?? {}, msg.endpoint.ID);
            const actionLookup: {[key: number]: string} = {0: "release", 1: "single", 2: "double", 3: "triple", 4: "hold"};
            const value = msg.data.presentValue;
            const action = actionLookup[value];
            return {action: `${button}_${action}`};
        },
    } satisfies Fz.Converter,
    multi_zig_sw_switch_config: {
        cluster: "genOnOffSwitchCfg",
        type: ["readResponse", "attributeReport"],
        convert: (model, msg, publish, options, meta) => {
            const channel = getKey(model.endpoint?.(msg.device) ?? {}, msg.endpoint.ID);
            const {switchType} = msg.data;
            return {[`switch_type_${channel}`]: getKey(switchTypesList, switchType)};
        },
    } satisfies Fz.Converter,
};

function ptvoGetMetaOption(device: Zh.Device | DummyDevice, key: string, defaultValue: unknown) {
    if (!utils.isDummyDevice(device)) {
        const value = device.meta[key];
        if (value === undefined) {
            return defaultValue;
        }
        return value;
    }

    return defaultValue;
}

function ptvoSetMetaOption(device: Zh.Device, key: string, value: unknown) {
    if (device != null && key != null) {
        device.meta[key] = value;
    }
}

function ptvoAddStandardExposes(endpoint: Zh.Endpoint, expose: Expose[], options: KeyValue, deviceOptions: KeyValue) {
    const epId = endpoint.ID;
    const epName = `l${epId}`;
    if (endpoint.supportsInputCluster("lightingColorCtrl")) {
        expose.push(e.light_brightness_colorxy().withEndpoint(epName));
        options.exposed_onoff = true;
        options.exposed_analog = true;
        options.exposed_colorcontrol = true;
    } else if (endpoint.supportsInputCluster("genLevelCtrl")) {
        expose.push(e.light_brightness().withEndpoint(epName));
        options.exposed_onoff = true;
        options.exposed_analog = true;
        options.exposed_levelcontrol = true;
    }
    if (endpoint.supportsInputCluster("genOnOff")) {
        if (!options.exposed_onoff) {
            expose.push(e.switch().withEndpoint(epName));
        }
    }
    if (endpoint.supportsInputCluster("genAnalogInput") || endpoint.supportsOutputCluster("genAnalogInput")) {
        if (!options.exposed_analog) {
            options.exposed_analog = true;
            expose.push(e.text(epName, ea.ALL).withEndpoint(epName).withProperty(epName).withDescription("State or sensor value"));
        }
    }
    if (endpoint.supportsInputCluster("msTemperatureMeasurement")) {
        expose.push(e.temperature().withEndpoint(epName));
    }
    if (endpoint.supportsInputCluster("msRelativeHumidity")) {
        expose.push(e.humidity().withEndpoint(epName));
    }
    if (endpoint.supportsInputCluster("msPressureMeasurement")) {
        expose.push(e.pressure().withEndpoint(epName));
    }
    if (endpoint.supportsInputCluster("msIlluminanceMeasurement")) {
        expose.push(e.illuminance().withEndpoint(epName));
    }
    if (endpoint.supportsInputCluster("msCO2")) {
        expose.push(e.co2());
    }
    if (endpoint.supportsInputCluster("pm25Measurement")) {
        expose.push(e.pm25());
    }
    if (endpoint.supportsInputCluster("haElectricalMeasurement")) {
        // haElectricalMeasurement may expose only one value defined explicitly
        if (!(options.exposed_voltage || options.exposed_current || options.exposed_power)) {
            expose.push(e.voltage().withEndpoint(epName));
            expose.push(e.current().withEndpoint(epName));
            expose.push(e.power().withEndpoint(epName));
        }
    }
    if (endpoint.supportsInputCluster("seMetering")) {
        if (!options.exposed_energy) {
            expose.push(e.energy().withEndpoint(epName));
        }
    }
    if (endpoint.supportsInputCluster("genPowerCfg")) {
        deviceOptions.expose_battery = true;
    }
    if (endpoint.supportsInputCluster("genMultistateInput") || endpoint.supportsOutputCluster("genMultistateInput")) {
        deviceOptions.expose_action = true;
    }
}

export const definitions: DefinitionWithExtend[] = [
    {
        /** @see https://github.com/Nerivec/silabs-firmware-builder/releases */
        fingerprint: [
            {modelID: "ZGA008", manufacturerName: "Aeotec", applicationVersion: 200},
            {modelID: "ZB-GW04", manufacturerName: "easyiot", applicationVersion: 200},
            {modelID: "ZB-GW04-1v1", manufacturerName: "easyiot", applicationVersion: 200},
            {modelID: "ZB-GW04-1v2", manufacturerName: "easyiot", applicationVersion: 200},
            {modelID: "SkyConnect", manufacturerName: "NabuCasa", applicationVersion: 200},
            {modelID: "SLZB-06M", manufacturerName: "SMLIGHT", applicationVersion: 200},
            {modelID: "SLZB-06MG24", manufacturerName: "SMLIGHT", applicationVersion: 200},
            {modelID: "SLZB-06MG26", manufacturerName: "SMLIGHT", applicationVersion: 200},
            {modelID: "SLZB-07", manufacturerName: "SMLIGHT", applicationVersion: 200},
            {modelID: "SLZB-07MG24", manufacturerName: "SMLIGHT", applicationVersion: 200},
            {modelID: "DONGLE-E", manufacturerName: "SONOFF", applicationVersion: 200},
            {modelID: "MGM240P", manufacturerName: "SparkFun", applicationVersion: 200},
            {modelID: "MGM24", manufacturerName: "TubesZB", applicationVersion: 200},
        ],
        model: "Silabs series 2 router",
        vendor: "Silabs",
        description: "Silabs series 2 adapter with router firmware",
        toZigbee: [tz.factory_reset],
        exposes: [
            e
                .enum("reset", ea.SET, ["reset"])
                .withDescription(
                    "Resets and launches the bootloader for flashing. If USB, ensure the device is already connected to the machine where you intend to flash it before triggering this.",
                ),
        ],
        extend: [m.linkQuality({reporting: true})],
        // prevent timeout with tz.factory_reset (reboots adapter into bootloader, hence disconnected)
        // since this is the only tz, it's not a problem to disable this globally
        meta: {disableDefaultResponse: true},
    },
    {
        zigbeeModel: ["ti.router"],
        model: "ti.router",
        vendor: "Custom devices (DiY)",
        description: "Texas Instruments router",
        fromZigbee: [fzLocal.tirouter],
        toZigbee: [tzLocal.tirouter],
        exposes: [
            e
                .numeric("transmit_power", ea.ALL)
                .withValueMin(-20)
                .withValueMax(20)
                .withValueStep(1)
                .withUnit("dBm")
                .withDescription(
                    "Transmit power, supported from firmware 20221102. The max for CC1352 is 20 dBm and 5 dBm for CC2652" +
                        " (any higher value is converted to 5dBm)",
                ),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(8);
            const payload = [{attribute: "zclVersion", minimumReportInterval: 0, maximumReportInterval: 3600, reportableChange: 0}];
            await reporting.bind(endpoint, coordinatorEndpoint, ["genBasic"]);
            await endpoint.configureReporting("genBasic", payload);
        },
    },
    {
        zigbeeModel: ["lumi.router"],
        model: "CC2530.ROUTER",
        vendor: "Custom devices (DiY)",
        description: "CC2530 router",
        fromZigbee: [fz.CC2530ROUTER_led, fz.CC2530ROUTER_meta, fz.ignore_basic_report],
        toZigbee: [tz.ptvo_switch_trigger],
        exposes: [e.binary("led", ea.STATE, true, false)],
    },
    {
        zigbeeModel: ["cc2538.router.v1"],
        model: "CC2538.ROUTER.V1",
        vendor: "Custom devices (DiY)",
        description: "MODKAM stick СС2538 router",
        fromZigbee: [fz.ignore_basic_report],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ["cc2538.router.v2"],
        model: "CC2538.ROUTER.V2",
        vendor: "Custom devices (DiY)",
        description: "MODKAM stick СС2538 router with temperature sensor",
        fromZigbee: [fz.ignore_basic_report, fz.device_temperature],
        toZigbee: [],
        exposes: [e.device_temperature()],
    },
    {
        zigbeeModel: ["ptvo.switch"],
        model: "ptvo.switch",
        vendor: "Custom devices (DiY)",
        description: "Multi-functional device",
        fromZigbee: [
            fz.battery,
            fz.on_off,
            fz.ptvo_multistate_action,
            fz.ptvo_switch_uart,
            fz.ptvo_switch_analog_input,
            fz.brightness,
            fz.ignore_basic_report,
            fz.temperature,
            fzLocal.humidity2,
            fzLocal.pressure2,
            fzLocal.illuminance2,
            fz.electrical_measurement,
            fz.metering,
            fz.co2,
        ],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_uart, tz.ptvo_switch_analog_input, tz.ptvo_switch_light_brightness, tzLocal.ptvo_on_off],
        exposes: (device, options) => {
            const expose: Expose[] = [];
            const exposeDeviceOptions: KeyValue = {};
            const deviceConfig = ptvoGetMetaOption(device, "device_config", "");
            if (deviceConfig === "" || utils.isDummyDevice(device)) {
                if (!utils.isDummyDevice(device)) {
                    for (const endpoint of device.endpoints) {
                        const exposeEpOptions: KeyValue = {};
                        ptvoAddStandardExposes(endpoint, expose, exposeEpOptions, exposeDeviceOptions);
                    }
                } else {
                    // fallback code
                    for (let epId = 1; epId <= 8; epId++) {
                        const epName = `l${epId}`;
                        expose.push(e.text(epName, ea.ALL).withEndpoint(epName).withProperty(epName).withDescription("State or sensor value"));
                        expose.push(e.switch().withEndpoint(epName));
                    }
                }
            } else {
                // device configuration description from a device
                const deviceConfigArray = deviceConfig.split(/[\r\n]+/);
                const allEndpoints: {[key: number]: string} = {};
                const allEndpointsSorted = [];
                // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                let epConfig;
                for (let i = 0; i < deviceConfigArray.length; i++) {
                    epConfig = deviceConfigArray[i];
                    const matches = epConfig.match(/^([0-9A-F]+)/);
                    if (!matches || matches.length === 0) {
                        continue;
                    }
                    const epId = Number.parseInt(matches[0], 16);
                    const epId2 = epId < 10 ? `0${epId}` : epId;
                    epConfig = epConfig.replace(/^[0-9A-F]+/, epId2);
                    allEndpoints[epId] = "1";
                    allEndpointsSorted.push(epConfig);
                }

                for (const endpoint of device.endpoints) {
                    if (allEndpoints[endpoint.ID] !== undefined) {
                        continue;
                    }
                    epConfig = endpoint.ID.toString();
                    if (endpoint.ID < 10) {
                        epConfig = `0${epConfig}`;
                    }
                    allEndpointsSorted.push(epConfig);
                }
                allEndpointsSorted.sort();

                for (let i = 0; i < allEndpointsSorted.length; i++) {
                    epConfig = allEndpointsSorted[i];
                    const epId = Number.parseInt(epConfig.substr(0, 2), 10);
                    epConfig = epConfig.substring(2);
                    const epName = `l${epId}`;
                    const epValueAccessRights = epConfig.substr(0, 1);
                    const epStateType = epValueAccessRights === "W" || epValueAccessRights === "*" ? ea.STATE_SET : ea.STATE;
                    const valueConfig = epConfig.substr(1);
                    const valueConfigItems = valueConfig ? valueConfig.split(",") : [];
                    let valueId = valueConfigItems[0] ? valueConfigItems[0] : "";
                    let valueDescription = valueConfigItems[1] ? valueConfigItems[1] : "";
                    let valueUnit = valueConfigItems[2] !== undefined ? valueConfigItems[2] : "";
                    if (exposeDeviceOptions[epName] === undefined) {
                        exposeDeviceOptions[epName] = {};
                    }
                    const exposeEpOptions: KeyValueAny = exposeDeviceOptions[epName];
                    if (valueId === "*") {
                        // GPIO output (Generic)
                        exposeEpOptions.exposed_onoff = true;
                        expose.push(e.switch().withEndpoint(epName));
                    } else if (valueId === "#") {
                        // GPIO state (contact, gas, noise, occupancy, presence, smoke, sos, tamper, vibration, water leak)
                        exposeEpOptions.exposed_onoff = true;
                        let exposeObj: Expose;
                        switch (valueDescription) {
                            case "g":
                                exposeObj = e.gas();
                                break;
                            case "n":
                                exposeObj = e.noise_detected();
                                break;
                            case "o":
                                exposeObj = e.occupancy();
                                break;
                            case "p":
                                exposeObj = e.presence();
                                break;
                            case "m":
                                exposeObj = e.smoke();
                                break;
                            case "s":
                                exposeObj = e.sos();
                                break;
                            case "t":
                                exposeObj = e.tamper();
                                break;
                            case "v":
                                exposeObj = e.vibration();
                                break;
                            case "w":
                                exposeObj = e.water_leak();
                                break;
                            default: // 'c'
                                exposeObj = e.contact();
                        }
                        expose.push(exposeObj.withProperty("state").withEndpoint(epName));
                    } else if (valueConfigItems.length > 0) {
                        let valueName: string; // name in Z2M
                        let valueNumIndex: string;
                        const idxPos = valueId.search(/(\d+)$/);
                        if (valueId.startsWith("mcpm") || valueId.startsWith("ncpm")) {
                            const num = Number.parseInt(valueId.substr(4, 1), 16);
                            valueName = valueId.substr(0, 4) + num;
                        } else if (idxPos >= 0) {
                            valueNumIndex = valueId.substr(idxPos);
                            valueId = valueId.substr(0, idxPos);
                        }

                        // analog value
                        // 1: value name (if empty, use the EP name)
                        // 2: description (if empty or undefined, use the value name)
                        // 3: units (if undefined, use the key name)
                        const infoLookup: {[key: string]: string} = {
                            C: "temperature",
                            "%": "humidity",
                            m: "altitude",
                            Pa: "pressure",
                            ppm: "quality",
                            psize: "particle_size",
                            V: "voltage",
                            A: "current",
                            Wh: "energy",
                            W: "power",
                            Hz: "frequency",
                            pf: "power_factor",
                            lx: "illuminance",
                        };
                        valueName = valueName !== undefined ? valueName : infoLookup[valueId];

                        if (valueName === undefined && valueNumIndex) {
                            valueName = `val${valueNumIndex}`;
                        }
                        if (valueName) {
                            exposeEpOptions[`exposed_${valueName}`] = true;
                        }

                        valueName = valueName === undefined ? epName : `${valueName}_${epName}`;

                        if (valueDescription === undefined || valueDescription === "") {
                            if (infoLookup[valueId]) {
                                valueDescription = infoLookup[valueId];
                                valueDescription = valueDescription.replace("_", " ");
                            } else {
                                valueDescription = "Sensor value";
                            }
                        }
                        valueDescription = valueDescription.substring(0, 1).toUpperCase() + valueDescription.substring(1);

                        if (valueNumIndex) {
                            valueDescription = `${valueDescription} ${valueNumIndex}`;
                        }

                        if ((valueUnit === undefined || valueUnit === "") && infoLookup[valueId]) {
                            valueUnit = valueId;
                        }

                        exposeEpOptions.exposed_analog = true;
                        expose.push(
                            e
                                .numeric(valueName, epStateType)
                                .withValueMin(-9999999)
                                .withValueMax(9999999)
                                .withValueStep(1)
                                .withDescription(valueDescription)
                                .withUnit(valueUnit),
                        );
                    }

                    const epConfigNext = allEndpointsSorted[i + 1] || "-1";
                    const epIdNext = Number.parseInt(epConfigNext.substr(0, 2), 10);
                    if (epIdNext !== epId) {
                        const endpoint = device.getEndpoint(epId);
                        if (!endpoint) {
                            continue;
                        }
                        ptvoAddStandardExposes(endpoint, expose, exposeEpOptions, exposeDeviceOptions);
                    }
                }
            }
            if (exposeDeviceOptions.expose_action) {
                expose.push(e.action(["single", "double", "triple", "hold", "release"]));
            }
            if (exposeDeviceOptions.expose_battery) {
                expose.push(e.battery());
            }

            return expose;
        },
        meta: {multiEndpoint: true, tuyaThermostatPreset: legacy.fz /* for subclassed custom converters */},
        endpoint: (device) => {
            // biome-ignore lint/suspicious/noExplicitAny: ignored using `--suppress`
            const endpointList: any = [];
            const deviceConfig = ptvoGetMetaOption(device, "device_config", "");
            if (device?.endpoints) {
                for (const endpoint of device.endpoints) {
                    const epId = endpoint.ID;
                    const epName = `l${epId}`;
                    endpointList[epName] = epId;
                }
            }
            if (deviceConfig === "") {
                if (endpointList.length === 0) {
                    // fallback code
                    for (let epId = 1; epId <= 8; epId++) {
                        const epName = `l${epId}`;
                        endpointList[epName] = epId;
                    }
                }
            } else {
                const deviceConfigArray = deviceConfig.split(/[\r\n]+/);
                // biome-ignore lint/suspicious/noImplicitAnyLet: ignored using `--suppress`
                let epConfig;
                for (let i = 0; i < deviceConfigArray.length; i++) {
                    epConfig = deviceConfigArray[i];
                    const matches = epConfig.match(/^([0-9A-F]+)/);
                    if (!matches || matches.length === 0) {
                        continue;
                    }
                    const epId = Number.parseInt(matches[0], 16);
                    const epName = `l${epId}`;
                    endpointList[epName] = epId;
                }
            }
            endpointList.action = 1;
            return endpointList;
        },
        configure: async (device, coordinatorEndpoint) => {
            if (device != null) {
                const controlEp = device.getEndpoint(1);
                if (controlEp != null) {
                    try {
                        let deviceConfig = await controlEp.read("genBasic", [32768]);
                        if (deviceConfig) {
                            deviceConfig = deviceConfig["32768"];
                            ptvoSetMetaOption(device, "device_config", deviceConfig);
                            device.save();
                        }
                    } catch {
                        /* do nothing */
                    }
                }
                for (const endpoint of device.endpoints) {
                    if (endpoint.supportsInputCluster("haElectricalMeasurement")) {
                        endpoint.saveClusterAttributeKeyValue("haElectricalMeasurement", {
                            dcCurrentDivisor: 1000,
                            dcCurrentMultiplier: 1,
                            dcPowerDivisor: 10,
                            dcPowerMultiplier: 1,
                            dcVoltageDivisor: 100,
                            dcVoltageMultiplier: 1,
                            acVoltageDivisor: 100,
                            acVoltageMultiplier: 1,
                            acCurrentDivisor: 1000,
                            acCurrentMultiplier: 1,
                            acPowerDivisor: 10,
                            acPowerMultiplier: 1,
                        });
                    }
                    if (endpoint.supportsInputCluster("seMetering")) {
                        endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1000, multiplier: 1});
                    }
                }
            }
        },
    },
    {
        zigbeeModel: ["DNCKAT_D001"],
        model: "DNCKATSD001",
        vendor: "Custom devices (DiY)",
        description: "DNCKAT single key wired wall dimmable light switch",
        extend: [m.light()],
    },
    {
        zigbeeModel: ["DNCKAT_S001"],
        model: "DNCKATSW001",
        vendor: "Custom devices (DiY)",
        description: "DNCKAT single key wired wall light switch",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["DNCKAT_S002"],
        model: "DNCKATSW002",
        vendor: "Custom devices (DiY)",
        description: "DNCKAT double key wired wall light switch",
        fromZigbee: [fz.DNCKAT_S00X_buttons],
        extend: [m.deviceEndpoints({endpoints: {left: 1, right: 2}}), m.onOff({endpointNames: ["left", "right"]})],
        exposes: [e.action(["release_left", "hold_left", "release_right", "hold_right"])],
    },
    {
        zigbeeModel: ["DNCKAT_S003"],
        model: "DNCKATSW003",
        vendor: "Custom devices (DiY)",
        description: "DNCKAT triple key wired wall light switch",
        fromZigbee: [fz.DNCKAT_S00X_buttons],
        extend: [m.deviceEndpoints({endpoints: {left: 1, center: 2, right: 3}}), m.onOff({endpointNames: ["left", "center", "right"]})],
        exposes: [e.action(["release_left", "hold_left", "release_right", "hold_right", "release_center", "hold_center"])],
    },
    {
        zigbeeModel: ["DNCKAT_S004"],
        model: "DNCKATSW004",
        vendor: "Custom devices (DiY)",
        description: "DNCKAT quadruple key wired wall light switch",
        fromZigbee: [fz.DNCKAT_S00X_buttons],
        extend: [
            m.deviceEndpoints({endpoints: {bottom_left: 1, bottom_right: 2, top_left: 3, top_right: 4}}),
            m.onOff({endpointNames: ["bottom_left", "bottom_right", "top_left", "top_right"]}),
        ],
        exposes: [
            e.action([
                "release_bottom_left",
                "hold_bottom_left",
                "release_bottom_right",
                "hold_bottom_right",
                "release_top_left",
                "hold_top_left",
                "release_top_right",
                "hold_top_right",
            ]),
        ],
    },
    {
        zigbeeModel: ["ZigUP"],
        model: "ZigUP",
        vendor: "Custom devices (DiY)",
        description: "CC2530 based ZigBee relais, switch, sensor and router",
        fromZigbee: [fz.ZigUP],
        toZigbee: [tz.on_off, tz.light_color, tz.ZigUP_lock],
        exposes: [e.switch()],
    },
    {
        zigbeeModel: ["ZWallRemote0"],
        model: "ZWallRemote0",
        vendor: "Custom devices (DiY)",
        description: "Matts Wall Switch Remote",
        fromZigbee: [fz.command_toggle],
        toZigbee: [],
        exposes: [e.action(["toggle"])],
    },
    {
        zigbeeModel: ["ZeeFlora"],
        model: "ZeeFlora",
        vendor: "Custom devices (DiY)",
        description: "Flower sensor with rechargeable battery",
        fromZigbee: [fz.temperature, fz.soil_moisture, fz.battery],
        toZigbee: [],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const firstEndpoint = device.getEndpoint(1);
            await reporting.bind(firstEndpoint, coordinatorEndpoint, ["genPowerCfg", "msTemperatureMeasurement", "msSoilMoisture"]);
            const overrides = {min: 0, max: 3600, change: 0};
            await reporting.batteryVoltage(firstEndpoint, overrides);
            await reporting.batteryPercentageRemaining(firstEndpoint, overrides);
            await reporting.temperature(firstEndpoint, overrides);
            await reporting.soil_moisture(firstEndpoint, overrides);
        },
        exposes: [e.soil_moisture(), e.battery(), e.temperature()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["UT-01"],
        model: "EFR32MG21.Router.1",
        vendor: "Custom devices (DiY)",
        description: "EFR32MG21 Zigbee bridge router",
        extend: [m.forcePowerSource({powerSource: "Mains (single phase)"})],
    },
    {
        zigbeeModel: ["UT-02"],
        model: "EFR32MG21.Router.2",
        vendor: "Custom devices (DiY)",
        description: "EFR32MG21 router",
        fromZigbee: [],
        toZigbee: [],
        exposes: [],
    },
    {
        zigbeeModel: ["b-parasite"],
        model: "b-parasite",
        vendor: "Custom devices (DiY)",
        description: "b-parasite open source soil moisture sensor",
        fromZigbee: [fz.temperature, fz.humidity, fz.battery, fz.soil_moisture],
        toZigbee: [],
        exposes: [e.temperature(), e.humidity(), e.battery(), e.soil_moisture()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(10);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg", "msTemperatureMeasurement", "msRelativeHumidity", "msSoilMoisture"]);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
            await reporting.soil_moisture(endpoint);
        },
        extend: [m.illuminance(), m.identify()],
    },
    {
        zigbeeModel: ["MULTI-ZIG-SW"],
        model: "MULTI-ZIG-SW",
        vendor: "smarthjemmet.dk",
        description: "Multi switch from Smarthjemmet.dk",
        fromZigbee: [fz.ignore_basic_report, fzLocal.multi_zig_sw_switch_buttons, fzLocal.multi_zig_sw_battery, fzLocal.multi_zig_sw_switch_config],
        toZigbee: [tzLocal.multi_zig_sw_switch_type],
        exposes: [
            ...[e.enum("switch_type_1", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_1")],
            ...[e.enum("switch_type_2", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_2")],
            ...[e.enum("switch_type_3", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_3")],
            ...[e.enum("switch_type_4", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_4")],
            e.battery(),
            e.action(["single", "double", "triple", "hold", "release"]),
            e.battery_voltage(),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {button_1: 2, button_2: 3, button_3: 4, button_4: 5};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genBasic", ["modelId", "swBuildId", "powerSource"]);
        },
    },
    {
        // https://github.com/devbis/z03mmc/
        zigbeeModel: ["LYWSD03MMC"],
        model: "LYWSD03MMC",
        vendor: "Custom devices (DiY)",
        description: "Xiaomi temperature & humidity sensor with custom firmware",
        extend: [
            m.quirkAddEndpointCluster({
                endpointID: 1,
                outputClusters: [],
                inputClusters: ["genPowerCfg", "msTemperatureMeasurement", "msRelativeHumidity", "hvacUserInterfaceCfg"],
            }),
            m.battery(),
            m.temperature({reporting: {min: 10, max: 300, change: 10}}),
            m.humidity({reporting: {min: 10, max: 300, change: 50}}),
            m.enumLookup({
                name: "temperature_display_mode",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "hvacUserInterfaceCfg",
                attribute: "tempDisplayMode",
                description: "The units of the temperature displayed on the device screen.",
            }),
            m.binary({
                name: "show_smiley",
                valueOn: ["SHOW", 1],
                valueOff: ["HIDE", 0],
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0010, type: Zcl.DataType.BOOLEAN},
                description: "Whether to show a smiley on the device screen.",
            }),
            m.binary({
                name: "enable_display",
                valueOn: ["ON", 1],
                valueOff: ["OFF", 0],
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0011, type: Zcl.DataType.BOOLEAN},
                description: "Whether to turn display on/off.",
            }),
            m.numeric({
                name: "temperature_calibration",
                unit: "°C",
                cluster: "msTemperatureMeasurement",
                attribute: {ID: 0x0010, type: Zcl.DataType.INT16},
                valueMin: -100.0,
                valueMax: 100.0,
                valueStep: 0.01,
                scale: 100,
                description: "The temperature calibration offset is set in 0.01° steps.",
            }),
            m.numeric({
                name: "humidity_calibration",
                unit: "%",
                cluster: "msRelativeHumidity",
                attribute: {ID: 0x0010, type: Zcl.DataType.INT16},
                valueMin: -100.0,
                valueMax: 100.0,
                valueStep: 0.01,
                scale: 100,
                description: "The humidity calibration offset is set in 0.01 % steps.",
            }),
            m.numeric({
                name: "comfort_temperature_min",
                unit: "°C",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0102, type: Zcl.DataType.INT16},
                valueMin: -100.0,
                valueMax: 100.0,
                scale: 100,
                description: "Comfort parameters/Temperature minimum, in 0.01°C steps.",
            }),
            m.numeric({
                name: "comfort_temperature_max",
                unit: "°C",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0103, type: Zcl.DataType.INT16},
                valueMin: -100.0,
                valueMax: 100.0,
                scale: 100,
                description: "Comfort parameters/Temperature maximum, in 0.01°C steps.",
            }),
            m.numeric({
                name: "comfort_humidity_min",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0104, type: Zcl.DataType.UINT16},
                valueMin: 0.0,
                valueMax: 100.0,
                scale: 100,
                description: "Comfort parameters/Humidity minimum, in 0.01% steps.",
            }),
            m.numeric({
                name: "comfort_humidity_max",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0105, type: Zcl.DataType.UINT16},
                valueMin: 0.0,
                valueMax: 100.0,
                scale: 100,
                description: "Comfort parameters/Humidity maximum, in 0.01% steps.",
            }),
        ],
        ota: true,
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const bindClusters = ["msTemperatureMeasurement", "msRelativeHumidity", "genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, bindClusters);
            await reporting.temperature(endpoint, {min: 10, max: 300, change: 10});
            await reporting.humidity(endpoint, {min: 10, max: 300, change: 50});
            await reporting.batteryPercentageRemaining(endpoint);
            try {
                await endpoint.read("hvacThermostat", [0x0010, 0x0011, 0x0102, 0x0103, 0x0104, 0x0105]);
                await endpoint.read("msTemperatureMeasurement", [0x0010]);
                await endpoint.read("msRelativeHumidity", [0x0010]);
            } catch {
                /* backward compatibility */
            }
        },
    },
    {
        zigbeeModel: ["MHO-C401N"],
        model: "MHO-C401N",
        vendor: "Custom devices (DiY)",
        description: "Xiaomi temperature & humidity sensor with custom firmware",
        extend: [
            m.quirkAddEndpointCluster({
                endpointID: 1,
                outputClusters: ["hvacUserInterfaceCfg"],
                inputClusters: ["genPowerCfg", "msTemperatureMeasurement", "msRelativeHumidity", "hvacUserInterfaceCfg"],
            }),
            m.battery(),
            m.temperature({reporting: {min: 10, max: 300, change: 10}}),
            m.humidity({reporting: {min: 10, max: 300, change: 50}}),
            // Temperature display and show smile.
            // For details, see: https://github.com/pvvx/ZigbeeTLc/issues/28#issue-2033984519
            m.enumLookup({
                name: "temperature_display_mode",
                lookup: {celsius: 0, fahrenheit: 1},
                cluster: "hvacUserInterfaceCfg",
                attribute: "tempDisplayMode",
                description: "The units of the temperature displayed on the device screen.",
            }),
            m.binary({
                name: "show_smile",
                valueOn: ["HIDE", 1],
                valueOff: ["SHOW", 0],
                cluster: "hvacUserInterfaceCfg",
                attribute: "programmingVisibility",
                description: "Whether to show a smile on the device screen.",
            }),
            // Setting offsets for temperature and humidity.
            // For details, see: https://github.com/pvvx/ZigbeeTLc/issues/30
            m.numeric({
                name: "temperature_calibration",
                unit: "C",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0100, type: 40},
                valueMin: -12.7,
                valueMax: 12.7,
                valueStep: 0.1,
                scale: 10,
                description: "The temperature calibration, in 0.1° steps. Requires v0.1.1.6 or newer.",
            }),
            m.numeric({
                name: "humidity_calibration",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0101, type: 40},
                valueMin: -12.7,
                valueMax: 12.7,
                valueStep: 0.1,
                scale: 10,
                description: "The humidity offset is set in 0.1 % steps. Requires v0.1.1.6 or newer.",
            }),
            // Comfort parameters.
            // For details, see: https://github.com/pvvx/ZigbeeTLc/issues/28#issuecomment-1855763432
            m.numeric({
                name: "comfort_temperature_min",
                unit: "C",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0102, type: 40},
                valueMin: -127,
                valueMax: 127,
                description: "Comfort parameters/Temperature minimum, in 1° steps. Requires v0.1.1.7 or newer.",
            }),
            m.numeric({
                name: "comfort_temperature_max",
                unit: "C",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0103, type: 40},
                valueMin: -127,
                valueMax: 127,
                description: "Comfort parameters/Temperature maximum, in 1° steps. Requires v0.1.1.7 or newer.",
            }),
            m.numeric({
                name: "comfort_humidity_min",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0104, type: 32},
                valueMin: 0,
                valueMax: 100,
                description: "Comfort parameters/Humidity minimum, in 1% steps. Requires v0.1.1.7 or newer.",
            }),
            m.numeric({
                name: "comfort_humidity_max",
                unit: "%",
                cluster: "hvacUserInterfaceCfg",
                attribute: {ID: 0x0105, type: 32},
                valueMin: 0,
                valueMax: 100,
                description: "Comfort parameters/Humidity maximum, in 1% steps. Requires v0.1.1.7 or newer.",
            }),
        ],
        ota: true,
    },
    {
        zigbeeModel: ["QUAD-ZIG-SW"],
        model: "QUAD-ZIG-SW",
        vendor: "smarthjemmet.dk",
        description: "FUGA compatible switch from Smarthjemmet.dk",
        fromZigbee: [fz.ignore_basic_report, fzLocal.multi_zig_sw_switch_buttons, fzLocal.multi_zig_sw_battery, fzLocal.multi_zig_sw_switch_config],
        toZigbee: [tzLocal.multi_zig_sw_switch_type],
        exposes: [
            ...[e.enum("switch_type_1", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_1")],
            ...[e.enum("switch_type_2", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_2")],
            ...[e.enum("switch_type_3", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_3")],
            ...[e.enum("switch_type_4", exposes.access.ALL, Object.keys(switchTypesList)).withEndpoint("button_4")],
            e.battery(),
            e.action(["single", "double", "triple", "hold", "release"]),
            e.battery_voltage(),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {button_1: 2, button_2: 3, button_3: 4, button_4: 5};
        },
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await endpoint.read("genBasic", ["modelId", "swBuildId", "powerSource"]);
        },
    },
    {
        zigbeeModel: ["ptvo_counter_2ch"],
        model: "ptvo_counter_2ch",
        vendor: "Custom devices (DiY)",
        description: "2 channel counter",
        fromZigbee: [fz.ignore_basic_report, fz.battery, fz.ptvo_switch_analog_input, fz.on_off],
        toZigbee: [tz.ptvo_switch_trigger, tz.ptvo_switch_analog_input, tz.on_off],
        exposes: [
            e.battery(),
            e
                .numeric("l3", ea.ALL)
                .withValueMin(-999999999)
                .withValueMax(999999999)
                .withDescription(
                    "Counter 1 value. Write zero or positive value to set a counter value. " +
                        "Write a negative value to set a wakeup interval in minutes",
                ),
            e
                .numeric("l5", ea.ALL)
                .withValueMin(-999999999)
                .withValueMax(999999999)
                .withDescription(
                    "Counter 2 value. Write zero or positive value to set a counter value. " +
                        "Write a negative value to set a wakeup interval in minutes",
                ),
            e.switch().withEndpoint("l6"),
            e.battery_voltage(),
        ],
        meta: {multiEndpoint: true},
        endpoint: (device) => {
            return {l3: 3, l5: 5, l6: 6};
        },
    },
    {
        zigbeeModel: ["alab.switch"],
        model: "alab.switch",
        vendor: "Alab",
        description: "Four channel relay board with four inputs",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 1, l2: 2, l3: 3, l4: 4, in1: 5, in2: 6, in3: 7, in4: 8}}),
            m.onOff({
                powerOnBehavior: false,
                configureReporting: false,
                endpointNames: ["l1", "l2", "l3", "l4"],
            }),
            m.commandsOnOff({endpointNames: ["l1", "l2", "l3", "l4"]}),
            m.numeric({
                name: "input_state",
                valueMin: 0,
                valueMax: 1,
                cluster: "genAnalogInput",
                attribute: "presentValue",
                description: "Input state",
                endpointNames: ["in1", "in2", "in3", "in4"],
            }),
        ],
    },
    {
        zigbeeModel: ["FanBee1", "Fanbox2"],
        model: "FanBee",
        vendor: "Lorenz Brun",
        description: "Fan with valve",
        fromZigbee: [fz.on_off, fz.fan_speed],
        toZigbee: [tz.on_off, tz.fan_speed],
        exposes: [e.fan().withState().withSpeed()],
    },
];
