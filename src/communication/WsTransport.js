const BaseTransport = require("./BaseTransport");

const COMMAND_SOCKET_WS_PORT = 3344

const clientCache = {}

const io = require('socket.io')(COMMAND_SOCKET_WS_PORT)
const ioClient = require('socket.io-client').io


module.exports = class WsTransport extends BaseTransport {
  constructor(address) {
    super(address);
    io.on('connection', (socket) => {
      console.log('WsTransport::connection', socket.id)
      socket.on('command', (command) => {
        console.log('WsTransport::command', command)
        const result = this.receiveCallback(command.data)
        socket.emit('command', {
          command: 'Reply',
          requestId: command.requestId,
          data: result
        })
      })
    })
  }

  getAddress() {
    return `ws://${this.ipAddress}:${COMMAND_SOCKET_WS_PORT}`
  }

  getProtocol() {
    return 'ws'
  }

  createWebSocketClient(url) {        
    const ws = new ioClient(url)    
    ws.on('message', function incoming(data) {
        console.log(data)
        this.receiveCallback(JSON.parse(data).data)
    })
    return ws
}

  send(message, destination) {
    console.log('WsTransport::send', message, destination)
    if (!clientCache[url]) {
      clientCache[url] = this.createWebSocketClient(url)
    }        
    clientCache[url].emit('command', message)
  }

  close() {
    console.log('WsTransport::close (unimplemented)')
    io.close()
  }
}