const sqlite3 = require('sqlite3');
const MessagingLayer = require('../MessagingLayer');

// Overview:

// The SystemCache is the base class for all cache classes. Each cache maps to an existing system table, although there may be many more tables than are cached.
// When a system table is updated, that table (the leader of each affected partition raft group of the table) will update the other nodes in the system using the messageLayer of the node.

// Description:

// Each cache uses an in-memory dqlite db to quickly search for information. When setting or modifying theis cache, the actual system tables need to be modified using the system table service.
// This service in turn will then update all other nodes using wildcard sending through the latency zone hierarchy (selecting one random latency group in each zone to cater to that zone).
// Actually, it will just look up the partition of the system table that do store the data permanently and send the update to any of its raft group members.
// The partition raft group lead will then update the rest of the system nodes using the latency hierarchy.

module.exports = class SystemCache {
    static UPDATE_SYSTEM = 'UPDATE_SYSTEM';
    static WILDACRD_DESTINATION = '*';
    static caches = {};

    static NODES_CACHE = 'NodesCache';
    static RAFT_GROUPS_CACHE = 'RaftGroupsCache';
    static CODE_CACHE = 'CodeCache';
    static PARTITIONS_CACHE = 'PartitionsCache';    


    cacheName = 'Undefined Cache Name';
    static messageLayer = null; // The assigned messagegroup for this node, set a bit after init, but before we need to send anything

    constructor(messageLayer, initialData) {
        SystemCache.caches[this.cacheName] = this; // Save any instance of a system cache so it can be looked up using the class
        this.db = new sqlite3.Database(':memory:');   
        this.tableName = this.getTableName()
        this.messageLayer = messageLayer;
        // TODO: We should not have both an internal sqlite db and a hastable for the same thing, hmm?
        if(initialData) {
            console.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&6 SystemCache::constructor inserting initial data');
            console.dir(initialData)
            this.insertInitialData(initialData).then(() => {
               console.log(' SystemCache::constructor initial data inserted');
            });
        } 
        this.createTable();  
    }

    static setMessageLayer(messageLayer) {        
        console.log('SystemCache::setMessageLayer setting messageLayer:')
        //console.dir(messageLayer)
        SystemCache.messageLayer = messageLayer;
    }    

    static async serializeAllCaches() {
        const cacheNames = Object.keys(SystemCache.caches);
        const serializedCaches = await Promise.all(cacheNames.map(cacheName => SystemCache.caches[cacheName].serialize()));
        console.log('------------------------------------------- serializedCaches -------------------------------------------')
        console.dir(serializedCaches)
        return serializedCaches;
    }

    static async populateAllCaches(existingData) {
        console.log('SystemCache::populateAllCaches existingData: ')
        console.dir(existingData)
        const cacheNames = Object.keys(SystemCache.caches);
        await Promise.all(cacheNames.map(cacheName => SystemCache.caches[cacheName].insertInitialData(existingData[cacheName] || [])));
    }

    createTable() {
        throw new Error('Method SystemCache.createTable not implemented in subclass; ', this);
    }

    async insertInitialData(initialData) {
        throw new Error('Method SystemCache.insertInitialData not implemented in subclass; ', this);
    }

    getTableName() {
        throw new Error('Method SystemCache.getTableName not implemented in subclass; ', this);
    }

    // Common method to call this.db.run for sql eueries, handling errors, returning a promise which reoslves with the results, if any
    run(sqlStatement) {
        console.log('SystemCache::run sqlStatement: ', sqlStatement)
        if (sqlStatement.includes('undefined')) {
            throw new Error('SystemCache::run sqlStatement includes undefined')
        }
        return new Promise((resolve, reject) => {
            this.db.run(sqlStatement, function(err) {
                if (err) {
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    // Common method to call this.db.get handling errors and returing promise
    get(sqlStatement) {
        return new Promise((resolve, reject) => {
            this.db.all(sqlStatement, function(err, rows) {
                if (err) {
                    reject(err);
                } else {
                    resolve(rows);
                }
            });
        });
    }

    // Update the system with the cache changes using the messageLayer of the node  
    updateSystem(cacheName, key, value) {
        const messageLayer = SystemCache.messageLayer
        //console.log('SystemCache::updateSystem messageLayer:')
        //console.dir(messageLayer)
        // Perform update
        const updateOtherNodes = messageLayer.createCommand(SystemCache.UPDATE_SYSTEM, {cacheName, key, value});
        messageLayer.sendMessage(updateOtherNodes, SystemCache.WILDACRD_DESTINATION);
    }

    // serialize cache into write format, so it can be sent to a new peer
    async serialize() {
        // Extract current table in db
        const sqlStatement = `SELECT * FROM ${this.tableName}`;
        const result = await this.get(sqlStatement);
        return JSON.stringify(result);
    }

    
}
