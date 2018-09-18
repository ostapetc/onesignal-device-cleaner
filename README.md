# Onesignal device cleaner
Tool for deleting devices in the onesignal.com

### Usage
Exports device ids to file that have been inactive for more than 365 days.

```
node ./src/export.js --appId 1 --restKey ZTc4 --days 365 --targetFile=/tmp/devices-to-delete.txt
```

Deletes devices in the file --targetFile=/tmp/devices-to-delete.txt

```
node src/delete.js --appId 1 --email=your@mail.com --password=p1 --targetFile=/tmp/devices-to-delete.txt
```

### Disclaimer
This tool is provided as-is, use at your own risk!
