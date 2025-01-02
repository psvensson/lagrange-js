const SystemCache = require('./SystemCache');

module.exports = class RaftGroupsCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData);
        this.cacheName = 'RaftGroupsCache';       
    }

    addRaftGroup(raftGroup) {
        this.set(raftGroup.id, raftGroup);
    }
}