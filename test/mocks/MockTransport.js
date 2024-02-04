const BaseTransport = require("../../src/communication/BaseTransport");
const WebSocket = require('ws')

const COMMAND_SOCKET_MOCK_PORT = 987654321

module.exports = class WsTransport extends BaseTransport {
  constructor(ipAddress, receiveCallback) {
    super(ipAddress, receiveCallback);
    
  }

  getAddress() {
    return `mock://${this.ipAddress}:${COMMAND_SOCKET_MOCK_PORT}`
  }

  send(url, data) {
    console.log('MockTransport::send', url, data)    
    this.receiveCallback(JSON.parse(data).data)
  }

  close() {
    console.log('MockTransport::close (unimplemented)')
  }
}