const BaseTransport = require("./BaseTransport");

const COMMAND_SOCKET_WS_PORT = 3344

const clientCache = {}

const io = require('socket.io')(COMMAND_SOCKET_WS_PORT)
const ioClient = require('socket.io-client').io


module.exports = class WsTransport extends BaseTransport {
  constructor(ipAddress, receiveCallback) {
    super(ipAddress, receiveCallback);
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

  createWebSocketClient(url) {        
    const ws = new ioClient(url)    
    ws.on('message', function incoming(data) {
        console.log(data)
        this.receiveCallback(JSON.parse(data).data)
    })
    return ws
}

  send(url, command) {
    console.log('WsTransport::send', url, command)
    if (!clientCache[url]) {
      clientCache[url] = this.createWebSocketClient(url)
    }    
    const data = {
      command: command.constructor.name,
      requestId: command.requestId,
      data: command.data
    }
    clientCache[url].emit('command', data)
  }

  close() {
    console.log('WsTransport::close (unimplemented)')
    io.close()
  }
}