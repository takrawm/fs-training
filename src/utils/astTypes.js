/**
 * ASTノードの型定義
 * @typedef {Object} ASTNode
 * @property {string} op - 演算子（'CONST'|'REF'|'ADD'|'SUB'|'MUL'|'DIV'）
 * @property {*} [value] - 定数値（op='CONST'の場合）
 * @property {string} [id] - 参照ID（op='REF'の場合）
 * @property {number} [lag] - 期間の遅延（op='REF'の場合）
 * @property {ASTNode[]} [args] - 引数（op='ADD'|'SUB'|'MUL'|'DIV'の場合）
 */

/**
 * ASTノードの種類
 */
export const AST_OPERATIONS = {
  CONST: "CONST",
  REF: "REF",
  ADD: "ADD",
  SUB: "SUB",
  MUL: "MUL",
  DIV: "DIV",
};

/**
 * 演算子の表示記号
 */
export const OPERATION_SYMBOLS = {
  CONST: "定数",
  ADD: "＋",
  SUB: "－",
  MUL: "×",
  DIV: "÷",
  REF: "参照",
};

/**
 * ASTノードを作成する
 * @param {string} op - 演算子
 * @param {Object} props - その他のプロパティ
 * @returns {ASTNode}
 */
export const createNode = (op, props = {}) => ({
  op, // 演算子
  ...props, // その他のプロパティ(スプレッド演算子（...props）により、柔軟なプロパティの追加を可能に)
});

// 以下の2つは同じ結果になります
// const op = "ADD";
// const props = { left: 1, right: 2 };

// 完全な形
// const node1 = {
//   op: op,
//   left: props.left,
//   right: props.right
// };

// 省略形
// const node2 = {
//   op,
//   ...props
// };

// 結果は同じ
// node1 = node2 = { op: "ADD", left: 1, right: 2 }
