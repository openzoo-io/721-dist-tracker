"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const solc = require("solc");
const fs = require("fs");
const path = require("path");
const Web3 = require("web3");
const web3 = new Web3(new Web3.providers.HttpProvider(process.env.NETWORK_RPC));
const eth = web3.eth;
try {
    const sources = {
        'validator.sol': fs.readFileSync(path.resolve(`./src/contracts/validator.sol`)).toString(),
    };
    const output = solc.compile({ sources }, 1);
    if (output.errors) {
        throw new Error(output.errors);
    }
    for (const name in output.contracts) {
        const contract = output.contracts[name];
        const data = JSON.parse(contract.interface);
        console.log(`${name.split(':')[1]}:`, JSON.stringify(data.map(item => {
            if (item.type === 'event') {
                item.signature = eth.abi.encodeEventSignature(item);
            }
            return item;
        })));
        console.log('');
        console.log('');
    }
}
catch (e) {
    console.log(e);
}
//# sourceMappingURL=print-abis.js.map