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
