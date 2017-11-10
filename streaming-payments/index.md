# Streaming Tutorial

## What you need before you start:

* complete the [Letter Shop](/tutorials/letter-shop) and [http-ilp](/tutorials/http-ilp) tutorials first

## What you'll learn:

* streaming payments

## Buying letters repeatedly

In the Letter Shop tutorial we created a command-line client that can buy letters
from the Letter Shop. In the http-ilp tutorial we updated the shop and the client
so that instead of telling the client directly which hashlock condition to use,
the shop sends a PSK shared secret, with which the client could in principle derive
endless condition/fulfillment pairs.

In practice, the `client2.js` script from the http-ilp tutorial only derived one
(paymentId 0), so that's what we'll change first, in `streaming-client1.js`; it will
send one payment per second, indefinitely:

```js
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
    console.log('Calculating hmac using shared secret:', base64url(sharedSecret))
    const fulfillmentGenerator = hmac(sharedSecret, 'ilp_psk_condition')
    const fulfillment =  hmac(fulfillmentGenerator, ilpPacket)
    const condition = sha256(fulfillment)
    plugin.sendTransfer({
      id: uuid(),
      from: plugin.getAccount(),
      to: destinationAddress,
      ledger: plugin.getInfo().prefix,
      expiresAt: new Date(new Date().getTime() + 1000000).toISOString(),
      amount: destinationAmount,
      executionCondition: base64url(condition),
      ilp: base64url(ilpPacket)
    })
    paymentId++
  }, 1000)
}
```

And the `outgoing_fulfill` handler will no longer disconnect the plugin or exit the process:

```js
plugin.on('outgoing_fulfill', function (transferId, fulfillmentBase64) {
  fetch('http://localhost:8000/', {
    headers: {
      'Pay-Token': base64url(sharedSecret)
    }
  }).then(function (res) {
    return res.text()
  }).then(function (body) {
    console.log(body)
  })
})
```

To see this in action, copy your `'plugins.js'` file [from before](../letter-shop) into the 'streaming-payments/'
folder of your local copy of the [tutorials repository](https://github.com/interledger/tutorials),
 run `node ./shop-from-before.js` in one terminal window, and `node ./streaming-client1.js` in another.

## Mid-request payments

One thing you may have noticed is that this client does one initial request, and then for each letter it does
one payment and one request to retrieve the new letter. This is not a very efficient way to stream letters.

Therefore, we're going to change the way the shop serves its `Pay` header. Until now, it was serving it on a 402 status
response, which is then terminated immediately. The client then ends up disconnected from the shop, and needs to
reconnect after having completed payment. But we live in a fast world, where consumption is a basic right,
and in order to consume more, faster, we of course want to be connected.

So we'll change the Letter Shop from before so that instead of terminating the http response with a 402 status,
it will serve up a 200 status, flush the headers, and stall the delivery of the body. The body will consist of the
letters the client buys, and will keep streaming them indefinitely, until the client interrupts the connection,
or the server process is terminated:


We'll change the Letter Shop from the previous tutorial a bit, to `shop2.js`. Instead of
using a human-readable "Payment Required" message that starts with "Please ...", we will
now use a machine-readable http header, and a fulfillment/condition pair that is generated
deterministically from a secret that's shared between the shop and the client.

Starting with the last part, `http.createServer`, you can see the flow of the http server
is a bit simpler; when a request comes in it sends headers, and
then the body will be sent letter-by-letter, as payments come in:

```js
res.writeHead(200, {
  'Pay': [ 1, plugin.getAccount() + '.' + user, base64(secret) ].join(' ')
})
// Flush the headers in a first TCP packet:
res.socket.write(res._header)
res._headerSent = true
```

In the client, instead of having to do a dedicated `fetch` call for each time `'outgoing_fulfill'` is triggered,
we just stream the body from the initial call:

```js
res.body.pipe(process.stdout)
```

To see this in action, run `node ./streaming-shop.js` in one terminal window, and `node ./streaming-client2.js` in another.
You can now maybe think about whay you want to build with Interledger - a shop? or a client? and for your use case, would it
be appropriate to use streaming content and streaming payments instead of one-shot requests and one-shot payments?

You may have noticed that paying via the XRP testnet ledger takes a few seconds. That's why, in the previous tutorial, we introduced
the `Pay-Token` / `Pay-Balance` protocol. But there is another way to make streaming Interledger payments faster, as we'll see in
the next tutorial: [Hosted Ledgers](/tutorials/hosted-ledgers).
