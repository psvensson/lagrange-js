const BaseTransport = require('../../src/communication/BaseTransport')
const SystemCache = require('../../src/cache/SystemCache')

const COMMAND_SOCKET_MOCK_PORT = 987654321


module.exports = class MockTransport extends BaseTransport {
  static localNodes = {}

  constructor(ipAddress) {

    super(ipAddress)
    if (!MockTransport.localNodes[ipAddress]) {
        // Save each instance of mocktransport in the static localNodes object
        // This way any message send can directly look up the receiver and call its receie callback directly
      MockTransport.localNodes[ipAddress] = this
    }
  }

  getAddress() {
    return `mock://${this.address}:${COMMAND_SOCKET_MOCK_PORT}`
  }

  getProtocol() {
    return 'mock'
  }

  async transportMessage(message, destination) {
    console.log('MockTransport::transportMessage', message, destination)       
    if(destination === SystemCache.WILDACRD_DESTINATION) {
        // If the destination is a wildcard, call the receive callback of all the receivers
      console.log('MockTransport not implementing wildcard destination')
    } else {
      //const extractedAddress = destination.match(/\/\/([^\/]+)/)[1]
      console.log('MockTransport::transportMessage extractedAddress:', destination)
      // Find the previously registered receiver and call its receive callback
      //console.log('registered mock nodes are;')
      //console.dir(MockTransport.localNodes)
      const found = MockTransport.localNodes[destination]
      //console.log('found is;')
      //console.dir(found)
      found.receiveCallback(message)
    }    
  }

  close() {
    console.log('MockTransport::close (unimplemented)')
  }
}