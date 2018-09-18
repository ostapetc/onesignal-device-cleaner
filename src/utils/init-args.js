const fs           = require('fs');
const commandArgs  = require('command-line-args');
const commandUsage = require('command-line-usage');

function initArgs(params) {
    let args;

    try {
        args = commandArgs(params.args);
    } catch (e) {
        console.error(`Error: ${e.message}`);
        printHelpInfo(params.help);
        process.exit(1);
        return;
    }

    if (args.help) {
        printHelpInfo(params.help);
        process.exit(0);
    }

    validate(args, params);

    return args;
}

function validate(args, params) {
    for (let definition of params.args) {
        if (definition.required && args[definition.name] == null) {
            console.error(`Error: missing required argument --${definition.name}. See help command.`);
            process.exit(1);
        }

        if (params.fileArgs !== undefined && params.fileArgs.indexOf(definition.name)) {
            const exist = fs.existsSync(args[definition.name]);

            if (!exist) {
                console.error(`Error: file does not exist ${args[definition.name]}`);
                process.exit(1);
            }
        }
    }
}
function printHelpInfo(config) {
    console.log(commandUsage(config));
}

module.exports = initArgs;