require('dotenv').config()
const axios = require('axios')
const { MongoClient, ServerApiVersion } = require('mongodb');
const trackERC721Distribution = require('./collectiontracker')
const contractutils = require('./contract.utils')
const apiEndPoint = process.env.API_ENDPOINT
const dbURL = process.env.DB_URL
let dbClient = null;
let dbCollection = null;

let trackedAddresses = []
const trackedContracts = []

const readTrackedFromApi = async () => {
  const response = await axios.get(apiEndPoint + '/tracked')
  const tracked = response.data
  tracked.forEach((t) => {
    if (t.type === 'address') {
      trackedAddresses.push(t.address)
    } else if (t.type === 'contract') {
      trackedContracts.push(t.address)
    }
  })


const trackerc721 = async () => {
  let contracts = []
  try {
    let response = await axios.get(`${apiEndPoint}getTrackable721Contracts`)
    if (response) {
      let data = response.data
      if (data.status == 'success') {
        data = data.data
        for (let i = 0; i < data.length; i++) {
          let address = data[i];
          if (!trackedAddresses.includes(address)) {
            let sc = contractutils.loadContractFromAddress(address)
            trackedAddresses.push(address)
            trackedContracts.push(sc)
            contracts.push(address)
            await dbCollection.insertOne({ address: address, type: 'erc721' });
          }
        }

        console.info(`Tracking ${contracts.length} new contracts`);
        await trackERC721Distribution(contracts)
      }
    }
  } catch (error) {
    console.log(error)
  }
}

const trackAll721s = async () => {
  const func = async () => {
    try {
      dbClient = await MongoClient.connect(dbURL, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        serverApi: {
          version: ServerApiVersion.v1,
        },
      });
      console.log('connect db success');
      dbCollection = dbClient.db('test').collection('tracked721');
      const tracked = await dbCollection.find({}).toArray();
      trackedAddresses = tracked.map((t) => t.address);
      console.log('trackedAddresses', trackedAddresses);
      await trackerc721()
      setTimeout(async () => {
        await func()
      }, 1000 * 60)
    } catch (error) {}
  }
  await func()
}

module.exports = trackAll721s
