//module requirements
//npm i puppeteer puppeteer-extra puppeteer-extra-plugin-stealth  || stealth mode
//npm i @extra/recaptcha   || captcha solver module
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

//let saleURL = 'https://google.com';
//let saleURL = 'https://httpbin.org/headers';
let saleURL = 'https://bot.sannysoft.com';
//let saleURL = 'https://patrickhlauke.github.io/recaptcha/';
//let saleURL = 'https://direct.playstation.com/en-us/hardware/ps5';

var proxies = fs.readFileSync('.\\qbypass_pupp\\proxies.txt').toString().split("\n");


 
async function main(proxy) {
    const proxyarr = proxy.split(":");
    console.log(proxyarr);
    const PROXY_SERVER_IP = proxyarr[0];
    const PROXY_SERVER_PORT = proxyarr[1];
    const PROXY_USERNAME = proxyarr[2];
    const PROXY_PASSWORD = proxyarr[3];
    const browser = await puppeteer.launch({
        headless: true,
        args: [
        //   `--proxy-server=http://${PROXY_SERVER_IP}:${PROXY_SERVER_PORT}`,
        //   "--window-size=300,500"
        ]
    });
    

    const initPage = (async (url)=>{
        const context = await browser.createIncognitoBrowserContext();
        const page = await context.newPage();
        await page.setDefaultTimeout(0);
        /*auth proxy
        await page.authenticate({
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD,
        });*/

        //ignores images, css, etc
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
                request.abort();
            } else {
                request.continue();
            }
        });

        //set event listener for page
        page.on("domcontentloaded", async (response) =>{
            //await page.solveRecaptchas();
            //console.log('response: ', response.status()); handle bans/errors
            const mycookies = await page.cookies();
            console.log(mycookies);
            mycookies.forEach(async thiscookie => {
                if (thiscookie.name.includes("1P_JAR")) {     //change to includes 'Queue-it-token', when passed queue -> saves session and opens a visible browser with session info
                    console.log("cookie: "+thiscookie.name);
                    const ls = await page.evaluate(() => JSON.stringify(localStorage));
                    const ss = await page.evaluate(() => JSON.stringify(sessionStorage));
                    //console.log(ls);
                    await initHeadfulBrowser(mycookies,ls,ss);
                    await page.removeAllListeners();
                    await browser.close();
                    //if (browser && browser.process() != null) browser.process().kill('SIGINT');
                }
            }
            ); 
        })
        await page.goto(url,{waitUntil: "networkidle0"});
        //await page.waitForTimeout(2500);
        //await page.goto("https://google.com");
    });

    //reopen a visible browser and restore session
    const initHeadfulBrowser = (async (cookies,ls,ss)=>{
        //console.log(ls);
        //console.log(ss);
        const browser2 = await puppeteer.launch({
            headless: false,
            args: [
        //   `--proxy-server=http://${PROXY_SERVER_IP}:${PROXY_SERVER_PORT}`,
            "--window-size=500,500",
            "--window-position=0,0",
        ]
        })
        /*auth proxy
        await page.authenticate({
        username: PROXY_USERNAME,
        password: PROXY_PASSWORD,
        });*/

        const headfulPage = await browser2.newPage();
        await headfulPage.setDefaultTimeout(0);
        
        //restore cookies
        await headfulPage.setCookie(...cookies);
        await headfulPage.goto(saleURL);

        //restore localstorage and sessionstorage
        await headfulPage.evaluate(ls => {
            for (const key in ls) {
              localStorage.setItem(key, ls[key]);
            }
        }, ls);
        await headfulPage.evaluate(ss => {
            for (const key in ss) {
              sessionStorage.setItem(key, ss[key]);
            }
        }, ss);  
    })
    

    //opens M incognito pages with unique sessions,cookies,etc | all M pages will use same proxy
    const openMpages = (async (M,url)=>{
        for (var i=0; i<M ; i++){
            try {
                initPage(url);
            } catch (error) {
                console.log(error);
            } 
        }
    })
    openMpages(25,saleURL);    
}

//runs for N proxies
function runNtimes(N){
    for (var i=0; i < N;i++){
        const proxystr = proxies[(Math.random() * proxies.length) | 0].slice(0,-1);
        main(proxystr);
    }
}

runNtimes(1); //edit to number of proxies you want to run