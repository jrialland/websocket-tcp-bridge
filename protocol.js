module.exports = {
/*
senderRole:'client',
type:'connect',
dstAddr : connInfo.dstAddr,
dstPort : connInfo.dstPort,
connectionId:connectionId
*/

  serialize : function(obj) {
    return JSON.stringify(obj);
  },

  deserialize : function(data) {
    return JSON.parse(data);
  },

};
