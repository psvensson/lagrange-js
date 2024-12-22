const yargs = require('yargs/yargs')
const { hideBin } = require('yargs/helpers')

const NodeManager = require('../_old/NodeManager');
const WebSocketTransport = require('./communication/WsTransport');

const argv = yargs(hideBin(process.argv)).argv

const arg_peers = argv.peers ? JSON.parse(argv.peers) : []
const arg_ipAddress = argv.ip ?  argv.ip : undefined

const nodeManager = new NodeManager(arg_peers);
const wsTransport = new WebSocketTransport(arg_ipAddress);
nodeManager.openCommunication([wsTransport]);