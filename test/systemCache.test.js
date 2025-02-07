// Test to verify functionality of the System Cache and its subclasses
const { createNode } = require('./mocks/NodeHelper');
const SystemCache = require('../src/cache/SystemCache');
// Jest test which created a new Node and then verifies that it has enterd information about itself in the NodesCache 
test('Test NodesCache', async () => {  
    const node = await createNode();
    const nodesCache = SystemCache.caches[SystemCache.NODES_CACHE];
    const nodes = await nodesCache.getAll();
    expect(nodes.length).toBeGreaterThan(0);
    await node.shutdown();
})