const SystemCache = require('./SystemCache');

module.exports = class atencyZonesCache extends SystemCache {
    constructor(messageLayer, initialData) {
        super(messageLayer, initialData);
        this.cacheName = 'LatencyZonesCache';       
    }
}