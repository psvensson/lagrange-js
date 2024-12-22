const {COMMANDS} = require('../../src/commands/BaseCommand');
module.exports = class CommunicationCentral {
    constructor() {
        this.transportsCache = {};
        this.commandCallbacks = {};
        this.outstandingRequests = {}        
    }

    registerTransport(transport) {
        transport.registerCallback(this.handleCommand.bind(this));
        const protocol = transport.getProtocol();
        this.transportsCache[protocol] = transport;
    }

    // Returns an array of addresses
    getAddresses() {
        return Object.values(this.transportsCache).map(transport => transport.getAddress());
    }

    registerCommand(command, callback) {
        this.commandCallbacks[command] = callback;
    }

    handleCommand(command) {
        console.log('CommunicationCentral: Received command', command);
        console.dir(command)
        //console.log('--- registered command callbacks')
        //console.dir(this.commandCallbacks)
        //console.log('---')
        command.commandName === COMMANDS.REPLY ? 
            this.outstandingRequests[command.requestId].resolve(command.data) :
            this.commandCallbacks[command.commandName](command.data);
    }

    getTransportFromUrl(url) {
        const protocol = url.split(':')[0];
        if (!this.transportsCache[protocol]) {
            throw new Error('CommunicationCentral: Unknown transport: "'+protocol+'"');
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