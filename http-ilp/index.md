# HTTP with ILP Tutorial

## What you need before you start:

* complete the [Letter Shop](./letter-shop) tutorial first

## What you'll learn:

* rewriting the letter shop with Koa ILP
* how HTTP-ILP works
* how to use ILP curl to make paid API requests

## Koa ILP

We'll change the Letter Shop from the previous tutorial a bit, to `shop2.js`. Instead of
using a human-readable "Payment Required" message that starts with "Please ...", we will
now use a machine-readable http header, and a fulfillment/condition pair that is generated
deterministically from a secret that's shared between the shop and the client.

It turns out that this is a common use case for ILP, so there are already libraries that
let us do this in node. We're going to be switching from the built-in `http` library to
the more powerful `koa`. With Koa, we can simply import a module to make our server charge
money for requests. We'll look further into how this works later.

```js
const Koa = require('koa')
const app = new Koa()
const router = require('koa-router')()

// instantiate our plugin just the same as before
const Plugin = require('ilp-plugin-xrp-escrow')
const plugin = new Plugin({
  secret: 'ssGjGT4sz4rp2xahcDj87P71rTYXo',
  account: 'rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW',
  server: 'wss://s.altnet.rippletest.net:51233'
})

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
  ctx.body = { letter }
})

// Add the route we defined to the application and then listen on port 8000.
app
  .use(router.routes())
  .use(router.allowedMethods())
  .listen(8000)
```

Start the new server with:

```sh
$ DEBUG=* node shop2.js
```

## Testing our Server

Now we've got our server, but we still need a client. First let's just see what happens when
we make a request to our server with `curl`.

```sh
$ curl -X GET localhost:8000/
No valid payment token provided
```

HTTP ILP works by associating a balance with a 32-byte authentication token. We
haven't given the server anything, so it doesn't know who to charge. Let's fix
that by giving it a token:

```sh
$ curl -X GET localhost:8000/ -H Pay-Token:BPtQLNWS7owdlvFlNkMKbVjpBlmvuh1A-V47XdYmeW8
Your Payment Token BPtQLNWS7owdlvFlNkMKbVjpBlmvuh1A-V47XdYmeW8 has no funds available. It needs at least 1000
```

Oh, that's right. We haven't sent any money. We can see the human-readable
message that the server gave back to us, but there's also a machine readable
version that the ILP tools can use, specified in [HTTP-ILP](https://github.com/interledger/rfcs/blob/58d8dcb015b160a381313126fa3065c64406db05/0014-http-ilp/0014-http-ilp.md#http-ilp).

## HTTP-ILP and The Pay Header

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
< Pay: interledger-psk 1000 g.crypto.ripple.escrow.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW.JCOtNQAm8OQlKPHR8dMeJixwfDXdpEQJw BEYMjoXSFQSCKlFRZ6itCQ
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
Pay: interledger-psk 1000 g.crypto.ripple.escrow.rrhnXcox5bEmZfJCHzPxajUtwdt772zrCW.JCOtNQAm8OQlKPHR8dMeJixwfDXdpEQJw BEYMjoXSFQSCKlFRZ6itCQ
```

`Pay` is made up of four portions: There's a payment method identifier `'interledger-psk'`, an amount required to fund this
request, an ILP address to send money to, and a shared secret. The shared
secret lets us use the [PSK
Protocol](https://github.com/interledger/rfcs/blob/master/0016-pre-shared-key/0016-pre-shared-key.md#pre-shared-key-transport-protocol-psk)
to agree on a condition without communicating.  From this one shared secret, we
can send as many payments as we want.

The `Pay-Balance` header tells us how much money is on our token right now.
We've not funded it yet, so the amount is `0`.

# ILP Curl

We want to make an HTTP request that includes payment, but our client from
before won't work against the official HTTP ILP spec. Fortunately, there exists
a tool for this purpose called ILP Curl.

```
$ npm install -g ilp-curl
$ ilp-curl -X GET localhost:8000
{ letter: 'A' }
```

We no longer have to specify a token; ILP curl will do that for us.
Furthermore, it will acquire us some testnet XRP to fund its request.

ILP curl makes a preliminary request which returns a 402. It takes out the
`Pay` header and sends an ILP payment to the server, using XRP. Then, once the
ILP payment has completed, it makes the request again and is successful.

## What you learned

We learned how to use the high-level ILP developer tools to make a server that
accepts payments.  We learned how HTTP-ILP uses the `Pay` header to tell
clients how to automatically pay it.  Finally, we learned how to pay one of
these servers with ILP Curl.
