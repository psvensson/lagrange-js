
module.exports = class BaseTransport {
    constructor(address) {
        this.address   = address;
    }

    getAddress() {
        return this.address
    }
  

    getProtocol() {
        console.log('*** BaseTransport.getProtocol NOT OVERRIDDEN')
    }

    registerCallback(callback) {
        this.receiveCallback = callback;
    }

    async transportMessage(message, destination) {
        console.log('*** BaseTransport.send NOT OVERRIDDEN')
    }
    
    async close() {
        console.log('*** BaseTransport.close NOT OVERRIDDEN')
    }
};