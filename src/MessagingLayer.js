const uuids = require('uuid');

const SystemCache = require('./cache/SystemCache');
const logger = require('./logger');
const {performance} = require('perf_hooks');

// Overview:

// The MessagelAyer is used by any logic in any node class which needs to send messages to other nodes in the system.
// It abstracts away the how of sending messages and focus on commands and acks.

// Description:


module.exports = class MessagingLayer {

    static MAX_MESSAGE_RESENDS = 5;
    static RPC_TIMEOUT = 1000;
    static PING_NODE = 'PING_NODE';

    rpcCallbacks = {}; //Where we store the local callback functions for callers who need to wait for reply locally instead of letting another node in the mesage raft group load the callback function by name and execute there

    // TODO: Remove the need for transport here (and also remove the sendMessageAndWaitForAck method so there is only one way to send messages)
    constructor(messageGroup, transportLayer) {
        logger.log('MessagingLayer constructor. transportLayer is;')
        logger.dir(transportLayer);
        this.messageGroup = messageGroup;
        this.messageGroup.setHouseKeepingCallback(this.houseKeeping);
        this.transportLayer = transportLayer;
        this.transportLayer.registerCallback(this.messageReceivedFromTransport.bind(this));
        this.listenFor(MessagingLayer.PING_NODE, this.handlePingNode.bind(this));
    }

    handlers = {}

    createCommand(messageName, data) {
        return {
            requestId: uuids.v4(),
            source: this.transportLayer.externalAddress,
            messageName: messageName,
            data: data
        }
    }

    createAckFor(message, result) {
        return {
            requestId: uuids.v4(),
            originalRequestId: message.requestId,
            source: this.transportLayer.externalAddress,
            messageName: 'ACK',
            data: result
        }
    }
    
    sendMessageToNode(message, destination, context, callbackFunctionName) {
        this.messageGroup.saveMessage(message, context || {}, callbackFunctionName || '<none>').then((res) => {
            //logger.log('............................ sendMessage saved message:')
            //logger.dir(res);
            this.transportLayer.transportMessage(message, destination);
        });
    }

    async pingNode(node) {
        //logger.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.externalAddress+') MessagingLayer.pingNode to node '+node.externalAddress);
        //logger.dir(node);
        const message = this.createCommand(MessagingLayer.PING_NODE, {});
        return this.sendRpc(message, node.externalAddress, {}, '<none>');
    }

    handlePingNode(message) {
        const ack = this.createAckFor(message, {});
        this.sendMessageToNode(ack, message.source);
    }

    // TODO: Hmm.. it's not possible to have an async rpc function which can also be distributed of the nodes of a message group of couorse :)
    // This means thatt rpc functionality will lead to breaks in communication if a node goes down for some reason. 
    // That leads to the need to expose the using logic to the need to become stateless and handle replies ouside of the context of calls, or indeed implement them only
    // in the MessageGroup, viz. by saving the contextual data together with the name of the function to be invoked later when an ack is received. 
    // This takes away any possibility for the programming language to do smart things about asynchronicity.

    // So the method below should not be used.

    // An async version of sendMessage which does not use the transport layer, but instead sets up a listener for the specific message name and waits for the ack to be received
    async sendRpc(message, destination, context, callbackFunctionName) {
        logger.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.externalAddress+') MessagingLayer.sendRpc to destination '+destination);
        const then = performance.now();
        return new Promise((resolve, reject) => {
            this.rpcCallbacks[message.requestId] = (message) => {
                this.rpcCallbacks[message.requestId] = null;
                const now = performance.now();
                message.latency = now - then;
                //logger.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.externalAddress+') MessagingLayer.sendRpc received ack for message: ' + message.requestId);
                //logger.dir(message);
                resolve(message);
            }
            this.sendMessageToNode(message, destination, context, callbackFunctionName);
        });
    }

    sendMessageToRaftGroup(message, context, callbackFunctionName, raftGroupId) {
        logger.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.externalAddress+') MessagingLayer.sendMessageToRaftGroup');
        const raftGroupCache = SystemCache.caches[SystemCache.RAFT_GROUPS];
        const raftGroup = raftGroupCache.getRaftGroupById(raftGroupId);
        // Select one of the node ids randomly and look that up in the nodes cache
        // The raftgroup rows look like this;
        /*
            CREATE TABLE IF NOT EXISTS raftgroups (
                id TEXT PRIMARY KEY, 
                type TEXT,
                members TEXT
            );
            CREATE INDEX IF NOT EXISTS idx_type ON raftgroups (type);
        */
        const members = raftGroup.members.split(',');
        const randomIndex = Math.floor(Math.random() * members.length);
        const randomMemberId = members[randomIndex];
        const nodesCache = SystemCache.caches[SystemCache.NODES];
        const randomMember = nodesCache.getNodeById(randomMemberId);
        this.sendMessageToNode(message, randomMember.externalAddress, context || {}, callbackFunctionName || '<none>');
    }


    listenFor(messagename, handler) {
        // Register handler for message name
        this.handlers[messagename] = handler;
        //logger.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.externalAddress+') MessagingLayer.listenFor Registered handler for message name: ' + messagename);
        //logger.dir(this.handlers)
    }

    //TODO: It seems like the messages are empty, so we need to find the original message by the originalRequestId
    async receiveAck(message) {
        //logger.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.externalAddress+') MessagingLayer.receiveAck Received ack for message: ' + message.requestId);
        //logger.dir(message);
        //logger.log('unsafecallbacks are:')
        //logger.dir(this.rpcCallbacks);
        //Find message identified in ack
	    // If ack contains result, evaluate message context with result
        // Remove from raft group
        
        this.messageGroup.removeMessageByMessageId(message.originalRequestId);        
       // Get callback function locally if unsafe, or by name from the code system cache
        const callback = this.rpcCallbacks[message.originalRequestId] 
        if(!callback) {
            const originalMessage = await this.messageGroup.findMessageByMessageId(message.originalRequestId);
            logger.log('found saved message:')
            logger.dir(originalMessage);
            callback = await this.getCallbackFunctionByName(originalMessage.callback);
        }
        callback(message);
    }

    async getCallbackFunctionByName(callbackName) {
        // Find function in system code cache
    }

    messageReceivedFromTransport(message) {
        /*
        logger.log('+++++++++++++++++++++++++++++++++++++++++++++++++ Message received from transport');
        logger.dir(message);
        logger.log('registered handlers are:')
        logger.dir(this.handlers);
        logger.log('this is:')
        logger.dir(this);
        */
        // If message is an ack, call receiveAck, otherwise call handler
        message.messageName == 'ACK' ? this.receiveAck(message) : this.handlers[message.messageName](message);
    }

    houseKeeping() {
         //If isLeader
		// For all unacknowledged messages
		//	According to message age and resend policy
		//		Resend message
        if(this.messageGroup.isLeader()){
            const messages = this.messageGroup.getUnacknowledgedMessages();
            messages.forEach(message => {
                if(message.resends < MessagingLayer.MAX_MESSAGE_RESENDS){
                    if(new Date() - message.creationTime > 1000){
                        this.transportLayer.send(message);
                        this.messageGroup.incrementResendsForMessage(message);
                    }
                } else {
                    this.messageGroup.removeMessageByMessageId(message.messageId);
                    // No ack was received. Log this in a smart way when we have a logger
                }
            });
        }
    }

    close() {
        this.transportLayer.close();
        this.messageGroup.close();
    }

    findPartitionsFor(tableName, whereClause) {
        // Find partitions for table name and where clause
        throw new Error('MessagingLayer::findPartitionsFor not implemented yet ', this);
    }

    crateWhereStatementFor(cacheName, key, value) {
        // Create a where statement for the cache name, key and value
        throw new Error('MessagingLayer::createWhereStatementFor not implemented yet ', this);
    }   
}


