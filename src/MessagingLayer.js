const uuids = require('uuid');

module.exports = class MessagingLayer {

    static MAX_MESSAGE_RESENDS = 5;

    unsafeCallbacks = {}; //Where we store the local callback functions for callers who need to wait for reply locally instead of letting another node in the mesage raft group load the callback function by name and execute there

    constructor(messageGroup, transportLayer) {
        //console.log('MessagingLayer constructor. transportLayer is;')
        //console.dir(transportLayer);
        this.messageGroup = messageGroup;
        this.messageGroup.setHouseKeepingCallback(this.houseKeeping);
        this.transportLayer = transportLayer;
        this.transportLayer.registerCallback(this.messageReceivedFromTransport.bind(this));
    }

    handlers = {}

    createCommand(messageName, data) {
        return {
            requestId: uuids.v4(),
            source: this.transportLayer.address,
            messageName: messageName,
            data: data
        }
    }

    createAckFor(message, result) {
        return {
            requestId: uuids.v4(),
            originalRequestId: message.requestId,
            source: this.transportLayer.address,
            messageName: 'ACK',
            data: result
        }
    }
    
    sendMessage(message, destination, context, callbackFunctionName) {
        this.messageGroup.saveMessage(message, context, callbackFunctionName).then((res) => {
            console.log('............................ sendMessage saved message:')
            console.dir(res);
            this.transportLayer.transportMessage(message, destination);
        });
    }

    // An async version of sendMessafe which waits until ack is reeived and then returns the value, instead of using context and named callbacks function
    async sendMessageAndWaitForAck(message, destination) {
        const ack = await new Promise((resolve, reject) => {
            const callback = (message)=>{
                this.unsafeCallbacks[message.requestId] = null;
                resolve(message.data);
            }
            this.unsafeCallbacks[message.requestId] = callback;
            this.transportLayer.transportMessage(message, destination);
        });
        return ack;
    }


    listenFor(messagename, handler) {
        // Register handler for message name
        this.handlers[messagename] = handler;
        //console.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.address+') MessagingLayer.listenFor Registered handler for message name: ' + messagename);
        //console.dir(this.handlers)
    }

    //TODO: It seems like the messages are empty, so we need to find the original message by the originalRequestId
    async receiveAck(message) {
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++ ('+this.transportLayer.address+') MessagingLayer.receiveAck Received ack for message: ' + message.requestId);
        console.dir(message);
        console.log('unsafecallbacks are:')
        console.dir(this.unsafeCallbacks);
        //Find message identified in ack
	    // If ack contains result, evaluate message context with result
        // Remove from raft group
        
        this.messageGroup.removeMessageByMessageId(message.originalRequestId);        
       // Get callback function locally if unsafe, or by name from the code system cache
        const callback = this.unsafeCallbacks[message.originalRequestId] 
        if(!callback) {
            const originalMessage = await this.messageGroup.findMessageByMessageId(message.originalRequestId);
            console.log('found saved message:')
            console.dir(originalMessage);
            this.getCallbackFunctionByName(originalMessage.callback);
        }
        callback(message);
    }

    getCallbackFunctionByName(callbackName) {
        // Find function in system code cache
    }

    messageReceivedFromTransport(message) {
        /*
        console.log('+++++++++++++++++++++++++++++++++++++++++++++++++ Message received from transport');
        console.dir(message);
        console.log('registered handlers are:')
        console.dir(this.handlers);
        console.log('this is:')
        console.dir(this);
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
                }
            });
        }
    }

    close() {
        this.transportLayer.close();
        this.messageGroup.close();
    }
}


