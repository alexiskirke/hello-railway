const assert = require("node:assert/strict");
const http = require("node:http");
const test = require("node:test");
const engine = require("../public/js/engine.js");
const { createServer, safePublicPath } = require("../server.js");

function request(server, path) {
  return new Promise((resolve, reject) => {
    const { port } = server.address();
    http
      .get(`http://127.0.0.1:${port}${path}`, (res) => {
        const chunks = [];
        res.on("data", (chunk) => chunks.push(chunk));
        res.on("end", () => {
          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: Buffer.concat(chunks),
          });
        });
      })
      .on("error", reject);
  });
}

test("wrap cycles reel indexes in both directions", () => {
  assert.equal(engine.wrap(0), 0);
  assert.equal(engine.wrap(6), 0);
  assert.equal(engine.wrap(-1), 5);
  assert.equal(engine.applyNudge(0, -1), 5);
  assert.equal(engine.applyNudge(5, 1), 0);
});

test("money formats credits", () => {
  assert.equal(engine.money(25), "$25.00");
  assert.equal(engine.money(1), "$1.00");
});

test("three matching symbols pay the table and jackpots", () => {
  const nun = engine.scoreLine([1, 1, 1]);
  assert.equal(nun.amount, 40);
  assert.equal(nun.jackpot, true);
  assert.match(nun.label, /Nun/);

  const doll = engine.scoreLine([2, 2, 2]);
  assert.equal(doll.amount, 50);
  assert.equal(doll.jackpot, true);

  const cross = engine.scoreLine([3, 3, 3]);
  assert.equal(cross.amount, 12);
  assert.equal(cross.jackpot, false);

  const miss = engine.scoreLine([0, 1, 2]);
  assert.equal(miss.amount, 0);
  assert.equal(miss.label, "");
});

test("held reels stay put when the others respin", () => {
  const targets = engine.spinTargets([4, 1, 2], [true, false, false], () => 0.99);
  assert.equal(targets[0], 4);
  assert.notEqual(targets[1], undefined);
  assert.ok(targets[1] >= 0 && targets[1] < engine.SYMBOLS.length);
});

test("bank math for spin, insert, and win", () => {
  assert.equal(engine.nextBankAfterSpin(25), 24);
  assert.equal(engine.nextBankAfterInsert(24), 44);
  assert.equal(engine.nextBankAfterWin(24, [2, 2, 2]), 74);
  assert.equal(engine.canSpin(1, false, 0), true);
  assert.equal(engine.canSpin(0.5, false, 0), false);
  assert.equal(engine.canSpin(25, true, 0), false);
  assert.equal(engine.canSpin(25, false, 3), false);
});

test("safePublicPath blocks traversal and serves the game", () => {
  assert.equal(safePublicPath("/../../etc/passwd"), null);
  assert.match(safePublicPath("/"), /index\.html$/);
  assert.match(safePublicPath("/symbols/nun.png"), /nun\.png$/);
});

test("offline http server serves health, page, art, and 404s", async (t) => {
  const server = createServer("test-time");
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));

  const health = await request(server, "/health");
  assert.equal(health.status, 200);
  const payload = JSON.parse(health.body.toString());
  assert.equal(payload.ok, true);
  assert.equal(payload.game, "conjuring-fruit");

  const home = await request(server, "/");
  assert.equal(home.status, 200);
  assert.match(home.body.toString(), /The Conjuring Fruit/);
  assert.match(home.body.toString(), /engine\.js/);

  const nun = await request(server, "/symbols/nun.png");
  assert.equal(nun.status, 200);
  assert.match(nun.headers["content-type"], /png/);
  assert.ok(nun.body.length > 1000);

  const missing = await request(server, "/nope");
  assert.equal(missing.status, 404);

  const traversal = await request(server, "/../../etc/passwd");
  assert.ok(traversal.status === 400 || traversal.status === 404);
});
