const BaseTransport = require('../src/transport/BaseTransport')

const COMMAND_SOCKET_MOCK_PORT = 987654321


module.exports = class MockTransport extends BaseTransport {
  static localNodes = {}

  constructor(ipAddress, receiveCallback) {
    this.receiveCallback = receiveCallback
    if (MockTransport.localNodes[ipAddress]) {
        // Save each instance of mocktransport in the static localNodes object
        // This way any message send can directly look up the receiver and call its receie callback directly
      MockTransport.localNodes[ipAddress] = this
    }
  }

  getAddress() {
    return `mock://${this.ipAddress}:${COMMAND_SOCKET_MOCK_PORT}`
  }

  getProtocol() {
    return 'mock'
  }

  send(message, destination) {
    console.log('MockTransport::send', message, destination)   
    const extractedAddress = destination.match(/\d+\.\d+\.\d+\.\d+/)
    console.log('xtractedAddress: ', extractedAddress[0])
    // Find the previously registered receiver and call its receive callback
    MockTransport.localNodes[extractedAddress[0]].receiveCallback(message)
  }

  close() {
    console.log('MockTransport::close (unimplemented)')
  }
}