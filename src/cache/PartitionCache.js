const SystemCache = require('./SystemCache');

// This cache holds partitions which are store in their own system table.
// Each partition also has a raft group, which is stored in the raftgroups table.
module.exports = class PartitionCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData, SystemCache.PARTITION_CACHE);  
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

    addItem(partitionGroup) {
        // insert a new record of the node in the db 
        const sqlStatement = `INSERT INTO ${this.tableName} (id, tableId, members, parentPartition, childPartitions, spanStart, spanEnd) VALUES ('${partitionGroup.id}', '${partitionGroup.tableId}', , '${partitionGroup.members}' , '${partitionGroup.parentPartition}', '${partitionGroup.childPartitions}', ${partitionGroup.spanStart}, ${partitionGroup.spanEnd})`;        
        return this.run(sqlStatement);
    }
}