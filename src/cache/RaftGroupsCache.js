const SystemCache = require('./SystemCache');
const logger = require('../logger');

// This is a cache for all known raft groups, message groups, partitions or future use cases
module.exports = class RaftGroupsCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData, SystemCache.RAFT_GROUPS_CACHE);
    }

    getTableName() {
        return 'raftgroups';
    }

    // members is acomma-separated list of node ids
    createTable() {
        const sqlStatement = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY, 
                type TEXT,
                members TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_type ON ${this.tableName} (type);
        `;
        // Create table using sqlite API and the this.db object
        this.db.exec(sqlStatement);
    }    

    addItem(raftGroup) {
        logger.log('RaftGroupsCache::addRaftGroup raftGroup: '+raftGroup.type)
        logger.dir(raftGroup)
        // INsert a new record of the raft group in the db and then call updateSystem
        const sqlStatement = `INSERT INTO ${this.tableName} (id, type, members) VALUES ('${raftGroup.id}', '${raftGroup.type}', '${raftGroup.members}')`;
        return this.run(sqlStatement)
    }
}