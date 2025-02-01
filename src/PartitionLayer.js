

// Overview:
// The PartitionLayer  is a service which receives commands from any other service in the system which need to run queries
// on this specific partition of a table. The partition layer will then execute the query on the partition and return the result.

// Description:
// This class connects to the messaging layer to receive queries. It is repsonsible foor mnaaging live queries and for partition maintanance.
// Live queries are registered by sending a message tthrough the message layer to the partition layer. The partition layer remember the live query registration and when
// otehr queries result in modification of data, it will find out which live queries it affects and send updates to the subscribers using the message layaer again.

// So the partition logic is split into an upper and lower half - this upper half which interacts with the rest of the system is the only point of connection to the
// lower part (the PartitionGroup class) which implements the actual raft group replication and storage of data.

module.exports = class PartitionLayer {

    static PARTITION_QUERY = 'PARTITION_QUERY';
    static PARTITION_REGISTER_LIVE_QUERY = 'PARTITION_REGISTER_LIVE_QUERY';
    static PARTITION_DEREGISTER_LIVE_QUERY = 'PARTITION_DEREGISTER_LIVE_QUERY';

    constructor(partitionGroup, messageLayer) {
        this.partitionGroup = partitionGroup;
        this.messageLayer = messageLayer;

        this.createLiveQuerySusbcriberTable();
        
        this.messageLayer.listenFor(PartitionLayer.PARTITION_QUERY, this.handlePartitionQuery.bind(this));
        this.messageLayer.listenFor(PartitionLayer.PARTITION_REGISTER_LIVE_QUERY, this.handleRegisterLiveQuery.bind(this));
        this.messageLayer.listenFor(PartitionLayer.PARTITION_DEREGISTER_LIVE_QUERY, this.handleDeregisterLiveQuery.bind(this));
    }

    createLiveQuerySusbcriberTable() {
        // columns is a comma-separated string of the columns in the table taht the live query should trigger for
        // recipients is a comma-separated string of the addresses of the nodes (or message groups) that should receive the results of the live query
        const sqlStatement = `
            CREATE TABLE IF NOT EXISTS live_query_subscribers (
                id TEXT PRIMARY KEY,
                columns TEXT,
                recipients TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_query ON live_query_subscribers (query);
        `;
        this.partitionGroup.db.exec(sqlStatement);
    }

    handlePartitionQuery(query) {
        // Execute query in the partition group

        // If the query resulted in database changes, we see if we have any live queries regsitered that matches the WHERE clause of the query

        // If we have matches, add the subscribers found to the recipients.

        // Send results to members of receipients list
    }

    handleRegisterLiveQuery(query) {
        // Register the live query in the partition group
    }

    handleDeregisterLiveQuery(query) {
        // Deregister the live query in the partition group
    }

}