const RaftGroup = require("./RaftGroup");


module.exports = class MessageGroup extends RaftGroup{

    houseKeepingCallback = null;

    constructor(raftGroup) {
        super(raftGroup);
        // Create rqlite table for messages, to hold messageId, messageName, serialized context (if any), name of callback to invoke, creation time, and number of resends
        const sqlStatement = "CREATE TABLE IF NOT EXISTS messages (messageId TEXT PRIMARY KEY, messageName TEXT, context TEXT, callback TEXT, creationTime TEXT, resends INTEGER)";
        this.raftGroup.executeCommand(sqlStatement);
    }

    /* Message format:
    {
        requestId: uuids.v4(),
        messageName: messageName,
        data: data
    }*/
    
    saveMessage(message, context, callbackName) {
        // Save message in rqlite table
        const creationTime = new Date().toISOString();
        const resends = 0;
        const sqlStatement = `INSERT INTO messages (messageId, messageName, context, callback, creationTime, resends) VALUES ('${message.requestId}', '${message.messageName}', '${context}', '${callbackName}', '${creationTime}', ${resends})`;
        this.raftGroup.executeCommand(sqlStatement);
    }

    findMessageByMessageId(messageId) {
        // Find message in rqlite table and return it
        const sqlStatement = `SELECT * FROM messages WHERE messageId = ${messageId}`;
        return this.raftGroup.executeQuery(sqlStatement);
    }

    incrementResendsForMessage(messageId) {
        // Increment resends for message in rqlite table
        const sqlStatement = `UPDATE messages SET resends = resends + 1 WHERE messageId = ${messageId}`;
        this.raftGroup.executeCommand(sqlStatement);
    }

    removeMessageByMessageId(messageId) {
        // Remove message from rqlite table
        const sqlStatement = `DELETE FROM messages WHERE messageId = ${messageId}`;
        this.raftGroup.executeCommand(sqlStatement);
    }

    getUnacknowledgedMessages() {
        // Find all messages in rqlite table where resends < MAX_RESENDS
        const sqlStatement = `SELECT * FROM messages WHERE resends < ${RaftGroup.MAX_RESENDS}`;
        return this.raftGroup.executeQuery(sqlStatement);
    }

    setHouseKeepingCallback(callback) {
        this.houseKeepingCallback = callback;
    }

    // Expose isLeader method from RaftGroup
    isLeader() {
        return this.raftGroup.isLeader();
    }

    houseKeeping() {
       if(this.houseKeepingCallback) {
           this.houseKeepingCallback();
       }
    }

    close() {
        // Close rqlite connection
        this.raftGroup.close();
    }

}