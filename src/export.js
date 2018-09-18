
const moment       = require('moment');
const fs           = require('fs');
const getOsClient  = require('./utils/get-os-client');
const initArgs     = require('./utils/init-args');
const downloadDump = require('./utils/download-dump');
const unzipDump    = require('./utils/unzip-dump');
const readDump     = require('./utils/read-dump');

function mapKeyToValues(keys, values) {
    let map = {};

    for (let i = 0; i < keys.length; i++) {
        map[keys[i]] = values[i];
    }

    return map;
}

function init() {
    return initArgs({
        args: [
            { name: 'help', alias: 'h', type: Boolean },
            { name: 'appId', alias: 'a', type: String, required: true },
            { name: 'restKey', alias: 'k', type: String, required: true },
            { name: 'days', alias: 'd', type: String, required: true },
            { name: 'targetFile', alias: 't', type: String, required: true }
        ],
        help: [
            {
                header  : 'Onesignal device cleaner',
                content : 'Exports outdated devices'
            },
            {
                header: 'Options',
                optionList: [
                    {
                        name: 'appId -a',
                        description: 'Onesignal.com application id.'
                    },
                    {
                        name: 'restKey -k',
                        description: 'Onesignal.com rest key.'
                    },
                    {
                        name: 'days -d',
                        description: 'Numbers of days to truncate on.'
                    },
                    {
                        name: 'targetFile -t',
                        description: 'File to export device ids .'
                    },
                    {
                        name: 'help',
                        description: 'Print this usage guide.'
                    }
                ]
            }
        ],
        files: ['targetFile']
    });
}

async function getCsvFileUrl(args) {
    let result = await getOsClient(args.appId, args.restKey).csvExport({});

    if (result.httpResponse.statusCode !== 200) {
        console.error(result.httpResponse.body.errors.join("\n"));
        process.exit(1);        
    }

    const csvFileUrl = result.data.csv_file_url;

    if (csvFileUrl == null) {
        console.error(`CSV file url is not found in response`);
        process.exit(1);     
    }

    return csvFileUrl;
}

function createExportFile(args, csvPath) {
    const days = parseInt(args.days);

    let keys;
    let count = 0;

    if (fs.existsSync(args.targetFile)) {
        fs.unlinkSync(args.targetFile);
    }

    const proccess = (row) => {
        if (row[0] === 'id' && keys == null) {
            keys = row;
            return;
        }

        row = mapKeyToValues(keys, row);

        const daysAgo = moment(new Date()).diff(row['last_active'], 'days');

        if (daysAgo >= days) {
            fs.appendFileSync(args.targetFile, row['id'] + "\n");
            count++;
        }
    }

    let finish = () => {
        if (count > 0) {
            console.log(`${count} devices have been exported to ${args.targetFile}`);
        } else {
            console.log('Devices is not found');       
        } 
    }

    readDump(csvPath, proccess, finish);
}

async function main() {
    const args = await init();

    console.log(`Requesting dump url...`);
    const csvFileUrl = await getCsvFileUrl(args);

    console.log(`Downloading dump...`);
    const gzipPath = await downloadDump(csvFileUrl, 10);

    const csvPath = await unzipDump(gzipPath);
    console.log(`Unzipping dump...`);

    createExportFile(args, csvPath);
}

main();

