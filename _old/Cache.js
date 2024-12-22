

module.exports = class Cache {
    constructor() {
        this.nodeCache = {};
    }

    setNodeInfo(key, value) {
        this.nodeCache[key] = value;
    }

    getNodeInfo(key) {
        return this.nodeCache[key];
    }
}