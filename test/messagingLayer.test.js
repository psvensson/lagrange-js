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

let mockHostIP = 1;

function createNode(args) {
    ;
    const address = args.externalAddress || 'mock://1.1.1.'+(mockHostIP++);
    const nodePort = args.nodePort || 2002;
    const nodeAddress = address+':'+nodePort;
    const mockTransport = new MockTransport(nodeAddress);

    const messageGroupPort = args.messageGroupPort || 4711;    
    const raftNodeAddress = nodeAddress+':'+messageGroupPort;    
    const raft = new MockRaftImplementation(raftNodeAddress, args.peerAddresses || [])

    return new Node({
        externalAddress: nodeAddress,
        existingNode: args.existingNode,
        transportLayer: mockTransport,
        raftImplementation: raft,
    });
}


test('Test MessageLayer', async () => {    
    const peerAddresses = [];    
    const node1 = await createNode({
        peerAddresses: peerAddresses
    });

    console.log('------------------------------- test node1 is:')
    console.dir(node1)    
    const node2 = await createNode({
        peerAddresses: peerAddresses,
        existingNode: node1.externalAddress
    });
        
    
});

