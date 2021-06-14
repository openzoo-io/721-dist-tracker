require('dotenv').config()
const axios = require('axios')
const ethers = require('ethers')

let rpcapi = process.env.MAINNET_RPC

const provider = new ethers.providers.JsonRpcProvider(rpcapi, 250)

const collectionTracker = require('./collectiontracker')
const contractutils = require('./contract.utils')

const ftmScanApiKey = process.env.FTM_SCAN_API_KEY
const validatorAddress = process.env.VALIDATORADDRESS
const limit = 99999999999

const toLowerCase = (val) => {
  if (val) return val.toLowerCase()
  else return val
}

const trackedAddresses = []
const trackedContracts = []

const trackerc721 = async (begin, end) => {
  try {
    let contracts = new Array()

    let request = `https://api.ftmscan.com/api?module=account&action=tokennfttx&address=${validatorAddress}&startblock=${begin}&endblock=${end}&sort=asc&apikey=${ftmScanApiKey}`
    let result = await axios.get(request)
    let tnxs = result.data.result

    if (tnxs.length == 0) return end
    if (tnxs) {
      let promises = tnxs.map(async (tnx) => {
        let contractInfo = {
          address: toLowerCase(tnx.contractAddress),
          name: tnx.tokenName,
          symbol: tnx.tokenSymbol,
        }
        if (
          !contracts.some(
            (contract) => contract.address == contractInfo.address,
          )
        ) {
          if (!trackedAddresses.includes(contractInfo.address)) {
            contracts.push(contractInfo)
            let sc = contractutils.loadContractFromAddress(contractInfo.address)
            trackedAddresses.push(contractInfo.address)
            console.log(contractInfo.address)
            trackedContracts.push(sc)
          }
        }
      })
      await Promise.all(promises)
      await collectionTracker.trackERC721Distribution(contracts)
    }
    return end
  } catch (error) {}
}

let start = 1

const trackAll721s = async () => {
  const func = async () => {
    try {
      let currentBlockHeight = await provider.getBlockNumber()
      start = await trackerc721(start, currentBlockHeight)
      if (currentBlockHeight > limit) start = 0
      setTimeout(async () => {
        await func()
      }, 1000 * 60)
    } catch (error) {}
  }
  await func()
}

const Tracker = {
  trackedContracts,
  trackAll721s,
}

module.exports = Tracker
