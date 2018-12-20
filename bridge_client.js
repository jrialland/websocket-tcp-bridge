const logger = require('./logger');
const SockJS = require('sockjs-client');
const minimist = require('minimist');
//configuration proxy
const args = minimist(process.argv.slice(2));
if(args.p) {
  logger.info('using http proxy : ' + args.p)
  require('proxying-agent').globalize(args.p.trim());
}

//classe d'envoi de messages
class BridgeClient {

  constructor(url, role) {
    this.url = url;
    this.role = role;
    this.ws = this.createWs();
    const that = this;
    setInterval(() => {
      try {
        that.sendMessage('ping', {ping:'ping'});
      } catch(e) {
        logger.error('ping failed');
      }
    }, 2000);
  }

  createWs() {
    let ws = new SockJS(this.url,{transports:['jsonp-polling']});
    ws.onopen = () => {logger.info('connected to ' + this.url)};
    ws.onmessage = this._onMessage.bind(this);
    const that = this;
    ws.onclose = () => {
      setTimeout(() => {that.ws = that.createWs()}, 3500);
    }
    return ws;
  }

  sendMessage(type, payload) {
    payload.type = type;
    payload.sender = this.role;
    if(payload.data) {
      payload.data = payload.data.toString('base64');
    }
    let raw = JSON.stringify(payload);
    logger.debug(`[${this.role}] sending ${payload.type}`);
    this.ws.send(raw);
  }

  _onMessage(event) {
    const msg = JSON.parse(event.data);
    logger.debug(`receive ${msg.type} from ${msg.sender?msg.sender:'?'}`);
    if(msg.data) {
      msg.data = Buffer.from(msg.data, 'base64');
    }
    if(event.sender != this.role) {
      this.onMessage(msg);
    }
  }

  onMessage(message) {
    console.log('received message' + JSON.stringify(message));
  }
}

module.exports = {
  BridgeClient:BridgeClient
};
