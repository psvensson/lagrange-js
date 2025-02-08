const BaseTransport = require("./BaseTransport");
const logger = require('../logger');

const clientCache = {}
module.exports = class WsTransport extends BaseTransport {

  constructor(address) {
    super(address);
    this.io = require('socket.io')(COMMAND_SOCKET_WS_PORT)
    this.ioClient = require('socket.io-client').io
    this.io.on('connection', (socket) => {
      logger.log('WsTransport::connection', socket.id)
      socket.on('command', (command) => {
        logger.log('WsTransport::command', command)
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
        logger.log(data)
        this.receiveCallback(JSON.parse(data).data)
    })
    return ws
}

  async transportMessage(message, destination) {
    logger.log('WsTransport::send', message, destination)
    if (!clientCache[url]) {
      clientCache[url] = this.createWebSocketClient(url)
    }        
    clientCache[url].emit('command', message)
  }

  close() {
    logger.log('WsTransport::close (unimplemented)')
    this.io.close()
  }
}