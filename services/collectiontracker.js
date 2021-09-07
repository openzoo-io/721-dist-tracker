require('dotenv').config()
const ethers = require('ethers')

const { default: axios } = require('axios')

const rpcapi = process.env.NETWORK_RPC
const chainID = parseInt(process.env.NETWORK_CHAINID)
const provider = new ethers.providers.JsonRpcProvider(rpcapi, chainID)

const toLowerCase = (val) => {
  if (val) return val.toLowerCase()
  else return val
}

const extractAddress = (data) => {
  let length = data.length
  return data.substring(0, 2) + data.substring(length - 40)
}

const parseTokenID = (hexData) => {
  return parseInt(hexData.toString())
}

const apiEndPoint = process.env.API_ENDPOINT

const callAPI = async (endpoint, data) => {
  console.log(data)
  await axios({
    method: 'post',
    url: apiEndPoint + endpoint,
    data,
  })
}

const trackSingleContract = async (address) => {
  let eventLogs = await provider.getLogs({
    address: address,
    fromBlock: 0,
    topics: [
      ethers.utils.id('Transfer(address,address,uint256)'),
      null,
      null,
      null,
    ],
  })

  let tokenIDs = []
  let ownerMap = new Map()

  eventLogs.map((eventLog) => {
    let topics = eventLog.topics
    let receiver = toLowerCase(extractAddress(topics[2]))
    let tokenID = parseTokenID(topics[3])
    ownerMap.set(tokenID, receiver)
    if (!tokenIDs.includes(tokenID)) tokenIDs.push(tokenID)
  })

  let promise = tokenIDs.map(async (tokenID, index) => {
    setTimeout(async () => {
      let to = ownerMap.get(tokenID)
      await callAPI('handle721Transfer', { address, to, tokenID })
    }, index * 100)
  })

  await Promise.all(promise)
}

const trackERC721Distribution = (addresses) => {
  addresses.map((address) => {
    trackSingleContract(address)
  })
}

module.exports = trackERC721Distribution
