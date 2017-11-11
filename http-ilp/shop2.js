const http = require('http')
const url = require('url')
const crypto = require('crypto')
const plugin = require('./plugins.js').xrp.Shop()
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
let letters = {}
let balances = {}

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
    // Browsers are irritiating and often probe for a favicon, just ignore
    if (req.url.startsWith(`/favicon.ico`)) {
      res.statusCode = 404
      res.end()
      return
    }

    console.log(`    - Incoming request to: ${req.url}`)
    const requestUrl = url.parse(req.url)

    if (requestUrl.path === `/`) {
      // Request for a letter with no attached fulfillment

      // Generate a client ID and a shared secret from which this client
      // can derive fulfillment/condition pairs.
      const clientId = base64url(crypto.randomBytes(8))
      let sharedSecret = crypto.randomBytes(32)
console.log('request headers', req.headers)
      // Use client-generated shared secret, if presented:
      if (req.headers['pay-token']) {
        sharedSecret = Buffer.from(req.headers['pay-token'], 'base64')
        console.log('Accepted shared secret from client', req.headers['pay-token'], balances)
        if (balances[base64url(sharedSecret)]) {
          // This code path is now also used to deliver the letter after the client paid:
          if (balances[base64url(sharedSecret)] >= cost) {
            // Get the letter that we are selling
            const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
              .split('')[(Math.floor(Math.random() * 26))]
            balances[base64url(sharedSecret)] -= cost
            res.end('Your letter: ' + letter)
            return
          }
        }
      }

      // Store the shared secret to use when we get paid
      sharedSecrets[clientId] = sharedSecret
      if (!balances[base64url(sharedSecret)]) {
        // The client is just establishing its prepaid account, but hasn't paid yet
        balances[base64url(sharedSecret)] = 0
      }

      console.log(`    - Waiting for payment...`)

      // Respond with a 402 HTTP Status Code (Payment Required)
      res.statusCode = 402
      res.setHeader(`Pay`, `interledger-hkdf ${cost} ${account}.${clientId} ${base64url(sharedSecret)}`)
      res.setHeader(`Pay-Balance`, balances[base64url(sharedSecret)].toString())

      res.end(`Please send an Interledger-PSK payment of` +
          ` ${normalizedCost} ${ledgerInfo.currencyCode} to ${account}.${clientId}` +
          ` using the shared secret ${base64url(sharedSecret)}\n`)
    }
  }).listen(8000, function () {
    console.log(`    - Listening on http://localhost:8000`)
    console.log(` 3. Visit http://localhost:8000 in your browser ` +
                                                        `to buy a letter`)
  })

  // Handle incoming payments
  plugin.on('incoming_prepare', function (transfer) {
    // Generate fulfillment from packet and this client's shared secret
    const ilpPacket = Buffer.from(transfer.ilp, 'base64')
    const payment = IlpPacket.deserializeIlpPayment(ilpPacket)
    const clientId = payment.account.substring(plugin.getAccount().length + 1).split('.')[0]
    const secret = sharedSecrets[clientId]

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
    const fulfillment = hmac(secret, ilpPacket)

    // Increase this client's balance
    balances[base64url(secret)] += parseInt(transfer.amount)

    console.log(`    - Increase balance for shared secret ${base64url(secret)} with ${transfer.amount} to ${balances[base64url(secret)]}. `)

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
