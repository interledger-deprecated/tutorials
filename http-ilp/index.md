# HTTP with ILP Tutorial

## What you need before you start:

* complete the [Letter Shop](/tutorials/letter-shop) tutorial first, including the Bonus Step

## What you'll learn:

* hmac-based key derivation (HKDF) for repeated conditional Interledger payments
* how to use the ILP curl tool to automatically administer your plugin credentials
* how to use the koa-ilp module in a webserver middleware framework
* how to use a `Pay-Token` to pay for multiple http requests with prepaid balance

## Using key derivation to generate fulfillment/condition pairs

The `Pay` header we used in the Letter Shop tutorial specifies which sha256 condition to
use for the payment. But once this condition has been used, and its fulfillment (the
preimage of the sha256 hash) has been made public, it cannot be reused.

Therefore, if the Letter Shop wants to give its customers a way to securely pay for
multiple letters, it can give each customer
a unique pre-shared secret, from which endless fulfillment/condition pairs can be derived.
This process of deriving endless keys from a pre-shared secret is called
an Hmac-Based Key Derivation Function (or HKDF, for short).

To do this, the shop needs to use a `Pay` header with the 'interledger-hkdf' payment method, instead
of the 'interledger-condition' method which we used in the previous tutorial.

In order to make each client uniquely identifiable, a different `clientId` is added to the shop's
ILP address. This means each client will pay the shop at a different ILP address,
but these payments still all arrive at the shop. The client will then add another identifier
to the end of the destination address, to make each of its multiple payments unique. So the ILP
address of the shop is then made up of `<ledger prefix> . < accountId > . < clientId > . < paymentId >`.

Apart from the payment's destination address, the client will also use the payment's amount
(measured at the destination), and optional
extra data to derive a fulfillment/condition pair from. The amount is expressed as an big-endian unsigned 64-bit
integer. The three bits of data (address, amount, data), are OER-encoded in a specific, deterministic way,
to get a binary string over which we can calculate an hmac. In the client, this process looks as follows:

```js
const paymentId = 0
const destinationAmount = parts[1]
const destinationAddress = parts[2] + '.' + paymentId
const sharedSecret = Buffer.from(parts[3], 'base64')
const ilpPacket = IlpPacket.serializeIlpPayment({
  account: destinationAddress,
  amount: destinationAmount,
  data: ''
})
console.log('Calculating hmac using shared secret:', base64url(sharedSecret))
const fulfillment = hmac(sharedSecret, ilpPacket)
const condition = sha256(fulfillment)
```

The `ilpPacket` is the OER-encoded binary string from which the fulfillment/condition pair is derived.
This process is deterministic, in the sense that if the client sends the ILP packet along with the
payment (which it does), that will allow the shop to see the client's `clientId`, and to derive the
same fulfillment/condition pair as the client did.

The `paymentId` is still always set to 0 in this tutorial, so we're not really making use of
[hmac-based key derivation](https://en.wikipedia.org/wiki/HKDF)
to derive endless fulfillment/condition pairs from a single shared secret; we're mainly using PSK here because
'interledger-psk' is a more standard payment method than 'interledger-condition', and more tools are available
for it, as we'll see shortly.

Later, in the [Streaming Payments](../streaming-payments) tutorial, we will also see how to use multiple payments
from a single PSK secret to get multiple letters.

Now copy your `plugins.js` file from the Letter Shop tutorial, and then run `node ./shop1.js` in one terminal
screen, and `node ./client1.js` in another, to see this in action!

## Using the `Pay-Token` and `Pay-Balance` headers

The use of PSK in the `Pay` header is a great step forward in our Letter Shop design, because it makes doing multiple
payments to the same shop easier. But we can also make an optimization in the opposite direction: what if you could
pay more than the invoice amount, to obtain a prepaid balance at the shop? If the ledger(s) over which your payment
travels are slow or expensive to use (*cough* bitcoin *cough*), and you know you will probably need to buy more letters
in the future, it could make sense to pay extra, and obtain a balance at the shop, represented by a token.

To implement this, we first need to decouple the retrieval of the letter from the fulfillment of the payment. So
instead of sending the fulfillment as proof of payment, the client will send its shared secret to prove that they are
the client that has a certain prepaid balance at the shop. And as we change this, at the same time, we'll move it
from the URL path (where the client was putting the base64url-encoded fulfillment), to an http request header, which
we'll call `Pay-Token`. The shop will also add a response header, `Pay-Balance`, which will inform the client of its
current balance.

Note that in the [Hosted Ledgers](../hosted-ledgers) tutorial, we will see another way of implementing the idea of prepaid
balance at the shop; there, the shop will run an Interledger-enabled ledger, at which the client has a balance. Both
have advantages and disadvantages, as will be discussed in more detail in the hosted-ledgers tutorial.

## Customer-generated shared secret

A final optimization we want to make is to allow the client to pick its own shared secret, instead of getting one
assigned by the shop. This can be useful when, for instance, a user has two devices (one for paying, one for consuming),
and these devices are not connected to each other, but they do have a shared secret between them (for instance, the same
ssh key is installed on both devices). The user can then use one device to put prepaid credit "on" that shared secret at
the shop, and use the other devices to consume the letter. Implementing this is quite simple: the client already sends
a `Pay-Token` header on its first request:

```js
const sharedSecret = crypto.randomBytes(32)

plugin.connect().then(function () {
  return fetch('http://localhost:8000/', {
    headers: {
      'Pay-Token': base64url(sharedSecret)
    }
  })
```

And then instead of generating a shared secret for it, the shop will use that secret
which the client picked.

```js
     const sharedSecret = crypto.randomBytes(32)

      // Use client-generated shared secret, if presented:
      if (req.headers['Pay-Token']) {
        sharedSecret = Buffer.from(req.headers['Pay-Token'], 'base64')
        console.log('Accepted shared secret from client', req.headers['Pay-Token'])
      }

      // Store the shared secret to use when we get paid
```

You can see the changes from this and the previous section implemented in `shop2.js` and `client2.js`.

# ILP Curl

So far, in this tutorial, we updated the Letter Shop with three extra improvements:
* use the (repeatable) `'interledger-hkdf'` payment method instead of the more basic `'interledger-condition'` method
* add prepaid balance for each customer of the shop
* let the client pick the shared secret

As a reader, you may be asking yourself where all of these small improvements are going, and why we thought it's so important
to add them in this tutorial. The answer is we didn't pick them by accident: they are all things you need to change
to become compatible with the new 'http-ilp' standard. There are two final changes which we need to make in order to become
compatible with the current experimental implementation of http-ilp (which is slightly different from the latest version of
the http-ilp specification at IETF discussions): remove the `'interledger-hkdf '` string from the `Pay` header,
and use a [different string](https://github.com/interledgerjs/ilp-plugin/pull/1) to identify the XRP testnet ledger 

These last tweaks have been made in `shop3.js` and `client3.js`, and again,
you can try running them to check that it works as expected.
 
And now, finally, to prove that our shop is now compatible with other publically available http-ilp tools, run `shop3.js` and then
instead of running `client3.js`, use the ilp-curl tool to buy a letter from the shop:

```
$ npm install -g ilp-curl
$ ilp-curl -X GET localhost:8000
Your letter: A
```

Behind the scenes, ilp-curl does the following:
* get an account on the XRP testnet and save the credentials in your `~/.ilprc.json` if you don't have that file yet
* read your plugin credentials from your `~/.ilprc.json` file (this file replaces `./plugins.js`)
* generate a shared secret for http://localhost:8000
* make an OPTIONS request to http://localhost:8000 to send the shared secret to the shop and learn the price of one letter
* use an Interledger payment to deposit money into the prepaid account at the shop
* retrieve one letter
* print the result

## Koa ILP

Another cool module we want to show you, is koa-ilp. It allows you to rewrite the Letter Shop
so that instead of the built-in `http` library, it will use the more powerful `koa`, which
is a webserver middleware framework which is very popular among frontend developers.

With Koa, we can simply import a module to make our server charge
money for requests. As you can see, `shop-koa.js` is only a few lines:

```js
const plugin = require('./plugins.js').xrp.Shop()
const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()

// work around https://github.com/interledgerjs/ilp-plugin/pull/1
plugin._prefix = 'g.crypto.ripple.escrow.'

// We use the plugin to create a new koa middleware.  This allows us to add a
// function to any endpoint that we want to ILP enable.
const KoaIlp = require('koa-ilp')
const ilp = new KoaIlp({ plugin })

// On the server's root endpoint, we add this ilp.paid() function, which
// requires payment of 1000 XRP drops (0.001 XRP) in order to run the main
// function code
router.get('/', ilp.paid({ price: 1000 }), async ctx => {
  const letter = ('ABCDEFGHIJKLMNOPQRSTUVWXYZ').split('')[(Math.floor(Math.random() * 26))]
  console.log('Sending letter:', letter)
  ctx.body = 'Your letter: ' + letter
})

// Add the route we defined to the application and then listen on port 8000.
app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8000)
```

Start the new server with:

```sh
$ DEBUG=* node shop-koa.js
```

## Testing our Server

To give you more of a feel of what is happening between client and shop on the http level,
let's just see what happens when we make a request to our server with `curl`.

```sh
$ curl -X GET localhost:8000/ -H Pay-Token:BPtQLNWS7owdlvFlNkMKbVjpBlmvuh1A-V47XdYmeW8
Your Payment Token BPtQLNWS7owdlvFlNkMKbVjpBlmvuh1A-V47XdYmeW8 has no funds available. It needs at least 1000
```

Oh, that's right. We haven't sent any money. We can see the human-readable
message that the server gave back to us, but there's also a machine readable
version that the ILP tools can use, specified in [HTTP-ILP](https://github.com/interledger/rfcs/blob/58d8dcb015b160a381313126fa3065c64406db05/0014-http-ilp/0014-http-ilp.md#http-ilp).

Let's look at all the headers that came back on the request we just sent.
We can do that by adding the verbose (`-v`) flag to curl.

```sh
$ curl -v -X GET localhost:8000/ -H Pay-Token:BPtQLNWS7owdlvFlNkMKbVjpBlmvuh1A-V47XdYmeW8

* Rebuilt URL to: localhost:8000/
*   Trying ::1...
* TCP_NODELAY set
* Connected to localhost (::1) port 8000 (#0)
> GET / HTTP/1.1
> Host: localhost:8000
> User-Agent: curl/7.51.0
> Accept: */*
> Pay-Token:BPtQLNWS7owdlvFlNkMKbVjpBlmvuh1A-V47XdYmeW8
>
< HTTP/1.1 402 Payment Required
< Pay: 1000 g.crypto.ripple.escrow.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW.JCOtNQAm8OQlKPHR8dMeJixwfDXdpEQJw BEYMjoXSFQSCKlFRZ6itCQ
< Pay-Balance: 0
< Content-Type: text/plain; charset=utf-8
< Content-Length: 109
< Date: Thu, 26 Oct 2017 18:51:13 GMT
< Connection: keep-alive
<
* Curl_http_done: called premature == 0
* Connection #0 to host localhost left intact
Your Payment Token BPtQLNWS7owdlvFlNkMKbVjpBlmvuh1A-V47XdYmeW8 has no funds available. It needs at least 1000%
```

That's a lot of output. The lines we care about are in the response headers.
They're called `Pay` and `Pay-Balance`.

```
Pay: 1000 g.crypto.ripple.escrow.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW.JCOtNQAm8OQlKPHR8dMeJixwfDXdpEQJw BEYMjoXSFQSCKlFRZ6itCQ
```

As you can see, the `Pay` header is made up of three portions instead of four now (the payment method identifier `'interledger-psk'` at the beginning is omitted).

The `Pay-Balance` header tells us how much money is on our token right now.
We've not funded it yet, so the amount is `0`.

## What's next

In the next tutorial, we will see how letters can flow from the shop, as money flows from the client in a stream. We call that [Streaming Payments](/tutorials/streaming-payments)

## What you learned

We learned how to make our Letter Shop compatible with different versions of the newly proposed HTTP-ILP standard.
We learned how to buy a letter with ILP Curl.
Finally, we learned how to use the high-level ILP developer tools to rewrite our Letter Shop using the Koa webserver middleware framework.
