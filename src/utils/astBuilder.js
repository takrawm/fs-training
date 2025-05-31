import { AST_OPERATIONS, createNode } from "./astTypes";
import { PARAMETER_TYPES } from "./constants";
import { evalNode } from "./astEvaluator";

/**
 * 勘定科目からASTを構築する
 * @param {Object} account - 勘定科目オブジェクト
 * @param {number} period - 対象期間
 * @returns {ASTNode|null} 構築されたAST（計算不要の場合はnull）
 */
export const buildFormula = (account, period) => {
  const { parameterType, parameterValue, parameterReferenceAccounts } = account;

  switch (parameterType) {
    case PARAMETER_TYPES.NONE:
    case "NONE":
      return null;

    case PARAMETER_TYPES.GROWTH_RATE:
      return createNode(AST_OPERATIONS.MUL, {
        args: [
          createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 }),
          createNode(AST_OPERATIONS.CONST, {
            value: 1 + (parameterValue || 0),
          }),
        ],
      });

    case PARAMETER_TYPES.PERCENTAGE:
      if (
        !parameterReferenceAccounts ||
        parameterReferenceAccounts.length === 0
      ) {
        throw new Error(
          `PERCENTAGE requires reference accounts for account: ${account.accountName}`
        );
      }
      return createNode(AST_OPERATIONS.MUL, {
        args: [
          createNode(AST_OPERATIONS.REF, {
            id: parameterReferenceAccounts[0].id,
            lag: 0,
          }),
          createNode(AST_OPERATIONS.CONST, { value: parameterValue || 0 }),
        ],
      });

    case PARAMETER_TYPES.PROPORTIONATE:
      if (
        !parameterReferenceAccounts ||
        parameterReferenceAccounts.length === 0
      ) {
        throw new Error(
          `PROPORTIONATE requires reference accounts for account: ${account.accountName}`
        );
      }
      // 連動は参照先の値をそのまま使用（比率1.0をかける）
      return createNode(AST_OPERATIONS.REF, {
        id: parameterReferenceAccounts[0].id,
        lag: 0,
      });

    case PARAMETER_TYPES.REFERENCE:
      if (
        !parameterReferenceAccounts ||
        parameterReferenceAccounts.length === 0
      ) {
        throw new Error(
          `REFERENCE requires reference accounts for account: ${account.accountName}`
        );
      }

      const firstRef = createNode(AST_OPERATIONS.REF, {
        id: parameterReferenceAccounts[0].id,
        lag: 0,
      });

      if (parameterReferenceAccounts.length === 1) {
        return firstRef;
      }

      const refAddArgs = [firstRef];

      for (let i = 1; i < parameterReferenceAccounts.length; i++) {
        const ref = parameterReferenceAccounts[i];
        if (ref.operation === "ADD") {
          refAddArgs.push(
            createNode(AST_OPERATIONS.REF, { id: ref.id, lag: 0 })
          );
        } else if (ref.operation === "SUB") {
          refAddArgs.push(
            createNode(AST_OPERATIONS.MUL, {
              args: [
                createNode(AST_OPERATIONS.CONST, { value: -1 }),
                createNode(AST_OPERATIONS.REF, { id: ref.id, lag: 0 }),
              ],
            })
          );
        }
      }

      return createNode(AST_OPERATIONS.ADD, { args: refAddArgs });

    case PARAMETER_TYPES.BALANCE_AND_CHANGE:
      // 期末残高+/-変動型：前期残高 + 当期変動
      const balanceAddArgs = [
        createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 }),
      ];

      if (parameterReferenceAccounts && parameterReferenceAccounts.length > 0) {
        parameterReferenceAccounts.forEach((ref) => {
          if (ref.operation === "ADD") {
            balanceAddArgs.push(
              createNode(AST_OPERATIONS.REF, { id: ref.id, lag: 0 })
            );
          } else if (ref.operation === "SUB") {
            balanceAddArgs.push(
              createNode(AST_OPERATIONS.MUL, {
                args: [
                  createNode(AST_OPERATIONS.CONST, { value: -1 }),
                  createNode(AST_OPERATIONS.REF, { id: ref.id, lag: 0 }),
                ],
              })
            );
          }
        });
      }

      return createNode(AST_OPERATIONS.ADD, { args: balanceAddArgs });

    case PARAMETER_TYPES.FIXED_VALUE:
      // 横置きは前期値をそのまま使用
      return createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 });

    case PARAMETER_TYPES.CHILDREN_SUM:
      // 子要素の合計は別途calculateSummaryAccountValueで処理
      return null;

    default:
      throw new Error(
        `Unknown parameter type: ${parameterType} for account: ${account.accountName}`
      );
  }
};

// evalNode関数はastEvaluator.jsに移動し、上記でインポートしています
