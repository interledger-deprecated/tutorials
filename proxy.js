const IlpPacket = require('ilp-packet')
const Plugin = require('ilp-plugin-xrp-escrow')
const http = require('http')
const fetch = require('node-fetch')
const uuid = require('uuid/v4')
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

const plugin = new Plugin({
  secret: 'sndb5JDdyWiHZia9zv44zSr2itRy1',
  account: 'rGtqDAJNTDMLaNNfq1RVYgPT8onFMj19Aj',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
})

function sendTransfer (obj) {
  obj.id = uuid()
  obj.from = plugin.getAccount()
  // to
  obj.ledger = plugin.getInfo().prefix
  // amount
  obj.ilp = base64url(IlpPacket.serializeIlpPayment({ amount: obj.amount, account: obj.to }))
  // executionCondition
  obj.expiresAt = new Date(new Date().getTime() + 1000000).toISOString()
  return plugin.sendTransfer(obj).then(function () {
    return obj.id
  })
}

plugin.connect().then(function () {
  http.createServer(function (req, outRes) {
    fetch('http://localhost:8000' + req.url).then(function (inRes) {
      return inRes.text()
    }).then(function (body) {
      const parts = body.split(' ')
      // Please send an Interledger payment by running: node ./pay.js test.crypto.xrp.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW 10 nhPJyYh-KkZSMHz8dfOQZAmCRAGnO39b0iFwV5qOmOA
      // 0      1    2  3           4       5  6        7    8        9                                                  10 11
      if (parts[0] === 'Please') {
        // Payment required
        sendTransfer({
          to: parts[9],
          amount: parts[10],
          executionCondition: parts[11]
        }).then(function (transferId) {
          const listenerForThisTransfer = function (transfer, fulfillment) {
            if (transfer.id === transferId) {
              console.log('outgoing fulfill', transfer, fulfillment, 'http://localhost:8000/' + fulfillment)
              fetch('http://localhost:8000/' + fulfillment).then(function (inRes) {
                return inRes.text()
              }).then(function (body) {
                outRes.end(body)
                plugin.removeListener('outgoing_fulfill', listenerForThisTransfer)
              })
            }
          }
          plugin.addListener('outgoing_fulfill', listenerForThisTransfer)
        }).catch(function (err) {
          console.error(err.message)
        })
      } else {
        // No payment required (anymore):
        outRes.end(parts.join(' '))
      }
    })
  }).listen(8001)
  console.log('Open http://localhost:8001 with your browser')
})
