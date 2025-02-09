const logger = require('../src/logger');
const SystemCache = require('../src/cache/SystemCache');

// Test to verify functionality of the System Cache and its subclasses
const { createNode } = require('./mocks/NodeHelper');
// Jest test which created a new Node and then verifies that it has enterd information about itself in the NodesCache 
test('Test NodesCache', async () => {  
    const node = await createNode();
    const nodesCache = node.caches[SystemCache.NODES_CACHE]
    const nodes = await nodesCache.getAll();
    logger.log('+++++++++ test nodes are:')
    logger.dir(nodes)
    expect(nodes.length).toBeGreaterThan(0);
    await node.shutdown();
})