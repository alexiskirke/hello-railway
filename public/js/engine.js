(function (root, factory) {
  const api = factory();
  if (typeof module === "object" && module.exports) {
    module.exports = api;
  }
  root.FruitEngine = api;
})(typeof globalThis !== "undefined" ? globalThis : this, function () {
  const SYMBOLS = [
    { id: "inverted", name: "Inverted Crucifix", file: "/symbols/inverted.png", payout: 25 },
    { id: "nun", name: "The Nun", file: "/symbols/nun.png", payout: 40 },
    { id: "doll", name: "Annabelle", file: "/symbols/doll.png", payout: 50 },
    { id: "cross", name: "Crucifix", file: "/symbols/cross.png", payout: 12 },
    { id: "hag", name: "Old Woman Demon", file: "/symbols/hag.png", payout: 20 },
    { id: "demon", name: "Old Demon Man", file: "/symbols/demon.png", payout: 20 },
  ];

  const REEL_COUNT = 3;
  const SPIN_COST = 1;
  const START_BANK = 25;
  const INSERT = 20;

  function wrap(index, length = SYMBOLS.length) {
    return ((index % length) + length) % length;
  }

  function money(value) {
    return `$${Number(value).toFixed(2)}`;
  }

  function scoreLine(positions) {
    const line = positions.map((pos) => SYMBOLS[wrap(pos)]);
    if (line[0].id === line[1].id && line[1].id === line[2].id) {
      return {
        amount: line[0].payout,
        jackpot: line[0].id === "doll" || line[0].id === "nun",
        label: `Three ${line[0].name}`,
        ids: line.map((symbol) => symbol.id),
      };
    }
    return { amount: 0, jackpot: false, label: "", ids: line.map((symbol) => symbol.id) };
  }

  function spinTargets(positions, held, rng = Math.random) {
    return positions.map((pos, i) => (held[i] ? pos : Math.floor(rng() * SYMBOLS.length)));
  }

  function applyNudge(position, direction) {
    return wrap(position + direction);
  }

  function canSpin(bank, spinning, nudges) {
    return !spinning && nudges <= 0 && bank >= SPIN_COST;
  }

  function nextBankAfterSpin(bank) {
    return bank - SPIN_COST;
  }

  function nextBankAfterInsert(bank) {
    return bank + INSERT;
  }

  function nextBankAfterWin(bank, positions) {
    return bank + scoreLine(positions).amount;
  }

  return {
    SYMBOLS,
    REEL_COUNT,
    SPIN_COST,
    START_BANK,
    INSERT,
    wrap,
    money,
    scoreLine,
    spinTargets,
    applyNudge,
    canSpin,
    nextBankAfterSpin,
    nextBankAfterInsert,
    nextBankAfterWin,
  };
});
