const bpi39 = require("bip39");
const bip84 = require("bip84"); //requires node-options="--openssl-legacy-provider", use npm run

console.log(null ?? "hello");
const newPhrase = bpi39.generateMnemonic();

//"garage pretty desert right pair patrol this love ripple blood blouse faith";
console.log(bpi39.validateMnemonic(newPhrase));
//console.log(newPhrase.toString());

const phraseArray = newPhrase.split(" ");

function permuteArray(array, stride) {
    const result = [];
    console.log(array.length);
    let k = 0;
    for(let s = 0; s < stride; s++) {
        for(let i = s; i < array.length; i+= stride) {
            console.log(i);
            //result.push(array[i]);
            result[i] = array[k];
            k++;
        }
    }
    return result;
}

console.log(phraseArray);
console.log(permuteArray(permuteArray(phraseArray, 3), 3).join(" "));

console.log(bpi39.validateMnemonic("garage pretty desert right pair patrol this love ripple blood blouse faith"));

const root = new bip84.fromMnemonic("garage pretty desert right pair patrol this love ripple blood blouse faith");
const rootAccount = root.deriveAccount(0);
const account = new bip84.fromZPrv(rootAccount);
const address1 = account.getAddress(0, true);
const address2 = account.getAddress(0);
console.log(address2);

// console.log(address1);
// console.log(address2);
