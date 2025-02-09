const uuids = require('uuid');

const MessageGroup = require('./MessageGroup');
const NodesCache = require('./cache/NodesCache');
const RaftGroupsCache = require('./cache/RaftGroupsCache');
const CodeCache = require('./cache/CodeCache');
const SystemCache = require('./cache/SystemCache');
const MessagingLayer = require('./MessagingLayer');
const WsTransport = require('./communication/WsTransport');

const logger = require('./logger');

// The nodes are stored in their own system table.
// Nodes aren't created anywhere else but in the process of a new node starting up, so there's no need for a static create method here.

// TODO: Crate a config class where all settings are stored
module.exports = class Node {

    static GET_PEER_DATA = 'GET_PEER_DATA';
    static SYSTEM_NODE_PORT = 2002 // The single port which is to be used to coommunicated messages between systems

    externalAddress = '';
    latencyZone = '<initial>';
    freeMem = 100;
    freeCpu = 100;

    messageLayer = null;
    nextPortAvailable = 3200; // For raft groups

    nodesCache = null;
    raftGroupsCache = null;
    codeCache = null;

    caches = {} // WE keep the caches instead of trying to store them in the SystemCache superclass

    constructor(args) {
        logger.log('================================================== ('+args.externalAddress+') Node Constructor ===============================')
        logger.dir(args)
        
        const { externalAddress, existingNode } = args;
        this.externalAddress = externalAddress;
        this.id = args.id || uuids.v4();

        const transportLayer        = args.transportLayer       || new WsTransport('http://' + externalAddress + ':' + Node.SYSTEM_NODE_PORT);
        const raftImplementation    = args.raftImplementation   || new RqliteRaftImplementation(externalAddress + ':' + this.nextAvailablePort(), []);

        return (async () => {
            await this.openMessageLayer(transportLayer, raftImplementation);
            this.createSystemCaches();
            await this.populateCaches(existingNode);
            await this.addNewlyCreatedThingsToCaches();
            await this.addNecessaryPeersToMessageGroup(this.nodesCache, this.messageGroup); 
            return this;
        })();
    }

    async addNewlyCreatedThingsToCaches() {
        await this.caches[SystemCache.RAFT_GROUPS_CACHE].addItem(this.messageGroup);
        await this.caches[SystemCache.NODES_CACHE].addItem(this.serialize());        
    }

    serialize() {
        return {
            externalAddress: this.externalAddress,
            nextPortAvailable: this.nextPortAvailable,
            id: this.id,
            latencyZone: this.latencyZone,
            freeMem: this.freeMem,
            freeCpu: this.freeCpu
        }
    }

    nextAvailablePort() {
        return this.nextPortAvailable++;
    }

    createSystemCaches(existingData) {
        this.caches[SystemCache.NODES_CACHE] = new NodesCache(this.messageLayer, existingData ? existingData.nodes : '');
        this.caches[SystemCache.RAFT_GROUPS_CACHE] = new RaftGroupsCache(this.messageLayer,existingData ? existingData.raftGroups : '');
        this.caches[SystemCache.CODE_CACHE] = new CodeCache(this.messageLayer,existingData ? existingData.code : '');
    }

    // If existingNode provided, download system informatino and populate caches.
    // If not, then we're the very first node and we're responsible to create the system tables (and partitions).
    async populateCaches(existingNode) {        
        logger.log('======== ('+this.externalAddress+') Node::populateCaches') 
        existingNode    ? await this.populateAllCaches(await this.fetchPeerData(existingNode)) 
                        : this.createSystemTables();
    }

    // Each table  is parsisted in a partition (which then can be split when needed).
    // Each partition is implemented by a raft group which replicates three (or any odd number) sql dbs. The canonical example is rqlite.
    // When a table is create, the first partition of that table is created at the same time. 

    // The first ables need to be the table table and the partition table. 
    // These objects are created (which alseo created the instances of raft nodes, with their physical sql storage). The objects are then serialzied. Then the table and partiton caches are created.
    // The table table and partitiontable are stored in the table cache. The partitions for both the table table and the partition table are stored in the partition cache.

    // As each partitoon now exists as raft group replicas on system nodes, th table caache and partitin cache can now update the system.

    // Updating a cache means that we look in the table cache to get information about the table to update, especially which partitions to update.
    // The partitions to update are then looked up in the partition cache, and the update is sent to the raft group leader of that partition.

    // When this initial creation of table and partition objets, creation of partition raft groups and updating of the table and partition system tables are done, the system is ready to go.

    // After that we can create the node table (which will create its first partition, which will be stored in the partition cache, et.c.).
    // And so on for the rest of the system tables. Each cache maps to a system table.

    createSystemTables() {
        logger.warn('* Nodes.crateSystemTables not implemented yet *')
    }

    async fetchPeerData(existingNode) {
        logger.log('======== ('+this.externalAddress+') Node::fetchPeerData. messageLayer is:') 
        //logger.dir(this.messageLayer)
        // Fetch data from existing node
        const getPeerData = this.messageLayer.createCommand(Node.GET_PEER_DATA);        
        const peerData = await this.messageLayer.sendRpc(getPeerData, existingNode);       
        //logger.log('======== ('+this.externalAddress+') Node::fetchPeerData got reply: '+typeof peerData)
        //logger.dir(peerData)  
        return peerData;
    }

    async openMessageLayer(transportLayer, raftImplementation) {          
        logger.log('======== ('+this.externalAddress+') Node::openMessageLayer')             
        this.messageGroup = await new MessageGroup({
            raftGroupImplementation: raftImplementation,
            members: [this.externalAddress]
        });        
        this.messageLayer = new MessagingLayer(this.messageGroup, transportLayer);
        this.messageLayer.listenFor(Node.GET_PEER_DATA, this.getPeerDataHandler.bind(this));           
    }

    getPeerDataHandler(message) {
        // Respond with nodesCache data
        //logger.log('======== ('+this.externalAddress+') Node::getPeerDataHandler got message:') 
        //logger.dir(message)
        this.serializeAllCaches().then(serializedCaches => {            
            const ack = this.messageLayer.createAckFor(message, serializedCaches);
            this.messageLayer.sendMessageToNode(ack, message.source);
        })        
    }

    // Debug/test method to see how we cangenerated stack traces for code crashing on another node
    async addNecessaryPeersToMessageGroup(nodesCache, messageGroup) {
        logger.log('======== ('+this.externalAddress+') Node::addnecessaryPeersToMessageGroup');
        const foo = ()=>{
            this.caches[SystemCache.CODE_CACHE].showContext()
        }
        
        foo()
        
        const morePeers = await this.findRaftPeers(nodesCache);
        // Add morePeers to messageGroup
        await Promise.all(morePeers.map(peer => messageGroup.addPeer(peer)));
    }

    async findRaftPeers(nodesCache) {
        logger.log('======== ('+this.externalAddress+') Node::findRaftPeers') 
        // Wee need two more peers.
        const morePeers = []
        // Find or create our latency zone

        // Find zero or more peers from the local latency zone

        // If one or more peers still missing, create local messagroup raft group peers (with incrementing unique ports) and add them.
        
        return morePeers;
    }

    async shutdown(){
        logger.log('======== ('+this.externalAddress+') Node::shutdown') 
        await this.messageLayer.close();

    }

    async serializeAllCaches() {
        const serializedCaches = {};
        for (const cacheName of Object.keys(this.caches)) {
            const cacheData = await this.caches[cacheName].serialize();
            serializedCaches[cacheName] = cacheData
        }
        return serializedCaches;
    }

    async populateAllCaches(existingData) {
        const cacheNames = Object.keys(this.caches);
        await Promise.all(cacheNames.map(cacheName => this.caches[cacheName].insertInitialData(JSON.parse(existingData[cacheName]) || [])));
    }

    
}