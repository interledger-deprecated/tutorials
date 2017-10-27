---
layout: page
title: "Letter Shop Tutorial | Interledger"
---
# Letter Shop Tutorial

In this tutorial you'll learn some of the basic concepts of Interledger and some of the standards that make ILP a protocol that can be applied to any payment network. 

In the tutorial we will run a very basic online service which sells... letters, and write a client to pay for them.

Every time you visit the site you will be given a random letter from A - Z. But, if you haven't paid the fee you'll be prompted to pay first and will only be able to collect your letter when you have done so.

In order to make the payment required to get our letter we will also implement a simple client to make the payment.

> This tutorial uses the XRP Testnet as the underlying payment network but any payment network can be used if there is a working ledger plugin for it. Check out the existing plugins that are in development on [GitHub](https://github.com/search?utf8=%E2%9C%93&q=ilp-plugin-).

## What you need before you start:

* a computer with an internet connection
* [NodeJS](https://nodejs.org/en/download/current/) version 7 or higher installed
* basic knowledge of the command line terminal
* basic knowledge of JavaScript
* (optional) have git installed

## What you'll learn:

* about conditional payments and hashtimelock agreements
* about ILP Addresses
* about the Ledger Plugin Interface (LPI) and how to configure and use plugins
* how to build a service that accepts Interledger payments 
* how to build a basic payment client for sending Interledger payments
* (bonus) how to build a client proxy that automates paying for requests as required

> **NOTE:** There will be times, while doing this tutorial, when following the instructions results in an error. **That may be intentional.** Read on to understand why the error exists and how to fix it.

## Background

To illustrate the basic ILP concepts we're going to build a simple online service that sells letters of the alphabet and accepts payments via ILP. *We haven't patented the idea so please be generous if you deploy this and become an instant millionaire.*

To do this we need a **server**, run by the shop, and also a **client**, run by the customer. 

### Server

The server will perform two functions:
1. It will host an HTTP service where clients can GET a new random letter with each request.
1. It will listen for incoming ILP payments related to pending letter purchases, fulfill these to accept the payment, and provide the payer with a token they can use to claim their letter.

Once we have completed the tutorial the server will perform the following steps:

1. Connect to an account and monitor it for incoming payments
1. Start a web server to accept letter requests
1. Process a request, store the result, and provide the customer with details of how to pay for the request and get the result
1. Process an incoming payment related to a previous request, and provide payer with the data required to perform request again using a proof-of-payment token
1. Process a request containing a proof-of-payment token, and return the originally generated result

### Client

The client will perform an ILP payment and output the returned fulfillment. This can be redeemed to get the letter that was requested in the original request.

Once we have completed the tutorial the client will perform the following steps:

1. Connect to an account from which to send payments
1. Initiate a payment using the address, amount, and condition provided in the response to the original letter request
1. Complete the payment and return the proof-of-payment token and instructions on how to use it to complete the original request

## Step 1: Get the code

The code for this tutorial is available in two forms:

1. If you follow the tutorial you will start with some very basic code and will flesh it out as we go. 
2. If you'd prefer to start with the finished code and simply walk through the steps then you can do that too.

First let's get all the code, either using Git or by simply downloading and unzipping it.

#### Git

```shell
git clone https://github.com/interledger/tutorials
```

#### Download

[ZIP Archive](https://github.com/interledger/tutorials/archive/master.zip)

Assuming you have either cloned the repository, or unzipped your download, open a terminal window at the root of the project and change into the `letter-shop` directory.

You should see the following files:

```shell
README.md
package-lock.json
package.json
pay.js
plugins.js
proxy.js
shop.js
```

Most of these files are just scaffolding, waiting for you to complete as we go. If you want the complete files so you can just follow along, switch into the `complete` sub-directory.

## Step 2: Run the server

The first thing we need to do is install our dependencies and start our shop's server.

We install using npm (this may take a few minutes while it downloads all the dependencies):

```shell
npm install
```

> If you get an error here make sure you have `node` installed.

Then we try and start our shop server:

```shell
node shop.js
```

But, we've hit a snag... Read on.

### Interledger plugins

Our shop, and many other components we'll build in this tutorial, use ledger plugins. A plugin is a piece of code that talks to a specific account on a specific ledger.

Since Interledger connects potentially very different ledgers together, we need an abstraction layer that hides the specifics of the ledger, but exposes the interface needed to send and receive money over that ledger. That is what Interledger plugins are for. 

Ledger plugins expose a common interface (the Ledger Plugin Interface) so that irrespective of which ledger your application is connected to, the way it sends and receives payments is identical.

> **NOTE:** As we go through this tutorial we'll be using different functions of the Ledger Plugin Interface. You can find the reference documentation in [IL-RFC 0004, Draft 8](https://interledger.org/rfcs/0004-ledger-plugin-interface/draft-8.html).

We've put all of the plugin config into a single file called `plugins.js`. The default plugin we use is the *XRP Escrow* plugin which allows us to connect to the XRP Testnet Ledger.

The *XRP Escrow* plugin is a wrapper around [RippleLib](https://github.com/ripple/ripple-lib), and exposes the Ledger Plugin Interface (LPI). In the code, you see that an 'ilp-plugin-xrp-escrow' Plugin is being configured with secret, account, server, and prefix. The first three values come from the [XRP Testnet Faucet](https://ripple.com/build/xrp-test-net/).

Edit this file in your favourite text editor and follow the instructions in the code comments to:

1. Get different XRP Testnet credentials for both the shop and the customer.
1. Configure the XRP Ledger plugins with those new credentials

> **IMPORTANT:** Even if you are using the completed tutorial code you'll need to set this up so you are using your own test accounts.

Now try running your server again.

```shell
$ node shop.js
```

You should see something like:

```
== Starting the shop server ==
```

Inside `shop.js` you'll see we got an instance of the ledger plugin you configured in `plugins.js`:

```js
const plugin = require('./plugins.js').xrp.Shop()
```

Now we need to **do something** with that plugin. Replace the text `// Do something...` with the following:

```js
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

  // Handle incoming web requests...

  // Handle incoming transfers...

})
```

Stop the server and restart it with the new code. Now it will use the ledger plugin to connect to the XRP Testnet Ledger. When it is connected (usually a few seconds) you'll see some logging in the console providing info about the ledger.

We can get a lot of info from the plugin about the ledger and the account it is connected to using the `getInfo()` and `getAccount()` methods.

> **NOTE:** The currency of the ledger is XRP and the currency scale is 6. That means that to send 1 XRP to this ledger we must send an Interledger payment with an amount of 1000000 (1 million Drops).

> **Interledger standardizes on 64-bit unsigned integers for amounts.**

> Note how we normalize the cost of our service (10 Drops) to be able to express it in XRP (0.00001 XRP) for display purposes.

> **IMPORTANT:** Scale (and precision) can be a confusing aspect of any financial protocol and you'd do well to understand the ledger you are working with and be sure that when you are sending payments and displaying amounts to users you are getting your scale and precision right. We made the decision to avoid some complexity by using only scale and requiring that ledgers always express their currency with a precision of zero. This allowed us to only use integers (not decimals) in the protocol so all numbers are normalised to that form. There are a lot of other technical reasons behind the decision which you'll find discussed at length in the project issue list if you are interested.

Now we have the plugin connected and we have the info we need about the account where we will be accepting payments. 

:tada: Congratulations, our shop is performing step 1 of our 5 step plan!

Our next job is to start up the web server that will host our Letter Shop service.

Whenever a customer visits the website we'll try to find a proof-of-payment token in the URL. If the token is there we'll try to redeem it and give the customer their letter. If not we'll generate the letter and the proof-of-payment token and store these for later. 

Lastly we derive the condition for the payment (explained in more detail later) which we can give to the customer to send with their payment. This has an important function in Interledger but for our shop it's also useful to reconcile the payment and this original request.

Replace the text `// Handle incoming web requests...` with the following:

```js
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
  ```

This snippet defines two code paths for incoming HTTP requests (well three but the first is just a hack to ignore favicon requests).

The first path handles requests to http://localhost:8000/ (i.e. no token in the URL) and defines the logic to generate a new letter, but to store this in memory until the customer pays for it.

First we set the HTTP Response code to 402 (Payment Required). This is not necessary but it's a useful convention. We'll see later how this becomes more valuable.

Then we generate the data required to request an Interledger payment from the customer.

```js
const secret = crypto.randomBytes(32) //Get a random 32-byte number as our secret
const fulfillment = base64url(secret) //Encode it as a string so we can share it easily (put it in URLs etc.)
const condition = sha256(secret) //Hash the secret to get the condition we'll use for the payment
```

The first piece of data is the fulfillment that we will release to the payer when the payment is delivered. The second is the condition we give to the payer to attach to the payment.

The condition is simply a SHA-256 hash of the fulfillment, meaning nobody can derive the fulfillment from the condition but it's possible to quickly verify that the condition is a hash of the fulfillment.

> **NOTE:** Conditions and fulfillments are a critical aspect of Interledger which we'll explain further when we attempt to make the payment. For now it's fine to simply understand that the fulfillment is a secret held by the payee and the condition is sent by the payer with their payment.

In our shop we use the fulfillment as a proof-of-payment token so we store the letter we have generated for the customer using the fulfillment as the index.

The rest of that branch of the code simply returns the amount, ILP Address, and condition back to the customer so they can pay for their request.

### Interledger Addresses

Note that a key piece of data we provide the customer is the ILP Address they must make the payment to.

ILP Addresses are universal addresses for any account on any network or ledger. They consist of a prefix that identifies the ledger/network, an identifier for the account, and may also have a suffix that is specific to the transaction (not used in this tutorial).

The prefix is an Interledger prefix, which is like an [IP subnet](https://en.wikipedia.org/wiki/Subnetwork). In this case, `test.` indicates that we are connecting to the Interledger testnet-of-testnets. 

The next part, `crypto.` indicates that we will be referring to a crypto currency's ledger. And finally, `xrp.` indicates that this ledger is the XRP testnet ledger. If you know the ledger prefix and the account, you can put them together to get the Interledger Address. 

In this case, the Interledger address of our shop's account is `test.crypto.xrp.<ripple address>` and was output to the console when you started the server.

> **NOTE:** Having a universal addressing scheme is critical if we want a ledger/network agnostic payment protocol. All payments need a destination, and while many traditional accounts have their own addressing scheme (IBANs, PANs, PayPal addresses), there is not a single universal scheme that can be used to address any payment.

> To read more about ILP Addresses and how these can be derived for accounts on both traditional and new payment networks see [IL-RFC-15, draft 1](https://interledger.org/rfcs/0015-ilp-addresses/draft-1.html).

If you run the server now you'll see that it completes both step 1 and 2 of our 5 step program. 

:tada: Congratulations, you're making great progress to becoming a letter baron.

Now let's put ourselves in the shoes of the customer and attempt to buy our first letter!

## Step 3: Paying for a letter

As instructed on the console, open a browser window and go to http://localhost:8000.

You should get a message along the lines of:

```
Please send an Interledger payment of 0.00001 XRP to XXXXXXXXXXXXXXXXX using the condition YYYYYYYYYYYYYYYY
> node ./pay.js XXXXXXXXXXXXXXXXX 10 YYYYYYYYYYYYYYYY
```

As they say, *"There is no such thing as a free letter!"*. So now we turn our attention to the **client**, and paying for this elusive character.

Open a **new console window** and make sure your current working directory is the same one you're using to run the shop. Copy the command that the shop helpfully provided and paste it into the console window.

```shell
node ./pay.js XXXXXXXXXXXXXXXXX 10 YYYYYYYYYYYYYYYY
```

If you already configured the customer plugin in `plugins.js` then you'll likely see the following and then the script completes:

```shell
== Starting the payment client ==
```

Just like we did with the server, we need to do something with our configured plugin. So let's edit `pay.js` and replace the text `// Do something...` with the following and try again:

```js
console.log(` 1. Connecting to an account to send payments...`)

plugin.connect().then(function () {
  const ledgerInfo = plugin.getInfo()
  const account = plugin.getAccount()
  console.log(`    - Connected to ledger: ${ledgerInfo.prefix}`)
  console.log(`    -- Account: ${account}`)
  console.log(`    -- Currency: ${ledgerInfo.currencyCode}`)
  console.log(`    -- CurrencyScale: ${ledgerInfo.currencyScale}`)

  // Make payment...

  // Listen for fulfillments...

})
```

You'll see that the script connects to the ledger and returns similar information to that returned when we connected the shop to the same ledger using its own account credentials.

But after that it simply hangs...

The comments in the code probably gave it away, but we now need to make the payment. Replace the text `// Make payment...` with:

```js
  console.log(` 2. Making payment to ${destinationAddress} ` +
                                        `using condition: ${condition}`)

  // Send the transfer
  plugin.sendTransfer({
    to: destinationAddress,
    amount: destinationAmount,
    executionCondition: condition,
    id: uuid(),
    from: plugin.getAccount(),
    ledger: plugin.getInfo().prefix,
    ilp: base64url(IlpPacket.serializeIlpPayment({
      amount: destinationAmount,
      account: destinationAddress
    })),
    expiresAt: new Date(new Date().getTime() + 1000000).toISOString()
  }).then(function () {
    console.log('    - Transfer prepared, waiting for fulfillment...')
  }, function (err) {
    console.error(err.message)
  })
```

We have parsed the `destinationAddress`, `destinationAmount`, and `condition` from the command line and now we are instructing our ledger plugin to prepare a transfer on the ledger.

> Note how the amount is expressed in the scale of the ledger. We know this to be 6 therefor our payment of 0.00001 XRP is expressed as 10 Drops.

> Also note how we are setting an expiry on the transfer we are preparing so that if the transfer is not fulfilled before that time it will roll-back.

### Conditional Payments and Hash Timelocked Agreements

At this point we should dig a little deeper into how transfers work in Interledger. They are a little different to a regular transfer on most traditional payment networks/ledgers in that they happen in two phases:
1. The transfer is prepared pending either the fulfillment of a condition, or expiry of a timeout
1. The transfer is either executed because the condition was fulfilled, or it rolls-back because it expired

In ILP we define a standard for the condition and the fulfillment. The condition is a 32-byte [SHA-256 hash](https://en.wikipedia.org/wiki/SHA-2) and the fulfillment is the 32-byte preimage of that hash. When a transfer is prepared by the sender the funds are locked, waiting for delivery to the receiver. The lock is the condition (a hash) and the key is the fulfillment. But, to avoid funds being locked up indefinitely, if the key is never produced the prepared transfer also has an expiry.

> **INFO:** A hash is a one-way function. Therefor for `condition = sha256hash(fulfillment)` there is no function `f` for which `fulfillment = f(condition)`. The only way to figure out the fulfillment is to guess. Because of the size of a SHA-256 hash (32 bytes) it is estimated that all the computing power in the world would take millions of years to guess its preimage. A pretty safe lock then for a transfer that shouldn't take more than a few seconds to complete.

We call this arrangement, between the parties to the transfer, a Hash Timelock Agreement (HTLA). You may have come across HTLCs or Hash Timelock Contracts as used in many crypto-currency based system like Lightning. HTLAs are a generalization of this that don't prescribe how they are enforced (i.e. It may not be a contract written in the code of the ledger like in a crypto-currency ledger, it may be an agreement enforced by law or simply based on trust). 

How two parties make transfers to one-another on a ledger will depend on the relationship between them and also the features of the underlying ledger. For our tutorial we are using a plugin specific to XRP Ledger, which uses [the on-ledger escrow](https://ripple.com/build/rippleapi/#transaction-types) features of that ledger. This means the parties are able to make transfers with no pre-existing relationship.

For more info on the different types of HTLA have a look at [IL-RFC 0022](https://interledger.org/rfcs/0022-hashed-timelock-agreements/).


> **NOTE:** ILP is a protocol for making payments that can traverse multiple networks. Therefor it's necessary to distinguish between the **payment** (from a sender to a receiver) and the one or more **transfers** on different networks/ledgers (between sender, intermediaries and the receiver) that make up the payment.

> In this simple example the payment is made using only a single transfer so the destination, and amount of the transfer, is the same as the destination and amount of the payment. You can see this from the fact that the same values are passed to the `sendTransfer()` function and used to build the ILP packet (`IlpPacket.serializeIlpPayment()`)

> In a later tutorial we'll expand this example to pay across multiple networks and demonstrate how these values will often be different.

Now that we've added the code to make our transfer let's run the script again and pay for our letter. This time you should see a message to say that we are making our payment, and waiting for the fulfillment.

:tada: Congratulations, that's step 2 of 3 completed for our client! Now switch back to the terminal where you're running the shop and let's see if the payment has arrived...

It hasn't, has it? So let's figure out why.

### Finding your transfer on the ledger

> The following short section is very specific to XRP Ledger but gives you an idea of what to do if you are debugging a failed payment. If you would rather skip ahead to the next section you can.

Let's dissect what should have happened under the hood. You used the `pay.js` script to load the XRP Escrow plugin and prepare an escrow payment for 10 Drops (0.00001 XRP) to the address provided by the shop. 

Our payment hasn't arrived at the shop so let's start by inspecting the XRP Testnet Ledger and see if that payment was prepared. We're going to use the REST API exposed by the same testnet server we connect our plugin to.

First you need to find the sending account address you used. Look in `plugins.js` and find the account you configured your customer plugin with, or look at the output from running `pay.js` (you only need the Ripple address so trim off the ILP ledger prefix).

The following will install a small tool that formats the JSON output to make it easier to read:

```shell
npm install -g jslint
```

Next use `curl` to POST an API call to the XRP Testnet server (replace the address with your sending address):

```shell
curl -X POST -d '{ "method": "account_objects", "params": [{"ledger_index":"validated", "account": "YOUR-SENDING-ADDRESS", "type": "escrow"}]}' https://client.altnet.rippletest.net:51234 | jslint
```

*Installing `curl` is out of scope for this tutorial so if you don't already have it you can skip ahead or figure that bit out yourself.*

You should get back a JSON object that shows all the transactions sent from your account. In among them should be the transaction you just created. 

So our investigation has revealed that the transfer has been created on the ledger. We need to go back to our shop service and figure out why it wasn't received.

## Step 4: Accepting the payment

If you look through what we've got in `shop.js` so far you'll notice a comment `//Handle incoming transfers...`. That's our first hint that we're missing some code.

This is our first introduction to some of the events that can be raised by ledger plugins. There are a number of these and the one we are interested in is called `incoming_prepare`. This event is raised whenever a transfer is prepared on the ledger and your plugin's account is the intended recipient.

As soon as yur plugin connects to the ledger it will start listening for incoming transfers and should raise this event every time one occurs.

Replace `//Handle incoming transfers...` with the following code:

```js
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
```

In this code we first check that the incoming transfer is for the correct amount, and if it's not we raise an ILP Error and call the `rejectIncomingTransfer()` function to reject the transfer. If there were other business rules we wanted to evaluate before accepting the transfer we could do these here too.

If the transfer is correct, we extract the condition and use this to look up the fulfillment from our local store. If we can't find it then we aren't able to fufill the transfer so we reject it.

> **NOTE:** There are other ways to map a fulfillment to an incoming transfer, including techniques where the fulfillment is derived from the transaction data. For an example of such a technique have a look at the [PSK protocol](https://interledger.org/rfcs/0016-pre-shared-key/).

The last step we need to perform is to fulfill the transfer so that the funds are released to us from the ledger escrow. We do this using the `fulfillCondition()` function on the plugin.

> **NOTE:** There are only two ways to handle an `incoming_prepare` event as a the receiver. Reject it or fulfill it. This action then cascades back down the payment chain causing the transfers in the chain to either be fulfilled or rejected.

Restart the shop service and run through the process of visiting the website and making the payment again. You should see that the output of the server now includes accepting and fulfilling the payment. 

:tada: Congratulations, that's step 4 of 5 complete for our server!

But, our client is still waiting for the fulfillment. Let's go back to the client and finish this up!

## Step 5: Using the fulfillment to get the Letter

As you've proabably guessed, we're missing an event listener in our client too. Go back to `pay.js` and replace `// Listen for fulfillments...` with the following code:

```js
  // Handle fulfillments
  plugin.on('outgoing_fulfill', function (transferId, fulfillment) {
    console.log(`    - Transfer executed. Got fulfillment: ${fulfillment}`)
    console.log(` 3. Collect your letter at ` +
                                    `http://localhost:8000/${fulfillment}`)
    plugin.disconnect()
    process.exit()
  })
```

As the transfer initiator we are interested in fulfillments that come out of the ledger after being submitted by the receiver, so we listen for the `outgoing_fulfill` event.

All we need to do with that fulfillment in this instance is print it to the screen so the user can go and collect their letter.

Re-run your client and after a few seconds you should now get a response to that effect. 

:tada: Congratulations! You've now finished the client.

So all that's left to do is get that letter! Go back to your browser and paste the URL that was output by the client into your address bar and you should receive the letter that was prepared for you upon your first request.

If you switch back to the terminal window for your server you'll see some additional output showing that the shop server accepted the request, looked up the letter using the fulfillment, and returned this letter.

:tada: Congratulations, that's step 5 of 5 and you now have a working server too.

## Bonus Step: A Paying Proxy

It's very cumbersome to copy and paste the condition from your browser to your command-line terminal each time you need to pay for something online, and then to copy and paste back the fulfillment from your terminal to your browser once you have paid. 

For most paid services we'd expect the client to detect that a payment is required, make the payment, and then retry the request.

To do this we need to make a few tweaks to the server and client.

First, we need to make our responses machine readable so that the client can find the details of the payment required in the response. Recall how we used the 402 (Payment Required) HTTP response in the server when we responded to the initial request. Now we can see how this is useful for clients to help them recognise the response type.

Another minor change that is required is to put the payment details in a response header in a standard format that clients recognise.

Modify the code in `shop.js` to look like this:

```js
      console.log(`    - Waiting for payment...`)

      res.setHeader("Pay", `${cost} ${account} ${condition}`)

      res.end(`Please send an Interledger payment of ${normalizedCost} ${ledgerInfo.currencyCode} to ${account} using the condition ${condition}\n` +
              `> node ./pay.js ${account} ${cost} ${condition}`)
```

When our shop responds to the request for a letter with a *"Payment Required"* response it will include the details of how to make the payment in the *"Pay"* header.

Clients that know how to interpret that header can process it and make the payment without the user intervening.

We have written a little proxy service that can do this for you. Have a look at `proxy.js` and you'll note that it has a lot of similarities with our client `pay.js` script.

The key differences are:
1. It hosts a web server at http://localhost:8001 which forwards any requests it receives to http://localhost:8000
1. It intercepts the response and, if a payment is required, makes the payment
1. After making a payment and getting back the fulfillment the proxy will retry the request and only then will it pass the response back to the original caller.

In the terminal windo where you ran your client, start the proxy instead:

```shell
node ./proxy.js
```
Now, instead of visiting http://localhost:8000/, visit http://localhost:8001/. This will take a while to load because in the background the proxy is busy paying for your request.

Look at the two terminal windows to see the activity at the shop and the proxy for each request.

## What have we learned?

The plugin used in all three scripts exposes the Ledger Plugin Interface (LPI) as described in [IL-RPC-4, draft 6](https://interledger.org/rfcs/0004-ledger-plugin-interface/draft-6.html), and of that, this script uses the following methods and events:
* `sendTransfer` method prepares a transfer to some other account on the same ledger.
* `getInfo` method to get information about the ledger the plugin is connected to
* `getAccount` method to get the account ILP Address of the plugin
* `rejectIncomingTransfer` method rejects an incoming transfer if someone tries to pay the wrong amount or the condition is invalid
* `fulfillCondition` method fulfills the condition of an incoming transfer
* `incoming_prepare` event is triggered when someone else sends you a conditional transfer
* `outgoing_fulfill` event is triggered when someone else fulfills your conditional transfer

## What's next?

There are a number of other tutorials that build on this one (some are still a work in progress).

If you look at the Ledger Plugin Interface documentation you'll see there are a few functions we didn't cover here such as `sendRequest( message:Message )` which are critical to more complex Interledger payments. These will be covered in more detail in later tutorials along with concepts such as quoting and some of the other application layer protocols that have been developed on top of ILP.

If you read the paragraphs above, you will have seen quite a few new words; see the glossary in [IL-RFC-19, draft 1](https://interledger.org/rfcs/0019-glossary/draft-1.html) as a reference if you forget some of them.