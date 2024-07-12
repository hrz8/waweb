import puppeteer from 'puppeteer';

const URL = 'https://web.whatsapp.com/';
const UserAgent = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_14_0) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/101.0.4951.67 Safari/537.36';

const browser = await puppeteer.launch();
const page = await browser.newPage();

const INTRO_IMG_SELECTOR = '[data-icon=\'search\']';
const INTRO_QRCODE_SELECTOR = 'div[data-ref] canvas';

await page.setUserAgent(UserAgent)

page.on('console', async (msg) => {
    const msgArgs = msg.args();
    for (let i = 0; i < msgArgs.length; ++i) {
        console.log(await msgArgs[i].jsonValue());
    }
});

await page.goto(URL, {
    waitUntil: 'load',
    timeout: 0,
    referer: 'https://whatsapp.com/'
});

const needAuth = await new Promise((resolve) => {
    page.waitForSelector(INTRO_QRCODE_SELECTOR, { timeout: 0 }).then(() => resolve(true))
});

if (needAuth) {
    await page.evaluate(async function (selectors) {
        const qrContainer = document.querySelector(selectors.QR_CONTAINER);
        if (!qrContainer) {
            return;
        }
        if (qrContainer instanceof HTMLElement) {
            console.log(`container: ${qrContainer.dataset.ref}`);
            if (!qrContainer.parentElement) {
                return;
            }
            const observer = new MutationObserver((muts) => {
                muts.forEach(mut => {
                    if (mut.type === 'attributes' && mut.attributeName === 'data-ref') {
                        const target = mut.target as HTMLElement;
                        console.log(`listen: ${target.dataset.ref}`);
                    } else if (mut.type === 'childList') {
                        const retryBtn = document.querySelector(selectors.QR_RETRY_BUTTON);
                        if (retryBtn && retryBtn instanceof HTMLElement) {
                            retryBtn.click()
                        };
                    }
                });
            });
            observer.observe(qrContainer.parentElement, {
                subtree: true,
                childList: true,
                attributes: true,
                attributeFilter: ['data-ref'],
            });
        }
    }, {
        QR_CONTAINER: 'div[data-ref]',
        QR_RETRY_BUTTON: 'div[data-ref] > span > button',
    });
}

// wait until login
await page.waitForSelector(INTRO_IMG_SELECTOR, { timeout: 0 });

await browser.close();
