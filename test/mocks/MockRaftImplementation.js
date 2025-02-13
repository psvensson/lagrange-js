const RaftImplementation = require('../../src/RaftImplementation');
const sqlite3 = require('sqlite3');

const logger = require('../../src/logger');

// An subclass of RaftImplementation which uses an in-memory sqlite database to execute queries
module.exports = class MockRaftImplementation extends RaftImplementation {
    
    constructor(raftNodeAddress, peerAddresses) {
        super(raftNodeAddress, peerAddresses);
        this.db = new sqlite3.Database(':memory:');        
    }

    executeQuery(query){
        logger.log('MockRaftImplementation::executeQuery query: %o ', query)
        return new Promise((resolve, reject) => {
            this.db.all(query, [], (err, rows) => {
                if (err) {
                    reject(err);
                    throw new Error(err)
                } else {
                    resolve(rows);
                }
            });
        });
    }

    status(){
        return "leader ok";
    }

    close(){
        this.db.close();
    }
}