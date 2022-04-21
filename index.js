//module requirements
//npm i puppeteer puppeteer-extra puppeteer-extra-plugin-stealth  || stealth mode
//npm i puppeteer-extra-plugin-recaptcha   || captcha solver module
const https = require('https')
const fs = require('fs');
const puppeteer = require('puppeteer-extra');
const StealthPlugin = require('puppeteer-extra-plugin-stealth');
const RecaptchaPlugin = require('puppeteer-extra-plugin-recaptcha')
puppeteer.use(StealthPlugin());
puppeteer.use(
    RecaptchaPlugin({
      provider: {
        id: '2captcha',
        token: 'XXXXXX', // REPLACE THIS WITH YOUR OWN 2CAPTCHA API KEY ⚡
      },
      visualFeedback: true, // colorize reCAPTCHAs (violet = detected, green = solved)
    })
  )

//let saleURL = 'https://google.com';
//let saleURL = 'https://bot.sannysoft.com';
let saleURL = 'https://www.google.com/recaptcha/api2/demo';

var proxies = fs.readFileSync('.\\qbypass_pupp\\proxies.txt').toString().split("\n"); //proxies file IP:PORT:USER:PASS\r\n
 
async function main(proxy) {
    const proxyarr = proxy.split(":");
    console.log(proxyarr);
    const PROXY_SERVER_IP = proxyarr[0];
    const PROXY_SERVER_PORT = proxyarr[1];
    const PROXY_USERNAME = proxyarr[2];
    const PROXY_PASSWORD = proxyarr[3];
    const browser = await puppeteer.launch({
        headless: false,
        args: [
           `--proxy-server=http://${PROXY_SERVER_IP}:${PROXY_SERVER_PORT}`,
           '--disable-features=IsolateOrigins,site-per-process',                 //flags for captcha
           '--flag-switches-begin --disable-site-isolation-trials --flag-switches-end'
        ]
    });
    

    const initPage = (async (url)=>{
        const context = await browser.createIncognitoBrowserContext();
        const page = await context.newPage();
        await page.setDefaultTimeout(0);
        await page.authenticate({username:PROXY_USERNAME, password:PROXY_PASSWORD}); //auth proxy

        /*ignores images, css, etc
        await page.setRequestInterception(true);
        page.on('request', (request) => {
            if (['image', 'stylesheet', 'font', 'script'].indexOf(request.resourceType()) !== -1) {
                request.abort();
            } else {
                request.continue();
            }
        });*/

        //set event listener for page
        page.on("domcontentloaded", async (response) =>{
            for (const frame of page.mainFrame().childFrames()) {
                // Attempt to solve any potential captchas in those frames
                const {captchas,filtered,solutions,solved,error} = await page.solveRecaptchas();
                console.log(error);
                if (solved.length>0) {
                    console.log(solved);
                    await page.$eval('XXXXXX', elem => elem.click());  // *CHANGE CSS SELECTOR AS NEEDED*
                }
            }                                                                                     //use #id or .class, https://www.w3schools.com/cssref/css_selectors.asp
            const mycookies = await page.cookies();
            mycookies.forEach(async thiscookie => {
                if (thiscookie.name.includes("Queue-it-token")) {     //change to includes 'Queue-it-token', when passed queue -> saves session and opens a visible browser with session info
                    console.log("cookie: "+thiscookie.name);
                    const ls = await page.evaluate(() => JSON.stringify(localStorage));       //store local and session storage
                    const ss = await page.evaluate(() => JSON.stringify(sessionStorage));
                    await initHeadfulBrowser(mycookies,ls,ss);                 //open a visible browser and close current browser including all pages
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
        const browser2 = await puppeteer.launch({
            headless: false,
            args: [
            `--proxy-server=http://${PROXY_SERVER_IP}:${PROXY_SERVER_PORT}`,
            "--window-size=900,900",
            "--window-position=0,0",
        ]
        })

        const headfulPage = await browser2.newPage();
        await headfulPage.setDefaultTimeout(0);
        await headfulPage.authenticate({username:PROXY_USERNAME, password:PROXY_PASSWORD});
        
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
    

    //opens #M incognito pages with unique sessions,cookies,etc | all M pages will use same proxy
    const openMpages = (async (M,url)=>{
        for (var i=0; i<M ; i++){
            try {
                initPage(url);
            } catch (error) {
                console.log(error);
            } 
        }
    })
    openMpages(1,saleURL);    
}

//runs for N proxies
function runNtimes(N){
    for (var i=0; i < N;i++){
        if (i>proxies.length) return;
        const proxystr = proxies[i].slice(0,-1);//(Math.random() * proxies.length) | 0].slice(0,-1);
        main(proxystr);
    }
}

runNtimes(1); //edit to number of proxies you want to run