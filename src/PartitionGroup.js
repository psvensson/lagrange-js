const { Parser } = require('node-sql-parser');

const RaftGroup = require('./RaftGroup');
const logger = require('./logger');

// The PartitionGroup represents a partition or shard of a syetm table. Each system table will have just one partition to start with (ordered by the primary key).
// As configurable thresholds are reached, a partition is split into two new ones. each partition knows about its parent and children.

// The sql table created in this raftgroup will be that of the original system table, but will only contain the rows that belong to this partition.
// Services that access the system table will analyze the sql statement WHERE caluse to understand which partition to access.
// Any additional index for the system table need to be stored in its own system table (and partition(s)).
// When looking up the partition for a WHERE clause, there ned to be an index already created for the property of the WHERE clause. The value of the WHERE clause ('like 'WHERE id = 123') will be used to find the partition.

module.exports = class PartitionGroup extends RaftGroup{

    type = 'PartitionGroup';

    static create(partitionDefinition){
        // Create a new partition group
    }   

    // Constructor for PartitionGroup
    constructor(partitionImplementation) {
        super(raftGroupImplementation);
    }

    // Execute a query on the partition group
    async executeQuery(query){
        return this.partitionImplementation.executeQuery(query);
    }

    // Close the partition group
    close(){
        super.close();
        this.partitionImplementation.close();
    }
}