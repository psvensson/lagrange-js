
const { createNode } = require('./mocks/NodeHelper');

test('Test MessageLayer', async () => {  

    const node1 = await createNode();
    console.log('------------------------------- test node1 is:')
    console.dir(node1)    

    const node2 = await createNode({
        existingNode: node1.externalAddress
    });
        
    await node1.shutdown();
    await node2.shutdown();
    
});

