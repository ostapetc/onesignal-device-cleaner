process.env.NODE_ENV = 'test';

const fs          = require('fs')
const pathUtil    = require('path');
const chai        = require('chai');
const moment      = require('moment');
const execSync    = require('child_process').execSync;
const getOsClient = require('../utils/get-os-client');

const rootDir = pathUtil.resolve(__dirname, '../../');
const srcDir  = pathUtil.join(rootDir, 'src');

require('dotenv').config({ path: pathUtil.join(rootDir, 'src', 'test', '.env') });

const should = chai.should();
const expect = chai.expect;

const requireEnv = [
    'ONESIGNAL_APP_ID',
    'ONESIGNAL_REST_KEY',
];

for (const varName of requireEnv) {
    if (!process.env[varName]) {
        console.error(`Missing required env ${varName}`);
        process.exit(1);
    }
}

const targetFile = pathUtil.join('/tmp', 'osc-export-test.txt');
const osClient = getOsClient(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_REST_KEY);

const tests = [
    {
        devices: [
            {
                deviceKey: '1',
                activeDaysAgo: 1,
                expectInExport: false
            },
            {
                deviceKey: '2',
                activeDaysAgo: 3,
                expectInExport: true,
            },

            {
                deviceKey: '3',
                activeDaysAgo: 5,
                expectInExport: true
            }
        ],
        days: 2
    },
    {
        devices: [
            {
                deviceKey: '1',
                activeDaysAgo: 1,
                expectInExport: false
            },
            {
                deviceKey: '2',
                activeDaysAgo: 3,
                expectInExport: false,
            },

            {
                deviceKey: '3',
                activeDaysAgo: 11,
                expectInExport: true
            }
        ],
        days: 10
    },
    {
        devices: [
            {
                deviceKey: '1',
                activeDaysAgo: 1,
                expectInExport: false
            },
            {
                deviceKey: '2',
                activeDaysAgo: 1,
                expectInExport: false,
            },

            {
                deviceKey: '3',
                activeDaysAgo: 1,
                expectInExport: false
            }
        ],
        days: 2
    }
];

describe('Tests export.js script', () => {
    it('it should export devices to file', async () => {
        const deviceKeyMap = await syncTestDevices(osClient);

        for (let i = 0; i < tests.length; i++) {
            if (fs.existsSync(targetFile)) {
                fs.unlinkSync(targetFile);
            }

            const test = tests[i];
            console.log(`Test case ${i}`);

            await updateDeviceLastActiveDate(osClient, test.devices, deviceKeyMap);

            const output = excuteExportCommand(test.days);
            console.log(output);

            await asserrExportFileValid(test, deviceKeyMap)
        }
    });
});

async function asserrExportFileValid(test, deviceKeyMap) {
    const exist = await fs.existsSync(targetFile);

    const expectedEmpty = test.devices.every(device => !device.expectInExport);
    
    if (expectedEmpty) {
        expect(exist).to.equal(false);
        return;
    }

    const deviceIds = fs.readFileSync(targetFile)
        .toString()
        .split("\n")
        .filter(line => line.length > 0);

    for (const device of test.devices) {
        const deviceId = deviceKeyMap[device.deviceKey];

        if (device.expectInExport) {
            expect(deviceIds).to.include(deviceId);
        } else {
            expect(deviceIds).to.not.include(deviceId);
        }
    }
}

async function syncTestDevices(osClient) {
    const devicesKeys = ['1', '2', '3'];
    const osDevices   = await osClient.viewDevicesSync();
    const devices     = {};

    if (!osDevices.players) {
        throw new Error(`Bad response: ${JSON.stringify(osDevices)}`);
    }

    const errorMsg = 'One signal test application shoud not contains devices/players in database';

    if (osDevices.players.length > devices.length) {
        throw new Error(errorMsg);
    }

    for (const osDevice of osDevices.players) {
        if (osDevice.tags == null || osDevice.tags.key == null || devicesKeys.indexOf(osDevice.tags.key) === -1) {
            throw new Error(errorMsg);
        }

        devices[osDevice.tags.key] = osDevice.id;
    }

    for (const key of devicesKeys) {
        if (devices[key]) {
            continue;
        }

        let response = await osClient.addDeviceSync({
            tags: { key: key },
            device_type: 1
        });

        expect(response.success).to.equal(true);
        expect(response.id).to.be.a('string');

        devices[key] = response.id;
    }

    return devices;
}

async function updateDeviceLastActiveDate(osClient, devices, deviceKeyMap) {
    for (const device of devices) {
        const deviceId   = deviceKeyMap[device.deviceKey];
        const lastActive = moment().subtract(device['activeDaysAgo'], 'days').unix();
        const response   = await osClient.editDeviceSync(deviceId, { last_active: lastActive });

        expect(response.success).to.equal(true);
    }
}

function excuteExportCommand(days) {
    const command = `node ${srcDir}/export.js -a ${process.env.ONESIGNAL_APP_ID} -k ${process.env.ONESIGNAL_REST_KEY} -d ${days} -t ${targetFile}`;
    const output  = execSync(command);

    console.log(command);

    return output.toString();
}