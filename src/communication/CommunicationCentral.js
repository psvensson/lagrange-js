const {COMMANDS} = require('../commands/BaseCommand');
module.exports = class CommunicationCentral {
    constructor() {
        this.transportsCache = {};
        this.commandCallbacks = {};
        this.outstandingRequests = {}        
    }

    registerTransport(protocol, transport) {
        transport.registerCallback(this.handleMessage.bind(this));
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
        console.log('--- registered command callbacks')
        console.dir(this.commandCallbacks)
        console.log('---')
        message.commandName === COMMANDS.REPLY ? 
            this.outstandingRequests[message.requestId].resolve(message.data) :
            this.commandCallbacks[message.commandName](message.data);
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