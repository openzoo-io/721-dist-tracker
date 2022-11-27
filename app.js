require('dotenv').config()

const trackAll721s = require('./services/erc721tracker')

trackAll721s().then(console.log).catch(console.log);
