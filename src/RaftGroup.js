const uuids = require('uuid');

const logger = require('./logger');

// THe raftgroups are stored in their own system table.
module.exports = class RaftGroup {

    raftGroupImplementation = null;
    // Interval to handle raft group housekeeping
    interval = 5000;    

    constructor(args) {
        if(!args.members || args.members.length === 0){
            throw new Error('RaftGroup::constructor: No members in raft group');
        }
        this.raftGroupImplementation = args.raftGroupImplementation;
        this.id = args.id || uuids.v4();
        this.members = args.members;
        this.timer = setTimeout(this.houseKeeping, this.interval);
    }

    houseKeeping() {
        throw new Error('RaftGroup::houseKeeping not implemented in subclass ', this);
    }

    async isLeader() {
        // Ask raft impementation if this node is the leader
        const status = await this.raftGroupImplementation.status();
        // Check if status string includes ths substring "leader ok"
        return status.includes("leader ok");
    }

    close() {
        // cancel settimeout
        clearTimeout(this.timer);
        
    }
}

