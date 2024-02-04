const WsTransport = require('./WsTransport');


module.exports = class CommunicationCentral {
    constructor(ipAddress) {
        this.ipAddress = ipAddress;
        this.transportsCache = {};
        this.commandCallbacks = {};
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
        console.log('CommunicationCentral: Checking if command '+message.command+' is registered')
        if (this.commandCallbacks[message.command]) {
            console.log('CommunicationCentral: Executing callback for command', message.command);
            console.dir(message)            
            this.commandCallbacks[message.command](message.data);
        } else {
            console.log('CommunicationCentral: No callback registered for command', message.command);
        }

    }

    getTransportFromUrl(url) {
        const protocol = url.split(':')[0];
        if (!this.transportsCache[protocol]) {
            throw new Error('CommunicationCentral: Unknown transport');
        }
        return this.transportsCache[protocol];
    }

    async send(url, command) {
        this.getTransportFromUrl(url).send(url, command.stringify());
    }
}