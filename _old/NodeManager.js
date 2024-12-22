const CommunicationCentral = require('./communication/CommunicationCentral')
const WsTransport = require('../_old/communication/WsTransport')
const Cache = require('./Cache')
const NodeInfo = require('./data/NodeInfo')
const {COMMANDS, createCommand} = require('./commands/BaseCommand')

/**
 * When creating the initial system the operator needs to have three nodes with discoverable ip addresses.
They will form a group of initial peers and each one will know all three addresses.

They will then form a primordial raft group where each step of the initialization process is stored and stepped forward by the node who happens to be the leader.

When a node is in the initialising state and detect raft state change to leader, it will start to do the following steps, each one noted in a proceedings table in the primordial raft group raft-sqlite db:

Create a raft-qlite db for the initial partition of the system::tables table
Do the same for system::partitions and system::nodes
Each of the three initial nodes now have replicas of those partitions.
INSERT into system::partitions information about all known partitions
INSERT into system::tables the same about the three tables
INSERT into system::nodes information about all three known nodes
Note that the process is finished in the primordial raft group table

When the node-manager receives the process finished raft state update from the primordial table, it starts to populate its cache (each of the three nodes will react in the same way).

Each node will then do a very basic SELECT * from ach table and put the result into its local cache for respective uses.
Then all three nodes will send a request for subscription of CDC feeds for each table to the tables partition, to receive all further updates.

Then the system is open.

Any subsequent node needs to be given just one existing node address, from which it can copy the cache and from there issue its own subscription of CDCs from the central tables.

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

    // TODO: This is a brittle and random way to initialize the system. Change the logic to instead create a raft-sqlite raft group
    // with the two first other nodes (which need to be declaed as peers) and let the leader continue the process of creating the system.
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