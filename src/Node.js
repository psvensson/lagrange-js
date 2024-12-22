const MessageGroup = require('./MessageGroup');
const NodesCache = require('./NodesCache');
const RaftGroupsCache = require('./RaftGroupsCache');
const LatencyZonesCache = require('./LatencyZonesCache');
const SystemCache = require('./SystemCache');
const MessagingLayer = require('./MessagingLayer');

module.exports = class Node {

    static GET_PEER_DATA = 'GET_PEER_DATA';

    externalAddress = '';
    messageLayer = null;
    nextPortAvailable = 3200;

    nodesCache = null;
    raftGroupsCache = null;
    latencyZonesCache = null;    

    constructor(args) {
        const {externalAddress, existingNode} = args
        this.externalAddress = externalAddress;
        Promise.all([
            this.populateCaches(existingNode), 
            this.openMessageLayer(externalAddress, peers, this.nodesCache)
        ]).then(() => {
            //
            // Update nodes system caches
            //
            this.nodesCache.addNode(this.externalAddress, this);
            this.raftGroupsCache.addRaftGroup(this.externalAddress, this.messageLayer);
        });
    }

    createSystemCaches() {
        this.nodesCache = new NodesCache(existingData.nodes);
        this.raftGroupsCache = new RaftGroupsCache(existingData.raftGroups);
        this.latencyZonesCache = new LatencyZonesCache(existingData.latencyZones);
    }

    // If existingNode provided, download system informatino and populate caches.
    // Create caches for system information
    async populateCaches(existingNode) {        
        const existingData = existingNode ? await this.fetchPeerData(existingNode): {}        
        this.createSystemCaches(existingData);
    }

    async fetchPeerData(existingNode) {
        // Fetch data from existing node
        // Create a temporary messageLayer (with coresponding messageGroup, et.c) to communicate with existing node
        const tmprqliteRaftImplementation = new RqliteRaftImplementation(existingNode.externalAddress, existingNode.peers);
        const tmp_messageGroup = new MessageGroup(tmprqliteRaftImplementation);
        const tmp_messageLayer = new MessagingLayer(tmp_messageGroup);
        const getPeerData = MessagingLayer.createCommand(Node.GET_PEER_DATA);
        const peerData = await tmp_messageLayer.sendMessage(getPeerData);
        // Shut down temporary messageLayer
        tmp_messageLayer.close();
        return peerData;
    }

    async openMessageLayer(externalAddress, peers, nodesCache) {        
        const peers = await this.findRaftPeers(nodesCache);
        const rqliteRaftImplementation = new RqliteRaftImplementation(externalAddress, peers);
        const messageGroup = new MessageGroup(rqliteRaftImplementation);
        this.messageLayer = new MessagingLayer(messageGroup);
        this.messageLayer.listenFor(Node.GET_PEER_DATA, (message) => {
            // Respond with nodesCache data
            this.messageLayer.sendMessage(message);
        });
        // Set messageLayer for all system caches
        SystemCache.setMessageLayer(this.serializeCaches());
    }

    serializeCaches() {
        return {
            nodes: this.nodesCache.serialize(),
            raftGroups: this.raftGroupsCache.serialize(),
            latencyZones: this.latencyZonesCache.serialize()
        }
    }

    async findRaftPeers(nodesCache) {
        // Detect special case of peers null or empty, and in that case generate thre new peer addresses on this node (with incrementing ports)

        // Look up peers in the same latency zone
    }
    
}