const BaseTransport = require("../../src/communication/BaseTransport");
const WebSocket = require('ws')

const COMMAND_SOCKET_MOCK_PORT = 987654321


module.exports = class MockTransport extends BaseTransport {
  static localNodes = {}

  constructor(ipAddress, receiveCallback) {
    super(ipAddress, receiveCallback);
    const extractedAddress = ipAddress.match(/\d+\.\d+\.\d+\.\d+/)
    if (extractedAddress) {
      MockTransport.localNodes[extractedAddress[0]] = this
    }
  }

  getAddress() {
    return `mock://${this.ipAddress}:${COMMAND_SOCKET_MOCK_PORT}`
  }

  getProtocol() {
    return 'mock'
  }

  send(url, data) {
    console.log('MockTransport::send', url, data)   
    const extractedAddress = url.match(/\d+\.\d+\.\d+\.\d+/)
    console.log('xtractedAddress: ', extractedAddress[0])
    MockTransport.localNodes[extractedAddress[0]].receiveCallback(data)
  }

  close() {
    console.log('MockTransport::close (unimplemented)')
  }
}