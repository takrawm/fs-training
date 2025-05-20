import { AST_OPERATIONS, createNode } from "./astTypes";

/**
 * 勘定科目からASTを構築する
 * @param {Object} account - 勘定科目オブジェクト
 * @returns {ASTNode} 構築されたAST
 */
export const buildFormula = (account) => {
  // 1) 前期末をまず加算リストに
  const addArgs = [createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 })];

  // 2) references を ADD/SUB に振り分け
  const subArgs = [];
  account.parameterReferenceAccounts?.forEach((r) => {
    const refNode = createNode(AST_OPERATIONS.REF, { id: r.id });
    (r.operation === "ADD" ? addArgs : subArgs).push(refNode);
  });

  // 3) ネストして AST を返す
  return subArgs.length
    ? createNode(AST_OPERATIONS.SUB, {
        args: [createNode(AST_OPERATIONS.ADD, { args: addArgs }), ...subArgs],
      })
    : createNode(AST_OPERATIONS.ADD, { args: addArgs });
};
