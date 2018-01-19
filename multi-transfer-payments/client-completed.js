const IlpPacket = require('ilp-packet')
const HostedLedgerPlugin = require('ilp-plugin-payment-channel-framework')
const plugin = new HostedLedgerPlugin({
  server: 'btp+ws://:@localhost:9000/'
})
const uuid = require('uuid/v4')
const fetch = require('node-fetch')
const crypto = require('crypto')

const connectorAddress = process.argv[2]

function base64url (buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sha256 (preimage) {
  return crypto.createHash('sha256').update(preimage).digest()
}

function hmac (secret, input) {
  return crypto.createHmac('sha256', secret).update(input).digest()
}

plugin.connect().then(function () {
  return fetch('http://localhost:8000/')
}).then(function (res) {
  const parts = res.headers.get('Pay').split(' ')
  if (parts[0] === 'interledger-psk') {
    let paymentId = 0
    setInterval(function () {
      const destinationAmount = parts[1]
      const destinationAddress = parts[2] + '.' + paymentId
      const sharedSecret = Buffer.from(parts[3], 'base64')
      const ilpPacket = IlpPacket.serializeIlpPayment({
        account: destinationAddress,
        amount: destinationAmount,
        data: ''
      })
      process.stdout.write('.')
      const fulfillmentGenerator = hmac(sharedSecret, 'ilp_psk_condition')
      const fulfillment =  hmac(fulfillmentGenerator, ilpPacket)
      const condition = sha256(fulfillment)

      function getQuote(account, amount) {
        const quotePacket = IlpPacket.serializeIlqpByDestinationRequest({
          destinationAccount: account,
          destinationAmount: amount,
          destinationHoldDuration: 3000 // gives the fund.js script 3 seconds to fulfill
        })
        const requestMessage = {
          id: uuid(),
          from: plugin.getAccount(),
          to: connectorAddress,
          ledger: plugin.getInfo().prefix,
          ilp: base64url(quotePacket),
          custom: {}
        }
        return plugin.sendRequest(requestMessage).then(responseMessage => {
          const quoteResponse = IlpPacket.deserializeIlqpByDestinationResponse(Buffer.from(responseMessage.ilp, 'base64'))
          return quoteResponse
        })
      }
      
      getQuote(destinationAddress, destinationAmount).then(function (quoteResult) {
        return plugin.sendTransfer({
          id: uuid(),
          from: plugin.getAccount(),
          to: connectorAddress,
          ledger: plugin.getInfo().prefix,
          expiresAt: new Date(new Date().getTime() + 1000000).toISOString(),
          amount: quoteResult.sourceAmount,
          executionCondition: base64url(condition),
          ilp: base64url(ilpPacket)
        })
      })
      paymentId++
    }, 1000)
  }
  res.body.pipe(process.stdout)
})
