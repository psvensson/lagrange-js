const logger = require('./logger');
// SUperclass for any actual implementation of Raft with sqlite pasing statements.

module.exports = class RaftImplementation {

    // Join existing raft group, if peerAddresses is non-null and non-empty
    constructor(raftNodeAddress, peerAddresses) {

    }

    removeFromGroup() {
        // Remove this node from the raft group
    }

    executeQuery(query){

    }

    status(){
        // Return raft group status in the rqlite /readyz endpoint format

    }
}   