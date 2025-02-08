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
    freeMem = 0;
    freeCpu = 0;

    messageLayer = null;
    nextPortAvailable = 3200; // For raft groups

    nodesCache = null;
    raftGroupsCache = null;
    codeCache = null;

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
            return this;
        })();
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
        this.nodesCache = new NodesCache(this.messageLayer, existingData ? existingData.nodes : '');
        this.raftGroupsCache = new RaftGroupsCache(this.messageLayer,existingData ? existingData.raftGroups : '');
        this.codeCache = new CodeCache(this.messageLayer,existingData ? existingData.code : '');
    }

    // If existingNode provided, download system informatino and populate caches.
    // If not, then we're the very first node and we're responsible to create the system tables (and partitions).
    async populateCaches(existingNode) {        
        logger.log('======== ('+this.externalAddress+') Node::populateCaches') 
        if(existingNode) {
            await SystemCache.populateAllCaches(await this.fetchPeerData(existingNode))
        } else {
            this.createSystemTables()
        }        
        await this.nodesCache.addItem(this.serialize());   
        await this.raftGroupsCache.addItem(this.messageGroup);
        // Set messageLayer for all system caches        
        SystemCache.setMessageLayer(this.messageLayer);            
        return this.addNecessaryPeersToMessageGroup(this.nodesCache, this.messageGroup);     
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

    }

    async fetchPeerData(existingNode) {
        logger.log('======== ('+this.externalAddress+') Node::fetchPeerData. messageLayer is:') 
        //logger.dir(this.messageLayer)
        // Fetch data from existing node
        const getPeerData = this.messageLayer.createCommand(Node.GET_PEER_DATA);        
        const peerData = await this.messageLayer.sendRpc(getPeerData, existingNode);       
        logger.log('======== ('+this.externalAddress+') Node::fetchPeerData got reply: '+typeof peerData)
        logger.dir(peerData)  
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
        SystemCache.serializeAllCaches().then(serializedCaches => {
            const ack = this.messageLayer.createAckFor(message, serializedCaches);
            // sendMessageToNode(message, destination, context, callbackFunctionName)
            this.messageLayer.sendMessageToNode(ack, message.source);
        })        
    }

    async addNecessaryPeersToMessageGroup(nodesCache, messageGroup) {
        logger.log('======== ('+this.externalAddress+') Node::addnecessaryPeersToMessageGroup');
        const foo = ()=>{
            this.codeCache.showContext()
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
    
}