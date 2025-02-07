const Node = require('../../src/Node');

const MockRaftImplementation = require('./MockRaftImplementation');
const MockTransport = require('./MockTransport');


let mockHostIP = 1;

module.exports = {
    createNode: (_args) => {
        const args = _args || {}
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
}