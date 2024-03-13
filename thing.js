const bip84 = require("bip84"); //requires node-options="--openssl-legacy-provider", use npm start
const { wordlists: { english: wordList }, validateMnemonic } = require("bip39");
const fs = require("fs");
const wordSet = new Set(wordList);

const choiceReg = /\(([a-z,]+)\)/g;
const listReg = /^{([a-z0-9]+)}$/g;

//fuck off javascript
function doThingOnRegexWithoutMutating(regex, functionName, ...args) {
    const toExecute = regex[functionName];
    const result = toExecute.call(regex, ...args);
    regex.lastIndex = 0;
    return result;
}

fs.readFile(process.argv[2], {encoding: "utf-8"}, (err, data) => {
    if(err) throw err;
    const spec = JSON.parse(data);
    validateSpec(spec);
    const startTime = performance.now();
    for(let p of spec.mnemonicPatterns) {
        if(processPattern(p, spec.targetAddresses, spec.wordLists ?? {}, !!spec.exodusDesktopMode)) {
            return;
        }
    }
    const endTime = performance.now();
    const minutes = Math.floor((endTime - startTime)/60000);
    const seconds = Math.floor(((endTime - startTime)%60000)/1000).toFixed(0);
    console.log("Completed in: " + minutes + " minutes " + seconds + " seconds.");
});

function validateWord(word) {
    if(!wordSet.has(word)) throw new Error(`${word} is not a valid BIP84 word.`);
}

function extractChoices(value) {
    const commaSep = getFirstCaptureGroup(value, choiceReg);
    const words = commaSep.split(",");
    words.forEach(validateWord);
    return words;
}

function getFirstCaptureGroup(value, regex) {
    return doThingOnRegexWithoutMutating(regex, "exec", value)[1];
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

function parseMnemonicPattern(pattern, wordLists) {
    const words = pattern.split(" ").filter(x => x.length > 0);
    if(words.length != 12) {
        throw new Error(`Patterns must have 12 parts. Invalid pattern: ${pattern}.`);
    }
    return words.map(word => parseWordPattern(word, wordLists));
}

function parseWordPattern(wordPattern, wordLists) {
    if(wordPattern === "*") {
        return wordList;
    }
    if(doThingOnRegexWithoutMutating(choiceReg, "test", wordPattern)) {
        const result = extractChoices(wordPattern);
        result.forEach(validateWord);
        return result;
    }
    if(doThingOnRegexWithoutMutating(listReg, "test", wordPattern)) {
        const listName = getFirstCaptureGroup(wordPattern, listReg);
        const wordList = wordLists[listName];
        if(!Array.isArray(wordList)) {
            throw new Error(`Word list named ${listName} was not provided in the spec.`);
        }
        wordList.forEach(validateWord);
        return wordList;
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

function getFirstAddress(mnemonic) {
    const root = new bip84.fromMnemonic(mnemonic);
    const rootAccount = root.deriveAccount(0);
    const account = new bip84.fromZPrv(rootAccount);
    return account.getAddress(0);
}

function invertStridePermutation(array, stride) {
    const result = [];
    let k = 0;
    for(let s = 0; s < stride; s++) {
        for(let i = s; i < array.length; i+= stride) {
            result.push(array[i]);
            //result[i] = array[k];
            k++;
        }
    }
    return result;
}

function processPattern(pattern, targetAddresses, wordLists, exodusMode = false) {
    const patternArray = parseMnemonicPattern(pattern, wordLists);
    const cardinality = getPatternCardinality(patternArray);
    console.log(`Processing pattern: ${pattern} with cardinality ${cardinality}.`);
    const targets = new Set(targetAddresses);
    let iteration = 1;
    for(let mnemonic of getChoices(patternArray)) {
        //we might want to validate the choices but validateMnemonic doesn't match exodus behavior
        const addresses = validateMnemonic(mnemonic) ? [[mnemonic, getFirstAddress(mnemonic)]] : [];
        if(exodusMode) {
            const alternateMnemonic = invertStridePermutation(mnemonic.split(" "), 3).join(" ");
            if(validateMnemonic(alternateMnemonic)) {
                addresses.push([alternateMnemonic, getFirstAddress(alternateMnemonic)]);
            }
        }
        for(let [mnemonic, address] of addresses) {
            console.log(`Valid mnemonic (${iteration} of ${cardinality}): ${mnemonic}: ${address}`);
        }
        const matches = addresses.filter(([_, address]) => targets.has(address));
        if(matches.length > 0) {
            console.log("We're rich, rich I tells ya!!!");
            for(let [mnemonic, match] of matches) {
                console.log(`Matching seed phrase: ${mnemonic}`);
                console.log(`Matching address: ${match}`);
            }
            return true;
        }
        //process.stdout.clearLine(0);
        //process.stdout.cursorTo(0);
        //process.stdout.write(`Checking ${iteration} of ${cardinality} mnemonics.`);
        iteration++;
    }
    return false;
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




