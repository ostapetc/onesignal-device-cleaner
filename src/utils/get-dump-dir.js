const pathUtil = require('path');

function getDumpDir() {
    return pathUtil.resolve(pathUtil.dirname(require.main.filename) + '/../tmp');
}

module.exports = getDumpDir;