const BaseTransport = require("./BaseTransport");

const clientCache = {}
module.exports = class WsTransport extends BaseTransport {

  constructor(address) {
    super(address);
    this.io = require('socket.io')(COMMAND_SOCKET_WS_PORT)
    this.ioClient = require('socket.io-client').io
    this.io.on('connection', (socket) => {
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
  
  getProtocol() {
    return 'ws'
  }

  createWebSocketClient(url) {        
    const ws = new this.ioClient(url)    
    ws.on('message', function incoming(data) {
        console.log(data)
        this.receiveCallback(JSON.parse(data).data)
    })
    return ws
}

  transportMessage(message, destination) {
    console.log('WsTransport::send', message, destination)
    if (!clientCache[url]) {
      clientCache[url] = this.createWebSocketClient(url)
    }        
    clientCache[url].emit('command', message)
  }

  close() {
    console.log('WsTransport::close (unimplemented)')
    this.io.close()
  }
}