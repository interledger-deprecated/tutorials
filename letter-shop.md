# Letter Shop Tutorial

## What you need before you start:

* a laptop with an internet connection
* have NodeJS installed
* (optional) have git installed
* basic knowledge of the command line terminal
* basic knowledge of JavaScript, including Promises and Buffers
* (optional) the concept of one-way hash functions

## What you'll learn:

* the hashlock concept
* the Ledger Plugin Interface (LPI)
* how to build a paid web app using Interledger!

## Step 1: Creating the Letter Shop

Open a command line terminal and `git clone` https://github.com/interledger/tutorials, or
if you prefer to download the code as a zip file, you can just visit that URL with your
browser, click 'Clone or Download'. On that URL you can also browse the JavaScript files
online without downloading them.

Assuming you now either cloned the repository, or unzipped, your download, with your command
line terminal, `cd` into the folder.

Now you can get up a Letter Shop website on http://localhost:8000, by running:

```sh
npm install
node shop.js
```

### Interledger plugins
```js
const Plugin = require('ilp-plugin-xrp-escrow')

// [...]

// A plugin is a piece of code that talks to a specific account on a specific ledger. In this case, we will be talking
// to an account on the XRP testnet, using the 'ilp-plugin-xrp-escrow' plugin. All ILP plugin repositories on github start
// with ['ilp-plugin-'](https://github.com/search?utf8=%E2%9C%93&q=ilp-plugin-).
const plugin = new Plugin({
  secret: 'ssGjGT4sz4rp2xahcDj87P71rTYXo',
  account: 'rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW',
  server: 'wss://s.altnet.rippletest.net:51233',
  prefix: 'test.crypto.xrp.'
})

plugin.connect().then(function () {
  // once the plugin is connected, listen for events; the 'incoming_prepare' event indicates an incoming
  // conditional transfer.
  plugin.on('incoming_prepare', function (transfer) {
    if (transfer.amount !== '10') {
      plugin.rejectIncomingTransfer(transfer.id, {
        code: 'F04',
        name: 'Insufficient Destination Amount',
        message: 'Please send exactly 10 drops, you sent ' + transfer.amount,
        triggered_by: plugin.getAccount(),
        triggered_at: new Date().toISOString(),
        forwarded_by: [],
        additional_info: {}
      })
    } else {
      // the ledger will check if the fulfillment is correct and if it was submitted before the transfer's
      // rollback timeout
      plugin.fulfillCondition(transfer.id, fulfillments[transfer.executionCondition]).catch(function () {})
    }
  })

  // [...]

})
```

Since Interledger connects potentially very different ledgers together, we need an abstraction layer that hides the specifics of the ledger, but exposes the interface needed to send and receive money over that ledger. That is what Interledger plugins are for. The 'XRP escrow' plugin is a wrapper around [RippleLib](https://github.com/ripple/ripple-lib), and exposes the Ledger Plugin Interface (LPI). In the code, you see that an 'ilp-plugin-xrp-escrow' Plugin is being configured with secret, account, server, and prefix. The first three come from the [XRP Testnet Faucet](https://ripple.com/build/xrp-test-net/).

### Interledger addresses

The prefix is an Interledger prefix, which is like an [IP subnet](https://en.wikipedia.org/wiki/Subnetwork). In this case, `test.` indicates that we are connecting to the Interledger testnet-of-testnets. The next part, `crypto.` indicates that we will be referring to a crypto currency's ledger. And finally, `xrp.` indicates that this ledger is the XRP testnet ledger. If you know the ledger prefix and the account, you can put them together to get the Interledger Address (see [IL-RFC-15, draft 1](https://interledger.org/rfcs/0015-ilp-addresses/draft-1.html)). In this case, the Interledger address of our Letter Shop is `test.crypto.xrp.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW`.

### Prepare and Fulfill with on-ledger Escrow
```js
function base64url (buf) { return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') }

// [...]

// Generate a preimage and its SHA256 hash,
// which we'll use as the fulfillment and condition, respectively, of the
// conditional transfer.
const secret = crypto.randomBytes(32)
const fulfillment = base64url(secret)
const condition = base64url(crypto.createHash('sha256').update(secret).digest())
```

The plugin used here is specific to XRP, and to the use of on-ledger escrow. Escrow for XRP is described [here](https://ripple.com/build/rippleapi/#transaction-types). Escrow transfers differ from normal transfer in that the recipient doesn't automatically receive the amount of the transfer in their account; the need to produce something in order to claim the funds. During the time between the sender's action of preparing the transfer (creating the escrow), and the time the recipient produces the fulfillment for the transfer's condition, the money is on hold on the ledger. If the recipient doesn't produce the fulfillment in time, the transaction is canceled, and the money goes back into the sender's account.

### Hashlocks
In the case of Interledger, transfers are always conditional: first, they are "prepared", with a "condition". This condition is the sha256 hash of a "fulfillment". With that fulfillment, the transfer is later "executed". Condition and fulfillment are always 32 bytes each.
SHA256 is a one-way hash function, so if you know `fulfillment`, then it's easy and quick to calculate `condition = sha256(fulfillment)`, but if you only know the condition, if you only have a million years or less, it's near-impossible to find (i.e., guess) a fulfillment for which `condition = sha256(fulfillment)` would hold. And in practice, we tend to use rollback timeouts that are of course much shorter! :) Because the transfer is *locked* until the recipient produces the correct fulfillment, the condition of the transfer is a *hash* of its fulfillment, we call this a *hashlock*.

## Step 2: Paying for your letter
Visit http://localhost:8000. You'll see something like:
```txt
Please send an Interledger payment by running: node ./pay.js test.crypto.xrp.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW 10 nhPJyYh-KkZSMHz8dfOQZAmCRAGnO39b0iFwV5qOmOA
```

Follow these instructions and wait for about 30 seconds, until you see something like:
```txt
Got the fulfillment, you paid for your letter! Go get it at http://localhost:8000/RWtoGF_sOVoIH3Casd-nmApQ-Thzl03lH-cInXume_g
```

As the instructions say, visit that URL to get your letter! :)

### Sending transfers

To send an Interledger payment, call the `plugin.sendTransfer` method of any connected Interledger plugin:

```js

plugin.connect().then(function () {
  plugin.on('outgoing_fulfill', function (transferId, fulfillment) {
    console.log('Got the fulfillment, you paid for your letter! Go get it at http://localhost:8000/' + fulfillment)
    plugin.disconnect()
    process.exit()
  })

  // Fill in the required fields for
  // https://interledger.org/rfcs/0004-ledger-plugin-interface/draft-7.html
  plugin.sendTransfer({
    to: destinationAddress,
    amount: destinationAmount,
    executionCondition: condition,
    id: uuid(),
    from: plugin.getAccount(),
    ledger: plugin.getInfo().prefix,
    ilp: base64url(IlpPacket.serializeIlpPayment({ amount: destinationAmount, account: destinationAddress })),
    expiresAt = new Date(new Date().getTime() + 1000000).toISOString()
  }).then(function () {
    console.log('transfer prepared, waiting for fulfillment...')
  }, function (err) {
    console.error(err.message)
  })
```

The `'outgoing_fulfill'` event will indicate that the payment was successful. See the [LPI spec](interledger.org/rfcs/0004-ledger-plugin-interface/) for more details.

## Step 3: Paying proxy

It's of course very cumbersome to cut and paste the condition from your browser to your command-line terminal each time you need to pay for something online, and then to cut and past back the fulfillment from your terminal to your browser once you paid. Therefore, the following paying proxy is useful, which parses the shop's payment instructions, executes them, retreives the paid content, and serves it on port 8001. Run it with:

```sh
node ./shop.js # unless your shop was still running from before
node ./proxy.js
```
and instead of visiting http://localhost:8000/, visit http://localhost:8001/ - you'll see that viewing the letter shop through the paying proxy is slower, but more convenient! You'll get a new letter each time you refresh the page.

### Pay, then fetch

As you can see in the `proxy.js code:

```js
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
```

the proxy retrieves the human-readable text that starts with 'Please', pays, gets the fulfillment from the `'outgoing_fulfill'` event, and then fetches the letter. In other tutorials,
you will see various alternatives to this, like machine-readable Interledger Payment Requests and HTTP-ILP `Pay` headers.

## Concepts learned

The plugin used in all three scripts exposes the Ledger Plugin Interface (LPI) as described in [IL-RPC-4, draft 6](https://interledger.org/rfcs/0004-ledger-plugin-interface/draft-6.html), and of that, this script uses the following methods and events:
* `sendTransfer` method (in `pay.js` and `proxy.js`, prepares a transfer to some other account on the same ledger)
* `getInfo` method (used in `pay.js` and `proxy.js` to fill in the `ledger` field to pass to `sendTransfer`)
* `getAccount` method (used in `pay.js` and `proxy.js` to fill in the `from` field to pass to `sendTransfer`)
* `rejectIncomingTransfer` method (in `shop.js`, rejects an incoming transfer if someone tries to pay the wrong amount)
* `fulfillCondition` method (in `shop.js`, fulfills the condition of an incoming transfer)
* `incoming_prepare` event (in `shop.js`, is triggered when someone else sends you a conditional transfer)
* `outgoing_fulfill` event (in `pay.js` and `proxy.js`, is triggered when someone else fulfills your conditional transfer)

If you read the paragraphs above, you will have seen quite a few new words; see the glossary in [IL-RFC-19, draft 1](https://interledger.org/rfcs/0019-glossary/draft-1.html) as a reference if you
forget some of them.
