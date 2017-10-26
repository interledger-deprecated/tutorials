const IlpPacket = require('ilp-packet')
const http = require('http')
const fetch = require('node-fetch')
const plugin = require('./plugins.js').xrp.Customer()
const uuid = require('uuid/v4')

function base64url (buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

console.log(`== Starting the proxy == `)
console.log(` 1. Connecting to an account to send payments...`)

plugin.connect().then(function () {
  const ledgerInfo = plugin.getInfo()
  const account = plugin.getAccount()
  console.log(`    - Connected to ledger: ${ledgerInfo.prefix}`)
  console.log(`    -- Account: ${account}`)
  console.log(`    -- Currency: ${ledgerInfo.currencyCode}`)
  console.log(`    -- CurrencyScale: ${ledgerInfo.currencyScale}`)

  console.log(` 2. Starting proxy server...`)

  http.createServer(function (req, resp) {
    // Browsers are irritiating and often probe for a favicon, just ignore
    if (req.url.startsWith(`/favicon.ico`)) {
      resp.statusCode = 404
      resp.end()
      return
    }

    console.log(`    -> Sending request to http://localhost:8000${req.url}...`)
    fetch('http://localhost:8000' + req.url).then(function (incomingResp) {
      if (incomingResp.statusCode === 402) {
        console.log(`    <- Payment Required`)

        const payHeader = incomingResp.headers.get(`Pay`).split(` `)

        // Need to pay for this request
        const destinationAmount = payHeader[0]
        const destinationAddress = payHeader[1]
        const condition = payHeader[2]
        const transferId = uuid()

        // Define a listener just for this transfer
        const listenerForThisTransfer = function (transfer, fulfillment) {
          if (transfer.id === transferId) {
            console.log(`    - Fulfillment received ${fulfillment}`)
            plugin.removeListener('outgoing_fulfill', listenerForThisTransfer)

            // Get real request
            console.log(`    -> Sending request to ` +
                                    `http://localhost:8000/${fulfillment}...`)
            fetch('http://localhost:8000/' + fulfillment)
              .then(function (paidResponse) {
                return paidResponse.text()
              })
              .then(function (body) {
                console.log(`    <- Sending response...`)
                resp.end(body)
              })
          }
        }

        // Register the listener
        plugin.addListener('outgoing_fulfill', listenerForThisTransfer)

        console.log(`    - Making payment to ${destinationAddress} ` +
                                          `with condition ${condition}`)
        plugin.sendTransfer({
          to: destinationAddress,
          amount: destinationAmount,
          executionCondition: condition,
          id: transferId,
          from: plugin.getAccount(),
          ledger: plugin.getInfo().prefix,
          ilp: base64url(IlpPacket.serializeIlpPayment({
            amount: destinationAmount,
            account: destinationAddress })),
          expiresAt: new Date(new Date().getTime() + 1000000).toISOString()
        }).then(function () {
          console.log(`    - Transfer (tx-id:${transferId}) prepared, ` +
                                              `waiting for fulfillment...`)
        }, function (err) {
          console.error(err.message)
        })
      } else {
        // Got the response
        return incomingResp.text().then(function (body) {
          console.log(`    <- Sending response...`)
          resp.end(body)
        })
      }
    })
  }).listen(8001, function () {
    console.log(`    - Listening on http://localhost:8001`)
    console.log(` 3. Visit http://localhost:8001 in your browser ` +
                                                      `to buy a letter`)
  })
})
