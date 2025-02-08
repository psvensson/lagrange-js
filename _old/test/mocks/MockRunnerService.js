const {RaftRunnerService} = require('raft-sqlite')
const sqlite3 = require('sqlite3').verbose();

const db = new sqlite3.Database(':memory');

// The MockRunnerService mocks a raft group, but only uses a local in-memory sqlite db.
// So any instances of this class will share the same db and so 'replicate'
module.exports = class MockRunnerService extends RaftRunnerService{
    constructor(options) {
        const { id, path, port, peers, ipAddress, stateChangeCallback, raftStateCallback, fileName, stateErrorCallback } = options;
        this.stateErrorCallback = stateErrorCallback
        this.stateChangedCallback = stateChangeCallback
        
        this.raftRunner = {
            isLeader: ()=>{{
                return true
            }},
            changeStateMachine: (query)=>{
                db.all(query, function callback(err, rows){
                    if(err){
                        console.log('.... MockRunnerService SQL StateMachine handle: err = ', err)
                        if(this.stateErrorCallback){
                            this.stateErrorCallback(query, err)
                        }
                        reject(err)
                    } else {
                        logger.log('.... MockRunnerServiceSQL StateMachine handle: success; ', this)
                        logger.dir(rows)
                        if(this.stateChangedCallback){
                            this.stateChangedCallback(query, rows)
                        }
                        resolve(rows)
                    }
                })
            },
        }
    }

    // Not used at the moment, since we're always the leader, so should not be called. Just keep an eye on it
    async routeQueryToLeader(query) {
        logger.log('.... MockRunnerService --- routeQueryToLeader')        
    }

    
}