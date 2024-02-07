const CommunicationCentral = require('../src/communication/CommunicationCentral');
const WsTransport = require('../src/communication/WsTransport');
const MockCommand = require('./mocks/MockCommand');
const MockTransport = require('./mocks/MockTransport');

describe('CommunicationCentral', () => {
    it('should be able to create a new instance', () => {
        const communicationCentral = new CommunicationCentral('127.0.0.1');
        expect(communicationCentral).toBeDefined();
    });

    it('should be able to register a transport', () => {
        const communicationCentral = new CommunicationCentral('127.0.0.1');
        const wsTransport = new WsTransport('127.0.0.1', () => {});
        communicationCentral.registerTransport('ws', wsTransport);
        expect(communicationCentral.transportsCache['ws']).toBe(wsTransport);
    });

    it('should be able to get the addresses of all transports', () => {
        const communicationCentral = new CommunicationCentral('127.0.0.1');
        const wsTransport = new WsTransport('127.0.0.1', () => {});
        communicationCentral.registerTransport('ws', wsTransport);
        const addresses = communicationCentral.getAddresses();
        expect(addresses).toContain(wsTransport.getAddress());
        wsTransport.close();
    });

    it('should be able to register a command callback', () => {
        const communicationCentral = new CommunicationCentral('127.0.0.1');
        const callback = jest.fn();
        communicationCentral.registerCommand('test', callback);
        expect(communicationCentral.commandCallbacks['test']).toBe(callback);
    });

    it('should be able to handle a message', () => {
        const communicationCentral = new CommunicationCentral('127.0.0.1');
        const callback = jest.fn() 
        communicationCentral.registerCommand('test', callback);
        communicationCentral.registerTransport('mock', new MockTransport());
        const message = {
            command: 'test',
            data: {some:'test data'}
        };        
        communicationCentral.handleMessage(message);
        expect(callback).toHaveBeenCalledWith({some:'test data'});
    });

    it('should be able to get a transport from a url', () => {
        const communicationCentral = new CommunicationCentral('127.0.0.1');
        const mockTransport = new MockTransport();
        communicationCentral.registerTransport('mock', mockTransport);       
        const transport = communicationCentral.getTransportFromUrl('mock://127.0.0.1');
        expect(transport).toBe(mockTransport);
    });

    it('should be able to send a message', async () => {
        const communicationCentral = new CommunicationCentral('127.0.0.1');
        const callback = jest.fn((data) => console.log('callback', data)) 
        const mockTransport = new MockTransport('127.0.0.1', callback);
        const mockTransportSend = jest.spyOn(mockTransport, 'send');
        communicationCentral.registerTransport('mock', mockTransport);
        const command = new MockCommand( 'test data');
        communicationCentral.send('mock://127.0.0.1', command);
        expect(mockTransportSend).toHaveBeenCalledWith('mock://127.0.0.1', expect.objectContaining({
            command: "MockCommand",
            data: "test data"
          }) );
    });
});