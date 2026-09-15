#!/usr/bin/env node
const assert = require("node:assert/strict");
const puppeteer = require("puppeteer-core");

const url = process.argv[2] || "http://127.0.0.1:3000/?mute=1";
const chrome = process.env.CHROME_PATH || "/usr/bin/google-chrome-stable";

async function waitForSpinIdle(page) {
  await page.waitForFunction(
    () => {
      const banner = document.getElementById("banner");
      const text = banner ? banner.textContent || "" : "";
      return !/spinning/i.test(text);
    },
    { timeout: 12000 }
  );
}

async function main() {
  const browser = await puppeteer.launch({
    executablePath: chrome,
    headless: "new",
    args: ["--mute-audio", "--no-sandbox", "--disable-gpu", "--window-size=390,844"],
    defaultViewport: { width: 390, height: 844, isMobile: true, hasTouch: true },
  });

  try {
    const page = await browser.newPage();
    await page.goto(url, { waitUntil: "networkidle0", timeout: 30000 });

    const muteLabel = await page.$eval("#mute-btn", (el) => el.textContent.trim());
    assert.equal(muteLabel, "Sound off", "game should start muted via ?mute=1");

    await page.click("#enter-btn");
    await page.waitForSelector("#gate", { hidden: true, timeout: 5000 });

    const creditsStart = await page.$eval("#credits", (el) => el.textContent.trim());
    assert.match(creditsStart, /^\$\d+\.\d{2}$/);

    await page.click("#paytable-btn");
    const paysHidden = await page.$eval("#paytable", (el) => el.hidden);
    assert.equal(paysHidden, false);
    const payText = await page.$eval("#pay-list", (el) => el.textContent);
    assert.match(payText, /Annabelle/);
    assert.match(payText, /The Nun/);
    await page.click("#close-pays");

    const before = await page.$eval("#credits", (el) => el.textContent.trim());
    await page.click("#spin-btn");
    await page.waitForFunction(
      () => /spinning|Held reels locked/i.test(document.getElementById("banner")?.textContent || ""),
      { timeout: 4000 }
    );
    await waitForSpinIdle(page);
    await page.waitForFunction(
      (beforeCredits) => document.getElementById("credits")?.textContent.trim() !== beforeCredits,
      { timeout: 4000 },
      before
    );
    const afterSpin = await page.$eval("#credits", (el) => el.textContent.trim());
    const beforeN = Number.parseFloat(before.slice(1));
    const afterN = Number.parseFloat(afterSpin.slice(1));
    assert.notEqual(afterSpin, before, "credits text should update after spin");
    assert.ok(afterN <= beforeN - 1 + 50, "win cannot exceed the Annabelle jackpot");

    await page.click("#insert-btn");
    const afterInsert = await page.$eval("#credits", (el) => el.textContent.trim());
    const inserted = Number.parseFloat(afterInsert.slice(1));
    assert.ok(inserted >= afterN + 20 - 0.001, "insert should add $20");

    const banner = await page.$eval("#banner", (el) => el.textContent.trim());
    assert.ok(banner.length > 0);

    const reels = await page.$$eval(".reel img", (imgs) => imgs.length);
    assert.ok(reels >= 18, "reels should be filled with symbols");

    console.log(`PASS muted online test @ ${url}`);
    console.log(`  credits ${creditsStart} -> spin ${afterSpin} -> insert ${afterInsert}`);
    console.log(`  banner: ${banner}`);
    console.log("  audio: Chrome --mute-audio and ?mute=1 Sound off");
  } finally {
    await browser.close();
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
