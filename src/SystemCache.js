
const MessagingLayer = require('./MessagingLayer');

// The SystemCache is the base class for all cache classes. It defines the Cache API and le the subclasses handle implementation details.
module.exports = class SystemCache {
    static UPDATE_SYSTEM = 'UPDATE_SYSTEM';
    static WILDACRD_DESTINATION = '*';

    cacheName = 'Undefined Cache Name';
    static messageLayer = null; // The assigned messagegroup for this node, set a bit after init, but before we need to send anything

    static setMessageLayer(messageLayer) {
        console.log('SystemCache::setMessageLayer setting mesageLayer:')
        console.dir(messageLayer)
        this.messageLayer = messageLayer;
    }

    static getMessageLayer() {
        return SystemCache.messageLayer;
    }

    constructor(messageLayer, initialData) {
        this.messageLayer = messageLayer;
        this.cache = initialData ? JSON.parse(initialData) : {};        
    }

    // Get the value of a key in the cache
    get(key) {
        return this.cache[key];
    }

    // Set the value of a key in the cache
    set(key, value) {
        this.cache[key] = value;
        this.updateSystem(this.cacheName, key, value)
    }

    // Delete the value of a key in the cache
    delete(key) {
        delete this.cache[key];
    }

    // Check if a key exists in the cache
    has(key) {
        return this.cache[key] !== undefined;
    }

    // Get all keys in the cache
    keys() {
        return Object.keys(this.cache);
    }

    // Get all values in the cache
    values() {
        return Object.values(this.cache);
    }

    // Get all key-value pairs in the cache
    entries() {
        return Object.entries(this.cache);
    }

    // Clear the cache
    clear() {
        this.cache = {};
    }

    // Update the system with the cache changes using the messageLayer of the node  
    updateSystem(cacheName, key, value) {
        const messageLayer = SystemCache.getMessageLayer();
        // Perform update
        const updateOtherNodes = MessagingLayer.createCommand(SystemCache.UPDATE_SYSTEM, {cacheName, key, value});
        messageLayer.sendMessage(updateOtherNodes, SystemCache.WILDACRD_DESTINATION);
    }

    // serialize cache into write format, so it can be sent to a new peer
    serialize() {
        return JSON.stringify(this.cache);
    }

}