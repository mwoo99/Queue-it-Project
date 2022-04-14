//module requirements
//npm i puppeteer puppeteer-extra puppeteer-extra-plugin-stealth  || stealth mode
//npm i @extra/recaptcha   || captcha solver module
//**NOT NEEDED** npm i puppeteer-extra-plugin-adblocker  || adblocker, to make faster?
const https = require('https')
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('@extra/recaptcha');
puppeteer.use(StealthPlugin());
/*
puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: '2captcha',
        token: 'XXXXXXX', // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
      },
      visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
    })
  )
*/

let saleURL = 'https://google.com';
//let saleURL = 'https://httpbin.org/headers';
//let saleURL = 'https://bot.sannysoft.com';
//let saleURL = 'https://patrickhlauke.github.io/recaptcha/';
//let saleURL = 'https://direct.playstation.com/en-us/hardware/ps5';

const PROXY_SERVER_IP = '88.216.39.167';
const PROXY_SERVER_PORT = '5183';
const PROXY_USERNAME = 'BCJTX2997';
const PROXY_PASSWORD = 'ADENWY24';
 
async function main() {
    const browser = await puppeteer.launch({
        headless: false,
        args: [
            `--proxy-server=http://${PROXY_SERVER_IP}:${PROXY_SERVER_PORT}`,
            "--window-size=300,500"
        ]
    });
    const page = await browser.newPage();

    //auth proxy
    await page.authenticate({
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD,
    });

    await page.setDefaultTimeout(0);

    //await page.setRequestInterception(true);
    //page.on("request", (request) => { request.continue()});

    //set event listener for page
    page.on("response", async (response) =>{
        if (response.status()==400) await browser.close();
        //await page.solveRecaptchas();
        //console.log('response: ', response.status()); handle bans/errors
        const mycookies = await page.cookies();
        await mycookies.forEach(thiscookie => {
            if (thiscookie.name.includes("1P_JAR")) {     //change to includes 'Queue-it-token', when passed queue -> brings forward the browser
                console.log("cookie: "+thiscookie.name);
                page.bringToFront();
                page.removeAllListeners();
            }
        }
        ); 
    })
    await page.goto(saleURL,{waitUntil: "networkidle0"});
};

function runNtimes(N){
    for (var i=0; i < N;i++){
        main();
    }
}

runNtimes(2);

//todo 1.read proxy.txt , 2.captcha solver, 3.bringToFront() as alert not ideal, 4.lessen pc resource strain(launch args,adblock,ignore useless stuff)