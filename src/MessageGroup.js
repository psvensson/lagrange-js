const RaftGroup = require("./RaftGroup");

// TODO: Create superclass for this class so it can be mocked
// The MessageGroup has no system table and is instead stored as a property of the Node property in its system table
module.exports = class MessageGroup extends RaftGroup{

    houseKeepingCallback = null;

    constructor(raftGroupImplementation) {
        super(raftGroupImplementation);
        // Create rqlite table for messages, to hold messageId, messageName, serialized context (if any), name of callback to invoke, creation time, and number of resends
        const sqlStatement = "CREATE TABLE IF NOT EXISTS messages (messageId TEXT PRIMARY KEY, messageName TEXT, context TEXT, callback TEXT, creationTime TEXT, resends INTEGER)";
        return new Promise((resolve, PromiseRejectionEvent) => {
            this.raftGroupImplementation.executeQuery(sqlStatement).then(() => {
                resolve(this);
            });
        })
    }

    // Expose raftgroup implementation to system caches to implement their own tables and access needed
    getRaftGroupImplementation(){
        return this.raftGroupImplementation;
    }
    
    /* Message format:
    {
        requestId: uuids.v4(),
        messageName: messageName,
        data: data
    }*/

    listTables(){
        const sqlStatement = "SELECT name FROM sqlite_master WHERE type='table'";        
        this.raftGroupImplementation.executeQuery(sqlStatement).then((tables) => {
            console.log('=========================================================================================================== Sqlite tables:')
            console.log(tables);
        })
    }
    
    listAllMessages(){
        const sqlStatement = "SELECT * FROM messages";
        this.raftGroupImplementation.executeQuery(sqlStatement).then((messages) => {
            console.log('=========================================================================================================== All messages:')
            console.log(messages);
        })
    }

    // The messages are sent for two reasons; 1) To have the current leader be able toresend them and 2) to let any node in the message raft group be able to load context and execute handler code when an ack is received
    saveMessage(message, context, callbackName) {        
        // Save message in rqlite table
        const creationTime = new Date().toISOString();
        const resends = 0;
        const sqlStatement = `INSERT INTO messages (messageId, messageName, context, callback, creationTime, resends) VALUES ('${message.requestId}', '${message.messageName}', '${context}', '${callbackName}', '${creationTime}', ${resends})`;
        return this.raftGroupImplementation.executeQuery(sqlStatement);
    }

    findMessageByMessageId(messageId) {
        console.log('-------------------------------------------findMessageByMessageId-------------------------------------------')
        this.listAllMessages();
        // Find message in rqlite table and return it
        const sqlStatement = `SELECT * FROM messages WHERE messageId = "${messageId}"`;
        return this.raftGroupImplementation.executeQuery(sqlStatement);
    }

    incrementResendsForMessage(messageId) {
        // Increment resends for message in rqlite table
        const sqlStatement = `UPDATE messages SET resends = resends + 1 WHERE messageId = "${messageId}"`;
        this.raftGroupImplementation.executeQuery(sqlStatement);
    }

    removeMessageByMessageId(messageId) {
        // Remove message from rqlite table
        const sqlStatement = `DELETE FROM messages WHERE messageId = "${messageId}"`;
        this.raftGroupImplementation.executeQuery(sqlStatement);
    }

    getUnacknowledgedMessages() {
        // Find all messages in rqlite table where resends < MAX_RESENDS
        const sqlStatement = `SELECT * FROM messages WHERE resends < ${RaftGroup.MAX_RESENDS}`;
        return this.raftGroupImplementation.executeQuery(sqlStatement);
    }

    setHouseKeepingCallback(callback) {
        this.houseKeepingCallback = callback;
    }

    // Expose isLeader method from RaftGroup
    isLeader() {
        return this.raftGroupImplementation.isLeader();
    }

    houseKeeping() {
       if(this.houseKeepingCallback) {
           this.houseKeepingCallback();
       }
    }

    close() {
        // Close rqlite connection
        this.raftGroupImplementation.close();
    }

}