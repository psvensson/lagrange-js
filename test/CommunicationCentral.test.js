const CommunicationCentral = require('../src/communication/CommunicationCentral');
const WsTransport = require('../src/communication/WsTransport');
const {COMMANDS, createCommand} = require('../src/commands/BaseCommand');
const MockTransport = require('./mocks/MockTransport');

describe('CommunicationCentral', () => {
    it('should be able to create a new instance', () => {
        const communicationCentral = new CommunicationCentral();
        expect(communicationCentral).toBeDefined();
    });

    it('should be able to register a transport', () => {
        const communicationCentral = new CommunicationCentral();
        const wsTransport = new WsTransport('127.0.0.1');
        communicationCentral.registerTransport(wsTransport);
        expect(communicationCentral.transportsCache['ws']).toBe(wsTransport);
    });

    it('should be able to get the addresses of all transports', () => {
        const communicationCentral = new CommunicationCentral();
        const wsTransport = new WsTransport('127.0.0.1', () => {});
        communicationCentral.registerTransport(wsTransport);
        const addresses = communicationCentral.getAddresses();
        expect(addresses).toContain(wsTransport.getAddress());
        wsTransport.close();
    });

    it('should be able to register a command callback', () => {
        const communicationCentral = new CommunicationCentral();
        const callback = jest.fn();
        communicationCentral.registerCommand('test', callback);
        expect(communicationCentral.commandCallbacks['test']).toBe(callback);
    });

    it('should be able to handle a message', () => {
        const communicationCentral = new CommunicationCentral();    
        communicationCentral.registerTransport(new MockTransport('x.x.x.1'));
        const command = createCommand(COMMANDS.MOCK, 'test data');      
        const commandCallback = jest.fn((data) => console.log('mock transport callback', data)) 
        communicationCentral.registerCommand(COMMANDS.MOCK, commandCallback);
        communicationCentral.handleCommand(command);
        expect(commandCallback).toHaveBeenCalledWith('test data');
    });

    it('should be able to get a transport from a url', () => {
        const communicationCentral = new CommunicationCentral();
        const mockTransport = new MockTransport('x.x.x.1');
        communicationCentral.registerTransport(mockTransport);       
        const transport = communicationCentral.getTransportFromUrl('mock://127.0.0.1');
        expect(transport).toBe(mockTransport);
    });

    it('should be able to send a message', async () => {
        const communicationCentral = new CommunicationCentral();
        const callback = jest.fn((data) => console.log('mock transport callback', data)) 
        const mockTransport = new MockTransport('127.0.0.1', callback);
        const mockTransportSend = jest.spyOn(mockTransport, 'send');
        communicationCentral.registerTransport(mockTransport);
        const command = createCommand(COMMANDS.MOCK, 'test data');
        const commandCallback = jest.fn((data) => console.log('mock transport callback', data)) 
        communicationCentral.registerCommand(COMMANDS.MOCK, commandCallback);
        communicationCentral.send('mock://127.0.0.1', command);
        expect(mockTransportSend).toHaveBeenCalledWith('mock://127.0.0.1', expect.objectContaining({
            commandName: COMMANDS.MOCK,
            data: "test data"
          }) );
    });

    it('should be able to register two transports with different addresses and send a command from one to the other', async () => {
        const communicationCentral = new CommunicationCentral();
        const callback1 = jest.fn((data) => console.log('mock 1 transport callback', data)) 
        const callback2 = jest.fn((data) => console.log('mock 2 transport callback', data)) 
        const mockTransport1 = new MockTransport('127.0.0.1', callback1);
        const mockTransport2 = new MockTransport('127.0.0.2', callback2);
        const mockTransportSend1 = jest.spyOn(mockTransport1, 'send');
        const mockTransportSend2 = jest.spyOn(mockTransport2, 'send');
        communicationCentral.registerTransport(mockTransport1);
        communicationCentral.registerTransport(mockTransport2);
        const command = createCommand(COMMANDS.MOCK, 'test data');
        const commandCallback = jest.fn((data) => console.log('command callback', data))
        communicationCentral.registerCommand(COMMANDS.MOCK, commandCallback);
        communicationCentral.send('mock://127.0.0.1', command);
        expect(commandCallback).toHaveBeenCalledWith("test data")        
    }); 
});