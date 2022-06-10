/*
module requirements:
npm i puppeteer puppeteer-extra puppeteer-extra-plugin-stealth  
npm i puppeteer-extra-plugin-recaptcha
*/   
const https = require('https')
const fs = require('fs');
const fetch = require('node-fetch')
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
const options_dict = {};
fs.readFileSync('./options.txt', 'utf8').split("\r\n").map(add_dict);
function add_dict(item) {
    var i = item.indexOf(":");
    var keyvalarr = [item.slice(0,i), item.slice(i+1)];
    options_dict[keyvalarr[0]] = keyvalarr[1];
}
console.log(options_dict);
const proxies = fs.readFileSync('.\\proxies.txt').toString().split("\n"); //proxies file IP:PORT:USER:PASS\r\n
puppeteer.use(StealthPlugin());
puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: '2captcha',
        token: options_dict["Captcha_Key"], // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY
      },
      visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
    })
);
process.setMaxListeners(Infinity);

/*------------------------------CHANGE THESE VARIABLES BEFORE USE----------------------------------*/
let headless = true;
let ifRecaptcha = true;
/*------------------------------------------------------------------------------------------------*/
const postURLtoDiscord = async (postURL) => {
    await fetch(options_dict["Discord_Webhook"], {
        'method': "POST",
        'headers': {'content-type':'application/json'},
        'body': JSON.stringify({
            username: 'hog rider',
            content: `deez nuts`,
            embeds: [{
                title: postURL,
                url: postURL
            }]
        })
    })
    .then(res => console.log(res))
    .catch(err => console.error(err))
}
 
async function main(proxy, taskindex, ifHeadless, ifRecaptcha) {
    const proxyarr = proxy.split(":");
    const PROXY_SERVER_IP = proxyarr[0];
    const PROXY_SERVER_PORT = proxyarr[1];
    const PROXY_USERNAME = proxyarr[2];
    const PROXY_PASSWORD = proxyarr[3];
    const browser = await puppeteer.launch({
        headless: ifHeadless,
        args: [
           `--proxy-server=http://${PROXY_SERVER_IP}:${PROXY_SERVER_PORT}`,
        ]
    });

    const initPage = (async (url)=>{
        const context = await browser.createIncognitoBrowserContext();
        const page = await context.newPage();
        await page.setDefaultTimeout(0);
        await page.authenticate({username:PROXY_USERNAME, password:PROXY_PASSWORD}); //auth proxy

        //set event listener for page
        if (ifRecaptcha){
            page.on("load", async () =>{
                for (const frame of page.mainFrame().childFrames()) {
                    // Attempt to solve any potential captchas in those frames
                    const {captchas,filtered,solutions,solved,error} = await page.solveRecaptchas();
                    if (solved.length>0) {
                        console.log(solved);
                        //await page.$eval('XXXXXX', elem => elem.click());  // *CHANGE CSS SELECTOR AS NEEDED*
                    }}
                });                                                                                     //use #id or .class, https://www.w3schools.com/cssref/css_selectors.asp
        }
        page.on("request", async (request) =>{
            //console.log(request.method() + request.url());
            //console.log(request.response());
            if (request.method() == 'GET'){
                if (request.url().includes("queueittoken")) {
                    console.log(request.url());
                    await postURLtoDiscord(request.url());
                    await page.removeAllListeners();
                    await browser.close();
                }
                //reload if there was an error? (solving captcha, etc)
                if (request.url().includes('error')){
                    console.log("Reloading page from task "+taskindex);
                    initPage(url);
                    page.close();
                }
            }
        });

        //catch and print progress in queue line
        page.on("response", async (response) =>{
            try {
                if (response.request().method() == 'POST') {
                    if (response.request().url().includes('status')){
                        if (response.headers()['content-type'].includes('application/json')){ 
                            var resp_json = await response.json();
                            if ('ticket' in resp_json) console.log("Task:"+taskindex+" - Ticket:"+resp_json.ticket.progress); //resp_json.ticket.progress
                        }
                    }
                }
            }
            catch (error) {
                //console.log(error);
            };
        });


        await page.goto(url,{waitUntil: "networkidle0"});

    });

    //opens #M incognito pages with unique sessions,cookies,etc | all M pages will use same proxy
    const openMpages = (async (url)=>{
        for (var i=0; i<options_dict["Num_Proxy_Browsers"] ; i++){
            try {
                initPage(url);
            } catch (error) {
                console.log(error);
            } 
        }
    })
    openMpages(options_dict["Sale_URL"]);
    console.log("Launching task #"+taskindex);
    console.log(proxyarr);    
}

const keypress = async () => {
    console.log("Confirm success entering queue-it waiting room and press Enter to continue");
    process.stdin.setRawMode(true)
    return new Promise(resolve => process.stdin.on('data', data => {
        const byteArray = [...data]
        if (byteArray[0] === 13) {   //user pressed enter
            console.log("Confirmation received. Launching tasks");
            process.stdin.setRawMode(false)
            process.stdin.destroy();
            resolve();
        }
        if (byteArray.length > 0 && byteArray[0] === 3) {
            console.log('^C')
            process.exit(1)
        }
    }))
}

//runs for N proxies
async function runNtimes(){
    await main(proxies[0].slice(0,-1),0,false,true);

    await keypress();
    for (var i=1; i <= options_dict["Num_Proxies"];i++){
        if (i>proxies.length) return;
        const proxystr = proxies[i].slice(0,-1);//(Math.random() * proxies.length) | 0].slice(0,-1);
        await setTimeout(main, 2000*i, proxystr, i, headless, ifRecaptcha);
    }
}

console.log("Press Ctrl+C at any time to exit");
runNtimes();
