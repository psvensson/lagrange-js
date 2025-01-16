const uuids = require('uuid');

// THe raftgroups are stored in their own system table.
module.exports = class RaftGroup {

    raftImplementation = null;
    // Interval to handle raft group housekeeping
    interval = 5000;    

    constructor(args) {
        this.raftGroupImplementation = args.raftGroupImplementation;
        this.id = args.id || uuids.v4();
        setTimeout(this.houseKeeping, this.interval);
    }

    houseKeeping() {
        throw new Error('RaftGroup::houseKeeping not implemented in subclass ', this);
    }

    async isLeader() {
        // Ask raft impementation if this node is the leader
        const status = await this.raftImplementation.status();
        // Check if status string includes ths substring "leader ok"
        return status.includes("leader ok");
    }

    close() {
        // Close the raft group
        throw new Error('RaftGroup::close not implemented in subclass ', this);
    }
}

