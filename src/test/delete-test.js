process.env.NODE_ENV = 'test';

const fs          = require('fs')
const chai        = require('chai');
const execSync    = require('child_process').execSync;
const pathUtil    = require('path');
const rootDir     = pathUtil.resolve(__dirname, '../../');
const getOsClient = require('../utils/get-os-client');

require('dotenv').config({ path: pathUtil.join(rootDir, 'src', 'test', '.env') });

const deviceCount = 3;

const should = chai.should();
const expect = chai.expect;

const requireEnv = [
    'ONESIGNAL_APP_ID',
    'ONESIGNAL_EMAIL',
    'ONESIGNAL_PASSWORD',
];

for (const varName of requireEnv) {
    if (!process.env[varName]) {
        console.error(`Missing required env ${varName}`);
        process.exit(1);
    }
}

const targetFile = pathUtil.join('/tmp', 'osc-delete-test.txt');
if (fs.existsSync(targetFile)) {
    fs.unlinkSync(targetFile);
}

const osClient = getOsClient(process.env.ONESIGNAL_APP_ID, process.env.ONESIGNAL_REST_KEY);

describe('Tests delete.js script', () => {
    it('it should delete devices', async () => {
        const ids = await createTestDevices(osClient, deviceCount);
        fs.writeFileSync(targetFile, ids.join("\n"));

        const output = executeDeleteCommand(targetFile);
        console.log(output);

        const osDeviceIds = (await osClient.viewDevicesSync()).players.map(device => device.id);

        for (const id of ids) {
            expect(osDeviceIds).not.include(id);
        }
    });
});

async function createTestDevices(client, count) {
    let ids = [];

    for (let i = 0; i < count; i++) {
        let response = await client.addDeviceSync({
            device_type: 1
        });

        expect(response.success).to.equal(true);
        expect(response.id).to.be.a('string');

        ids.push(response.id);
    }

    return ids;
}

function executeDeleteCommand(targetFile) {
    const command = `node ${rootDir}/src/delete.js -u ${process.env.ONESIGNAL_EMAIL} -p ${process.env.ONESIGNAL_PASSWORD} -a ${process.env.ONESIGNAL_APP_ID} -t ${targetFile}`;
    const output  = execSync(command);

    return output.toString();
}