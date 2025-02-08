const logger = require('../logger');
module.exports = class BaseTransport {
    constructor(address) {
        this.address   = address;
    }

    getAddress() {
        return this.address
    }
  

    getProtocol() {
        logger.log('*** BaseTransport.getProtocol NOT OVERRIDDEN')
    }

    registerCallback(callback) {
        this.receiveCallback = callback;
        //logger.log('*** BaseTransport.registerCallback executed')
    }

    async transportMessage(message, destination) {
        logger.log('*** BaseTransport.send NOT OVERRIDDEN')
    }
    
    async close() {
        logger.log('*** BaseTransport.close NOT OVERRIDDEN')
    }
};