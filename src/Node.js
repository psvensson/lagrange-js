const uuids = require('uuid');

const MessageGroup = require('./MessageGroup');
const NodesCache = require('./cache/NodesCache');
const RaftGroupsCache = require('./cache/RaftGroupsCache');
const CodeCache = require('./cache/CodeCache');
const SystemCache = require('./cache/SystemCache');
const MessagingLayer = require('./MessagingLayer');
const WsTransport = require('./communication/WsTransport');

// The nodes are stored in their own system table.
// Nodeas aren't created anywhere else but in the process of a new node startin up, so there's no need for a static create method here.
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
        console.log('================================================== ('+args.externalAddress+') Node Constructor ===============================')
        console.dir(args)
        return new Promise((resolve, reject) => {
            const {externalAddress, existingNode} = args
            this.externalAddress = externalAddress;
            this.id = args.id || uuids.v4();
            const transportLayer =      args.transportLayer ? 
                                        args.transportLayer : new WsTransport('http://'+externalAddress+':' + Node.SYSTEM_NODE_PORT);

            const raftImplementation =  args.raftImplementation ? 
                                        args.raftImplementation : new RqliteRaftImplementation(externalAddress+':'+this.nextAvailablePort(), []);

            this.externalAddress = externalAddress;

            this.openMessageLayer(transportLayer, raftImplementation)
                .then(() => this.populateCaches(existingNode))                
                .then(() => {
                    resolve(this);
                })
        });
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
        this.nodesCache = new NodesCache(existingData ? existingData.nodes : '');
        this.raftGroupsCache = new RaftGroupsCache(existingData ? existingData.raftGroups : '');
        this.codeCache = new CodeCache(existingData ? existingData.code : '');
    }

    // If existingNode provided, download system informatino and populate caches.
    async populateCaches(existingNode) {        
        console.log('======== ('+this.externalAddress+') Node::populateCaches') 
        const existingData = existingNode ? await this.fetchPeerData(existingNode): {}        
        await SystemCache.populateAllCaches(existingData);
    }

    async fetchPeerData(existingNode) {
        console.log('======== ('+this.externalAddress+') Node::fetchPeerData. messageLayer is:') 
        console.dir(this.messageLayer)
        // Fetch data from existing node
        const getPeerData = this.messageLayer.createCommand(Node.GET_PEER_DATA);        
        const peerData = await this.messageLayer.sendRpc(getPeerData, existingNode);       
        console.log('======== ('+this.externalAddress+') Node::fetchPeerData got reply: ')
        console.dir(peerData)  
        return peerData;
    }

    async openMessageLayer(transportLayer, raftImplementation) {          
        console.log('======== ('+this.externalAddress+') Node::openMessageLayer')     
        this.createSystemCaches();
        const messageGroup = await new MessageGroup({raftGroupImplementation: raftImplementation});        
        console.log('New MessageGroup created...')
        console.dir(messageGroup)
        console.log('raftGroupsCache is:')
        console.dir(this.raftGroupsCache)
        await this.raftGroupsCache.addRaftGroup(messageGroup);
        console.log('New MessageGroup added...')
        this.messageLayer = new MessagingLayer(messageGroup, transportLayer);
        this.messageLayer.listenFor(Node.GET_PEER_DATA, this.getPeerDataHandler.bind(this));
        // Set messageLayer for all system caches
        console.log('======== ('+this.externalAddress+') Node::openMessageLayer setting message layer for system caches') 
        SystemCache.setMessageLayer(this.messageLayer);
        console.log('======== ('+this.externalAddress+') Node::constructor updating nodes system caches') 
        this.nodesCache.addNode(this.externalAddress, this.serialize());       
        return this.addNecessaryPeersToMessageGroup(this.nodesCache, messageGroup);        
    }

    getPeerDataHandler(message) {
        // Respond with nodesCache data
        console.log('======== ('+this.externalAddress+') Node::openMessageLayer got message:') 
        console.dir(message)
        SystemCache.serializeAllCaches().then(serializedCaches => {
            const ack = this.messageLayer.createAckFor(message, serializedCaches);
            this.messageLayer.sendMessageToNode(ack, message.source);
        })        
    }

    async addNecessaryPeersToMessageGroup(nodesCache, messageGroup) {
        console.log('======== ('+this.externalAddress+') Node::addnecessaryPeersToMessageGroup');

        const foo = ()=>{
            this.codeCache.showContext()
        }
        
        foo()
        
        const morePeers = await this.findRaftPeers(nodesCache);
        // Add morePeers to messageGroup
        await Promise.all(morePeers.map(peer => messageGroup.addPeer(peer)));
    }

    async findRaftPeers(nodesCache) {
        console.log('======== ('+this.externalAddress+') Node::findRaftPeers') 
        // Wee need two more peers.
        const morePeers = []
        // Find or create our latency zone

        // Find zero or more peers from the local latency zone

        // If one or more peers still missing, create local messagroup raft group peers (with incrementing unique ports) and add them.
        
        return morePeers;
    }
    
}