const BaseCommand = require("../../src/commands/BaseCommand");

module.exports = class MockCommand extends BaseCommand {
    constructor(data) {
        super(data);
    }
}