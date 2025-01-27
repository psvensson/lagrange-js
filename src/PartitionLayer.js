

// Overview:
// The PartitionLayer  is a service which receives commands from any other service in the system which need to run queries
// on thhis specific partition of a table. The partition layer will then execute the query on the partition and return the result.

// Description:


module.exports = class PartitionLayer {

    constructor(partitionGroup, transportLayer) {
        this.partitionGroup = partitionGroup;
        this.transportLayer = transportLayer;
        
    }
}