const makeEnums = require('../DoNotCreateAFileCalledUtils').makeEnums

const NODE_STATE = makeEnums(['CONNECTING', 'CONNECTED', 'STOPPING', 'STOPPED', 'INITIALIZE_START', 'INITIALIZE_FINISH'])

module.exports = class nodeInfo {
    constructor(nodeInfo) {
        super(nodeInfo)
        this.addresses = nodeInfo.addresses;
        this.state = nodeInfo.state || NODE_STATE.INITIALIZE_START;        
    }
}   