
// A partition does not know if it is being used to store table data or an index to a table
module.exports = class Partition {
    // parentPartition (if given) is the parent that this partition is one of the sibling of (in the partition BSP tree)
    // raftGroup is an array of 'tcp://' urls for the members (coming or existing) of the raft group in the node-zmq-raft format.
    constructor(partitionInfo) {
       this.parentPartitionId = partitionInfo.parentPartitionId;
       this.raftGroup = partitionInfo.raftGroup;
    }   
}