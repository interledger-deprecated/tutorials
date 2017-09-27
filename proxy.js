const Plugin = require('ilp-plugin-xrp-escrow')
const http = require('http')
const fetch = require('node-fetch')
const uuid = require('uuid/v4')

const plugin = new Plugin({
  secret: 'sndb5JDdyWiHZia9zv44zSr2itRy1',
  account: 'rGtqDAJNTDMLaNNfq1RVYgPT8onFMj19Aj',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
})

const pendingRes = {}

function sendTransfer (obj) {
  obj.id = uuid()
  obj.from = plugin.getAccount()
  // to
  obj.ledger = plugin.getInfo().prefix
  // amount
  obj.ilp = 'AA'
  // executionCondition
  obj.expiresAt = new Date(new Date().getTime() + 1000000).toISOString()
  return plugin.sendTransfer(obj).then(function () {
    return obj.id
  })
}

plugin.connect().then(function () {
  plugin.on('outgoing_fulfill', function (transfer, fulfillment) {
    console.log('outgoing fulfill', transfer, fulfillment, 'http://localhost:8000/' + fulfillment)
    fetch('http://localhost:8000/' + fulfillment).then(function (inRes) {
      return inRes.text()
    }).then(function (body) {
      pendingRes[transfer.id].end(body)
    })
  })

  http.createServer(function (req, outRes) {
    fetch('http://localhost:8000' + req.url).then(function (inRes) {
      return inRes.text()
    }).then(function (body) {
      const parts = body.split(' ')
      if (parts[0] === 'Please') {
        sendTransfer({
          to: parts[6],
          amount: '1',
          executionCondition: parts[9]
        }).then(function (transferId) {
          console.log('transfer sent', transferId)
          pendingRes[transferId] = outRes
        }, function (err) {
          console.error(err.message)
        })
      } else {
        outRes.end(parts.join(' '))
      }
    })
  }).listen(8001)
})
