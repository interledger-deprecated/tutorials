# Letter Shop Tutorial

## What you need before you start:

* a laptop with an internet connection and NodeJS installed
* basic knowledge of the command line terminal
* basic knowledge of JavaScript, including Promises and Buffers
* (optional) the concept of one-way hash functions

## What you'll learn:

* the concept Hash Time Lock Agreements (HTLAs)
* the Ledger Plugin Interface (LPI)
* how to build a paid web app using Interledger!

## Step 1:

Save the following JavaScript as `shop.js`:

```js
const http = require('http')
const crypto = require('crypto')
const Plugin = require('ilp-plugin-xrp-escrow')
function base64 (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

let fulfillments = {}
let letters = {}

const plugin = new Plugin({
  secret: 'ssGjGT4sz4rp2xahcDj87P71rTYXo',
  account: 'rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
})

plugin.connect().then(function () {
  plugin.on('incoming_prepare', function (transfer) {
    plugin.fulfillCondition(transfer.id, fulfillments[transfer.executionCondition]).catch(function () {})
  })

  http.createServer(function (req, res) {
    if (letters[req.url.substring(1)]) {
      res.end('Your letter: ' + letters[req.url.substring(1)])
    } else {
      const secret = crypto.randomBytes(32)
      const fulfillment = base64(secret)
      const condition = base64(crypto.createHash('sha256').update(secret).digest())
      const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('')[(Math.floor(Math.random() * 26))]
      fulfillments[condition] = fulfillment
      letters[fulfillment] = letter
      console.log('Generated letter for visitor on ', req.url, { secret, fulfillment, condition, letter })
      res.end('Please send an Interledger payment to ' + plugin.getAccount() + ' with condition ' + condition)
    }
  }).listen(8000)
})
```

Set up a Letter Shop website on http://localhost:8000, by running:

```sh
npm install michielbdejong/ilp-plugin-xrp-escrow#3fadeb4
node shop.js
```
In the code, you see that an 'ilp-plugin-xrp-escrow' Plugin is being configured with secret, account, server, and prefix.
The first three come from the [XRP Testnet Faucet](https://ripple.com/build/xrp-test-net/). The prefix is an Interledger prefix, which is like an [IP subnet](https://en.wikipedia.org/wiki/Subnetwork). In this case, `test.` indicates that we are connecting to the Interledger testnet-of-testnet. The next part, `crypto.` indicates that we will be referring to a crypto currency's ledger. And finally, `xrp.` indicates that this ledger is the XRP testnet ledger. If you know the ledger prefix and the account, you can put them together to get the Interledger Address (see [IL-RFC-15, draft 1](https://interledger.org/rfcs/0015-ilp-addresses/draft-1.html)). In this case, the Interledger address of our Letter Shop is `test.crypto.xrp.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW`.

The plugin used here is specific to XRP, and to the use of on-ledger escrow. Escrow for XRP is described [here](https://ripple.com/build/rippleapi/#transaction-types). Escrow transfers differ from normal transfer in that the recipient doesn't automatically receive the amount of the transfer in their account; the need to produce something in order to claim the funds. During the time between the sender's action of preparing the transfer (creating the escrow), and the time the recipient produces the fulfillment for the transfer's condition, the money is on hold on the ledger. If the recipient doesn't produce the fulfillment in time, the transaction is canceled, and the money goes back into the sender's account.

In the case of Interledger, the fulfillment is always a 32-byte string, and the condition is the sha256 hash of that string.
SHA256 is a one-way hash function, so if you know `fulfillment`, then it's easy and quick to calculate `condition = sha256(fulfillment)`, but if you only know the condition, if you only have a million years or less, it's near-impossible to find (i.e., guess) a fulfillment for which `condition = sha256(fulfillment)` would hold. And in practice, we tend to use rollback timeouts that are of course much shorter! :) Because the transfer is *locked* until the recipient produces the correct fulfillment, the condition of the transfer is a *hash* of its fulfillment, and the transfer will *time* out after a while if the recipient doesn't produce the fulfillment to claim the funds, we call this type of conditional transfer a *Hash Time Lock Contract (HTLC)*. We call this a contract between sender an recipient, that is enforced by the ledger. If the sender and the recipient would exchange the condition and the fulfillment directly, that would be an off-ledger transaction, and instead of a Hash Time Lock Contract, we would use the more general term Hash Time Lock Agreement, to indicate that the interaction happens without having the ledger as an arbitor.

## Paying for your letter
Visit http://localhost:8000. You'll see something like:
```txt
Please send an Interledger payment to test.crypto.xrp.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW with condition A6-zI1uIEtjOXMTDoZLtML1xj6YPxBA6yxIQyVh4qhE
```

Save the following script as `pay.js`:
```js
const Plugin = require('ilp-plugin-xrp-escrow')
const uuid = require('uuid/v4')

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
  obj.ilp = 'AA'
  // executionCondition
  obj.expiresAt = new Date(new Date().getTime() + 1000000).toISOString()
  return plugin.sendTransfer(obj)
}

plugin.connect().then(function () {
  plugin.on('outgoing_fulfill', function (transferId, fulfillment) {
    console.log('Got the fulfillment, you paid for your letter! Go get it at http://localhost:8000/' + fulfillment)
    plugin.disconnect()
    process.exit()
  })

  sendTransfer({
    to: process.argv[2],
    amount: '1',
    executionCondition: process.argv[3]
  }).then(function () {
    console.log('transfer prepared, waiting for fulfillment...')
  }, function (err) {
    console.error(err.message)
  })
})
```

Now run, something like the following, (put the condition from your own shop's local website as the second argument):
```sh
$ node ./pay.js test.crypto.xrp.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW A6-zI1uIEtjOXMTDoZLtML1xj6YPxBA6yxIQyVh4qhE
```

Now wait for about 30 seconds, until you see something like:
```txt
Got the fulfillment, you paid for your letter! Go get it at http://localhost:8000/RWtoGF_sOVoIH3Casd-nmApQ-Thzl03lH-cInXume_g
```

As the instructions say, visit that URL to get your letter! :)

## Paying proxy

It's of course very cumbersome to cut and paste the condition from your browser to your command-line terminal each time you need to pay for something online, and then to cut and past back the fulfillment from your terminal to your browser once you paid. Therefore, the following paying proxy is useful, which parses the shop's payment instructions, executes them, retreives the paid content, and serves it on port 8001. Save it as `proxy.js`:
```js
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
```

Now run:
```sh
npm install node-fetch
node ./shop.js # unless your shop was still running from before
node ./proxy.js
```
and instead of visiting http://localhost:8000/, visit http://localhost:8001/ - you'll see that viewing the letter shop through the paying proxy is slower, but more convenient! You'll get a new letter each time you refresh the page.

## Concepts learned

The plugin used in all three scripts exposes the Ledger Plugin Interface (LPI) as described in [IL-RPC-4, draft 6](https://interledger.org/rfcs/0004-ledger-plugin-interface/draft-6.html), and of that, this script uses the following methods and events:
* `sendTransfer` method (in `pay.js` and `proxy.js`, prepares a transfer to some other account on the same ledger)
* `getInfo` method (used in `pay.js` and `proxy.js` to fill in the `ledger` field to pass to `sendTransfer`)
* `getAccount` method (used in `pay.js` and `proxy.js` to fill in the `from` field to pass to `sendTransfer`)
* `fulfillCondition` method (in `shop.js`, fulfills the condition of an incoming transfer)
* `incoming_prepare` event (in `shop.js`, is triggered when someone else sends you a conditional transfer)
* `outgoing_fulfill` event (in `pay.js` and `proxy.js`, is triggered when someone else fulfills your conditional transfer)

If you read the paragraphs above, you will have seen the following new words; see the glossary in [IL-RFC-19, draft 1](https://interledger.org/rfcs/0019-glossary/draft-1.html) as a reference if you
forget some of them.

* transfer
* condition
* fulfillment
* HTLA
* ledger prefix
* Interledger address
* Ledger Plugin Interface, and some of its methods


