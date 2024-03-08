const bpi39 = require("bip39");
const bip84 = require("bip84"); //requires node-options="--openssl-legacy-provider", use npm run
console.log(bpi39.validateMnemonic("garage pair ripple pretty patrol blood desert this blouse right love faith"));

console.log(bpi39.validateMnemonic("toilet polar aisle define expand tank general timber inmate share fade subject"));

const root = new bip84.fromMnemonic("garage pair ripple pretty patrol blood desert this blouse right love faith");
const rootAccount = root.deriveAccount(0);
const account = new bip84.fromZPrv(rootAccount);
const address1 = account.getAddress(0, true);
const address2 = account.getAddress(0);

console.log(address1);
console.log(address2);
