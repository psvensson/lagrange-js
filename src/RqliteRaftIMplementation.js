const Docker = require('dockerode');
const docker = new Docker({ socketPath: '/var/run/docker.sock' });

const RaftImplementation = require("./RaftImplementation");

// Starts a new instance of rqlite using Docker on the local node
module.exports = class RqliteRaftIMplementation extends RaftImplementation{
    constructor(uniqueName, raftNodeAddress, peerAddresses) {
        // Start a rqlite docker container on the local node, with the raftNodeAddress as external address and peerAddresses as the list of peers
        docker.run('rqlite', ['rqlited', '-raft', '-http-addr', raftNodeAddress, '-raft-addr', raftNodeAddress, '-raft-peers', peerAddresses.join(',')], process.stdout, {name: 'rqlite_${uniqueName}'}, function (err, data, container) {
            console.log(data.StatusCode);
        });
    }

    close(){
        // Close the rqlite instance
        // Use docker to stop the container with the name 'rqlite'
        docker.listContainers(function (err, containers) {
            containers.forEach(function (containerInfo) {
                if (containerInfo.Names.includes('/rqlite_${uniqueName}')) {
                    const container = docker.getContainer(containerInfo.Id);
                    container.stop(function (err, data) {
                        console.log(data);
                    });
                }
            });
        });
    }   
}