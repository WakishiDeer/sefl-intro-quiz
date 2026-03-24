const { chromium } = require("playwright");
(async () => {
    const b = await chromium.launch();
    const p = await b.newPage();
    await p.goto("http://localhost:5173");
    await p.click('a[href="/create"]');
    await p.fill("#nickname", "Debug太郎");
    await p.click('button[type="submit"]');
    await p.waitForURL(/\/room\//, { timeout: 10000 });
    await p.waitForTimeout(2000);
    const url = p.url();
    console.log("URL:", url);
    const btns = await p.locator("button").allTextContents();
    console.log("BUTTONS:", JSON.stringify(btns, null, 2));
    const html = await p.content();
    console.log("HTML length:", html.length);
    // Check for any text on the page
    const body = await p.locator("body").textContent();
    console.log("BODY TEXT:", body?.substring(0, 500));
    await b.close();
})();

