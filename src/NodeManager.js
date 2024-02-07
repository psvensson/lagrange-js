const CommunicationCentral = require('./communication/CommunicationCentral')
const Cache = require('./Cache')
const NodeInfo = require('./NodeInfo')
const InitialConnectCommand = require('./commands/InitialConnectCommand')

/**
 * When starting a node, it will try to connect to the peers in the list.
 * If there are no peers, it will remain in teh 'CONNECTING' state until two more peers are added.
 * When peers connect, they exchange how many known nodes they know.
 * When the third peer connects to one of two existing known peers, it will start to create the system.
 * If a node connect to a peer which knows more than two nodes, the system is alrady created and it will start to sync.
 * 
 * The creation of the distributed system means creating the initial raft-sqlite tables and their initial partitions (blocks).
 * The initial tables are system-tables, system-partition and system-nodes.
 * When the ables are created, the table data will be writen into system-ables, the partition data will be writen into system-partitions
 * and the node data will be writen into system-nodes.
 * 
 * Since the creation of the tables will involve contacting the two other nodes (so that a minimal raft group can be formed for each partition)
 * those nodes will be kept up to date as well.
 * 
 */

module.exports = class NodeManager {

    constructor(ipAddress, peers) {
        this.peers = peers
        this.initialKnownPeers = 1
        this.cache = new Cache()
        this.communicationCentral = new CommunicationCentral(ipAddress)
        
        this.createNodeInfo()
        this.openCommandSocket()
        this.createWebSocketClient()
        this.connectToInitialPeers(peers).then((result)=>[
            console.log('connectToPeers result:', result)
        ])
    }

    createNodeInfo(){
        this.nodeInfo = new NodeInfo({
            addresses: this.communicationCentral.getAddresses()
        }) 
        this.cache.setNodeInfo(this.nodeInfo)
    }

    async connectToInitialPeers(peers) {        
        console.log('connectToInitialPeers', peers)
        peers.forEach((peer)=>{
            this.connectToPeer(peer)
        }) 
    }

    connectToPeer(peer) {
        console.log('connectToPeer', peer)
        const command = new InitialConnectCommand(this.nodeInfo)
        this.communicationCentral.send(command, peer)
    }
    
}