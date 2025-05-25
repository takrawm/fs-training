import { AST_OPERATIONS } from "./astTypes";

/**
 * 式から依存関係を抽出する
 * @param {Object} expr 計算式
 * @returns {Array} 依存するアカウントIDの配列
 */
export function extractDependencies(expr) {
  if (!expr) return [];

  switch (expr.op) {
    case AST_OPERATIONS.CONST:
      return [];

    case AST_OPERATIONS.REF:
      return [expr.id]; // 単一の依存関係

    case AST_OPERATIONS.ADD:
    case AST_OPERATIONS.SUB:
    case AST_OPERATIONS.MUL:
    case AST_OPERATIONS.DIV:
      // すべての引数から依存関係を再帰的に抽出して平坦化
      return expr.args
        .flatMap((arg) => extractDependencies(arg))
        .filter((v, i, a) => a.indexOf(v) === i); // 重複除去

    default:
      return [];
  }
}

/**
 * ASTノードを評価する
 * @param {ASTNode} node - 評価するASTノード
 * @param {number} period - 評価する期間
 * @param {Function} getValue - 値を取得する関数
 * @returns {number} 評価結果
 */
export const evalNode = (node, period, getValue) => {
  switch (node.op) {
    case AST_OPERATIONS.CONST:
      return node.value;
    case AST_OPERATIONS.REF:
      return getValue(node.id, period - (node.lag ?? 0));
    case AST_OPERATIONS.ADD:
      return node.args.reduce((s, n) => s + evalNode(n, period, getValue), 0);
    case AST_OPERATIONS.SUB: {
      const [f, ...r] = node.args;
      return r.reduce(
        (res, n) => res - evalNode(n, period, getValue),
        evalNode(f, period, getValue)
      );
    }
    case AST_OPERATIONS.MUL:
      return node.args.reduce((p, n) => p * evalNode(n, period, getValue), 1);
    case AST_OPERATIONS.DIV: {
      const [a, b] = node.args.map((n) => evalNode(n, period, getValue));
      if (b === 0) throw new Error("÷0");
      return a / b;
    }
    default:
      throw new Error(`Unknown op ${node.op}`);
  }
};
