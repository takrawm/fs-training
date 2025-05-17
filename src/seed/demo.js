/* ---------- 1. 小さな計算関数（calcOnce） ---------- */
function calcOnce(meta, logic, input, id, p = 0) {
  const rules = Object.fromEntries(logic.map((r) => [r.id, r]));
  console.log("rules: ", rules);
  const cache = new Map(); // この呼び出し内だけのメモ化
  const stack = new Set(); // 循環検出

  /* 値を取ってくる内部ヘルパ */
  function getValue(tid, period = 0) {
    // key = 'GP_0'
    const key = `${tid}_${period}`;

    if (cache.has(key)) return cache.get(key);
    if (stack.has(key)) throw new Error(`Circular ref: ${tid}`);

    console.log(`getValue → ${tid} (p=${period})`);
    /* 入力値なら即返す */
    // key === 'GP_0', input[tid] === undefined
    // ※input['SALES] = 1_000_000
    if (period === 0 && tid in input) {
      console.log(`  input  : ${input[tid]}`);

      cache.set(key, input[tid]);
      // input['SALES] = 1_000_000
      //   ※
      return input[tid];
    }

    stack.add(key);
    let v;

    const rule = rules[tid];
    if (!rule) throw new Error(`No rule for ${tid}`);

    if (rule.aggregateChildren) {
      /* ここでは使わないが、子科目合計用の枝 */
    } else {
      v = evalNode(rule.formula, period);
    }

    console.log(`  result : ${v}`);
    cache.set(key, v);
    stack.delete(key);
    return v;
  }

  /* AST ノード再帰評価 */
  function evalNode(node, period) {
    switch (node.op) {
      case "CONST":
        return node.value;
      case "REF":
        return getValue(node.id, period - (node.lag ?? 0));
      case "ADD":
        return node.args.reduce((s, n) => s + evalNode(n, period), 0);
      case "SUB": {
        const [f, ...r] = node.args;
        return r.reduce(
          (res, n) => res - evalNode(n, period),
          evalNode(f, period)
        );
      }
      case "MUL":
        return node.args.reduce((p, n) => p * evalNode(n, period), 1);
      case "DIV": {
        const [a, b] = node.args.map((n) => evalNode(n, period));
        if (b === 0) throw new Error("÷0");
        return a / b;
      }
      default:
        throw new Error(`Unknown op ${node.op}`);
    }
  }

  /* 実際の呼び出し開始点 */
  return getValue(id, p);
}

/* ---------- 2. 具体的なデータ ---------- */
/* 2-1. 勘定科目メタ（今回はツリー無しなので name だけ） */
const meta = [
  { id: "SALES", name: "売上高" },
  { id: "COGS", name: "売上原価" },
  { id: "GP", name: "売上総利益" },
  { id: "SGA", name: "販管費" },
  { id: "OP", name: "営業利益" },
];

/* 2-2. 計算ロジック（AST） */
const logic = [
  /* 売上総利益 = 売上高 − 売上原価 */
  {
    id: "GP",
    formula: {
      op: "SUB",
      args: [
        { op: "REF", id: "SALES" },
        { op: "REF", id: "COGS" },
      ],
    },
  },
  /* 営業利益 = 売上総利益 − 販管費 */
  {
    id: "OP",
    formula: {
      op: "SUB",
      args: [
        { op: "REF", id: "GP" },
        { op: "REF", id: "SGA" },
      ],
    },
  },
];

/* 2-3. 期 0 の入力値（千円） */
const inputData = {
  SALES: 1_000_000,
  COGS: 600_000,
  SGA: 200_000,
};

/* ---------- 3. 実行 & 挙動確認 ---------- */
const gp = calcOnce(meta, logic, inputData, "GP"); // 売上総利益
const op = calcOnce(meta, logic, inputData, "OP"); // 営業利益

console.log("\n=== 計算結果 ===");
console.log("売上総利益 (GP) =", gp.toLocaleString(), "千円");
console.log("営業利益   (OP) =", op.toLocaleString(), "千円");
