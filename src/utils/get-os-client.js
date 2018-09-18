const OneSignal = require('onesignal-node');

function getOsClient(appId, restKey) {
    const client = new OneSignal.Client({
        userAuthKey: 'XXXXXX',
        app: { appAuthKey: restKey, appId: appId }
    });

    client.viewDevicesSync = function(query) {
        return new Promise((resolve, reject) => {
            this.viewDevices(query, function (error, response, data) {
                if (error != null) {
                    reject(error);
                    return;
                }

                data = JSON.parse(data);
                resolve(data);
            });
        });
    }

    client.addDeviceSync = function (data) {
        return new Promise((resolve, reject) => {
            this.addDevice(data, function (error, response, data) {
                if (error != null) {
                    reject(error);
                    return;
                }

                resolve(data);
            });
        })
    }

    client.editDeviceSync = function(id, data) {
        return new Promise((resolve, reject) => {
            this.editDevice(id, data, function (error, response, data) {
                if (error != null) {
                    reject(error);
                    return;
                }

                resolve(data);
            });
        });
    }

    return client;
}

module.exports = getOsClient;