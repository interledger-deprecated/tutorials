const http = require('http')
const url = require('url')
const crypto = require('crypto')
const plugin = require('./plugins.js').xrp.Shop()

function base64url (buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function sha256 (preimage) {
  return crypto.createHash('sha256').update(preimage).digest()
}

let fulfillments = {}
let letters = {}
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

  // Covert our cost (10) into the right format given the ledger scale
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

      // Respond with a 402 HTTP Status Code (Payment Required)
      res.statusCode = 402

      // Generate a preimage and its SHA256 hash,
      // which we'll use as the fulfillment and condition, respectively, of the
      // conditional transfer.
      const secret = crypto.randomBytes(32)
      const fulfillment = base64url(secret)
      const condition = sha256(secret)

      // Get the letter that we are selling
      const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
        .split('')[(Math.floor(Math.random() * 26))]

      console.log(`    - Generated letter (${letter}) ` +
      `at http://localhost:8000${req.url}${fulfillment}`)

      // Store the fulfillment (indexed by condition) to use when we get paid
      fulfillments[condition] = fulfillment

      // Store the letter (indexed by the fulfillment) to use when the customer
      // requests it
      letters[fulfillment] = letter

      console.log(`    - Waiting for payment...`)

      res.setHeader(`Pay`, `${cost} ${account} ${condition}`)

      res.end(`Please send an Interledger payment of` +
          ` ${normalizedCost} ${ledgerInfo.currencyCode} to ${account}` +
          ` using the condition ${condition}\n` +
        `> node ./pay.js ${account} ${cost} ${condition}`)
    } else {
      // Request for a letter with the fulfillment in the path

      // Get fulfillment from the path
      const fulfillment = requestUrl.path.substring(1)

      // Lookup the letter we stored previously for this fulfillment
      const letter = letters[fulfillment]

      if (!letter) {
        // We have no record of a letter that was issued for this fulfillment

        // Respond with a 404 HTTP Status Code (Not Found)
        res.statusCode = 404

        console.log(`    - No letter found for fulfillment: ${fulfillment}`)

        res.end(`Unrecognized fulfillment.`)
      } else {
        // Provide the customer with their letter
        res.end(`Your letter: ${letter}`)

        console.log(` 5. Providing paid letter to customer ` +
                                            `for fulfillment ${fulfillment}`)
      }
    }
  }).listen(8000, function () {
    console.log(`    - Listening on http://localhost:8000`)
    console.log(` 3. Visit http://localhost:8000 in your browser ` +
                                                        `to buy a letter`)
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
    } else {
      // Lookup fulfillment from condition attached to incoming transfer
      const fulfillment = fulfillments[transfer.executionCondition]

      if (!fulfillment) {
        // We don't have a fulfillment for this condition
        console.log(`    - Payment received with an unknwon condition: ` +
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
      }

      console.log(` 4. Accepted payment with condition ` +
                                              `${transfer.executionCondition}.`)
      console.log(`    - Fulfilling transfer on the ledger ` +
                                            `using fulfillment: ${fulfillment}`)

      // The ledger will check if the fulfillment is correct and
      // if it was submitted before the transfer's rollback timeout
      plugin.fulfillCondition(transfer.id, fulfillment).catch(function () {
        console.log(`    - Error fulfilling the transfer`)
      })
      console.log(`    - Payment complete`)
    }
  })
})
