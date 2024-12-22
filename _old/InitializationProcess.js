const makeEnums = require('./DoNotCreateAFileCalledUtils').makeEnums
const { RaftRunnerService } = require('raft-sqlite')

// This class is a state machine which uses a primordial raft-sqlite cluster comprised of the first three peers to initialize the system.

const INIT_STATES = makeEnums([
    'STARTING',
    'CREATED_SYSTEM_TABLES',
    'CREATED_SYSTEM_PARTITIONS',
    'CREATED_SYSTEM_NODES',
    'UPDATED_TABLES',
    'UPDATED_PARTITIONS',
    'UPDATED_NODES',
    'FINISHED'])

const PRIMORDIAL_PORT = 5000

module.exports = class IitiaöizationProcess {
    constructor(id, peers, ipAddress) {
        this.peers = peers;
        this.raftRunnerService = new RaftRunnerService({
            peers,
            port: PRIMORDIAL_PORT,
            id,
            ipAddress,
            stateChangeCallback: this.stateChangeCallback,
            raftStateChangeCallback: this.raftStateCallback, stateErrorCallback: this.stateErrorCallback
        })
        this.state = INIT_STATES.STARTING
        // Create an array with state objects, which maps the INIT_STATES to the coresponding method to call
        this.stateMethods = [
            this.createSystemTables,
            this.createSystemPartitions,
            this.createSystemNodes,
            this.updateTables,
            this.updatePartitions,
            this.updateNodes
        ]
    }

    // The first elected leader of the primoridal raft group starts the initialization process
    raftStateCallback = (state) => {
        this.raftState = state
        if (this.raftRunnerService.raftRunner.isLeader()) {
            this.createStateTableIfNotExists().then(() => {
                this.stepMethod()
            })
        }
    }

    createStateTableIfNotExists = () => {
        return new Promise((resolve, reject) => {
            const query = `CREATE TABLE IF NOT EXISTS state (id INTEGER PRIMARY KEY, state TEXT)`
            this.raftRunnerService.queryHandler(query).then(() => {
                resolve()
            }).catch((err) => {
                reject(err)
            })
        })
    }

    stepMethod = () => {
        // Get state from state table (if any state is stored), otherwise use INIT_STATES.STARTING
        this.raftRunnerService.queryHandler('SELECT * FROM state').then((rows) => {
            if (rows.length > 0) {
                this.state = rows[rows.length - 1].state
            }
            this.stateMethods[this.state]()
            // Bump state and store in the state table
            this.state++
            this.raftRunnerService.queryHandler(`INSERT INTO state (state) VALUES ('${this.state}')`).then(() => {
                // We continue if we are still leader. Otherwise another primordial node have been elected and will the continue the process
                if (!this.raftRunnerService.raftRunner.isLeader()) {
                    return
                }
                this.stepMethod()
            }).catch((err) => {
                console.log(err)
            })
        }).catch((err) => {
            console.log(err)
        })
    }

    stateChangeCallback = (state) => {
        this.state = state
    }

    stateErrorCallback = (error) => {
        console.log(error)
    }

    createSystemTables = () => {
        this.raftRunnerService.createSystemTables()
    }

    createSystemPartitions = () => {
        this.raftRunnerService.createSystemPartitions()
    }

    createSystemNodes = () => {
        this.raftRunnerService.createSystemNodes()
    }

    updateTables = () => {
        this.raftRunnerService.updateTables()
    }

    updatePartitions = () => {
        this.raftRunnerService.updatePartitions()
    }

    updateNodes = () => {
        this.raftRunnerService.updateNodes()
    }


}