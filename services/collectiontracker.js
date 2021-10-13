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
  try {
    return axios({
      method: 'post',
      url: apiEndPoint + endpoint,
      data,
    })
  } catch (err) {
    console.error('[callAPI error] failed for: ', {data});
    console.error(err.message);
  }
}

const trackSingleContract = async (address) => {
  console.log(`Starting contract: ${address}`)
  let eventLogs
  try {
    eventLogs = await provider.getLogs({
      address: address,
      fromBlock: 0,
      topics: [
        ethers.utils.id('Transfer(address,address,uint256)'),
        null,
        null,
        null,
      ],
    })
  } catch (err) {
    console.error(`Failed to get logs for contract: ${address}`, err.message);
    return;
  }

  let tokenIDs = []
  let ownerMap = new Map()

  eventLogs.map((eventLog) => {
    let topics = eventLog.topics
    let receiver = toLowerCase(extractAddress(topics[2]))
    let tokenID = parseTokenID(topics[3])
    ownerMap.set(tokenID, receiver)
    if (!tokenIDs.includes(tokenID)) tokenIDs.push(tokenID)
  })

  console.info(`[${address}] sending ${tokenIDs.length} transfer events`);

  const concurrency = 30;
  const batches = Math.ceil(tokenIDs.length / concurrency);

  let batch = 1;
  let lastStop = 0;
  let status;

  return new Promise((resolve) => {
    let interval = setInterval(async () => {
      if (batch > batches) {
        console.info(`[${address}] all batches send`);
        clearInterval(interval);
        return resolve()
      }

      if (status === "pending") {
        console.debug(`Waiting for batch: ${batch} to finish`);
        return;
      }

      status = "pending";
      console.debug(`Running batch ${batch} of ${batches} [${lastStop}, ${lastStop + concurrency}]`);
      const tokensInBatch = tokenIDs.slice(lastStop, lastStop + concurrency < tokenIDs.length ? lastStop + concurrency : tokenIDs.length - 1);
      const promises = tokensInBatch.map(async (tokenID) => {
        const to = ownerMap.get(tokenID);
        return callAPI('handle721Transfer', {address, to, tokenID})
      });
      await Promise.all(promises);

      console.debug(`Batch: ${batch} finished`);
      batch += 1;
      lastStop = lastStop + concurrency;
      status = "completed"
    }, 100);
  })
}

const trackERC721Distribution = async (addresses) => {
  for (const address of addresses) {
    await trackSingleContract(address)
  }
}

module.exports = trackERC721Distribution
