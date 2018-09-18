const fs       = require('fs');
const https    = require('https');
const pathUtil = require('path');

async function downloadDump(url, attempts) {
    const response = await makeRequestAttempts(url, attempts);

    return new Promise((resolve, reject) => {
        if (response == null || response.statusCode !== 200) {
            reject('Unable to download devices dump');
            return;
        }
    
        const filePath = getCsvFilePath();
    
        try {
            const fileStream = initFileStream(filePath);

            response.pipe(fileStream).on('finish', () => {
                resolve(filePath);
            });
        } catch (e) {
            reject(e.message);
        }
    });
}

async function makeRequestAttempts(url, count) {
    for (let i = 1; i <= count; i++) {
        try {
            console.log(`Requesting dump file, attempt #${i}`);    

            const response = await doRequest(url);
    
            if (response.statusCode === 200) {
                return response;
            }
        } catch (e) {
            console.error(`Server error ${e.message}`);    
            return false;
        }

        await sleep(2000);
    }
}

function sleep(ms){
    return new Promise(resolve=>{
        setTimeout(resolve,ms)
    })
}

function doRequest(url) {
    return new Promise((resolve, reject) => {
        let request = https.get(url);

        request.on('response', response => {
            resolve(response);
        });
      
        request.on('error', error => {
            reject(error);
        });
    });
}

function getCsvFilePath() {
    return pathUtil.join('/tmp/devices.csv.gz');
}

function initFileStream(path) {
    const exist = fs.existsSync(path);

    if (exist) {
        fs.unlinkSync(path);
    }

    const fileStream = fs.createWriteStream(path);

    if (!fileStream.writable) {
        throw new Error(`Dir ${fileDir} is not writable`);     
    }

    return fileStream;
}

module.exports = downloadDump;