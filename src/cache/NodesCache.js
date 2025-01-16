const SystemCache = require('./SystemCache');

module.exports = class NodesCache extends SystemCache {

    static LATNCY_ZONE_THRESHOLD = 30; // In ms
    static PING_NODE = 'PING';

    constructor(messageLayer, initialData) {
        super(messageLayer, initialData);
        this.cacheName = SystemCache.NODES_CACHE;     
    }

    getTableName() {
        return 'nodes';
    }

    // Create nodes table the cache in-memory db
    createTable() {
        const sqlStatement = `
            CREATE TABLE IF NOT EXISTS ${this.tableName} (
                nodeId TEXT PRIMARY KEY, 
                externalAddress TEXT, 
                latencyZone TEXT, 
                freeMem REAL, 
                freeCpu REAL
            );
            CREATE INDEX IF NOT EXISTS idx_latencyZone ON ${this.tableName} (latencyZone);
        `;
        // Create table using sqlite API and the this.db object
        this.db.exec(sqlStatement);
    }

    async insertInitialData(initialData) {
        // The initialData format is the same as the output from the sqlite3 all() function call, just an array of rows
        // The call looks like this that produced the data; 
        /*
        db.all("SELECT * FROM my_table", function(err, rows) {  
            rows.forEach(function (row) {  
                console.log(row.col1, row.col2);    // and other columns, if desired
            })  
        });*/
        await Promise.all(initialData.map(row => this.addNode(row.externalAddress, row)));
    }

    /*
    * Node format:
    * ------------
    * {
    *   id: '<uuid>',
    *   externalAddress: 'http://localhost:3200',
    *   latencyZone: '<uuid>', // Nodes with similar latency between them are in the same latency zone
    *   freeMem: 200. // in MB
    *   freeCpu: 50 // In percentage
    * }
    * 
    */
    async addNode(externalAddress, node) {
        console.log('NodesCache::addNode node: ', node)
        // insert a new record of the node in the db 
        const sqlStatement = `INSERT INTO ${this.tableName} (nodeId, externalAddress, latencyZone, freeMem, freeCpu) VALUES ('${node.id}', '${node.externalAddress}', '${node.latencyZone}', ${node.freeMem}, ${node.freeCpu})`;        
        return this.run(sqlStatement);
    }

    // Get all unique latency zone ids from the latency zone table
    latencyZones() {
        const sqlStatement = `SELECT DISTINCT latencyZone FROM ${this.tableName}`;
        return this.get(sqlStatement);
    }

    // Get one random node from a given latency zone
    randomNodeFromLatencyZone(latencyZone) {
        const sqlStatement = `SELECT * FROM ${this.tableName} WHERE latencyZone = '${latencyZone}' ORDER BY RANDOM() LIMIT 1`;
        return this.get(sqlStatement);
    }

    // Ping a random node in a given latency zone
    pingNode(latencyZone) {
        const node = this.randomNodeFromLatencyZone(latencyZone);
        return this.messageLayer.sendMessageAndWaitForAck(NodesCache.PING_NODE, node);
    }

    // For all latency group, ping one random node in each and select the one with the lowest latency
    async pingNodes() {
        const latencyZones = await this.latencyZones();
        if (latencyZones.length === 0) {
            return [];
        }
        const pings = latencyZones.map(latencyZone => this.pingNode(latencyZone).catch(() => Infinity));
        const results = await Promise.all(pings);
        return results.reduce((min, current) => {
            return current < min ? current : min;
        }, Infinity);   
    }


}