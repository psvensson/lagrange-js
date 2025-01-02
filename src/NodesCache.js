const SystemCache = require('./SystemCache');

module.exports = class NodesCache extends SystemCache {

    static LATNCY_ZONE_THRESHOLD = 30; // In ms
    static PING_NODE = 'PING';

    constructor(messageLayer, initialData) {
        super(messageLayer, initialData);
        this.cacheName = 'NodesCache';       
    }

    // Create nodes table in messageGroup.raftGroup
    createTable() {
        const sqlStatement = `
            CREATE TABLE IF NOT EXISTS nodes (
                nodeId TEXT PRIMARY KEY, 
                externalAddress TEXT, 
                latencyZone TEXT, 
                freeMem REAL, 
                freeCpu REAL
            );
            CREATE INDEX IF NOT EXISTS idx_latencyZone ON nodes (latencyZone);
        `;
        this.messageLayer.raftGroup.executeCommand(sqlStatement);
    }

    // create a similar table for messagegroup (holding only the id)
    createNodeTable() {
        const sqlStatement = "CREATE TABLE IF NOT EXISTS nodes (nodeId TEXT PRIMARY KEY)";
        this.messageLayer.raftGroup.executeCommand(sqlStatement);
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
    addNode(externalAddress, node) {
        this.set(externalAddress, node)
    }

    // Get all unique latency zone ids from the latency zone table
    latencyZones() {
        const sqlStatement = `SELECT DISTINCT latencyZone FROM nodes`;
        return this.messageLayer.raftGroup.executeQuery(sqlStatement);
    }

    // Get one random node from a given latency zone
    randomNodeFromLatencyZone(latencyZone) {
        const sqlStatement = `SELECT * FROM nodes WHERE latencyZone = '${latencyZone}' ORDER BY RANDOM() LIMIT 1`;
        return this.messageLayer.raftGroup.executeQuery(sqlStatement);
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