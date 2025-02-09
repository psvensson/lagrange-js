const sqlite3 = require('sqlite3');

const MessagingLayer = require('../MessagingLayer');
const logger = require('../logger');

// Overview:

// The SystemCache is the base class for all cache classes. Each cache maps to an existing system table, although there may be many more tables than are cached.
// When a system table is updated, that table (the leader of each affected partition raft group of the table) will update the other nodes in the system using the messageLayer of the node.

// Description:

// Each cache uses an in-memory dqlite db to quickly search for information. When setting or modifying theis cache, the actual system tables need to be modified using the system table service.
// This service in turn will then update all other nodes using wildcard sending through the latency zone hierarchy (selecting one random latency group in each zone to cater to that zone).
// Actually, it will just look up the partition of the system table that do store the data permanently and send the update to any of its raft group members.
// The partition raft group lead will then update the rest of the system nodes using the latency hierarchy.

module.exports = class SystemCache {
    static UPDATE_TABLE = 'UPDATE_TABLE';
    static caches = {};

    static NODES_CACHE = 'NodesCache';
    static RAFT_GROUPS_CACHE = 'RaftGroupsCache';
    static CODE_CACHE = 'CodeCache';
    static PARTITIONS_CACHE = 'PartitionsCache';    
    static TABLE_CACHE = 'TableCache';

    cacheName = 'Undefined Cache Name';    

    constructor(messageLayer, initialData, cacheName) {                    
        logger.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&& SystemCache::constructor cacheName: '+ cacheName)
        this.messageLayer = messageLayer;
        this.cacheName = cacheName;
        this.db = new sqlite3.Database(':memory:');   
        this.tableName = this.getTableName()
       
        if(initialData) {
            logger.log('&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&&6 SystemCache::constructor inserting initial data');
            logger.dir(initialData)
            this.insertInitialData(initialData).then(() => {
               logger.log(' SystemCache::constructor initial data inserted');
            });
        } 
        this.createTable();  
    }

    getAddress() {  
        return this.messageLayer.transportLayer.externalAddress
    }

    createTable() {
        throw new Error('Method SystemCache.createTable not implemented in subclass; ', this);
    }

    async insertInitialData(initialData) {    
        logger.log('----------------------------------------------------------------------------------> RaftGroupsCache::insertInitialData initialData. ['+this.getAddress()+'] '+this.cacheName+' is: ')
        //logger.dir(initialData)
        //await this.debugListContents()
        //logger.log('<---------------------------------------------------------------------------------- RaftGroupsCache::insertInitialData')    
        await Promise.all(initialData.map(row => {
            logger.log('Inserting '+this.getAddress()+': '+this.cacheName+'  row: ');
            logger.dir(row)
            return this.addItem(row);
        }));
        //logger.log('==-------------------------------------------------------------------------------== RaftGroupsCache::insertInitialData initialData. ['+this.getAddress()+'] '+this.cacheName+' final cache content after add: ')
        //await this.debugListContents()
    }

    getTableName() {
        throw new Error('Method SystemCache.getTableName not implemented in subclass; ', this);
    }

    // Common method to call this.db.run for sql eueries, handling errors, returning a promise which reoslves with the results, if any
    run(sqlStatement) {
        logger.log('SystemCache::run sqlStatement: ', sqlStatement)
        if (sqlStatement.includes('undefined')) {
            logger.log('//////////////////////////////////////////////////////////////////////////////////////////////////////////////')
            logger.log(sqlStatement)
            throw new Error('SystemCache::run sqlStatement includes undefined')
        }
        return new Promise((resolve, reject) => {
            this.db.run(sqlStatement, function(err) {
                if (err) {
                    logger.error('SystemCache::run error: ', err)
                    reject(err);
                } else {
                    resolve(this);
                }
            });
        });
    }

    async debugListContents() {
        const rows = await this.getAll();
        logger.log('SystemCache::debugListContents for '+this.tableName+' rows: ');
        logger.dir(rows);
    }

    getAll() {
        const sqlStatement = `SELECT * FROM ${this.tableName}`;
        return this.get(sqlStatement);
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

    // Update the system table tha the cache is caching from
    updateSystem(cacheName, key, value) {
        const messageLayer = this.messageLayer        
        const updateTable = messageLayer.createCommand(SystemCache.UPDATE_TABLE, {cacheName, key, value});
        // The message laye will use the table cache to get the table id and the partitions cache to find which partitions are affected that matches the WHERE clause of the update
        const affectedPartitions = messageLayer.findPartitionsFor(this.tableName, messageLayer.createWhereStatementFor(cacheName, key, value));
        messageLayer.sendMessage(updateTable, affectedPartitions);
    }

    // serialize cache into write format, so it can be sent to a new peer
    async serialize() {
        // Extract current table in db        
        const result = await this.getAll();
        //logger.log('SystemCache::serialize result for '+this.cacheName+': ')
        //logger.dir(result)
        return JSON.stringify(result);
    }

    
}
