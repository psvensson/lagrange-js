const { Parser } = require('node-sql-parser');

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
        this.partitionGroup.executeQuery(sqlStatement);
    }

    async handlePartitionQuery(query) {
        // Execute query in the partition group
        const result = await this.partitionGroup.executeQuery(query);
        // Analyze query to understand if it updates the table
        const parser = new Parser();
        const parsedQuery = parser.astify(query);
        if (parsedQuery.type === 'insert' || parsedQuery.type === 'update' || parsedQuery.type === 'delete') {
             // If the query resulted in database changes, we see if we have any live queries regsitered that matches the WHERE clause of the query
            this.handleLiveQuerySubscribers(query);
        }
        return result
    }

    async handleLiveQuerySubscribers(query) {
        const subscribers = this.findLiveQuerySubscribers(query);
        // Send the result to the subscribers
        await Promise.all(subscribers.forEach(subscriber => {
            const columns = subscriber.columns.split(',');
            const recipients = subscriber.recipients.split(',');
            this.messageLayer.sendMessageToNode(result, recipients);
        }));
    }

    async handleRegisterLiveQuery(recipients, query) {
        // Register the live query in the partition group
        const columns = this.extractColumnNamesFromQuery(query);
        // Insert the live query into the live_query_subscribers table
        const sqlStatement = `INSERT INTO live_query_subscribers (id, columns, recipients) VALUES ('${query}', '${columns.join(',')}', '${recipients.join(',')}')`;
        return this.partitionGroup.executeQuery(sqlStatement);
    }

    async handleDeregisterLiveQuery(recepients, query) {
        // Deregister the live query in the partition group
        const sqlStatement = `DELETE FROM live_query_subscribers WHERE id = '${query}'`;
        return this.partitionGroup.executeQuery(sqlStatement);
    }

    async findLiveQuerySubscribers(query) {
        // Find all live query subscribers that match the WHERE clause of the query
        const columns = this.extractColumnNamesFromQuery(query);
        const sqlStatement = `SELECT * FROM live_query_subscribers WHERE columns = '${columns.join(',')}'`;
        return this.partitionGroup.executeQuery(sqlStatement);
    }

    extractColumnNamesFromQuery(query)  {
        const parser = new Parser();
        const parsedQuery = parser.astify(query);
        // The parsed query is a tree structure that we need to traverse to find the columns
        // We can use a recursive function to find the columns
        const columns = [];    
       // Use the parsedQuery structure to etract the columns
        const extractColumns = (node) => {
            if (node.type === 'column_ref') {
                columns.push(node.column);
            }
            if (node.type === 'select') {
                node.columns.forEach(column => {
                    extractColumns(column.expr);
                });
            }
            if (node.type === 'from') {
                node.from.forEach(from => {
                    extractColumns(from);
                });
            }
        }
        extractColumns(parsedQuery);
        return columns;
    }

    

}