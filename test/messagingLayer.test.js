const MessagingLayer = require('../src/MessagingLayer');
const MessageGroup = require('../src/MessageGroup');
const Node = require('../src/Node');

const MockRaftImplementation = require('./mocks/MockRaftImplementation');
const MockTransport = require('./mocks/MockTransport');

/*
This is things are setup:

const peers = await this.findRaftPeers(nodesCache);
const rqliteRaftImplementation = new RqliteRaftImplementation(externalAddress, peers);
const messageGroup = new MessageGroup(rqliteRaftImplementation);
this.messageLayer = new MessagingLayer(messageGroup);

*/

function createNode(args) {
    const mockTransport = new MockTransport(args.externalAddress);
    const raft = new MockRaftImplementation(args.raftNodeAddress, args.peerAddresses);
    return new Node({
        externalAddress: args.externalAddress,
        transportLayer: mockTransport,
        raftImplementation: raft,
    });
}


test('Test MessageLayer', async () => {
    const node1Address = "mock://11.22.33.44:2002";
    const raftNode1Address = "mock://11.22.33.44:4711";
    const peerAddresses = [];
    
    const node1 = await createNode({
        externalAddress: node1Address,
        raftNodeAddress: raftNode1Address,
        peerAddresses: peerAddresses
    });

    console.log('------------------------------- test node1 is:')
    console.dir(node1)

    
    const node2Address = "mock://77.88.99.11:2002";
    const raftNode2Address = "mock://77.88.99.11:4711";
    
    const node2 = await createNode({
        externalAddress: node2Address,
        raftNodeAddress: raftNode2Address,
        peerAddresses: peerAddresses,
        existingNode: node1Address
    });
        
    
});

