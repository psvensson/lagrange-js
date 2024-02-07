

module.exports = class BaseTransport {
    constructor(ipAddress, receiveCallback) {
        this.ipAddress   = ipAddress;
        this.receiveCallback = receiveCallback;
    }

    async send(url, command) {
        console.log('*** BaseTransport.send NOT OVERRIDDEN')
    }
    
    async close() {
        console.log('*** BaseTransport.close NOT OVERRIDDEN')
    }
};