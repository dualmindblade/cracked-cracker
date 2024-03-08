const bip84 = require("bip84"); //requires node-options="--openssl-legacy-provider", use npm start
const { wordlists: { english: wordList }, validateMnemonic } = require("bip39");
const fs = require("fs");
const wordSet = new Set(wordList);

//const match = "bc1q4tjpnkxcfdanu084ugz4p3xjkveeldf62a4xkm";

//const root = new bip84.fromMnemonic("garage pair ripple pretty patrol blood desert this blouse right love faith");
// for(let j = 0; j < 100; j++)
// for(let i = 0; i< 100; i++) {
//     //root.coinType = i;
    // const rootAccount = root.deriveAccount(j);
    // const account = new bip84.fromZPrv(rootAccount);
    // const address1 = account.getAddress(i, true);
    // const address2 = account.getAddress(i);
    // const pk = account
//     if([address1, address2].includes( match)) {
//         console.log("!!!!!!!!");
//         break;
//     }
// }



const choiceReg = /^\(([a-z,]+)\)$/g;

//fuck off javascript
function doThingOnRegexWithoutMutating(regex, functionName, ...arguments) {
    const toExecute = regex[functionName];
    const result = toExecute.call(regex, ...arguments);
    regex.lastIndex = 0;
    return result;
}

fs.readFile(process.argv[2], {encoding: "utf-8"}, (err, data) => {
    if(err) throw err;
    const spec = JSON.parse(data);
    validateSpec(spec);
    spec.mnemonicPatterns.forEach(p => processPattern(p, spec.targetAddresses));
});

function validateWord(word) {
    if(!wordSet.has(word)) throw new Error(`${word} is not a valid BIP84 word.`);
}

function extractChoices(value) {
    const commaSep = doThingOnRegexWithoutMutating(choiceReg, "exec", value)[1];
    const words = commaSep.split(",");
    words.forEach(validateWord);
    return words;
}

function validateStringArray(stringArray, errorMessage) {
    if(!stringArray || 
        !Array.isArray(stringArray) || 
        stringArray.length == 0 ||
        !stringArray.every(address => typeof(address) === "string")) {
            throw new Error(errorMessage || "Invalid string array!");
        }
}

function validateSpec(spec) {
    validateStringArray(spec.targetAddresses, "Spec must provide a list of addresses to match.");
    validateStringArray(spec.mnemonicPatterns, "Spec must provide a list of mnemonic patterns.");
}

function parseMnemonicPattern(pattern) {
    const words = pattern.split(" ").filter(x => x.length > 0);
    if(words.length != 12) {
        throw new Error(`Patterns must have 12 parts. Invalid pattern: ${pattern}.`);
    }
    return words.map(parseWordPattern);
}

function parseWordPattern(wordPattern) {
    if(wordPattern === "*") {
        return wordList;
    }
    if(doThingOnRegexWithoutMutating(choiceReg, "test", wordPattern)) {
        const result = extractChoices(wordPattern);
        result.forEach(validateWord);
        return result;
    }
    validateWord(wordPattern);
    return [ wordPattern ];
}

function getPatternCardinality(pattern) {
    if(pattern.length == 1) {
        return pattern[0].length;
    }
    const [first, ...rest] = pattern;
    return first.length * getPatternCardinality(rest);
}

function processPattern(pattern, targetAddresses) {
    const patternArray = parseMnemonicPattern(pattern);
    const cardinality = getPatternCardinality(patternArray);
    console.log(`Processing pattern: ${pattern} with cardinality ${cardinality}.`);
    const targets = new Set(targetAddresses);
    let iteration = 1;
    for(let mnemonic of getChoices(patternArray)) {
        //we might want to validate the choices but validateMnemonic doesn't match exodus behavior
        console.log(mnemonic);
        const root = new bip84.fromMnemonic(mnemonic);
        const rootAccount = root.deriveAccount(0);
        const account = new bip84.fromZPrv(rootAccount);
        const address = account.getAddress(0);
        console.log(address);
        if(targets.has(address)) {
            console.log("We're rich, rich I tells ya!!!");
            console.log(`Matching seed phrase: ${mnemonic}`);
            console.log(`Matching address: ${address}`);
            return;
        }
        //process.stdout.clearLine(0);
        //process.stdout.cursorTo(0);
        //process.stdout.write(`Checking ${iteration} of ${cardinality} mnemonics.`);
        iteration++;
    }
}

function* getChoices(pattern) {
    const [start, ...rest] = pattern;
    if(rest.length > 0) {
        for(let startChoice of start) {
            for(let restChoice of getChoices(rest)) {
                yield `${startChoice} ${restChoice}`;
            }
        }
    }
    else {
        for(let choice of start) {
            yield choice;
        }
    }
}




