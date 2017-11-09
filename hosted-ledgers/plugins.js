const HostedLedgerPlugin = require('ilp-plugin-payment-channel-framework')
const ObjStore = require('ilp-plugin-payment-channel-framework/src/model/in-memory-store')

exports.xrp /* sic */ = {
  Customer: function () {
    return new HostedLedgerPlugin({
      server: 'btp+ws://:@localhost:9000/'
    })
  },
  Shop: function () {
    return new HostedLedgerPlugin({
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
  }
}
