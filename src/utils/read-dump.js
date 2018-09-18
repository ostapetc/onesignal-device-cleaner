const fs    = require('fs');
const parse = require('csv-parse');

function readDump(path, proccess, finish) {
    fs.createReadStream(path).pipe(parse({ delimiter: ',' })).on('data', row => {
        proccess(row);
    }).on('end',() => {
        finish();
    });
}

module.exports = readDump;