import {Zcl} from "zigbee-herdsman";

import * as fz from "../converters/fromZigbee";
import * as tz from "../converters/toZigbee";
import * as constants from "../lib/constants";
import * as exposes from "../lib/exposes";
import * as m from "../lib/modernExtend";
import * as reporting from "../lib/reporting";
import type {DefinitionWithExtend, Fz, KeyValue, ModernExtend, Tz} from "../lib/types";
import * as utils from "../lib/utils";
import {postfixWithEndpointName} from "../lib/utils";

const e = exposes.presets;
const ea = exposes.access;

function indicatorMode(endpoint?: string) {
    let description = "Set Indicator Mode.";
    if (endpoint) {
        description = `Set Indicator Mode for ${endpoint} switch.`;
    }
    return m.enumLookup({
        name: "indicator_mode",
        lookup: {
            reverse_with_load: 2,
            consistent_with_load: 0,
            always_off: 3,
            always_on: 1,
        },
        cluster: "manuSpecificSchneiderLightSwitchConfiguration",
        attribute: "ledIndication",
        description: description,
        endpointName: endpoint,
    });
}

function socketIndicatorMode() {
    return m.enumLookup({
        name: "indicator_mode",
        lookup: {
            reverse_with_load: 0,
            consistent_with_load: 1,
            always_off: 2,
            always_on: 3,
        },
        cluster: "manuSpecificSchneiderFanSwitchConfiguration",
        attribute: "ledIndication",
        description: "Set indicator mode",
    });
}

function fanIndicatorMode() {
    const description = "Set Indicator Mode.";
    return m.enumLookup({
        name: "indicator_mode",
        lookup: {
            always_on: 3,
            on_with_timeout_but_as_locator: 4,
            on_with_timeout: 5,
        },
        cluster: "manuSpecificSchneiderFanSwitchConfiguration",
        attribute: "ledIndication",
        description: description,
    });
}

function fanIndicatorOrientation() {
    const description = "Set Indicator Orientation.";
    return m.enumLookup({
        name: "indicator_orientation",
        lookup: {
            horizontal_left: 2,
            horizontal_right: 0,
            vertical_top: 3,
            vertical_bottom: 1,
        },
        cluster: "manuSpecificSchneiderFanSwitchConfiguration",
        attribute: "ledOrientation",
        description: description,
    });
}

function switchActions(endpoint?: string) {
    let description = "Set Switch Action.";
    if (endpoint) {
        description = `Set Switch Action for ${endpoint} Button.`;
    }
    return m.enumLookup({
        name: "switch_actions",
        lookup: {
            light: 0,
            light_opposite: 254,
            dimmer: 1,
            dimmer_opposite: 253,
            standard_shutter: 2,
            standard_shutter_opposite: 252,
            schneider_shutter: 3,
            schneider_shutter_opposite: 251,
            scene: 4,
            toggle_light: 5,
            toggle_dimmer: 6,
            alternate_light: 7,
            alternate_dimmer: 8,
            not_used: 127,
        },
        cluster: "manuSpecificSchneiderLightSwitchConfiguration",
        attribute: "switchActions",
        description: description,
        endpointName: endpoint,
    });
}

const schneiderElectricExtend = {
    addVisaConfigurationCluster: (enumDataType: Zcl.DataType.ENUM8 | Zcl.DataType.UINT8) =>
        m.deviceAddCustomCluster("visaConfiguration", {
            ID: 0xfc04,
            manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            attributes: {
                indicatorLuminanceLevel: {ID: 0x0000, type: enumDataType},
                indicatorColor: {ID: 0x0001, type: enumDataType},
                indicatorMode: {ID: 0x0002, type: enumDataType},
                motorTypeChannel1: {ID: 0x0003, type: Zcl.DataType.UINT8},
                motorTypeChannel2: {ID: 0x0004, type: Zcl.DataType.UINT8},
                curtainStatusChannel1: {ID: 0x0005, type: Zcl.DataType.UINT8},
                curtainStatusChannel2: {ID: 0x0006, type: Zcl.DataType.UINT8},
                key1EventNotification: {ID: 0x0020, type: Zcl.DataType.UINT8},
                key2EventNotification: {ID: 0x0021, type: Zcl.DataType.UINT8},
                key3EventNotification: {ID: 0x0022, type: Zcl.DataType.UINT8},
                key4EventNotification: {ID: 0x0023, type: Zcl.DataType.UINT8},
            },
            commands: {},
            commandsResponse: {},
        }),
    visaConfigIndicatorLuminanceLevel: (): ModernExtend => {
        return m.enumLookup({
            name: "indicator_luminance_level",
            lookup: {
                "100": 0,
                "80": 1,
                "60": 2,
                "40": 3,
                "20": 4,
                "0": 5,
            },
            cluster: "visaConfiguration",
            attribute: "indicatorLuminanceLevel",
            description: "Set indicator luminance Level",
        });
    },
    visaConfigIndicatorColor: (): ModernExtend => {
        return m.enumLookup({
            name: "indicator_color",
            lookup: {
                white: 0,
                blue: 1,
            },
            cluster: "visaConfiguration",
            attribute: "indicatorColor",
            description: "Set indicator color",
        });
    },
    visaIndicatorMode: ([reverseWithLoad, consistentWithLoad, alwaysOff, alwaysOn]: number[]): ModernExtend => {
        return m.enumLookup({
            name: "indicator_mode",
            lookup: {
                reverse_with_load: reverseWithLoad,
                consistent_with_load: consistentWithLoad,
                always_off: alwaysOff,
                always_on: alwaysOn,
            },
            cluster: "visaConfiguration",
            attribute: "indicatorMode",
            description: "Set indicator mode for switch",
        });
    },
    visaConfigMotorType: (channel?: number): ModernExtend => {
        const attribute = `motorTypeChannel${channel || ""}`;
        const description = `Set motor type for channel ${channel || ""}`;

        return m.enumLookup({
            name: `motor_type${channel ? `_${channel}` : ""}`,
            lookup: {
                ac_motor: 0,
                pulse_motor: 1,
            },
            cluster: "visaConfiguration",
            attribute: attribute,
            description: description,
        });
    },
    visaConfigCurtainStatus: (channel?: number): ModernExtend => {
        const attribute = `curtainStatusChannel${channel || ""}`;
        const description = `Set curtain status for channel ${channel}`;

        return m.enumLookup({
            access: "STATE",
            name: `curtain_status${channel ? `_${channel}` : ""}`,
            lookup: {
                stop: 0,
                opening: 1,
                closing: 2,
            },
            cluster: "visaConfiguration",
            attribute: attribute,
            description: description,
        });
    },
    visaWiserCurtain: (endpointNames: string[]): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "genLevelCtrl",
                    type: ["attributeReport", "readResponse"],
                    convert: (model, msg, publish, options, meta) => {
                        const onOffTransitionTime = Number(msg.data.onOffTransitionTime) / 10;
                        const currentLevel = utils.mapNumberRange(Number(msg.data.currentLevel), 0, 255, 0, 100);

                        const transition = postfixWithEndpointName("transition", msg, model, meta);
                        const position = postfixWithEndpointName("position", msg, model, meta);

                        return {
                            [transition]: onOffTransitionTime,
                            [position]: currentLevel,
                        };
                    },
                },
            ],
            toZigbee: [
                {
                    key: ["transition", "position"],
                    convertGet: async (entity, key, meta) => {
                        await entity.read("genLevelCtrl", ["onOffTransitionTime", "currentLevel"]);
                    },
                    convertSet: async (entity, key, value, meta) => {
                        if (key === "transition") {
                            await entity.write("genLevelCtrl", {onOffTransitionTime: +value * 10}, utils.getOptions(meta.mapped, entity));
                        } else if (key === "position") {
                            await entity.command(
                                "genLevelCtrl",
                                "moveToLevelWithOnOff",
                                {level: utils.mapNumberRange(Number(value), 0, 100, 0, 255), transtime: 0},
                                utils.getOptions(meta.mapped, entity),
                            );
                        }
                    },
                },
                {
                    key: ["state"],
                    convertSet: async (entity, key, value, meta) => {
                        if (value === "OPEN") {
                            await entity.command("genOnOff", "on", {}, utils.getOptions(meta.mapped, entity));
                        } else if (value === "CLOSE") {
                            await entity.command("genOnOff", "off", {}, utils.getOptions(meta.mapped, entity));
                        } else if (value === "STOP") {
                            await entity.command("genLevelCtrl", "stop", {}, utils.getOptions(meta.mapped, entity));
                        }
                    },
                },
            ],
            exposes: [
                ...endpointNames.map((endpointName) =>
                    e.enum("state", ea.SET, ["OPEN", "CLOSE", "STOP"]).withDescription("State of the curtain").withEndpoint(endpointName),
                ),
                ...endpointNames.map((endpointName) =>
                    e
                        .numeric("position", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(100)
                        .withUnit("%")
                        .withDescription("Position of the curtain")
                        .withEndpoint(endpointName),
                ),
                ...endpointNames.map((endpointName) =>
                    e
                        .numeric("transition", ea.ALL)
                        .withValueMin(0)
                        .withValueMax(300)
                        .withUnit("s")
                        .withDescription("Transition time in seconds")
                        .withEndpoint(endpointName),
                ),
            ],
        };
    },
    visaKeyEventNotification: (key: "1" | "2" | "3" | "4"): ModernExtend => {
        return {
            isModernExtend: true,
            fromZigbee: [
                {
                    cluster: "visaConfiguration",
                    type: ["attributeReport"],
                    convert: (model, msg, publish, options, meta) => {
                        return {
                            [`key${key}_event_notification`]: msg.data[`key${key}EventNotification`],
                        };
                    },
                },
            ],
        };
    },

    dimmingMode: (): ModernExtend => {
        const extend = m.enumLookup({
            name: "dimmer_mode",
            lookup: {
                Auto: 0,
                "RL-LED": 3,
            },
            cluster: "lightingBallastCfg",
            attribute: "wiserControlMode",
            description: "Auto detects the correct mode for the ballast. RL-LED may have improved dimming quality for LEDs.",
            entityCategory: "config",
        });
        extend.configure.push(m.setupConfigureForReading("lightingBallastCfg", ["wiserControlMode"]));
        return extend;
    },

    addOccupancyConfigurationCluster: () =>
        m.deviceAddCustomCluster("occupancyConfiguration", {
            ID: 0xff19,
            manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            attributes: {
                ambienceLightThreshold: {ID: 0x0000, type: Zcl.DataType.UINT16},
                occupancyActions: {ID: 0x0001, type: Zcl.DataType.ENUM8},
                unoccupiedLevelDflt: {ID: 0x0002, type: Zcl.DataType.UINT8},
                unoccupiedLevel: {ID: 0x0003, type: Zcl.DataType.UINT8},
            },
            commands: {},
            commandsResponse: {},
        }),

    occupancyConfiguration: (): ModernExtend => {
        const extend = m.enumLookup({
            name: "occupancy_sensitivity",
            lookup: {
                Low: 50,
                Medium: 75,
                High: 100,
            },
            cluster: "msOccupancySensing",
            attribute: {ID: 0xe003, type: Zcl.DataType.UINT8},
            zigbeeCommandOptions: {
                manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC,
            },
            description: "Sensitivity of the occupancy sensor",
            entityCategory: "config",
        });

        const luxScale: m.ScaleFunction = (value: number, type: "from" | "to") => {
            if (type === "from") {
                return Math.round(10 ** ((value - 1) / 10000));
            }
            return Math.round(10000 * Math.log10(value) + 1);
        };

        const luxThresholdExtend = m.numeric({
            name: "ambience_light_threshold",
            cluster: "occupancyConfiguration",
            attribute: "ambienceLightThreshold",
            reporting: {min: "10_SECONDS", max: "1_HOUR", change: 5},
            description: "Threshold above which occupancy will not trigger the light switch.",
            unit: "lx",
            scale: luxScale,
            entityCategory: "config",
            valueMin: 1,
            valueMax: 2000,
        });
        extend.fromZigbee.push(...luxThresholdExtend.fromZigbee);
        extend.toZigbee.push(...luxThresholdExtend.toZigbee);
        extend.exposes.push(...luxThresholdExtend.exposes);
        extend.configure.push(m.setupConfigureForReading("occupancyConfiguration", ["ambienceLightThreshold"]));

        return extend;
    },
};

const tzLocal = {
    lift_duration: {
        key: ["lift_duration"],
        convertSet: async (entity, key, value, meta) => {
            await entity.write(0x0102, {57344: {value, type: 0x21}}, {manufacturerCode: Zcl.ManufacturerCode.SCHNEIDER_ELECTRIC});
            return {state: {lift_duration: value}};
        },
    } satisfies Tz.Converter,
    fan_mode: {
        ...tz.fan_mode,
        convertSet: async (entity, key, value, meta) => {
            utils.assertString(value);
            // biome-ignore lint/style/noParameterAssign: ignored using `--suppress`
            if (value.toLowerCase() === "on") value = "low";
            return await tz.fan_mode.convertSet(entity, key, value, meta);
        },
    } satisfies Tz.Converter,
};

const fzLocal = {
    schneider_powertag: {
        cluster: "greenPower",
        type: ["commandNotification", "commandCommissioningNotification"],
        convert: async (model, msg, publish, options, meta) => {
            if (msg.type !== "commandNotification") {
                return;
            }

            const commandID = msg.data.commandID;
            if (utils.hasAlreadyProcessedMessage(msg, model, msg.data.frameCounter, `${msg.device.ieeeAddr}_${commandID}`)) return;

            const rxAfterTx = msg.data.options & (1 << 11);
            const ret: KeyValue = {};

            switch (commandID) {
                case 0xa1: {
                    const attr = msg.data.commandFrame.attributes;
                    const clusterID = msg.data.commandFrame.clusterID;

                    switch (clusterID) {
                        case 2820: {
                            // haElectricalMeasurement
                            const acCurrentDivisor = attr.acCurrentDivisor;
                            const acVoltageDivisor = attr.acVoltageDivisor;
                            const acFrequencyDivisor = attr.acFrequencyDivisor;
                            const powerDivisor = attr.powerDivisor;

                            if (attr.rmsVoltage !== undefined) {
                                ret.voltage_phase_a = attr.rmsVoltage / acVoltageDivisor;
                            }

                            if (attr.rmsVoltagePhB !== undefined) {
                                ret.voltage_phase_b = attr.rmsVoltagePhB / acVoltageDivisor;
                            }

                            if (attr.rmsVoltagePhC !== undefined) {
                                ret.voltage_phase_c = attr.rmsVoltagePhC / acVoltageDivisor;
                            }

                            if (attr["19200"] !== undefined) {
                                ret.voltage_phase_ab = attr["19200"] / acVoltageDivisor;
                            }

                            if (attr["19456"] !== undefined) {
                                ret.voltage_phase_bc = attr["19456"] / acVoltageDivisor;
                            }

                            if (attr["19712"] !== undefined) {
                                ret.voltage_phase_ca = attr["19712"] / acVoltageDivisor;
                            }

                            if (attr.rmsCurrent !== undefined) {
                                ret.current_phase_a = attr.rmsCurrent / acCurrentDivisor;
                            }

                            if (attr.rmsCurrentPhB !== undefined) {
                                ret.current_phase_b = attr.rmsCurrentPhB / acCurrentDivisor;
                            }

                            if (attr.rmsCurrentPhC !== undefined) {
                                ret.current_phase_c = attr.rmsCurrentPhC / acCurrentDivisor;
                            }

                            if (attr.totalActivePower !== undefined) {
                                ret.power = (attr.totalActivePower * 1000) / powerDivisor;
                            }

                            if (attr.totalApparentPower !== undefined) {
                                ret.power_apparent = (attr.totalApparentPower * 1000) / powerDivisor;
                            }

                            if (attr.acFrequency !== undefined) {
                                ret.ac_frequency = attr.acFrequency / acFrequencyDivisor;
                            }

                            if (attr.activePower !== undefined) {
                                ret.power_phase_a = (attr.activePower * 1000) / powerDivisor;
                            }

                            if (attr.activePowerPhB !== undefined) {
                                ret.power_phase_b = (attr.activePowerPhB * 1000) / powerDivisor;
                            }

                            if (attr.activePowerPhC !== undefined) {
                                ret.power_phase_c = (attr.activePowerPhC * 1000) / powerDivisor;
                            }
                            break;
                        }
                        case 1794: {
                            // seMetering
                            const divisor = attr.divisor;

                            if (attr.currentSummDelivered !== undefined) {
                                const val = attr.currentSummDelivered;
                                ret.energy = val / divisor;
                            }

                            if (attr["16652"] !== undefined) {
                                const val = attr["16652"];
                                ret.energy_phase_a = val / divisor;
                            }

                            if (attr["16908"] !== undefined) {
                                const val = attr["16908"];
                                ret.energy_phase_b = val / divisor;
                            }

                            if (attr["17164"] !== undefined) {
                                const val = attr["17164"];
                                ret.energy_phase_c = val / divisor;
                            }

                            if (attr.powerFactor !== undefined) {
                                ret.power_factor = attr.powerFactor;
                            }

                            break;
                        }
                    }

                    break;
                }
                case 0xa3:
                    // Should handle this cluster as well
                    break;
            }

            if (rxAfterTx) {
                // Send Schneider specific ACK to make PowerTag happy
                // @ts-expect-error ignore
                const networkParameters = await msg.device.constructor.adapter.getNetworkParameters();
                const payload = {
                    options: 0b000,
                    tempMaster: msg.data.gppNwkAddr,
                    tempMasterTx: networkParameters.channel - 11,
                    srcID: msg.data.srcID,
                    gpdCmd: 0xfe,
                    gpdPayload: {
                        commandID: 0xfe,
                        buffer: Buffer.alloc(1), // I hope it's zero initialised
                    },
                };

                await msg.endpoint.commandResponse("greenPower", "response", payload, {
                    srcEndpoint: 242,
                    disableDefaultResponse: true,
                });
            }

            return ret;
        },
    } satisfies Fz.Converter,
};

export const definitions: DefinitionWithExtend[] = [
    {
        zigbeeModel: ["PUCK/SHUTTER/1"],
        model: "CCT5015-0001",
        vendor: "Schneider Electric",
        description: "Roller shutter module",
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.lift_duration],
        exposes: [
            e.cover_position(),
            e.numeric("lift_duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(300).withDescription("Duration of lift"),
        ],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ["NHPB/SHUTTER/1"],
        model: "S520567",
        vendor: "Schneider Electric",
        description: "Roller shutter",
        fromZigbee: [fz.cover_position_tilt],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.lift_duration],
        exposes: [
            e.cover_position_tilt(),
            e.numeric("lift_duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(300).withDescription("Duration of lift"),
        ],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ["iTRV"],
        model: "WV704R0A0902",
        vendor: "Schneider Electric",
        description: "Wiser radiator thermostat",
        fromZigbee: [
            fz.ignore_basic_report,
            fz.ignore_haDiagnostic,
            fz.ignore_genOta,
            fz.ignore_zclversion_read,
            fz.thermostat,
            fz.battery,
            fz.hvac_user_interface,
            fz.wiser_device_info,
        ],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_keypad_lockout],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3200}}},
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 5, 30, 0.5)
                .withLocalTemperature(ea.STATE)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withPiHeatingDemand(),
            e.battery(),
            e.battery_voltage(),
            e.keypad_lockout().withAccess(ea.ALL),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat", "haDiagnostic"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            // bind of hvacUserInterfaceCfg fails with 'Table Full', does this have any effect?
            await endpoint.configureReporting("hvacUserInterfaceCfg", [
                {
                    attribute: "keypadLockout",
                    reportableChange: 1,
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["U202DST600ZB"],
        model: "U202DST600ZB",
        vendor: "Schneider Electric",
        description: "EZinstall3 2 gang 2x300W dimmer module",
        extend: [m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}), m.light({endpointNames: ["l1", "l2"], configureReporting: true})],
    },
    {
        zigbeeModel: ["PUCK/DIMMER/1"],
        model: "CCT5010-0001",
        vendor: "Schneider Electric",
        description: "Micro module dimmer",
        ota: true,
        extend: [m.light({configureReporting: true, levelConfig: {}})],
        fromZigbee: [fz.wiser_lighting_ballast_configuration],
        toZigbee: [tz.ballast_config, tz.wiser_dimmer_mode],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO07090"},
            {vendor: "Schneider Electric", model: "550B1012"},
        ],
    },
    {
        zigbeeModel: ["PUCK/SWITCH/1"],
        model: "CCT5011-0001/CCT5011-0002/MEG5011-0001",
        vendor: "Schneider Electric",
        description: "Micro module switch",
        ota: true,
        extend: [m.onOff({powerOnBehavior: false})],
        whiteLabel: [{vendor: "Elko", model: "EKO07144"}],
    },
    {
        zigbeeModel: ["PUCK/UNIDIM/1"],
        model: "CCT5010-0003",
        vendor: "Schneider Electric",
        description: "Micro module dimmer with neutral lead",
        ota: true,
        extend: [m.light({configureReporting: true, levelConfig: {}})],
        fromZigbee: [fz.wiser_lighting_ballast_configuration],
        toZigbee: [tz.ballast_config, tz.wiser_dimmer_mode],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
    },
    {
        zigbeeModel: ["CCTFR6730"],
        model: "CCTFR6730",
        vendor: "Schneider Electric",
        description: "Wiser power micromodule",
        whiteLabel: [{vendor: "Elko", model: "EKO20004"}],
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter({cluster: "metering"}), m.identify()],
    },
    {
        zigbeeModel: ["NHROTARY/DIMMER/1"],
        model: "WDE002334",
        vendor: "Schneider Electric",
        description: "Rotary dimmer",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tz.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["NHROTARY/UNIDIM/1"],
        model: "NH3516A",
        vendor: "Schneider Electric",
        description: "Rotary dimmer",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: false,
                color: false,
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
            }),
            m.lightingBallast(),
            schneiderElectricExtend.dimmingMode(),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO07278"},
            {vendor: "Elko", model: "EKO07279"},
            {vendor: "Elko", model: "EKO07280"},
            {vendor: "Elko", model: "EKO07281"},
            {vendor: "Elko", model: "EKO30198"},
            {vendor: "Schneider", model: "WDE002961"},
            {vendor: "Schneider", model: "WDE003961"},
            {vendor: "Schneider", model: "WDE004961"},
        ],
    },
    {
        zigbeeModel: ["NHPB/UNIDIM/1"],
        model: "WDE002960",
        vendor: "Schneider Electric",
        description: "Push button dimmer",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tz.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["CCT593011_AS"],
        model: "550B1024",
        vendor: "Schneider Electric",
        description: "Temperature & humidity sensor",
        fromZigbee: [fz.humidity, fz.temperature, fz.battery],
        toZigbee: [],
        exposes: [e.battery(), e.temperature(), e.humidity()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["msTemperatureMeasurement", "genPowerCfg", "msRelativeHumidity"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
            await reporting.temperature(endpoint);
            await reporting.humidity(endpoint);
        },
    },
    {
        zigbeeModel: ["NHPB/DIMMER/1"],
        model: "WDE002386",
        vendor: "Schneider Electric",
        description: "Push button dimmer",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["CH/DIMMER/1"],
        model: "41EPBDWCLMZ/354PBDMBTZ",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series Module Dimmer",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config],
        exposes: [
            e.light_brightness(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
        ],
        ota: true,
        extend: [indicatorMode("smart")],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
        endpoint: (device) => {
            return {smart: 21};
        },
    },
    {
        zigbeeModel: ["CH2AX/SWITCH/1"],
        model: "41E2PBSWMZ/356PB2MBTZ",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series module switch 2AX",
        ota: true,
        extend: [m.onOff({powerOnBehavior: false}), indicatorMode("smart")],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
        endpoint: (device) => {
            return {smart: 21};
        },
    },
    {
        zigbeeModel: ["CH10AX/SWITCH/1"],
        model: "41E10PBSWMZ-VW",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series module switch 10AX with ControlLink",
        ota: true,
        extend: [m.onOff({powerOnBehavior: false}), indicatorMode("smart")],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff"]);
            await reporting.onOff(endpoint);
        },
        endpoint: (device) => {
            return {smart: 21};
        },
    },
    {
        zigbeeModel: ["CHFAN/SWITCH/1"],
        model: "41ECSFWMZ-VW",
        vendor: "Schneider Electric",
        description: "Wiser 40/300-Series Module AC Fan Controller",
        fromZigbee: [fz.fan],
        toZigbee: [tzLocal.fan_mode],
        exposes: [e.fan().withState("fan_state").withModes(["off", "low", "medium", "high", "on"])],
        ota: true,
        extend: [fanIndicatorMode(), fanIndicatorOrientation()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(7);
            await reporting.bind(endpoint, coordinatorEndpoint, ["hvacFanCtrl"]);
            await reporting.fanMode(endpoint);
        },
    },
    {
        zigbeeModel: ["SMARTPLUG/1"],
        model: "CCT711119",
        vendor: "Schneider Electric",
        description: "Wiser smart plug",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior, tz.electrical_measurement_power],
        exposes: [
            e.switch(),
            e.power().withAccess(ea.STATE_GET),
            e.energy(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // only activePower seems to be support, although compliance document states otherwise
            await endpoint.read("haElectricalMeasurement", ["acPowerMultiplier", "acPowerDivisor"]);
            await reporting.activePower(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
    },
    {
        zigbeeModel: ["U201DST600ZB"],
        model: "U201DST600ZB",
        vendor: "Schneider Electric",
        description: "EZinstall3 1 gang 550W dimmer module",
        extend: [m.light({configureReporting: true})],
    },
    {
        zigbeeModel: ["U201SRY2KWZB"],
        model: "U201SRY2KWZB",
        vendor: "Schneider Electric",
        description: "Ulti 240V 9.1 A 1 gang relay switch impress switch module, amber LED",
        extend: [m.onOff()],
    },
    {
        zigbeeModel: ["CCTFR6100"],
        model: "CCTFR6100Z3",
        vendor: "Schneider Electric",
        description: "Wiser radiator thermostat",
        fromZigbee: [
            fz.ignore_basic_report,
            fz.ignore_haDiagnostic,
            fz.ignore_genOta,
            fz.ignore_zclversion_read,
            fz.thermostat,
            fz.battery,
            fz.hvac_user_interface,
            fz.wiser_device_info,
        ],
        toZigbee: [tz.thermostat_occupied_heating_setpoint, tz.thermostat_keypad_lockout],
        exposes: [
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 7, 30, 1)
                .withLocalTemperature(ea.STATE)
                .withRunningState(["idle", "heat"], ea.STATE)
                .withPiHeatingDemand(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat", "haDiagnostic"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.thermostatPIHeatingDemand(endpoint);
            // bind of hvacUserInterfaceCfg fails with 'Table Full', does this have any effect?
            await endpoint.configureReporting("hvacUserInterfaceCfg", [
                {
                    attribute: "keypadLockout",
                    reportableChange: 1,
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["NHPB/SWITCH/1"],
        model: "S520530W",
        vendor: "Schneider Electric",
        description: "Odace connectable relay switch 10A",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["U202SRY2KWZB"],
        model: "U202SRY2KWZB",
        vendor: "Schneider Electric",
        description: "Ulti 240V 9.1 A 2 gangs relay switch impress switch module, amber LED",
        extend: [m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["1GANG/SHUTTER/1"],
        model: "MEG5113-0300/MEG5165-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5165 PlusLink Shutter insert with Merten Wiser System M Push Button (1fold)",
        fromZigbee: [fz.cover_position_tilt, fz.command_cover_close, fz.command_cover_open, fz.command_cover_stop],
        toZigbee: [tz.cover_position_tilt, tz.cover_state, tzLocal.lift_duration],
        exposes: [
            e.cover_position_tilt(),
            e.numeric("lift_duration", ea.STATE_SET).withUnit("s").withValueMin(0).withValueMax(300).withDescription("Duration of lift"),
        ],
        meta: {coverInverted: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1) || device.getEndpoint(5);
            await reporting.bind(endpoint, coordinatorEndpoint, ["closuresWindowCovering"]);
            await reporting.currentPositionLiftPercentage(endpoint);
        },
    },
    {
        zigbeeModel: ["1GANG/DIMMER/1", "1GANG/DALI/1"],
        model: "MEG5116-0300/MEG5171-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5171 PlusLink Dimmer insert with Merten Wiser System M Push Button (1fold)",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tz.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        extend: [indicatorMode(), switchActions()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
    },
    {
        zigbeeModel: ["2GANG/DIMMER/1"],
        model: "MEG5126-0300/MEG5171-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5171 PlusLink Dimmer insert with Merten Wiser System M Push Button (2fold)",
        fromZigbee: [fz.on_off, fz.brightness, fz.level_config, fz.wiser_lighting_ballast_configuration],
        toZigbee: [tz.light_onoff_brightness, tz.level_config, tz.ballast_config, tz.wiser_dimmer_mode],
        exposes: [
            e.light_brightness().withLevelConfig(),
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        extend: [indicatorMode("right"), indicatorMode("left"), switchActions("right"), switchActions("left")],
        meta: {multiEndpoint: true},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "lightingBallastCfg"]);
            await reporting.onOff(endpoint);
            await reporting.brightness(endpoint);
        },
        endpoint: (device) => {
            return {right: 21, left: 22};
        },
    },
    {
        zigbeeModel: ["2GANG/DIMMER/2"],
        model: "MEG5126-0300/MEG5172-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5172 PlusLink Dimmer insert with Merten Wiser System M Push Button (2fold)",
        fromZigbee: [fz.wiser_lighting_ballast_configuration],
        toZigbee: [tz.ballast_config, tz.wiser_dimmer_mode],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast"),
            e
                .enum("dimmer_mode", ea.ALL, ["auto", "rc", "rl", "rl_led"])
                .withDescription("Sets dimming mode to autodetect or fixed RC/RL/RL_LED mode (max load is reduced in RL_LED)"),
        ],
        extend: [
            m.deviceEndpoints({endpoints: {left: 4, right: 3, left_btn: 22, right_btn: 21}}),
            m.light({endpointNames: ["left", "right"], configureReporting: true}),
            switchActions("left_btn"),
            switchActions("right_btn"),
            indicatorMode("left_btn"),
        ],
    },
    {
        zigbeeModel: ["1GANG/SWITCH/1"],
        model: "MEG5161-0000",
        vendor: "Schneider Electric",
        description: "Merten PlusLink relay insert with Merten Wiser system M push button (1fold)",
        extend: [m.onOff({powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["LK Switch"],
        model: "545D6514",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless double relay",
        meta: {multiEndpoint: true},
        fromZigbee: [fz.on_off, fz.command_on, fz.command_off],
        toZigbee: [tz.on_off],
        endpoint: (device) => {
            return {l1: 1, l2: 2, s1: 21, s2: 22, s3: 23, s4: 24};
        },
        exposes: [e.switch().withEndpoint("l1"), e.switch().withEndpoint("l2"), e.action(["on_s*", "off_s*"])],
        configure: (device, coordinatorEndpoint) => {
            device.endpoints.forEach(async (ep) => {
                if (ep.outputClusters.includes(6) || ep.ID <= 2) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genOnOff"]);
                    if (ep.ID <= 2) {
                        await reporting.onOff(ep);
                    }
                }
            });
        },
    },
    {
        zigbeeModel: ["LK Dimmer"],
        model: "545D6102",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless dimmer",
        fromZigbee: [fz.schneider_lighting_ballast_configuration, fz.command_recall, fz.command_on, fz.command_off, fz.command_move, fz.command_stop],
        toZigbee: [tz.ballast_config, tz.schneider_dimmer_mode],
        endpoint: (device) => {
            return {l1: 3, s1: 21, s2: 22, s3: 23, s4: 24};
        },
        meta: {multiEndpoint: true},
        extend: [m.light({endpointNames: ["l1"], configureReporting: true, levelConfig: {}})],
        exposes: [
            e
                .numeric("ballast_minimum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the minimum light output of the ballast")
                .withEndpoint("l1"),
            e
                .numeric("ballast_maximum_level", ea.ALL)
                .withValueMin(1)
                .withValueMax(254)
                .withDescription("Specifies the maximum light output of the ballast")
                .withEndpoint("l1"),
            e.enum("dimmer_mode", ea.ALL, ["RC", "RL"]).withDescription("Controls Capacitive or Inductive Dimming Mode").withEndpoint("l1"),
            e.action(["on", "off", "brightness_move_up", "brightness_move_down", "brightness_stop", "recall_*"]),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // Configure the dimmer actuator endpoint
            const endpoint = device.getEndpoint(3);
            await reporting.bind(endpoint, coordinatorEndpoint, ["lightingBallastCfg"]);
            // Configure the four front switches
            device.endpoints.forEach(async (ep) => {
                if (21 <= ep.ID && ep.ID <= 22) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
                } else if (23 <= ep.ID && ep.ID <= 24) {
                    await reporting.bind(ep, coordinatorEndpoint, ["genScenes"]);
                }
            });
        },
        onEvent: (type, data, device) => {
            // Record the factory default bindings for easy removal/change after deviceInterview
            if (type === "deviceInterview") {
                const dimmer = device.getEndpoint(3);
                device.endpoints.forEach((ep) => {
                    if (21 <= ep.ID && ep.ID <= 22) {
                        ep.addBinding("genOnOff", dimmer);
                        ep.addBinding("genLevelCtrl", dimmer);
                    }
                    if (23 <= ep.ID && ep.ID <= 24) {
                        ep.addBinding("genScenes", dimmer);
                    }
                });
            }
        },
    },
    {
        zigbeeModel: ["FLS/AIRLINK/4"],
        model: "550D6001",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless battery 4 button switch",
        fromZigbee: [fz.command_on, fz.command_off, fz.command_move, fz.command_stop, fz.battery],
        toZigbee: [],
        endpoint: (device) => {
            return {top: 21, bottom: 22};
        },
        whiteLabel: [{vendor: "Elko", model: "EKO07117"}],
        meta: {multiEndpoint: true},
        exposes: [
            e.action([
                "on_top",
                "off_top",
                "on_bottom",
                "off_bottom",
                "brightness_move_up_top",
                "brightness_stop_top",
                "brightness_move_down_top",
                "brightness_stop_top",
                "brightness_move_up_bottom",
                "brightness_stop_bottom",
                "brightness_move_down_bottom",
                "brightness_stop_bottom",
            ]),
            e.battery(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            // When in 2-gang operation mode, unit operates out of endpoints 21 and 22, otherwise just 21
            const topButtonsEndpoint = device.getEndpoint(21);
            await reporting.bind(topButtonsEndpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl", "genPowerCfg"]);
            await reporting.batteryPercentageRemaining(topButtonsEndpoint);
            const bottomButtonsEndpoint = device.getEndpoint(22);
            await reporting.bind(bottomButtonsEndpoint, coordinatorEndpoint, ["genOnOff", "genLevelCtrl"]);
        },
    },
    {
        fingerprint: [{modelID: "CCTFR6700", manufacturerName: "Schneider Electric"}],
        model: "CCTFR6700",
        vendor: "Schneider Electric",
        description: "Heating thermostat",
        fromZigbee: [fz.thermostat, fz.metering, fz.schneider_pilot_mode],
        toZigbee: [
            tz.schneider_temperature_measured_value,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_pilot_mode,
            tz.schneider_temperature_measured_value,
        ],
        exposes: [
            e.power(),
            e.energy(),
            e.enum("schneider_pilot_mode", ea.ALL, ["contactor", "pilot"]).withDescription("Controls piloting mode"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "auto", "heat"])
                .withPiHeatingDemand(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["seMetering"]);
            await reporting.instantaneousDemand(endpoint2, {min: 0, max: 60, change: 1});
            await reporting.currentSummDelivered(endpoint2, {min: 0, max: 60, change: 1});
        },
    },
    {
        fingerprint: [{modelID: "Thermostat", manufacturerName: "Schneider Electric"}],
        model: "CCTFR6400",
        vendor: "Schneider Electric",
        description: "Temperature/Humidity measurement with thermostat interface",
        fromZigbee: [fz.battery, fz.schneider_temperature, fz.humidity, fz.thermostat, fz.schneider_ui_action],
        toZigbee: [
            tz.schneider_thermostat_system_mode,
            tz.schneider_thermostat_occupied_heating_setpoint,
            tz.schneider_thermostat_control_sequence_of_operation,
            tz.schneider_thermostat_pi_heating_demand,
            tz.schneider_thermostat_keypad_lockout,
        ],
        exposes: [
            e.keypad_lockout().withAccess(ea.STATE_SET),
            e.humidity(),
            e.battery(),
            e.battery_voltage(),
            e.action(["screen_sleep", "screen_wake", "button_press_plus_down", "button_press_center_down", "button_press_minus_down"]),
            e.climate().withSetpoint("occupied_heating_setpoint", 4, 30, 0.5, ea.SET).withLocalTemperature(ea.STATE).withPiHeatingDemand(ea.SET),
        ],
        meta: {battery: {dontDividePercentage: true}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["genPowerCfg", "hvacThermostat", "msTemperatureMeasurement", "msRelativeHumidity"]);
            await reporting.temperature(endpoint1);
            await reporting.humidity(endpoint1);
            await reporting.batteryPercentageRemaining(endpoint1);
            endpoint1.saveClusterAttributeKeyValue("genBasic", {zclVersion: 3});
            endpoint1.saveClusterAttributeKeyValue("hvacThermostat", {schneiderWiserSpecific: 1, systemMode: 4, ctrlSeqeOfOper: 2});
            endpoint1.saveClusterAttributeKeyValue("hvacUserInterfaceCfg", {keypadLockout: 0});
        },
    },
    {
        zigbeeModel: ["EH-ZB-SPD-V2"],
        model: "EER40030",
        vendor: "Schneider Electric",
        description: "Zigbee smart plug with power meter",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            const options = {disableDefaultResponse: true};
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
            await endpoint.write("genBasic", {57424: {value: 1, type: 0x10}}, options);
        },
    },
    {
        zigbeeModel: ["EH-ZB-LMACT"],
        model: "EER42000",
        vendor: "Schneider Electric",
        description: "Zigbee load actuator with power meter",
        fromZigbee: [fz.on_off, fz.metering],
        toZigbee: [tz.on_off],
        exposes: [e.switch(), e.power(), e.energy()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "seMetering"]);
            await reporting.onOff(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ["2GANG/SWITCH/2", "2GANG/SWITCH/1"],
        model: "MEG5126-0300",
        vendor: "Schneider Electric",
        description: "Merten MEG5165 PlusLink relais insert with Merten Wiser System M push button (2fold)",
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"], powerOnBehavior: false})],
    },
    {
        zigbeeModel: ["EH-ZB-VACT"],
        model: "EER53000",
        vendor: "Schneider Electric",
        description: "Wiser radiator thermostat (VACT)",
        fromZigbee: [
            fz.ignore_basic_report,
            fz.ignore_genOta,
            fz.ignore_zclversion_read,
            fz.battery,
            fz.hvac_user_interface,
            fz.wiser_smart_thermostat,
            fz.wiser_smart_thermostat_client,
            fz.wiser_smart_setpoint_command_client,
        ],
        toZigbee: [
            tz.wiser_sed_thermostat_local_temperature_calibration,
            tz.wiser_sed_occupied_heating_setpoint,
            tz.wiser_sed_thermostat_keypad_lockout,
            tz.wiser_vact_calibrate_valve,
            tz.wiser_sed_zone_mode,
        ],
        exposes: [
            e.battery(),
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e.binary("calibrate_valve", ea.STATE_SET, "calibrate", "idle").withDescription("Calibrates valve on next wakeup"),
            e.enum("valve_calibration_status", ea.STATE, ["ongoing", "successful", "uncalibrated", "failed_e1", "failed_e2", "failed_e3"]),
            e.enum("zone_mode", ea.STATE_SET, ["manual", "schedule", "energy_saver", "holiday"]).withDescription("Icon shown on device displays"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 7, 30, 0.5, ea.STATE_SET)
                .withLocalTemperature(ea.STATE)
                .withLocalTemperatureCalibration(-12.8, 12.7, 0.1, ea.STATE_SET)
                .withPiHeatingDemand(),
        ],
        meta: {battery: {voltageToPercentage: {min: 2500, max: 3000}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            // Insert default values for client requested attributes
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {minHeatSetpointLimit: 7 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {maxHeatSetpointLimit: 30 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 20 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {systemMode: 4});
            // VACT needs binding to endpoint 11 due to some hardcoding in the device
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(11);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat"];
            await reporting.bind(endpoint, coordinatorEndpointB, binds);
            await reporting.batteryVoltage(endpoint);
            await reporting.thermostatTemperature(endpoint);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await endpoint.configureReporting("hvacUserInterfaceCfg", [
                {
                    attribute: "keypadLockout",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.HOUR,
                    reportableChange: 1,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["EH-ZB-RTS"],
        model: "EER51000",
        vendor: "Schneider Electric",
        description: "Wiser thermostat (RTS)",
        fromZigbee: [
            fz.ignore_basic_report,
            fz.ignore_genOta,
            fz.ignore_zclversion_read,
            fz.battery,
            fz.hvac_user_interface,
            fz.wiser_smart_thermostat_client,
            fz.wiser_smart_setpoint_command_client,
            fz.schneider_temperature,
        ],
        toZigbee: [tz.wiser_sed_zone_mode, tz.wiser_sed_occupied_heating_setpoint],
        exposes: [
            e.battery(),
            e.climate().withSetpoint("occupied_heating_setpoint", 7, 30, 0.5, ea.STATE_SET).withLocalTemperature(ea.STATE),
            e.enum("zone_mode", ea.STATE_SET, ["manual", "schedule", "energy_saver", "holiday"]).withDescription("Icon shown on device displays"),
        ],
        meta: {battery: {voltageToPercentage: {min: 3000, max: 4200}}},
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            // Insert default values for client requested attributes
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {minHeatSetpointLimit: 7 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {maxHeatSetpointLimit: 30 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {occupiedHeatingSetpoint: 20 * 100});
            endpoint.saveClusterAttributeKeyValue("hvacThermostat", {systemMode: 4});
            // RTS needs binding to endpoint 11 due to some hardcoding in the device
            const coordinatorEndpointB = coordinatorEndpoint.getDevice().getEndpoint(11);
            const binds = [
                "genBasic",
                "genPowerCfg",
                "genIdentify",
                "genAlarms",
                "genOta",
                "hvacThermostat",
                "hvacUserInterfaceCfg",
                "msTemperatureMeasurement",
            ];
            await reporting.bind(endpoint, coordinatorEndpointB, binds);
            // Battery reports without config once a day, do the first read manually
            await endpoint.read("genPowerCfg", ["batteryVoltage"]);
            await endpoint.configureReporting("msTemperatureMeasurement", [
                {
                    attribute: "measuredValue",
                    minimumReportInterval: constants.repInterval.MINUTE,
                    maximumReportInterval: constants.repInterval.MINUTES_10,
                    reportableChange: 50,
                },
            ]);
        },
    },
    {
        zigbeeModel: ["EH-ZB-HACT"],
        model: "EER50000",
        vendor: "Schneider Electric",
        description: "Wiser H-Relay (HACT)",
        fromZigbee: [fz.ignore_basic_report, fz.ignore_genOta, fz.ignore_zclversion_read, fz.wiser_smart_thermostat, fz.metering, fz.identify],
        toZigbee: [
            tz.thermostat_local_temperature,
            tz.thermostat_occupied_heating_setpoint,
            tz.wiser_fip_setting,
            tz.wiser_hact_config,
            tz.wiser_zone_mode,
            tz.identify,
        ],
        exposes: [
            e.climate().withSetpoint("occupied_heating_setpoint", 7, 30, 0.5).withLocalTemperature(),
            e.power(),
            e.energy(),
            e.enum("identify", ea.SET, ["0", "30", "60", "600", "900"]).withDescription("Flash green tag for x seconds"),
            e.enum("zone_mode", ea.ALL, ["manual", "schedule", "energy_saver", "holiday"]),
            e
                .enum("hact_config", ea.ALL, ["unconfigured", "setpoint_switch", "setpoint_fip", "fip_fip"])
                .withDescription("Input (command) and output (control) behavior of actuator"),
            e
                .enum("fip_setting", ea.ALL, ["comfort", "comfort_-1", "comfort_-2", "energy_saving", "frost_protection", "off"])
                .withDescription("Output signal when operating in fil pilote mode (fip_fip)"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(11);
            const binds = ["genBasic", "genPowerCfg", "hvacThermostat", "msTemperatureMeasurement", "seMetering"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.instantaneousDemand(endpoint);
        },
    },
    {
        zigbeeModel: ["FLS/SYSTEM-M/4"],
        model: "WDE002906/MEG5001-0300",
        vendor: "Schneider Electric",
        description: "Wiser wireless switch 1-gang or 2-gang",
        extend: [
            m.battery(),
            m.deviceEndpoints({endpoints: {right: 21, left: 22}}),
            switchActions("right"),
            switchActions("left"),
            m.commandsOnOff({endpointNames: ["right", "left"]}),
            m.commandsLevelCtrl({endpointNames: ["right", "left"]}),
        ],
    },
    {
        zigbeeModel: ["SOCKET/OUTLET/2"],
        model: "EKO09738",
        vendor: "Schneider Electric",
        description: "Zigbee smart socket with power meter",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
            e.current(),
            e.voltage(),
        ],
        whiteLabel: [{vendor: "Elko", model: "EKO09738", description: "SmartStikk"}],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ["SOCKET/OUTLET/1"],
        model: "EKO09716",
        vendor: "Schneider Electric",
        description: "Zigbee smart socket with power meter",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
            e.current(),
            e.voltage(),
        ],
        extend: [socketIndicatorMode()],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]);
            await reporting.readMeteringMultiplierDivisor(endpoint);
        },
    },
    {
        zigbeeModel: ["LK/OUTLET/1"],
        model: "545D6115",
        vendor: "Schneider Electric",
        description: "LK FUGA wiser wireless socket outlet",
        fromZigbee: [fz.on_off, fz.electrical_measurement, fz.EKO09738_metering, fz.power_on_behavior],
        toZigbee: [tz.on_off, tz.power_on_behavior],
        exposes: [
            e.switch(),
            e.power(),
            e.energy(),
            e.current(),
            e.voltage(),
            e.enum("power_on_behavior", ea.ALL, ["off", "previous", "on"]).withDescription("Controls the behaviour when the device is powered on"),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(6);
            await reporting.bind(endpoint, coordinatorEndpoint, ["genOnOff", "haElectricalMeasurement", "seMetering"]);
            await reporting.onOff(endpoint);
            // Unit supports acVoltage and acCurrent, but only acCurrent divisor/multiplier can be read
            await endpoint.read("haElectricalMeasurement", ["acCurrentDivisor", "acCurrentMultiplier"]);
            await reporting.readMeteringMultiplierDivisor(endpoint);
            await reporting.currentSummDelivered(endpoint, {min: 60, change: 1});
        },
    },
    {
        zigbeeModel: ["EVSCKT/OUTLET/1"],
        model: "MUR36014",
        vendor: "Schneider Electric",
        description: "Mureva EVlink Smart socket outlet",
        extend: [m.onOff({powerOnBehavior: true}), m.electricityMeter()],
    },
    {
        zigbeeModel: ["NHMOTION/SWITCH/1"],
        model: "NH3526",
        vendor: "Schneider Electric",
        description: "Motion sensor with switch",
        extend: [
            m.onOff({
                powerOnBehavior: false,
                configureReporting: true,
            }),
            m.illuminance(),
            m.occupancy({
                pirConfig: ["otu_delay"],
            }),
            schneiderElectricExtend.addOccupancyConfigurationCluster(),
            schneiderElectricExtend.occupancyConfiguration(),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO06988"},
            {vendor: "Elko", model: "EKO06989"},
            {vendor: "Elko", model: "EKO06990"},
            {vendor: "Elko", model: "EKO06991"},
            {vendor: "LK", model: "545D6306"},
        ],
    },
    {
        zigbeeModel: ["CCT595011_AS"],
        model: "CCT595011",
        vendor: "Schneider Electric",
        description: "Wiser motion sensor",
        fromZigbee: [fz.battery, fz.ias_enroll, fz.ias_occupancy_only_alarm_2],
        toZigbee: [],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint = device.getEndpoint(1);
            const binds = ["genPowerCfg"];
            await reporting.bind(endpoint, coordinatorEndpoint, binds);
            await reporting.batteryPercentageRemaining(endpoint);
        },
        exposes: [e.battery(), e.occupancy()],
        extend: [m.illuminance()],
    },
    {
        zigbeeModel: ["CH/Socket/2"],
        model: "3025CSGZ",
        vendor: "Schneider Electric",
        description: "Dual connected smart socket",
        ota: true,
        extend: [m.deviceEndpoints({endpoints: {l1: 1, l2: 2}}), m.onOff({endpointNames: ["l1", "l2"]})],
    },
    {
        zigbeeModel: ["CCT592011_AS"],
        model: "CCT592011",
        vendor: "Schneider Electric",
        description: "Wiser water leakage sensor",
        fromZigbee: [fz.ias_water_leak_alarm_1],
        toZigbee: [],
        exposes: [e.battery_low(), e.water_leak(), e.tamper()],
    },
    {
        fingerprint: [{modelID: "GreenPower_254", ieeeAddr: /^0x00000000e.......$/}],
        model: "A9MEM1570",
        vendor: "Schneider Electric",
        description: "PowerTag power sensor",
        fromZigbee: [fzLocal.schneider_powertag],
        toZigbee: [],
        exposes: [
            e.power(),
            e.power_apparent(),
            e.numeric("power_phase_a", ea.STATE).withUnit("W").withDescription("Instantaneous measured power on phase A"),
            e.numeric("power_phase_b", ea.STATE).withUnit("W").withDescription("Instantaneous measured power on phase B"),
            e.numeric("power_phase_c", ea.STATE).withUnit("W").withDescription("Instantaneous measured power on phase C"),
            e.power_factor(),
            e.energy(),
            e.numeric("energy_phase_a", ea.STATE).withUnit("kWh").withDescription("Sum of consumed energy on phase A"),
            e.numeric("energy_phase_b", ea.STATE).withUnit("kWh").withDescription("Sum of consumed energy on phase B"),
            e.numeric("energy_phase_c", ea.STATE).withUnit("kWh").withDescription("Sum of consumed energy on phase C"),
            e.ac_frequency(),
            e.numeric("voltage_phase_a", ea.STATE).withUnit("V").withDescription("Measured electrical potential value on phase A"),
            e.numeric("voltage_phase_b", ea.STATE).withUnit("V").withDescription("Measured electrical potential value on phase B"),
            e.numeric("voltage_phase_c", ea.STATE).withUnit("V").withDescription("Measured electrical potential value on phase C"),
            e.numeric("voltage_phase_ab", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase A and B"),
            e.numeric("voltage_phase_bc", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase B and C"),
            e.numeric("voltage_phase_ca", ea.STATE).withUnit("V").withDescription("Measured electrical potential value between phase C and A"),
            e.numeric("current_phase_a", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase A"),
            e.numeric("current_phase_b", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase B"),
            e.numeric("current_phase_c", ea.STATE).withUnit("A").withDescription("Instantaneous measured electrical current on phase C"),
        ],
    },
    {
        zigbeeModel: ["W599001", "W599501", "755WSA"],
        model: "W599001",
        vendor: "Schneider Electric",
        description: "Wiser smoke alarm",
        extend: [
            m.battery({voltage: true, voltageReporting: true}),
            m.temperature(),
            m.iasZoneAlarm({
                zoneType: "smoke",
                zoneAttributes: ["alarm_1", "tamper", "battery_low", "test"],
                zoneStatusReporting: true,
                manufacturerZoneAttributes: [
                    {
                        bit: 1,
                        name: "heat",
                        valueOn: true,
                        valueOff: false,
                        description: "Indicates whether the device has detected high temperature",
                    },
                    {
                        bit: 11,
                        name: "hush",
                        valueOn: true,
                        valueOff: false,
                        description: "Indicates whether the device is in hush mode",
                        entityCategory: "diagnostic",
                    },
                ],
            }),
        ],
        whiteLabel: [
            {vendor: "Schneider Electric", model: "W599501", description: "Wiser smoke alarm", fingerprint: [{modelID: "W599501"}]},
            {vendor: "Schneider Electric", model: "755WSA", description: "Clipsal Wiser smoke alarm", fingerprint: [{modelID: "755WSA"}]},
        ],
    },
    {
        zigbeeModel: ["CCT591011_AS"],
        model: "CCT591011_AS",
        vendor: "Schneider Electric",
        description: "Wiser window/door sensor",
        fromZigbee: [fz.ias_contact_alarm_1, fz.ias_contact_alarm_1_report],
        toZigbee: [],
        exposes: [e.battery_low(), e.contact(), e.tamper()],
    },
    {
        zigbeeModel: ["EKO07259"],
        model: "EKO07259",
        vendor: "Schneider Electric",
        description: "Smart thermostat",
        fromZigbee: [fz.stelpro_thermostat, fz.metering, fz.schneider_pilot_mode, fz.wiser_device_info, fz.hvac_user_interface],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_pilot_mode,
            tz.schneider_thermostat_keypad_lockout,
            tz.thermostat_temperature_display_mode,
        ],
        exposes: [
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e.enum("schneider_pilot_mode", ea.ALL, ["contactor", "pilot"]).withDescription("Controls piloting mode"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"])
                .withPiHeatingDemand(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["seMetering"]);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout", "tempDisplayMode"]);
        },
    },
    {
        zigbeeModel: ["WDE002497"],
        model: "WDE002497",
        vendor: "Schneider Electric",
        description: "Smart thermostat",
        fromZigbee: [fz.stelpro_thermostat, fz.metering, fz.schneider_pilot_mode, fz.wiser_device_info, fz.hvac_user_interface, fz.temperature],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_pilot_mode,
            tz.schneider_thermostat_keypad_lockout,
            tz.thermostat_temperature_display_mode,
        ],
        exposes: [
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e.enum("schneider_pilot_mode", ea.ALL, ["contactor", "pilot"]).withDescription("Controls piloting mode"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"])
                .withPiHeatingDemand(),
            e.temperature(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            await reporting.temperature(endpoint2);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout", "tempDisplayMode"]);
        },
    },
    {
        zigbeeModel: ["WDE011680"],
        model: "WDE011680",
        vendor: "Schneider Electric",
        description: "Smart thermostat",
        fromZigbee: [fz.stelpro_thermostat, fz.metering, fz.schneider_pilot_mode, fz.wiser_device_info, fz.hvac_user_interface, fz.temperature],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_running_state,
            tz.thermostat_local_temperature,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_pilot_mode,
            tz.schneider_thermostat_keypad_lockout,
            tz.thermostat_temperature_display_mode,
        ],
        exposes: [
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e.enum("schneider_pilot_mode", ea.ALL, ["contactor", "pilot"]).withDescription("Controls piloting mode"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat"])
                .withRunningState(["idle", "heat"])
                .withPiHeatingDemand(),
            e.temperature(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.bind(endpoint2, coordinatorEndpoint, ["msTemperatureMeasurement"]);
            await reporting.temperature(endpoint2);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout", "tempDisplayMode"]);
        },
    },
    {
        zigbeeModel: ["2GANG/ESWITCH/2"],
        model: "MEG5126-0300_MEG5152-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5152 switch insert (2fold) with Merten System M push button (2fold)",
        extend: [
            m.deviceEndpoints({endpoints: {left: 1, right: 2, left_sw: 21, right_sw: 22}}),
            m.identify(),
            m.onOff({powerOnBehavior: false, endpointNames: ["left", "right"]}),
            m.commandsOnOff({endpointNames: ["left_sw", "right_sw"]}),
        ],
    },
    {
        zigbeeModel: ["1GANG/SWITCH/2"],
        model: "MEG5116-0300_MEG5162-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5162 switch insert (2fold) with Merten System M push button (1fold)",
        extend: [
            m.deviceEndpoints({endpoints: {left: 1, right: 2, left_sw: 21}}),
            m.identify(),
            m.onOff({powerOnBehavior: false, endpointNames: ["left", "right"]}),
            m.commandsOnOff({endpointNames: ["left_sw"]}),
        ],
    },
    {
        zigbeeModel: ["1GANG/ESWITCH/1"],
        model: "MEG5116-0300_MEG5151-0000",
        vendor: "Schneider Electric",
        description: "Merten MEG5151 switch insert with Merten System M push button (1fold)",
        extend: [
            m.deviceEndpoints({endpoints: {switch: 1, switch_sw: 21}}),
            m.identify(),
            m.onOff({powerOnBehavior: false}),
            m.commandsOnOff({endpointNames: ["switch_sw"]}),
        ],
    },
    {
        zigbeeModel: ["E8331DST300ZB"],
        model: "E8331DST300ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 1G dimmer switch",
        extend: [
            m.light({effect: false, color: false, powerOnBehavior: false, configureReporting: true}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8332DST350ZB"],
        model: "E8332DST350ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G dimmer switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            m.light({
                endpointNames: ["l1", "l2"],
                effect: false,
                color: false,
                powerOnBehavior: false,
                configureReporting: true,
            }),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.ENUM8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([2, 0, 3, 1]),
        ],
    },
    {
        zigbeeModel: ["E8331SRY800ZB"],
        model: "E8331SRY800ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 1G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10}}),
            m.onOff({endpointNames: ["l1"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["A3N31SR800ZB_xx_C1"],
        model: "E8331SRY800ZB_NEW",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 1G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10}}),
            m.onOff({endpointNames: ["l1"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8332SRY800ZB"],
        model: "E8332SRY800ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            m.onOff({endpointNames: ["l1", "l2"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["A3N32SR800ZB_xx_C1"],
        model: "E8332SRY800ZB_NEW",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            m.onOff({endpointNames: ["l1", "l2"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8333SRY800ZB"],
        model: "E8333SRY800ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 3G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11, l3: 12}}),
            m.onOff({endpointNames: ["l1", "l2", "l3"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["A3N33SR800ZB_xx_C1"],
        model: "E8333SRY800ZB_NEW",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 3G onoff switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11, l3: 12}}),
            m.onOff({endpointNames: ["l1", "l2", "l3"], powerOnBehavior: false}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
        ],
    },
    {
        zigbeeModel: ["E8332SCN300ZB"],
        model: "E8332SCN300ZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 2G curtain switch",
        extend: [
            m.deviceEndpoints({endpoints: {l1: 10, l2: 11}}),
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaIndicatorMode([0, 1, 2, 3]),
            schneiderElectricExtend.visaWiserCurtain(["l1", "l2"]),
            schneiderElectricExtend.visaConfigMotorType(1),
            schneiderElectricExtend.visaConfigMotorType(2),
            schneiderElectricExtend.visaConfigCurtainStatus(1),
            schneiderElectricExtend.visaConfigCurtainStatus(2),
        ],
    },
    {
        zigbeeModel: ["E8334RWMZB"],
        model: "E8334RWMZB",
        vendor: "Schneider Electric",
        description: "Wiser AvatarOn 4K Freelocate",
        extend: [
            schneiderElectricExtend.addVisaConfigurationCluster(Zcl.DataType.UINT8),
            schneiderElectricExtend.visaConfigIndicatorLuminanceLevel(),
            schneiderElectricExtend.visaConfigIndicatorColor(),
            schneiderElectricExtend.visaKeyEventNotification("1"),
            schneiderElectricExtend.visaKeyEventNotification("2"),
            schneiderElectricExtend.visaKeyEventNotification("3"),
            schneiderElectricExtend.visaKeyEventNotification("4"),
        ],
    },
    {
        zigbeeModel: ["NHMOTION/DIMMER/1"],
        model: "NH3527A",
        vendor: "Schneider Electric",
        description: "Motion sensor with dimmer",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: false,
                color: false,
                configureReporting: true,
                levelConfig: {features: ["on_level", "current_level_startup"]},
            }),
            m.lightingBallast(),
            m.illuminance(),
            m.occupancy({
                pirConfig: ["otu_delay"],
            }),
            schneiderElectricExtend.addOccupancyConfigurationCluster(),
            schneiderElectricExtend.occupancyConfiguration(),
            schneiderElectricExtend.dimmingMode(),
        ],
        whiteLabel: [
            {vendor: "Elko", model: "EKO07250"},
            {vendor: "Elko", model: "EKO07251"},
            {vendor: "Elko", model: "EKO07252"},
            {vendor: "Elko", model: "EKO07253"},
            {vendor: "Elko", model: "EKO30199"},
            {vendor: "Exxact", model: "WDE002962"},
            {vendor: "Exxact", model: "WDE003962"},
        ],
    },
    {
        zigbeeModel: ["NHMOTION/UNIDIM/1"],
        model: "NHMOTION/UNIDIM/1",
        vendor: "Schneider Electric",
        description: "Motion sensor with dimmer",
        extend: [
            m.light({
                effect: false,
                powerOnBehavior: false,
                color: false,
                configureReporting: true,
                levelConfig: {
                    features: ["on_level", "current_level_startup"],
                },
            }),
            m.lightingBallast(),
            m.illuminance(),
            m.occupancy({
                pirConfig: ["otu_delay"],
            }),
            schneiderElectricExtend.addOccupancyConfigurationCluster(),
            schneiderElectricExtend.occupancyConfiguration(),
            schneiderElectricExtend.dimmingMode(),
        ],
        whiteLabel: [
            {vendor: "ELKO", model: "EKO06984", description: "SmartPir with push dimmer"},
            {vendor: "ELKO", model: "EKO06985", description: "SmartPir with push dimmer"},
            {vendor: "ELKO", model: "EKO06986", description: "SmartPir with push dimmer"},
        ],
    },
    {
        zigbeeModel: ["S520619"],
        model: "S520619",
        vendor: "Schneider Electric",
        description: "Wiser Odace Smart thermostat",
        fromZigbee: [
            fz.stelpro_thermostat,
            fz.metering,
            fz.schneider_pilot_mode,
            fz.wiser_device_info,
            fz.hvac_user_interface,
            fz.temperature,
            fz.occupancy,
        ],
        toZigbee: [
            tz.thermostat_occupied_heating_setpoint,
            tz.thermostat_system_mode,
            tz.thermostat_local_temperature,
            tz.thermostat_control_sequence_of_operation,
            tz.schneider_pilot_mode,
            tz.schneider_thermostat_keypad_lockout,
            tz.thermostat_temperature_display_mode,
        ],
        exposes: [
            e.binary("keypad_lockout", ea.STATE_SET, "lock1", "unlock").withDescription("Enables/disables physical input on the device"),
            e.enum("schneider_pilot_mode", ea.ALL, ["contactor", "pilot"]).withDescription("Controls piloting mode"),
            e
                .enum("temperature_display_mode", ea.ALL, ["celsius", "fahrenheit"])
                .withDescription("The temperature format displayed on the thermostat screen"),
            e
                .climate()
                .withSetpoint("occupied_heating_setpoint", 4, 30, 0.5)
                .withLocalTemperature()
                .withSystemMode(["off", "heat", "cool"])
                .withPiHeatingDemand(),
            e.temperature(),
            e.occupancy(),
        ],
        configure: async (device, coordinatorEndpoint) => {
            const endpoint1 = device.getEndpoint(1);
            const endpoint2 = device.getEndpoint(2);
            const endpoint4 = device.getEndpoint(4);
            await reporting.bind(endpoint1, coordinatorEndpoint, ["hvacThermostat"]);
            await reporting.thermostatPIHeatingDemand(endpoint1);
            await reporting.thermostatOccupiedHeatingSetpoint(endpoint1);
            await reporting.temperature(endpoint2);
            await endpoint1.read("hvacUserInterfaceCfg", ["keypadLockout", "tempDisplayMode"]);
            await reporting.bind(endpoint4, coordinatorEndpoint, ["msOccupancySensing"]);
            await reporting.thermostatOccupancy(endpoint4);
        },
        options: [exposes.options.measurement_poll_interval()],
        onEvent: (type, data, device, options) => {
            const endpoint = device.getEndpoint(1);
            const poll = async () => {
                await endpoint.read("hvacThermostat", ["occupiedHeatingSetpoint"]);
            };
            utils.onEventPoll(type, data, device, options, "measurement", 20, poll);
        },
    },
];
