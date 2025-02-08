const logger = requuire('../src/logger');

const { createNode } = require('./mocks/NodeHelper');

test('Test MessageLayer', async () => {  

    const node1 = await createNode();
    logger.log('------------------------------- test node1 is:')
    logger.dir(node1)    

    const node2 = await createNode({
        existingNode: node1.externalAddress
    });
        
    await node1.shutdown();
    await node2.shutdown();
    
});

