require('dotenv').config()
const axios = require('axios')

const trackERC721Distribution = require('./collectiontracker')
const contractutils = require('./contract.utils')
const apiEndPoint = process.env.API_ENDPOINT

const trackedAddresses = []
const trackedContracts = []

const trackerc721 = async () => {
  let contracts = []
  try {
    let response = await axios.get(`${apiEndPoint}getTrackable721Contracts`)
    if (response) {
      let data = response.data
      if (data.status == 'success') {
        data = data.data
        data.map((address) => {
          if (!trackedAddresses.includes(address)) {
            let sc = contractutils.loadContractFromAddress(address)
            trackedAddresses.push(address)
            trackedContracts.push(sc)
            contracts.push(address)
          }
        })
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
      await trackerc721()
      setTimeout(async () => {
        await func()
      }, 1000 * 60)
    } catch (error) {}
  }
  await func()
}

module.exports = trackAll721s
