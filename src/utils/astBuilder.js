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
  // CF項目は専用の処理に委譲（ASTではなく専用の計算ロジックを使用）
  if (AccountUtils.isCFItem(account)) {
    return null; // CF項目は calculateCFItemValue で処理される
  }

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
      // 新構造のみ対応：単一参照として処理
      if (
        !parameterReferenceAccounts ||
        !parameterReferenceAccounts.accountId
      ) {
        throw new Error(
          `PERCENTAGE requires reference account for: ${account.accountName}`
        );
      }

      // 単一オブジェクトとして直接使用
      return createNode(AST_OPERATIONS.MUL, {
        args: [
          createNode(AST_OPERATIONS.REF, {
            id: parameterReferenceAccounts.accountId,
            lag: 0,
          }),
          createNode(AST_OPERATIONS.CONST, { value: parameterValue || 0 }),
        ],
      });

    case PARAMETER_TYPES.PROPORTIONATE:
      // 新構造のみ対応：単一参照として処理
      if (
        !parameterReferenceAccounts ||
        !parameterReferenceAccounts.accountId
      ) {
        throw new Error(
          `PROPORTIONATE requires reference account for: ${account.accountName}`
        );
      }

      // 参照先アカウントの検証
      const refAccount = accounts.find(
        (acc) => acc.id === parameterReferenceAccounts.accountId
      );

      if (!refAccount) {
        throw new Error(
          `Reference account not found: ${parameterReferenceAccounts.accountId} for account: ${account.accountName}`
        );
      }

      console.log(`=== PROPORTIONATE AST構築: ${account.accountName} ===`);
      console.log(
        `参照先: ${refAccount.accountName} (${parameterReferenceAccounts.accountId})`
      );

      // 参照先の成長率計算用ノード
      const refLastYearNode = createNode(AST_OPERATIONS.REF, {
        id: parameterReferenceAccounts.accountId,
        lag: 1,
      });
      const refCurrentYearNode = createNode(AST_OPERATIONS.REF, {
        id: parameterReferenceAccounts.accountId,
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
      const proportionateNode = createNode(AST_OPERATIONS.MUL, {
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

      return proportionateNode;

    case PARAMETER_TYPES.CALCULATION:
      // 複数参照（配列）として処理
      if (
        !Array.isArray(parameterReferenceAccounts) ||
        parameterReferenceAccounts.length === 0
      ) {
        throw new Error(
          `CALCULATION requires reference accounts array for: ${account.accountName}`
        );
      }

      // 既存のロジックをそのまま使用
      const firstRef = createNode(AST_OPERATIONS.REF, {
        id: parameterReferenceAccounts[0].accountId,
        lag: 0,
      });

      if (parameterReferenceAccounts.length === 1) {
        return firstRef;
      }

      const refAddArgs = [firstRef];

      for (let i = 1; i < parameterReferenceAccounts.length; i++) {
        const ref = parameterReferenceAccounts[i];
        if (ref.operation === OPERATIONS.ADD) {
          refAddArgs.push(
            createNode(AST_OPERATIONS.REF, {
              id: ref.accountId,
              lag: 0,
            })
          );
        } else if (ref.operation === OPERATIONS.SUB) {
          refAddArgs.push(
            createNode(AST_OPERATIONS.MUL, {
              args: [
                createNode(AST_OPERATIONS.CONST, { value: -1 }),
                createNode(AST_OPERATIONS.REF, {
                  id: ref.accountId,
                  lag: 0,
                }),
              ],
            })
          );
        }
        // MULとDIVの処理も追加可能
      }

      return createNode(AST_OPERATIONS.ADD, { args: refAddArgs });

    case PARAMETER_TYPES.REFERENCE:
      // 新構造のみ対応：単一参照として処理
      if (
        !parameterReferenceAccounts ||
        !parameterReferenceAccounts.accountId
      ) {
        throw new Error(
          `REFERENCE requires reference account for: ${account.accountName}`
        );
      }

      // 値をそのまま参照
      return createNode(AST_OPERATIONS.REF, {
        id: parameterReferenceAccounts.accountId,
        lag: 0,
      });

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
  // 前期末残高
  const args = [createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 })];

  // CF調整を適用
  const cfAdjustments = getCFAdjustmentAccounts(account, accounts);

  cfAdjustments.forEach((cfAccount) => {
    const cfAdj = AccountUtils.getCFAdjustment(cfAccount);
    const cfNode = createNode(AST_OPERATIONS.REF, {
      id: cfAccount.id,
      lag: 0,
    });

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
