module.exports = {};

bufferUtils = require('buffer-utils');
BufferReader = bufferUtils.BufferReader;
BufferWriter = bufferUtils.BufferWriter;

const CLIENT_DECL = 1;
const SERVER_DECL = 2;
const CONNECT_REQUEST = 3;
const CLIENT_DATA = 4;
const SERVER_DATA = 5;
const CLIENT_CONNECTION_CLOSE = 6;
const SERVER_CONNECTION_CLOSE = 7;

module.exports.serialize_client_decl = function() {
  //return new BufferWriter().writeUInt8(CLIENT_DECL).getContents().toString('base64');
  return JSON.stringify({
    senderRole:'client',
    type:'clientDecl'
  });
};

module.exports.serialize_server_decl = function() {
  //return new BufferWriter().writeUInt8(SERVER_DECL).getContents().toString('base64');
  return JSON.stringify({
    senderRole:'server',
    type:'serverDecl'
  });
};

module.exports.serialize_connect_request = function(dstAddr, dstPort, connectionId) {
  /*return new BufferWriter()
    .writeUInt8(CONNECT_REQUEST)
    .writeString(dstAddr)
    .writeUInt16BE(dstPort)
    .writeString(connectionId)
    .getContents()
    .toString('base64');*/
  return JSON.stringify({
    senderRole:'client',
    type:'connect',
    dstAddr:dstAddr,
    dstPort:dstPort,
    connectionId:connectionId
  });
};

/*
function deserialize_connect_request(data) {
  let reader = new BufferReader(data);
  data.readUInt8();
  let dstAddr = reader.readString();
  let dstPort = reader.readUInt16BE();
  let connectionId = parseInt(reader.readString());
  return {
    senderRole:'client',
    type:'connect',
    dstAddr:dstAddr,
    dstPort:dstPort,
    connectionId:connectionId
  };
}
*/

module.exports.serialize_client_data = function(data, connectionId) {
  /*return new BufferWriter()
    .writeUInt8(CLIENT_DATA)
    .writeString(connectionId)
    .writeString(data.toString('base64'))
    .getContents()
    .toString('base64');
  */
  return JSON.stringify({
    senderRole:'client',
    type:'data',
    connectionId:connectionId,
    data:data.toString('base64')
  });
};

module.exports.serialize_server_data = function(data, connectionId) {
  /*return new BufferWriter()
    .writeUInt8(SERVER_DATA)
    .writeString(connectionId)
    .writeString(data.toString('base64'))
    .getContents()
    .toString('base64');
    */
    return JSON.stringify({
      senderRole:'server',
      type:'data',
      connectionId:connectionId,
      data:data.toString('base64')
    });
};
/*
function deserialize_data(data) {
  let reader = new BufferReader(data);
  let code = reader.readUInt8();
  let connectionId = reader.readString();
  let payload = reader.readString();
  payload = Buffer.from(payload, 'base64');
  return {
    senderRole:code == SERVER_DATA ? 'server' : 'client',
    type:'data',
    connectionId:connectionId,
    data:payload
  };
}*/

module.exports.serialize_client_connection_close = function(connectionId) {
  /*return new BufferWriter()
    .writeUInt8(CLIENT_CONNECTION_CLOSE)
    .writeString(connectionId)
    .getContents()
    .toString('base64');
    */
  return JSON.stringify({
    senderRole:'client',
    type:'connectionClosed',
    connectionId:connectionId
  });
};

module.exports.serialize_server_connection_close = function(connectionId) {
  /*return new BufferWriter()
    .writeUInt8(SERVER_CONNECTION_CLOSE)
    .writeString(connectionId)
    .getContents()
    .toString('base64');*/
    return JSON.stringify({
      senderRole:'server',
      type:'connectionClosed',
      connectionId:connectionId
    });
};
/*
function deserialize_connection_close(data) {
  let code = data.readUInt8();
  let connectionId = data.readString();
  return {
    senderRole : code == CLIENT_CONNECTION_CLOSE ? 'client' : 'server',
    type:'connectionClosed',
    connectionId : connectionId
  };
}
*/
module.exports.deserialize = function(serialized) {
  let msg = JSON.parse(serialized);
  if(msg.type == 'data') {
    msg.data = Buffer.from(msg.data, 'base64');
  }
  return msg;
};
