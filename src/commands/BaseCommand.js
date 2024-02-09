const uuids = require('uuid')
const makeEnums = require('../DoNotCreateAFileCalledUtils').makeEnums

const COMMANDS = makeEnums(['MOCK', 'INITIAL_CONNECT', 'REPLY', 'CREATE_REPLICA', 'DELETE_REPLICA', 'INITIAL_CONNECT', 'REPLY'])

module.exports = {

    createCommand: (commandName, data) => {
        return {
            requestId: uuids.v4(),
            commandName: commandName,
            data: data
        }
    }
    ,
    COMMANDS
}
