const MessageGroup = require('./MessageGroup');
const NodesCache = require('./NodesCache');
const RaftGroupsCache = require('./RaftGroupsCache');
const LatencyZonesCache = require('./LatencyZonesCache');
const SystemCache = require('./SystemCache');
const MessagingLayer = require('./MessagingLayer');
const WsTransport = require('./communication/WsTransport');

module.exports = class Node {

    static GET_PEER_DATA = 'GET_PEER_DATA';
    static SYSTEM_NODE_PORT = 2002 // The single port which is to be used to coommunicated messages between systems

    externalAddress = '';
    messageLayer = null;
    nextPortAvailable = 3200; // For raft groups

    nodesCache = null;
    raftGroupsCache = null;
    latencyZonesCache = null;

    constructor(args) {
        console.log('================================================== ('+args.externalAddress+') Node Constructor ===============================')
        console.dir(args)
        return new Promise((resolve, reject) => {
            const {externalAddress, existingNode} = args
            const transportLayer =      args.transportLayer ? 
                                        args.transportLayer : new WsTransport('http://'+externalAddress+':' + Node.SYSTEM_NODE_PORT);

            const raftImplementation =  args.raftImplementation ? 
                                        args.raftImplementation : new RqliteRaftImplementation(externalAddress+':'+this.nextAvailablePort(), []);

            this.externalAddress = externalAddress;

            this.openMessageLayer(transportLayer, raftImplementation)
                .then(() => this.populateCaches(existingNode))
                .then(() => {
                    //
                    // Update nodes system caches
                    //
                    console.log('======== ('+this.externalAddress+') Node::constructor updating nodes system caches') 
                    this.nodesCache.addNode(this.externalAddress, this.serialize());
                    this.raftGroupsCache.addRaftGroup(this.externalAddress, this.messageLayer);
                    return this.addNecessaryPeersToMessageGroup(this.nodesCache, this.messageLayer);
                })
                .then(() => {
                    resolve(this);
                })
                .catch(reject);
        });
    }

    serialize() {
        return {
            externalAddress: this.externalAddress,
            nextPortAvailable: this.nextPortAvailable
        }
    }

    nextAvailablePort() {
        return this.nextPortAvailable++;
    }

    createSystemCaches(existingData) {
        this.nodesCache = new NodesCache(existingData.nodes);
        this.raftGroupsCache = new RaftGroupsCache(existingData.raftGroups);
        this.latencyZonesCache = new LatencyZonesCache(existingData.latencyZones);
    }

    // If existingNode provided, download system informatino and populate caches.
    async populateCaches(existingNode) {        
        console.log('======== ('+this.externalAddress+') Node::populateCaches') 
        const existingData = existingNode ? await this.fetchPeerData(existingNode): {}        
        this.createSystemCaches(existingData);
    }

    async fetchPeerData(existingNode) {
        console.log('======== ('+this.externalAddress+') Node::fetchPeerData. messageLayer is:') 
        console.dir(this.messageLayer)
        // Fetch data from existing node
        const getPeerData = this.messageLayer.createCommand(Node.GET_PEER_DATA);
        console.log('======== ('+this.externalAddress+') Node::fetchPeerData created command: ')
        console.dir(getPeerData) 
        const peerData = await this.messageLayer.sendMessageAndWaitForAck(getPeerData, existingNode);       
        console.log('======== ('+this.externalAddress+') Node::fetchPeerData got reply: ')
        console.dir(peerData)  
        return peerData;
    }

    async openMessageLayer(transportLayer, raftImplementation) {          
        console.log('======== ('+this.externalAddress+') Node::openMessageLayer')     
        const messageGroup = await new MessageGroup(raftImplementation);
        this.messageLayer = new MessagingLayer(messageGroup, transportLayer);
        this.messageLayer.listenFor(Node.GET_PEER_DATA, (message) => {
            // Respond with nodesCache data
            console.log('======== ('+this.externalAddress+') Node::openMessageLayer got message:') 
            console.dir(message)
            const ack = this.messageLayer.createAckFor(message, this.serializeCaches());
            this.messageLayer.sendMessage(ack, message.source);
        });
        // Set messageLayer for all system caches
        console.log('======== ('+this.externalAddress+') Node::openMessageLayer setting message layer for system caches') 
        SystemCache.setMessageLayer(this.messageLayer);
    }

    async addNecessaryPeersToMessageGroup(nodesCache, messageGroup) {
        console.log('======== ('+this.externalAddress+') Node::addnecessaryPeersToMessageGroup') 
        const morePeers = await this.findRaftPeers(nodesCache);
        // Add morePeers to messageGroup
        await Promise.all(morePeers.map(peer => messageGroup.addPeer(peer)));
    }

    serializeCaches() {
        console.log('======== ('+this.externalAddress+') Node::serializeCaches') 
        return {
            nodes: this.nodesCache.serialize(),
            raftGroups: this.raftGroupsCache.serialize(),
            latencyZones: this.latencyZonesCache.serialize()
        }
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