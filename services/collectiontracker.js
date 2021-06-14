require('dotenv').config()
const ethers = require('ethers')

const { default: axios } = require('axios')

const mongoose = require('mongoose')
const NFTITEM = mongoose.model('NFTITEM')

const contractutils = require('./contract.utils')

const rpcapi = process.env.MAINNET_RPC
const provider = new ethers.providers.JsonRpcProvider(rpcapi, 250)
const provider1 = new ethers.providers.JsonRpcProvider(
  'https://rpc2.fantom.network',
  250,
)
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

const getBlockTime = async (blockNumber) => {
  let block = await provider1.getBlock(parseInt(blockNumber))
  let blockTime = block.timestamp
  blockTime = new Date(blockTime * 1000)
  return blockTime
}

const trackSingleContract = async (sc, address) => {
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
  let blockNumberMap = new Map()

  eventLogs.map((eventLog) => {
    let topics = eventLog.topics
    let receiver = toLowerCase(extractAddress(topics[2]))
    let tokenID = parseTokenID(topics[3])
    blockNumberMap.set(tokenID, eventLog.blockNumber)
    ownerMap.set(tokenID, receiver)
    if (!tokenIDs.includes(tokenID)) tokenIDs.push(tokenID)
  })

  let promise = tokenIDs.map(async (tokenID, index) => {
    setTimeout(async () => {
      try {
        let erc721token = await NFTITEM.findOne({
          contractAddress: address,
          tokenID: tokenID,
        })
        if (erc721token) {
          if (erc721token.owner != ownerMap.get(tokenID)) {
            erc721token.owner = ownerMap.get(tokenID)
            await erc721token.save()
          }
        } else {
          let tokenURI = await sc.tokenURI(tokenID)
          if (tokenURI.startsWith('https://')) {
            let newTk = new NFTITEM()
            newTk.contractAddress = address
            newTk.tokenID = tokenID
            newTk.tokenURI = tokenURI
            newTk.owner = ownerMap.get(tokenID)
            newTk.tokenType = 721
            let tokenName = ''
            try {
              let metadata = await axios.get(tokenURI)
              if (metadata) tokenName = metadata.data.name
            } catch (error) {}
            newTk.name = tokenName
            try {
              let mintTime = await getBlockTime(blockNumberMap.get(tokenID))
              newTk.createdAt = mintTime
            } catch (error) {}
            try {
              await newTk.save()
            } catch (error) {}
          }
        }
      } catch (error) {}
    }, index * 100)
  })

  await Promise.all(promise)
}

const trackERC721Distribution = async (contracts) => {
  let promise = contracts.map(async (contract) => {
    let sc = contractutils.loadContractFromAddress(contract.address)
    await trackSingleContract(sc, contract.address)
  })
  await Promise.all(promise)
}

const collectionTracker = {
  trackERC721Distribution,
}

module.exports = collectionTracker
