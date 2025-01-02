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


test('Test MessageLayer', async () => {
    const node1Address = "mock://11.22.33.44:2002";    
    const mockTransport1 = new MockTransport(node1Address);    

    const peerAddresses = [];
    const raftNode1Address = "mock://11.22.33.44:4711";
    const raft1 = new MockRaftImplementation(raftNode1Address, peerAddresses);    

    const node1 = await new Node({
        externalAddress: node1Address,
        transportLayer: mockTransport1,
        raftImplementation: raft1,
    });

    console.log('------------------------------- test node1 is:')
    console.dir(node1)

    
    const node2Address = "mock://77.88.99.11:2002";
    const mockTransport2 = new MockTransport(node2Address);
    const raftNode2Address = "mock://77.88.99.11:4711";
    const raft2 = new MockRaftImplementation(raftNode2Address, peerAddresses);
    
    const node2 = await new Node({
        externalAddress: node2Address,
        transportLayer: mockTransport2,
        raftImplementation: raft2,
        existingNode: node1Address
    });
        
    
});

