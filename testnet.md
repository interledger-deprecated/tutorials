# Connecting to the testnet

So far, in the Letter Shop tutorial, and also (if you've already done that one) in the Streaming Payments tutorial,
you sent payments from the wallet on your laptop to the shop on your laptop, either directly or over the XRP testnet ledger,
but never interacting with any Interledger addresses which you didn't create on your local machine. Therefore, even if
the transfer went over the public XRP testnet, on the Interledger level, these payments happened within a closed network.

But there is an Interledger testnet-of-testnets, too, where you can participate! It consists of nodes with routing tables,
and to join, you either have to convince these existing nodes to list your node, or pick an Interledger address "at" one
of the nodes. The easiest way to do this is to set up a BTP trustline with Amundsen, a testnet node that is specialized
in offering onboarding to people who are new to the network.

Run the `testnet-shop.js` script. You'll see it uses the 'ilp-plugin-btp-client' plugin to connect to Amundsen. The
username and token are chosen randomly.

Now, when you visit http://localhost:8000, you'll be instructed to run `testnet-pay.js`. It functions differently than
the `pay.js` script from the Letter Shop tutorial, in a fundamental way: it sends the transfer to Amundsen, even
if the payment destination is your own Letter Shop! Amundsen will notice the incoming 'prepare' event, see the payment
destination which you put in the 'ilp' field of the transfer, and create a second transfer, by which the payment is
forwarded. So one payment (from you to your shop) consists of two transfers (from you to Amundsen, and from Amundsen to
your shop).

Note that the Interledger addresses for you shop and your wallet (your 'testnet-pay.js' script) both start with `test.amundsen.`.
This is because they are both accounts on private ledgers, run on the amundsen.michielbdejong.com server.

You will also be able to pay out to XRP wallets; just set the destination address to `test.crypto.xrp.' + the XRP address.

## Using the Interfaucet

You can use the Interfaucet to get free test money, delivered to anywhere on the testnet-of-testnets. The use of the
Interfaucet is based on [version 2 of the Interledger Payment Request standard](https://interledger.org/rfcs/0011-interledger-payment-request/draft-1.html).
Just run the `fund.js` script, and follow the instructions! :)
