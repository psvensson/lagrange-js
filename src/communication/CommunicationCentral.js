
const WsTransport = require('./WsTransport');

module.exports = class CommunicationCentral {
    constructor(ipAddress) {
        this.ipAddress = ipAddress;
        this.transportsCache = {};
        this.commandCallbacks = {};
        this.outstandingRequests = {}
        //
        this.transportsCache['ws'] = new WsTransport(this.ipAddress, this.handleMessage);
    }

    registerTransport(protocol, transport) {
        this.transportsCache[protocol] = transport;
    }

    // Returns an array of addresses
    getAddresses() {
        return Object.values(this.transportsCache).map(transport => transport.getAddress());
    }

    registerCommand(command, callback) {
        this.commandCallbacks[command] = callback;
    }

    handleMessage(message) {
        console.log('CommunicationCentral: Received message', message);
        console.dir(message)
        message.command === 'Reply' ? 
            this.outstandingRequests[message.requestId].resolve(message.data) :
            this.commandCallbacks[message.command](message.data);
    }

    getTransportFromUrl(url) {
        const protocol = url.split(':')[0];
        if (!this.transportsCache[protocol]) {
            throw new Error('CommunicationCentral: Unknown transport');
        }
        return this.transportsCache[protocol];
    }

    send(url, command) {        
        this.getTransportFromUrl(url).send(url, command);
        const promise = new Promise((resolve, reject) => {
            this.outstandingRequests[command.requestId] = {
                resolve,
                reject
            };
        });
        return promise
    }


}