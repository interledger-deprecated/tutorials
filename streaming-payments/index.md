# Streaming Tutorial

## What you need before you start:

* complete the [Letter Shop](./letter-shop) tutorial first

## What you'll learn:

* convert the proxy from the Letter Shop tutorial into a http-ilp client
* using the `Pay` header in your shop and your client
* using the ILP packet
* streaming payments
* deterministically picking a hashlock condition based on a Pre-Shared Key (PSK)

## The Pay Header

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

The `Pay` header contains 3 parts:

* amount (in this case, the price of one letter, in XRP)
* user-specific destination address
* a Base64-encoded shared secret for use with [PSK](https://interledger.org/rfcs/0016-pre-shared-key/draft-3.html)

Note how we are appending `'.' + user` to the shop's Interledger address! This is a special feature of Interledger
addresses, they can be subnetted endlessly, just add another `.` at the end to convert an account address
to a ledger prefix, and then add new sub-accounts after that. In this case, we want to know which user is paying
for letters, so by telling each user a different Interledger sub-address, we can neatly keep our users apart.

When a transfer comes in, the server opens the [ILP packet](https://interledger.org/rfcs/0003-interledger-protocol/draft-4.html#ilp-payment-packet-format):
```js
const ilpPacket = Buffer.from(transfer.ilp, 'base64')
const ilpPacketContents = IlpPacket.deserializeIlpPayment(ilpPacket)
const parts = ilpPacketContents.account.split('.')
// 0: test, 1: crypto, 2: xrp, 3: rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW, 4: userId, 5: paymentId
```

In there is a destination account and a destination amount, which will usually (if all went well) be equal
to the amount of the transfer. In later tutorials, we will see how transfers can be chained together
into one ILP payment, but for now, we will only use single-transfer payments.

Instead of (like the Letter Shop from the previous tutorial did) remembering the random fulfillment strings
to use, this version of the shop uses PSK to derive the exact fulfillment bytes from the ILP packet and the
shared secret which it previously sent to this user base64-encoded in the `Pay` header:

```js
const { secret, res } = users[parts[4]]
const fulfillmentGenerator = hmac(secret, 'ilp_psk_condition')
const fulfillment =  hmac(fulfillmentGenerator, ilpPacket)
const condition = sha256(fulfillment)
if (transfer.executionCondition === base64(condition)) {
  // ...
```

To run this new version of the shop, clone or download https://github.com/interledgerjs/tutorials, `cd` into that folder, and type this into your terminal:

```sh
npm install
node ./shop2.js
```

The ILP packet is not very useful in a one-transfer payment, but in future tutorials, we see how connectors can forward an
incoming transfer, and thus connect one ledger to other ledgers. When that happens, we say the whole sender
to receiver process is the "payment", and each link in the chain is a "transfer", so one payment consists of 
one or more transfers. The sender can then put information in the ILP packet which the receiver can use
to generate the fulfillment, and if that information would be tampered with by connectors along the way,
this would be detected because the fulfillment would not match.
The ILP Payment Packet is serialized into OER and then Base64-encoded before it's added to the transfer as a Memo.
Note that this assumes that either the ledger supports adding a memo to the transfer, or there is some out-of-band
communication channel, but luckily, most ledgers do support annotating transfers with some sort of custom data.

## Http-ilp client

The following is mainly a mix between the `pay.js` and `proxy.js` scripts from the Letter Shop tutorial,
that can pay for content in reaction to an `Pay` header, and then stream that content to the console
as it comes in. Have a look at `client.js`. As you can see, it parses the `Pay` header, and then sends one XRP-drop per 500ms.
This is a naive implementation, that will pay any amount asked of it.

```js
plugin.connect().then(function () {
  return fetch('http://localhost:8000/')
}).then(function (inRes) {
  inRes.body.pipe(process.stdout)
  const payHeaderParts = inRes.headers.get('Pay').split(' ')
  console.log(payHeaderParts)
  // e.g. Pay: 1 test.crypto.xrp.asdfaqefq3f.26wrgevaew SkTcFTZCBKgP6A6QOUVcwWCCgYIP4rJPHlIzreavHdU
  setInterval(function () {
    const ilpPacket = IlpPacket.serializeIlpPayment({
      account: payHeaderParts[1] + '.' + (++counter),
      amount: '1',
      data: ''
    })
    const fulfillmentGenerator = hmac(Buffer.from(payHeaderParts[2], 'base64'), 'ilp_psk_condition')
    const fulfillment =  hmac(fulfillmentGenerator, ilpPacket)
    const condition = sha256(fulfillment)
    sendTransfer({
      to: payHeaderParts[1],
      amount: '1',
      executionCondition: base64(condition),
      ilp: base64(ilpPacket)
    }).then(function () {
      // console.log('transfer sent')
    }).catch(function (err) {
      console.error(err.message)
    })
  }, 500)
})
```

Try it out!

```sh
$ node ./client.js
```

After some startup time, you should see one letter per 500ms being printed.

## What you learned

We used the ILP packet for the first time, talked about connectors, payments as chains of transfers, and used
the `Pay` header, so that the shop could request payment from the client that connects to it.
We also saw how with PSK, endless fulfillment/condition pairs can be derived, while only having to share one single secret
between the sender and the receiver of an Interledger payment.
