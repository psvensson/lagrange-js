const SystemCache = require('./SystemCache');

module.exports = class NodesCache extends SystemCache {

    addNode(externalAddress, node) {
        this.set(externalAddress, node)
    }
}