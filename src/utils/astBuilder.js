import { AST_OPERATIONS, createNode } from "./astTypes";
import { PARAMETER_TYPES, OPERATIONS } from "./constants";
import { evalNode } from "./astEvaluator";
import { ParameterUtils } from "./parameterUtils";
import { AccountUtils } from "./accountUtils.js";
import {
  isCFAdjustmentTarget,
  getCFAdjustmentAccounts,
} from "./balanceSheetCalculator";

/**
 * 勘定科目からASTを構築する
 * @param {Object} account - 勘定科目オブジェクト
 * @param {number} period - 対象期間
 * @param {Array} accounts - 全アカウント配列
 * @returns {ASTNode|null} 構築されたAST（計算不要の場合はnull）
 */
export const buildFormula = (account, period, accounts) => {
  // 新しいParameterUtilsを使用してパラメータを取得
  const parameterType = ParameterUtils.getParameterType(account);
  const parameterValue = ParameterUtils.getParameterValue(account);
  const parameterReferenceAccounts =
    ParameterUtils.getParameterReferences(account);

  // 現預金計算の特別処理
  if (parameterType === PARAMETER_TYPES.CASH_CALCULATION) {
    return buildCashCalculationFormula(account, accounts);
  }

  // stock科目でパラメータがない場合の特別処理
  if (
    AccountUtils.isStockAccount(account) &&
    !ParameterUtils.hasParameter(account)
  ) {
    // CF調整による計算式を構築
    if (isCFAdjustmentTarget(account, accounts)) {
      return buildCFAdjustedFormula(account, accounts);
    }
    // CF調整もない場合は前期値をそのまま使用
    return createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 });
  }

  // 旧形式との互換性のため、元の変数も保持
  const {
    parameterType: oldParameterType,
    parameterValue: oldParameterValue,
    parameterReferenceAccounts: oldParameterReferenceAccounts,
  } = account;

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
      // parameterReferenceAccountsが配列でない場合（新構造）の処理
      let percentageRef;
      if (Array.isArray(parameterReferenceAccounts)) {
        if (parameterReferenceAccounts.length === 0) {
          throw new Error(
            `PERCENTAGE requires reference accounts for account: ${account.accountName}`
          );
        }
        percentageRef = parameterReferenceAccounts[0];
      } else if (parameterReferenceAccounts) {
        // 単一オブジェクトの場合
        percentageRef = parameterReferenceAccounts;
      } else {
        throw new Error(
          `PERCENTAGE requires reference accounts for account: ${account.accountName}`
        );
      }

      return createNode(AST_OPERATIONS.MUL, {
        args: [
          createNode(AST_OPERATIONS.REF, {
            id: percentageRef.accountId || percentageRef.id,
            lag: 0,
          }),
          createNode(AST_OPERATIONS.CONST, { value: parameterValue || 0 }),
        ],
      });

    case PARAMETER_TYPES.PROPORTIONATE:
      // parameterReferenceAccountsが配列でない場合（新構造）の処理
      let proportionateRef;
      if (Array.isArray(parameterReferenceAccounts)) {
        if (parameterReferenceAccounts.length === 0) {
          throw new Error(
            `PROPORTIONATE requires reference accounts for account: ${account.accountName}`
          );
        }
        proportionateRef = parameterReferenceAccounts[0];
      } else if (parameterReferenceAccounts) {
        // 単一オブジェクトの場合
        proportionateRef = parameterReferenceAccounts;
      } else {
        throw new Error(
          `PROPORTIONATE requires reference accounts for account: ${account.accountName}`
        );
      }

      // 参照先アカウントの実際の成長率を計算
      const refAccountId = proportionateRef.accountId || proportionateRef.id;
      const refAccount = accounts.find((acc) => acc.id === refAccountId);

      if (!refAccount) {
        throw new Error(
          `Reference account not found: ${refAccountId} for account: ${account.accountName}`
        );
      }

      // 参照先アカウントの前期値と当期値を取得するためのノードを作成
      const refLastYearNode = createNode(AST_OPERATIONS.REF, {
        id: refAccountId,
        lag: 1,
      });
      const refCurrentYearNode = createNode(AST_OPERATIONS.REF, {
        id: refAccountId,
        lag: 0,
      });

      // 成長率を計算: (当期値 / 前期値) - 1
      const growthRateNode = createNode(AST_OPERATIONS.SUB, {
        args: [
          createNode(AST_OPERATIONS.DIV, {
            args: [refCurrentYearNode, refLastYearNode],
          }),
          createNode(AST_OPERATIONS.CONST, { value: 1 }),
        ],
      });

      // 自分の前期値 × (1 + 成長率)
      return createNode(AST_OPERATIONS.MUL, {
        args: [
          createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 }),
          createNode(AST_OPERATIONS.ADD, {
            args: [
              createNode(AST_OPERATIONS.CONST, { value: 1 }),
              growthRateNode,
            ],
          }),
        ],
      });

    case PARAMETER_TYPES.CALCULATION:
      if (
        !parameterReferenceAccounts ||
        parameterReferenceAccounts.length === 0
      ) {
        throw new Error(
          `CALCULATION requires reference accounts for account: ${account.accountName}`
        );
      }

      const firstRef = createNode(AST_OPERATIONS.REF, {
        id:
          parameterReferenceAccounts[0].accountId ||
          parameterReferenceAccounts[0].id,
        lag: 0,
      });

      if (parameterReferenceAccounts.length === 1) {
        return firstRef;
      }

      const refAddArgs = [firstRef];

      for (let i = 1; i < parameterReferenceAccounts.length; i++) {
        const ref = parameterReferenceAccounts[i];
        const refId = ref.accountId || ref.id;
        if (ref.operation === "ADD") {
          refAddArgs.push(
            createNode(AST_OPERATIONS.REF, { id: refId, lag: 0 })
          );
        } else if (ref.operation === "SUB") {
          refAddArgs.push(
            createNode(AST_OPERATIONS.MUL, {
              args: [
                createNode(AST_OPERATIONS.CONST, { value: -1 }),
                createNode(AST_OPERATIONS.REF, { id: refId, lag: 0 }),
              ],
            })
          );
        }
      }

      return createNode(AST_OPERATIONS.ADD, { args: refAddArgs });

    case PARAMETER_TYPES.FIXED_VALUE:
      // 横置きは前期値をそのまま使用
      return createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 });

    case PARAMETER_TYPES.CHILDREN_SUM:
      // 子要素の合計は別途calculateSummaryAccountValueで処理
      return null;

    case PARAMETER_TYPES.BS_CHANGE:
      // BS項目の当期と前期の差分を計算
      if (!parameterReferenceAccounts) {
        throw new Error(
          `BS_CHANGE requires reference accounts for account: ${account.accountName}`
        );
      }

      const bsRef = parameterReferenceAccounts;
      const refId = bsRef.accountId || bsRef.id;

      const changeNode = createNode(AST_OPERATIONS.SUB, {
        args: [
          createNode(AST_OPERATIONS.REF, {
            id: refId,
            lag: 0, // 当期
          }),
          createNode(AST_OPERATIONS.REF, {
            id: refId,
            lag: 1, // 前期
          }),
        ],
      });

      // 符号の調整（資産増加はマイナス、負債増加はプラス）
      if (bsRef.operation === OPERATIONS.SUB) {
        return createNode(AST_OPERATIONS.MUL, {
          args: [createNode(AST_OPERATIONS.CONST, { value: -1 }), changeNode],
        });
      }
      return changeNode;

    case PARAMETER_TYPES.CF_ADJUSTMENT_CALC:
      // CF調整計算：参照先の値に演算子を適用
      if (!parameterReferenceAccounts) {
        throw new Error(
          `CF_ADJUSTMENT_CALC requires reference accounts for account: ${account.accountName}`
        );
      }

      const cfRef = parameterReferenceAccounts;
      const cfRefId = cfRef.accountId || cfRef.id;
      const cfRefNode = createNode(AST_OPERATIONS.REF, {
        id: cfRefId,
        lag: 0,
      });

      // 演算子に応じて符号を調整
      if (cfRef.operation === OPERATIONS.SUB) {
        return createNode(AST_OPERATIONS.MUL, {
          args: [createNode(AST_OPERATIONS.CONST, { value: -1 }), cfRefNode],
        });
      }
      return cfRefNode;

    default:
      throw new Error(
        `Unknown parameter type: ${parameterType} for account: ${account.accountName}`
      );
  }
};

/**
 * 現預金計算用のAST構築
 * 複雑な計算のため、専用の構造を作成
 * @param {Object} account - 現預金アカウント
 * @param {Array} accounts - 全アカウント配列
 * @returns {ASTNode} 構築されたAST
 */
const buildCashCalculationFormula = (account, accounts) => {
  // この関数は概念的なもので、実際の計算はcalculateCashBalanceで行う
  // ASTでは表現が複雑すぎるため、特別な処理フラグとして機能
  return {
    op: "CASH_CALC",
    accountId: account.id,
  };
};

/**
 * CF調整を適用したAST式を構築する
 * @param {Object} account 対象のstock科目
 * @param {Array} accounts 全アカウント配列
 * @returns {ASTNode} CF調整を適用したAST
 */
const buildCFAdjustedFormula = (account, accounts) => {
  console.log(`=== CF調整AST構築: ${account.accountName} ===`);

  // 前期末残高
  const args = [createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 })];

  // CF調整を適用
  const cfAdjustments = getCFAdjustmentAccounts(account, accounts);

  console.log(`CF調整科目数: ${cfAdjustments.length}`);

  cfAdjustments.forEach((cfAccount) => {
    const cfAdj = AccountUtils.getCFAdjustment(cfAccount);
    const cfNode = createNode(AST_OPERATIONS.REF, {
      id: cfAccount.id,
      lag: 0,
    });

    console.log(
      `CF調整科目: ${cfAccount.accountName}, 演算: ${cfAdj.operation}`
    );

    const operation = cfAdj.operation;
    if (operation === OPERATIONS.SUB) {
      // 減算の場合は-1を掛けて加算に変換
      args.push(
        createNode(AST_OPERATIONS.MUL, {
          args: [createNode(AST_OPERATIONS.CONST, { value: -1 }), cfNode],
        })
      );
    } else {
      // 加算の場合はそのまま追加
      args.push(cfNode);
    }
  });

  console.log(`=== CF調整AST構築完了 ===`);

  return createNode(AST_OPERATIONS.ADD, { args });
};

/**
 * キャッシュフロー計算用のASTを構築する
 * @param {Object} account - 勘定科目オブジェクト
 * @param {boolean} [isSimpleReference=false] - 単純参照モードの場合true
 * @returns {ASTNode} 構築されたAST
 */
export const buildCashflowFormula = (account, isSimpleReference = false) => {
  if (isSimpleReference) {
    // 単純参照モード：当年度の値をそのまま参照
    return createNode(AST_OPERATIONS.REF, { id: account.id, lag: 0 });
  }

  // 通常モード：当年度の値 - 前年度の値を計算
  return createNode(AST_OPERATIONS.SUB, {
    args: [
      createNode(AST_OPERATIONS.REF, { id: account.id, lag: 0 }), // 当年度の値
      createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 }), // 前年度の値
    ],
  });
};
