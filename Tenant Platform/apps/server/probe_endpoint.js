const https = require('https');

// Helper to make request
function probe(payload) {
    return new Promise((resolve) => {
        const options = {
            hostname: 'noa-ai.complyark.com',
            path: '/translate',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            }
        };

        const req = https.request(options, (res) => {
            let data = '';
            res.on('data', chunk => data += chunk);
            res.on('end', () => {
                console.log(`Payload keys: ${Object.keys(payload).join(', ')}`);
                console.log(`Status: ${res.statusCode}`);
                console.log(`Body: ${data}`);
                console.log('---');
                resolve();
            });
        });

        req.on('error', (e) => {
            console.error(`Error: ${e.message}`);
            resolve();
        });

        req.write(JSON.stringify(payload));
        req.end();
    });
}

async function run() {
    console.log('Testing payloads on /translate...');

    // Case 1: text + source_lang + target_lang
    await probe({
        text: "Hello",
        source_lang: "eng_Latn",
        target_lang: "mal_Mlym"
    });

    // Case 2: inputs + source_lang + target_lang
    await probe({
        inputs: "Hello",
        source_lang: "eng_Latn",
        target_lang: "mal_Mlym"
    });

    // Case 3: inputs + src_lang + tgt_lang (IndiTrans2 common)
    await probe({
        inputs: "Hello",
        src_lang: "eng_Latn",
        tgt_lang: "mal_Mlym"
    });
}

run();
