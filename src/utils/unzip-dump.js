const fs   = require('fs');
const zlib = require('zlib');

async function unzipDump(path) {
    return new Promise((resolve, reject) => {
        const exist = fs.existsSync(path);

        if (!exist) {
            reject('Dump file does not exist');
            return;
        }
        
        let gunzip = zlib.createGunzip().on('error', error => {
            reject(error);
        });

        let csvPath = path.replace('.csv.gz', '.csv');

        let gzipReadStream = fs.createReadStream(path);
        let csvWriteStream = fs.createWriteStream(csvPath);
    
        gzipReadStream.pipe(gunzip).pipe(csvWriteStream);

        csvWriteStream.on('close', () => {
            resolve(csvPath);
        });
    });
}


module.exports = unzipDump;