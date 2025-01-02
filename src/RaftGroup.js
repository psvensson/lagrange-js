

module.exports = class RaftGroup {

    raftImplementation = null;
    // Interval to handle raft group housekeeping
    interval = 5000;    

    constructor(raftImplementation) {
        this.raftGroupImplementation = raftImplementation;
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

