const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const RaftImplementation = require("./RaftImplementation");

// Starts a new instance of rqlite using Docker on the local node
module.exports = class RqliteRaftImplementation extends RaftImplementation {

    constructor(raftNodeAddress, peerAddresses) {
        // Start a rqlite docker container on the local node, with the raftNodeAddress as external address and peerAddresses as the list of peers
        docker.run('rqlite', ['rqlited', '-raft', '-http-addr', raftNodeAddress, '-raft-addr', raftNodeAddress, '-raft-peers', peerAddresses.join(',')], process.stdout, {name: 'rqlite_${uniqueName}'}, function (err, data, container) {
            console.log('RqliteRaftImplementation constructor statusCode = ',data.StatusCode);
            if(err){
                console.log('RqliteRaftImplementation constructor error = ',err);
            } else {
                this.container = container;
            }
        });
    }

    close(){
        // Close the rqlite instance
        // Use docker to stop the container with the name 'rqlite'
        docker.listContainers(function (err, containers) {
            if(err){
                console.log('RqliteRaftImplementation close error = ',err);
            }
            containers.forEach(function (containerInfo) {
                if (containerInfo.Names.includes('/rqlite_${this.uniqueName}')) {
                    const container = docker.getContainer(containerInfo.Id);
                    container.stop(function (err, data) {
                        console.log('RqliteRaftImplementation close result = ',data);
                        if(err){
                            console.log('RqliteRaftImplementation close error = ',err);
                        }
                    });
                }
            });
        });
    }   

    // execute query using the rqlite command inside the running container
    executeQuery(query) {
        return new Promise((resolve, reject) => {
            this.container.inspect((err, data) => {
                if (err) {
                    console.log('RqliteRaftImplementation executeQuery error = ', err);
                    reject(err);
                } else {
                    const port = Object.keys(data.NetworkSettings.Ports)[0].split('/')[0];
                    this.container.exec({
                        Cmd: ['rqlite', 'query', `http://${this.raftNodeAddress}:${port}`, query],
                        AttachStdout: true,
                        AttachStderr: true
                    }, (err, exec) => {
                        if (err) {
                            console.log('RqliteRaftImplementation executeQuery error = ', err);
                            reject(err);
                        } else {
                            exec.start((err, stream) => {
                                if (err) {
                                    console.log('RqliteRaftImplementation executeQuery error = ', err);
                                    reject(err);
                                } else {
                                    let output = '';
                                    stream.on('data', (chunk) => {
                                        output += chunk.toString();
                                    });
                                    stream.on('end', () => {
                                        resolve(output);
                                    });
                                }
                            });
                        }
                    });
                }
            });
        });
    }

}