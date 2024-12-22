const uuids = require('uuid');

module.exports = class MessagingLayer {

    static MAX_MESSAGE_RESENDS = 5;

    constructor(messageGroup, transportLayer) {
        this.messageGroup = messageGroup;
        this.messageGroup.registerHousekeepingCallback(this.houseKeeping);
        this.transportLayer = transportLayer;
        this.transportLayer.registerCallback(this.messageReceivedFromTransport);
    }

    handlers = {}

    static createCommand(messageName, data) {
        return {
            requestId: uuids.v4(),
            messageName: messageName,
            data: data
        }
    }

    static createAckFor(message, result) {
        return {
            requestId: command.requestId,
            messageName: 'ACK',
            data: result
        }
    }

    sendMessage(message, destionation, context, callbackFunctionName) {
        this.messageGroup.saveMessage(message, context, callbackFunctionName);
        this.transportLayer.send(message, destination);
    }

    listenFor(messagename, handler) {
        // Register handler for message name
        this.handlers[messagename] = handler;
    }

    receiveAck(message) {
        //Find message identified in ack
	    // If ack contains result, evaluate message context with result
        // Remove from raft group
        const originalMessage = this.messageGroup.findMessageByMessageId(message.requestId);
        this.messageGroup.removeMessageByMessageId(message.requestId);        
       // Get callback function by name from the code system cache


    }

    messageReceivedFromTransport(message) {
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


