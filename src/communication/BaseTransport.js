

module.exports = class BaseTransport {
    constructor(address) {
        this.address   = address;
    }

    getProtocol() {
        console.log('*** BaseTransport.getProtocol NOT OVERRIDDEN')
    }

    registerCallback(callback) {
        this.receiveCallback = callback;
    }

    async send(url, command) {
        console.log('*** BaseTransport.send NOT OVERRIDDEN')
    }
    
    async close() {
        console.log('*** BaseTransport.close NOT OVERRIDDEN')
    }
};