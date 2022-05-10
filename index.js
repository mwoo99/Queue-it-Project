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
puppeteer.use(StealthPlugin());
puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: '2captcha',
        token: 'XXXXXXXXXXXXXXXXXXXXXXX', // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY
      },
      visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
    })
);
process.setMaxListeners(Infinity);

/*------------------------------CHANGE THESE VARIABLES BEFORE USE----------------------------------*/
let N = 1; //# of proxies used
let M = 1; //# of pages per proxy
let headless = false;
let ifRecaptcha = true;
let saleURL = 'https://google.com.com';
var proxies = fs.readFileSync('.\\proxies.txt').toString().split("\n"); //proxies file IP:PORT:USER:PASS\r\n
const webHookurl = "XXXXXXXXXXXXXXXXXXXXXXXXXXXXX";   //replace with discord webhook
/*------------------------------------------------------------------------------------------------*/
const postURLtoDiscord = async (postURL) => {
    await fetch(webHookurl, {
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
    console.log(proxyarr);
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
                    //console.log(request.url());
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
        for (var i=0; i<M ; i++){
            try {
                initPage(url);
            } catch (error) {
                console.log(error);
            } 
        }
    })
    openMpages(saleURL);    
}

//runs for N proxies
async function runNtimes(){
    for (var i=0; i < N;i++){
        if (i>proxies.length) return;
        const proxystr = proxies[i].slice(0,-1);//(Math.random() * proxies.length) | 0].slice(0,-1);
        await setTimeout(main, 2000*i, proxystr, i, headless, ifRecaptcha);
    }
}

runNtimes();
