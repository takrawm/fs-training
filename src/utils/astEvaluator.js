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
 * @param {number} period - 対象期間
 * @param {Function} getValue - 値取得関数
 * @returns {number} 評価結果
 */
export const evalNode = (node, period, getValue) => {
  if (!node) return null;

  switch (node.op) {
    case AST_OPERATIONS.CONST:
      return node.value;

    case AST_OPERATIONS.REF:
      return getValue(node.id, period - (node.lag ?? 0));

    case AST_OPERATIONS.ADD:
      return node.args.reduce(
        (sum, n) => sum + evalNode(n, period, getValue),
        0
      );

    case AST_OPERATIONS.SUB: {
      const [first, ...rest] = node.args;
      return rest.reduce(
        (result, n) => result - evalNode(n, period, getValue),
        evalNode(first, period, getValue)
      );
    }

    case AST_OPERATIONS.MUL:
      return node.args.reduce(
        (product, n) => product * evalNode(n, period, getValue),
        1
      );

    case AST_OPERATIONS.DIV: {
      const [a, b] = node.args.map((n) => evalNode(n, period, getValue));
      if (b === 0) throw new Error(`Division by zero in AST evaluation`);
      return a / b;
    }

    default:
      throw new Error(`Unknown AST operation: ${node.op}`);
  }
};
