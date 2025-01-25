const SystemCache = require('./SystemCache');

// This cache holds partitions which are store in their own system table.
// Each partition also has a raft group, which is stored in the raftgroups table.
module.exports = class PartitionCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData);
        this.cacheName = SystemCache.CODE_CACHE;    
    }

    getTableName() {
        return 'partitiongroup';
    }

    createTable() {
        const sqlStatement = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                id TEXT PRIMARY KEY, 
                tableId TEXT,
                members TEXT,
                parentPartition TEXT,
                childPartitions TEXT,
                spanStart NUMBER,
                spanEnd NUMBER
            );
            CREATE INDEX IF NOT EXISTS idx_tabelId ON ${this.tableName} (tableId);
            CREATE INDEX IF NOT EXISTS idx_parentPartition ON ${this.tableName} (parentPartition;
        `;
        // Create table using sqlite API and the this.db object
        this.db.exec(sqlStatement);
    }

    async insertInitialData(initialData) {
        // The initialData format is the same as the output from the sqlite3 all() function call, just an array of rows
        // The call looks like this that produced the data;        
        await Promise.all(initialData.map(row => this.addPartitionGroup(row)));
    }

    addCPartitionGroup(partitionGroup) {
        // insert a new record of the node in the db 
        const sqlStatement = `INSERT INTO ${this.tableName} (id, tableId, members, parentPartition, childPartitions, spanStart, spanEnd) VALUES ('${partitionGroup.id}', '${partitionGroup.tableId}', , '${partitionGroup.members}' , '${partitionGroup.parentPartition}', '${partitionGroup.childPartitions}', ${partitionGroup.spanStart}, ${partitionGroup.spanEnd})`;        
        return this.run(sqlStatement);
    }
}