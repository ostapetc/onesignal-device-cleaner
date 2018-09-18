const initArgs    = require('./utils/init-args');
const puppeteer   = require('puppeteer');
const ProgressBar = require('progress');
const fs          = require('fs');

async function createTabs(browser, count) {
    const tabs = [];

    for (let i = 0; i < count; i++) {
        const page = await browser.newPage();

        page.on('dialog', async dialog => {
            await dialog.accept();
        });

        tabs.push({page: page, locked: false});
    }

    return tabs;
}

function getNotActiveDeviceIds(targetFile) {
    let deviceIds = new Set(fs.readFileSync(targetFile).toString().split('\n'));
    return Array.from(deviceIds);
}

function getNextDeviceId(deviceIds) {
    if (this.index == null) {
        this.index = 0;
    } else {
        this.index++;
    }

    return deviceIds[index];
}

async function exit(intervals, browser) {
    for (let interval of intervals) {
        if (interval != null) {
            clearInterval(interval);
        }
    }

    console.log('Finished.');

    await browser.close();
    process.exit(0);
}

function getDevicePageUrl(appId, deviceId) {
    return `https://onesignal.com/apps/${appId}/players?utf8=✓&user_search[id]=${deviceId}&commit=Filter`;
}

async function login(page, args) {
    console.log('Authentication...');

    await page.goto('https://onesignal.com');

    await page.click('#navigation-bar > div > ul > li:nth-child(5) > a');
    await page.waitFor(1000);

    await page.type('#user_email', args['email']);
    await page.type('#user_password', args['password']);

    await page.click('#login-form button.go-button');
    await page.waitFor(5000);

    const title = await page.evaluate(() => {
        return document.querySelector('h1').textContent.trim();
    });

    if (title !== 'All Applications') {
        console.error('Authentication failed');
        process.exit(1);
    }
}

async function deleteDevice(page, appId, devId) {
    try {
        let url = getDevicePageUrl(appId, devId);

        await page.goto(url);
        await page.click('#dropdownMenu1');
        await page.click('#players ul.dropdown-menu a[data-method=delete]');
    } catch(error) {
        console.log(error.name);
    }
}

function startWorkers(browser, tabs, bar, appId, deviceIds) {
    let intervals = [];

    for (let i = 0; i < tabs.length; i++) {
        const interval = setInterval(async ()  => {
            if (tabs[i].locked) {
                return;
            }

            let deviceId = getNextDeviceId(deviceIds);

            if (deviceId == null) {
                exit(intervals, browser);
            } else {
                tabs[i].locked = true;

                await deleteDevice(tabs[i].page, appId, deviceId);
                fs.appendFileSync('./tmp/deleted_devices.txt', deviceId + '\n');

                tabs[i].locked = false;

                if (!bar.complete) {
                    bar.tick();
                }
            }
        }, 1000);

        intervals.push(interval);
    }
}

function init() {
    return initArgs({
        args: [
            { name: 'help', alias: 'h', type: Boolean },
            { name: 'appId', alias: 'a', type: String, required: true },
            { name: 'email', alias: 'u', type: String, required: true },
            { name: 'password', alias: 'p', type: String, required: true },
            { name: 'targetFile', alias: 't', type: String, required: true },
            { name: 'concurrency', alias: 'c', type: Number, defaultOption: true, defaultValue: 1 },
            { name: 'browser', alias: 'b', type: Boolean}
        ],
        help: [
            {
                header  : 'Onesignal device cleaner',
                content : 'Deletes outdated devices'
            },
            {
                header: 'Options',
                optionList: [
                    {
                        name: 'email -u',
                        description: 'onesignal.com email.'
                    },
                    {
                        name: 'password -p',
                        description: 'onesignal.com password.'
                    },
                    {
                        name: 'appId -a',
                        description: 'onesignal.com application id.'
                    },
                    {
                        name: 'targetFile -t',
                        description: 'File with ids of device, each id on a new line.'
                    },
                    {
                        name: 'concurrency -c',
                        description: 'Number of multiple requests to perform at a time. Default is one request at a time'
                    },
                    {
                        name: 'browser -b',
                        description: 'Launches a full version of Chromium'
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

async function main() {
    const args = await init();

    const deviceIds = getNotActiveDeviceIds(args.targetFile);

    if (deviceIds.length === 0) {
        console.log('There are no devices to delete');
        process.exit(0);
    }

    console.log(`Going to delete ${deviceIds.length} devices`);

    const browser = await puppeteer.launch({ headless: !args.browser });

    const page = await browser.newPage();
    await page.setViewport({width: 1024, height: 768});

    await login(page, args);
    await page.close();

    let tabs = await createTabs(browser, args.concurrency);
    let bar  = new ProgressBar('Deleting devices [:bar] :current/:total :rate/bps :percent :etas', {
        total: deviceIds.length,
        width: 90
    });

    startWorkers(browser, tabs,  bar, args.appId, deviceIds);
}

main();










