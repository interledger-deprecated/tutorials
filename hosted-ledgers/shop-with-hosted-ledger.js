const http = require('http')
const url = require('url')
const crypto = require('crypto')
const HostedLedgerPlugin = require('ilp-plugin-payment-channel-framework')
const ObjStore = require('ilp-plugin-payment-channel-framework/src/model/in-memory-store')
const plugin = new HostedLedgerPlugin({
  listener: {
    port: 9000
  },
  incomingSecret: '',
  maxBalance: '1000000000',
  prefix: 'example.letter-shop.mytrustline.',
  info: {
    currencyScale: 9,
    currencyCode: 'XRP',
    prefix: 'example.letter-shop.mytrustline.',
    connectors: []
  },
  _store: new ObjStore()
})
const IlpPacket = require('ilp-packet')

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

let sharedSecrets = {}
const cost = 10

console.log(`== Starting the shop server == `)
console.log(` 1. Connecting to an account to accept payments...`)

plugin.connect().then(function () {
  // Get ledger and account information from the plugin
  const ledgerInfo = plugin.getInfo()
  const account = plugin.getAccount()

  console.log(`    - Connected to ledger: ${ledgerInfo.prefix}`)
  console.log(`    -- Account: ${account}`)
  console.log(`    -- Currency: ${ledgerInfo.currencyCode}`)
  console.log(`    -- CurrencyScale: ${ledgerInfo.currencyScale}`)

  // Convert our cost (10) into the right format given the ledger scale
  const normalizedCost = cost / Math.pow(10, parseInt(ledgerInfo.currencyScale))

  console.log(` 2. Starting web server to accept requests...`)
  console.log(`    - Charging ${normalizedCost} ${ledgerInfo.currencyCode}`)

  // Handle incoming web requests
  http.createServer(function (req, res) {
      // Generate a client ID and a shared secret from which this client
      // can derive fulfillment/condition pairs.
      const clientId = base64url(crypto.randomBytes(8))
      const sharedSecret = crypto.randomBytes(32)

      // Store the shared secret and the http request context to use when we get paid
      sharedSecrets[clientId]  = { sharedSecret, res }

      console.log(`    - Waiting for payments...`)

      res.writeHead(200, {
        Pay: `interledger-psk ${cost} ${account}.${clientId} ${base64url(sharedSecret)}`
      })
      // Flush the headers in a first TCP packet:
      res.socket.write(res._header)
      res._headerSent = true
  }).listen(8000, function () {
    console.log(`    - Listening on http://localhost:8000`)
  })

  // Handle incoming payments
  plugin.on('incoming_prepare', function (transfer) {
    if (parseInt(transfer.amount) < 10) {
      // Transfer amount is incorrect
      console.log(`    - Payment received for the wrong amount ` +
                                        `(${transfer.amount})... Rejected`)

      const normalizedAmount = transfer.amount /
                            Math.pow(10, parseInt(ledgerInfo.currencyScale))

      plugin.rejectIncomingTransfer(transfer.id, {
        code: 'F04',
        name: 'Insufficient Destination Amount',
        message: `Please send at least 10 ${ledgerInfo.currencyCode},` +
                  `you sent ${normalizedAmount}`,
        triggered_by: plugin.getAccount(),
        triggered_at: new Date().toISOString(),
        forwarded_by: [],
        additional_info: {}
      })
      return
    }
    // Generate fulfillment from packet and this client's shared secret
    const ilpPacket = Buffer.from(transfer.ilp, 'base64')
    const payment = IlpPacket.deserializeIlpPayment(ilpPacket)
    const clientId = payment.account.substring(plugin.getAccount().length + 1).split('.')[0]
    const secret = sharedSecrets[clientId].sharedSecret
    const res = sharedSecrets[clientId].res

    if (!clientId || !secret) {
      // We don't have a fulfillment for this condition
      console.log(`    - Payment received with an unknown condition: ` +
                                            `${transfer.executionCondition}`)

      plugin.rejectIncomingTransfer(transfer.id, {
        code: 'F05',
        name: 'Wrong Condition',
        message: `Unable to fulfill the condition:  ` +
                                            `${transfer.executionCondition}`,
        triggered_by: plugin.getAccount(),
        triggered_at: new Date().toISOString(),
        forwarded_by: [],
        additional_info: {}
      })
      return
    }
    console.log(`    - Calculating hmac; for clientId ${clientId}, the shared secret is ${base64url(secret)}.`)
    const fulfillmentGenerator = hmac(secret, 'ilp_psk_condition')
    const fulfillment =  hmac(fulfillmentGenerator, ilpPacket)

    // Get the letter that we are selling
    const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
      .split('')[(Math.floor(Math.random() * 26))]

    console.log(`    - Generated letter (${letter}) `)
    res.write(letter)

    console.log(` 4. Accepted payment with condition ` +
                                            `${transfer.executionCondition}.`)
    console.log(`    - Fulfilling transfer on the ledger ` +
                               `using fulfillment: ${base64url(fulfillment)}`)

    // The ledger will check if the fulfillment is correct and
    // if it was submitted before the transfer's rollback timeout
    plugin.fulfillCondition(transfer.id, base64url(fulfillment))
      .catch(function () {
        console.log(`    - Error fulfilling the transfer`)
      })
    console.log(`    - Payment complete`)
    
  })
})
