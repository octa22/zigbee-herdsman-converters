import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend} from "../lib/types";

const e = exposes.presets;

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["SZ-ESW01"],
        model: "SZ-ESW01",
        vendor: "Sercomm",
        description: "Telstra smart plug",
        fromZigbee: [fz.on_off, fz.metering],
        exposes: [e.switch(), e.power()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1000000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ["SZ-ESW01-AU"],
        model: "SZ-ESW01-AU",
        vendor: "Sercomm",
        description: "Telstra smart plug",
        exposes: [e.switch(), e.power(), e.energy(), e.current(), e.voltage()],
        fromZigbee: [fz.on_off, fz.metering, fz.electrical_measurement],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering", "haElectricalMeasurement"]);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await reporting.currentSummDelivered(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1000000, multiplier: 1});
            await reporting.readEletricalMeasurementMultiplierDivisors(endpoint);
            await reporting.rmsVoltage(endpoint);
            await reporting.rmsCurrent(endpoint);
        },
    },
    {
        zigbeeModel: ["SZ-ESW02N-CZ3"],
        model: "SZ-ESW02N-CZ3",
        vendor: "Sercomm",
        description: "Telstra smart plug",
        extend: [m.onOff({powerOnBehavior: false}), m.electricityMeter({cluster: "metering"})],
    },
    {
        zigbeeModel: ["SZ-ESW02"],
        model: "SZ-ESW02",
        vendor: "Sercomm",
        description: "Telstra smart plug 2",
        fromZigbee: [fz.on_off, fz.metering],
        exposes: [e.switch(), e.power()],
        toZigbee: [tz.on_off],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.instantaneousDemand(endpoint);
            endpoint.saveClusterAttributeKeyValue("seMetering", {divisor: 1000000, multiplier: 1});
        },
    },
    {
        zigbeeModel: ["XHS2-SE"],
        model: "XHS2-SE",
        vendor: "Sercomm",
        description: "Magnetic door & window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ["SZ-DWS04", "SZ-DWS04N_SF"],
        model: "SZ-DWS04",
        vendor: "Sercomm",
        description: "Magnetic door & window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ["SZ-DWS08N", "SZ-DWS08", "SZ-DWS08N-CZ3"],
        model: "SZ-DWS08",
        vendor: "Sercomm",
        description: "Magnetic door & window contact sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.contact(), e.battery_low(), e.tamper(), e.temperature(), e.battery()],
    },
    {
        zigbeeModel: ["SZ-PIR02_SF", "SZ-PIR02"],
        model: "AL-PIR02",
        vendor: "Sercomm",
        description: "PIR motion sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: "3V_2100"}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genPowerCfg"]);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.occupancy(), e.battery_low(), e.tamper(), e.battery()],
    },
    {
        zigbeeModel: ["SZ-PIR04N", "SZ-PIR04N_EU"],
        model: "SZ-PIR04N",
        vendor: "Sercomm",
        description: "PIR motion & temperature sensor",
        fromZigbee: [fz.ias_occupancy_alarm_1, fz.temperature, fz.battery],
        toZigbee: [],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3200}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["msTemperatureMeasurement", "genPowerCfg"]);
            await reporting.temperature(endpoint);
            await reporting.batteryVoltage(endpoint);
        },
        exposes: [e.occupancy(), e.tamper(), e.temperature(), e.battery(), e.battery_voltage()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["SZ-WTD03"],
        model: "SZ-WTD03",
        vendor: "Sercomm",
        description: "Water leak detector",
        fromZigbee: [fz.ias_water_leak_alarm_1, fz.battery],
        toZigbee: [],
        exposes: [e.water_leak(), e.battery_low()],
    },
];
