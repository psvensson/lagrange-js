const CommunicationCentral = require('./communication/CommunicationCentral')
const WsTransport = require('./communication/WsTransport')
const Cache = require('./Cache')
const NodeInfo = require('./data/NodeInfo')
const {COMMANDS, createCommand} = require('./commands/BaseCommand')

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

    constructor(peers) {
        this.peers = peers
        this.initialKnownPeers = 1
        this.cache = new Cache()
        this.openCommunication()
        this.createNodeInfo()
        this.connectToInitialPeers(peers).then((result) => [
            console.log('connectToPeers result:', result)
        ])
    }

    openCommunication(transports = []) {
        this.communicationCentral = new CommunicationCentral()        
        transports.forEach(transport => {
            this.registerTransport(transport)
        })
    }

    registerTransport(transport) {
        this.communicationCentral.registerTransport(transport)
    }

    createNodeInfo() {
        this.nodeInfo = new NodeInfo({
            addresses: this.communicationCentral.getAddresses()
        })
        this.cache.setNodeInfo(this.nodeInfo)
    }

    async connectToInitialPeers(peers) {
        console.log('connectToInitialPeers', peers)
        for (let peer of peers) {
            await this.connectToPeer(peer)
            this.initialKnownPeers++
            if (this.initialKnownPeers > 2) {
                this.initializeSystem()
            }
        }
    }

    connectToPeer(peer) {
        console.log('connectToPeer', peer)
        const command = createCommand(COMMANDS.INITIAL_CONNECT, this.nodeInfo)
        return this.communicationCentral.send(command, peer)
    }

    initializeSystem() {
        console.log('initializeSystem')
    }

    

}