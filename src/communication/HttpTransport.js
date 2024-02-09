// FILEPATH: /media/peter/4509da27-4751-4dee-b366-f3983d077725/peter/projects/lagrange-js/src/communication/transports/ExpressTransport.js
const express = require('express');
const axios = require('axios');

class HttpTransport {
  constructor(address, port = 3000) {
    super(address)
    this.app = express();
    this.app.use(express.json());
    this.app.post('/', this.handleRequest.bind(this));
    this.app.listen(port);
  }

  getProtocol() {
    return 'http';
  } 

  handleRequest(req, res) {
    this.receiveCallback(req.body);
    res.sendStatus(200);
  }

  async send(targetUrl, message) {
    try {
      await axios.post(targetUrl, message);
    } catch (error) {
      console.error(`Problem with request: ${error.message}`);
    }
  }

}

module.exports = HttpTransport;