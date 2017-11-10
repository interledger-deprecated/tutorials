# Multi-Transfer Payments

So far, we have seen payments over the XRP testnet ledger, and over simple ledgers that we hosted ourselves on localhost.
In this tutorial, we'll combine them! The shop will have an account on the XRP testnet ledger, but the client will
pay on a own hosted ledger. So how will this work, a payment where the payer and the payee are not on the same ledger?

You guessed it, this is where Interledger will finally shine and live up to its name! We will introduce a connector which has
one account on each ledger, and acts as a bridge between the two.

## Building a simple connector

First, have a look at `connector.js`:
```js
const pluginOnXrpLedger = require('./plugins.js').xrp.Customer() // reuse the XRP testnet account that was previously used for the client
const HostedLedgerPlugin = require('ilp-plugin-payment-channel-framework')
const ObjStore = require('ilp-plugin-payment-channel-framework/src/model/in-memory-store')
const pluginOnHostedLedger = new HostedLedgerPlugin({
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
const uuid = require('uuid/v4')
const EXCHANGE_RATE = 200 // 1 XRP drop buys you 200 nano-USD
const MIN_MESSAGE_WINDOW = 10000
const pendingPayments = {}

Promise.all([ pluginOnXrpLedger.connect(), pluginOnHostedLedger.connect() ]).then(function () {
  console.log('Now run node ./client-for-hosted-ledger.js ' + pluginOnHostedLedger.getAccount())
  pluginOnHostedLedger.on('incoming_prepare', function(incomingTransfer) {
    process.stdout.write(` ${incomingTransfer.amount}`)
    const ilpPacket = IlpPacket.deserializeIlpPayment(Buffer.from(incomingTransfer.ilp, 'base64'))

    // TODO: check if incoming transfer amount is high enough

    const outgoingTransfer = {
      id: uuid(),
      from: pluginOnXrpLedger.getAccount(),
      to: ilpPacket.account,
      ledger: pluginOnXrpLedger.getInfo().prefix,
      expiresAt: new Date(new Date(incomingTransfer.expiresAt).getTime() - MIN_MESSAGE_WINDOW).toISOString(),
      amount: ilpPacket.amount,
      executionCondition: incomingTransfer.executionCondition,
      ilp: incomingTransfer.ilp
    }
    pluginOnXrpLedger.sendTransfer(outgoingTransfer)
    pendingPayments[outgoingTransfer.id] = incomingTransfer.id
    process.stdout.write(`>${outgoingTransfer.amount} `)
  })
  pluginOnXrpLedger.on('outgoing_fulfill', function(outgoingTransfer, fulfillment) {
    pluginOnHostedLedger.fulfillCondition(pendingPayments[outgoingTransfer.id], fulfillment)
    process.stdout.write('<')
  })

  // TODO: deal with quote requests
})
```

As you can see, it will (naively) forward all incoming prepared conditional transfers to the Letter Shop,
and try to fulfill its own incoming transfers when the Letter Shop fulfills the connector's outgoing transfers.

The `MIN_MESSAGE_WINDOW` indicates that the connector wants the outgoing transfer to expire 10000 milliseconds earlier than the incoming transfer does.

Another interesting point is that it writes instructions to the console for running the client, so that the client will know the connector's XRP address.

As you can see in the client script, it no longer sets the `to` field of the transfer object to the destination address, but now just always sets 
it to the connector's XRP address. The `'account'` field in the ILP packet still indicates the real destination address as specified by the shop,
and this is what the connector forwards the payment to.

## The Interledger Quoting Protocol

So far, the connector script doesn't check how much money it receives, and whether that's actually enough to cover the cost of the outgoing transfer.
To improve that situation, replace 'TODO: check if incoming transfer amount is high enough' with:
```js
if (parseInt(incomingTransfer.amount) * EXCHANGE_RATE < ilpPacket.amount) {
  pluginOnXrpLedger.rejectIncomingTransfer(incomingTransfer)
  return
}
```

And replace 'TODO: deal with quote requests' with:

```js
function base64url (buf) {
  return buf.toString('base64')
    .replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}

function toLpi(packet, msg) {
  return Promise.resolve({
    id: uuid(),
    from: msg.to,
    to: msg.from,
    ledger: msg.ledger,
    ilp: base64url(packet),
    custom: {}
  })
}

pluginOnHostedLedger.registerRequestHandler(function (msg) {
  const ilpReq = IlpPacket.deserializeIlpPacket(Buffer.from(msg.ilp, 'base64'))
  switch (ilpReq.typeString) {
    case 'ilqp_by_source_request':
      return toLpi(IlpPacket.serializeIlqpBySourceResponse({
        destinationAmount: (parseInt(ilpReq.data.sourceAmount) * EXCHANGE_RATE).toString(),
        sourceHoldDuration: 3000
      }), msg)
    case 'ilqp_by_destination_request':
      return toLpi(IlpPacket.serializeIlqpByDestinationResponse({
        sourceAmount: (Math.ceil(parseInt(ilpReq.data.destinationAmount) / EXCHANGE_RATE)).toString(),
        sourceHoldDuration: 3000
      }), msg)
    case 'ilqp_liquidity_request':
      return toLpi(IlpPacket.serializeIlqpLiquidityResponse({
        liquidityCurve: [ [0, 0], [1000000, 1000000 * EXCHANGE_RATE] ],
        appliesToPrefix: pluginOnHostedLedger.getInfo().prefix,
        sourceHoldDuration: 3000,
        expiresAt: new Date(Date.now() + 3600 * 1000)
      }), msg)
  }
  return Promise.resolve()
})
```

The result should look like `connector-completed.js`.

In the client, we can now make sure to send the correct number of XRP drops by doing a quote request first.
Instead of directly calling sendTransfer inside the setInterval block, do:

```js
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
```

The result should look like `client-completed.js`. You can try this all out by running `node shop-on-xrp-ledger.js` in one window,
`node connector-completed.js` in a second, and `node ./client-for-hosted-ledger.js example.letter-shop.mytrustline.server` in a third.
You can see in the connector window how it's forwarding 1 nano-USD from the hosted ledger as 10 drops of XRP.


## What's next

This connector script is obviously overly simplistic.
To build a real connector, you would for instance need to look at the prefix of the destination address, and route accordingly.
