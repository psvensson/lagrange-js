const logger = require('../src/logger');
const SystemCache = require('../src/cache/SystemCache');

const { createNode } = require('./mocks/NodeHelper');

test('Test MessageLayer', async () => {  

    const node1 = await createNode();
    //logger.log('------------------------------- test node1 is:')
    //logger.dir(node1)    

    const node2 = await createNode({
        existingNode: node1.externalAddress
    });

    //logger.log('------------------------------- test node2 caches are:')
    //logger.dir(node2.caches)

    // ensure that the nodecache of node2 also contains node1
    const nodesCache = node2.caches[SystemCache.NODES_CACHE]
    const nodes = await nodesCache.getAll();
    logger.log('+++++++++ test nodes are:')
    logger.dir(nodes)
    expect(nodes.length).toBe(2);
        
    await node1.shutdown();
    await node2.shutdown();
    
});

