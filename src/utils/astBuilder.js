import { AST_OPERATIONS, createNode } from "./astTypes.js";
import { PARAMETER_TYPES, OPERATIONS } from "./constants.js";
import { evalNode } from "./astEvaluator.js";
import { ParameterUtils } from "./parameterUtils.js";
import { AccountUtils } from "./accountUtils.js";
import {
  isCFAdjustmentTarget,
  getCFAdjustmentAccounts,
  isBaseProfitTarget,
} from "./balanceSheetCalculator.js";

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
    // CF調整 または baseProfit調整の対象かチェック
    // 両方の調整タイプを統一的に処理する
    const hasCFAdjustment = isCFAdjustmentTarget(account, accounts);
    const hasBaseProfitAdjustment = isBaseProfitTarget(account, accounts);

    if (hasCFAdjustment || hasBaseProfitAdjustment) {
      // 統一されたCF調整式を構築
      // この関数がCF調整とbaseProfit調整の両方を処理する
      return buildCFAdjustedFormula(account, accounts);
    }

    // どちらの調整もない場合は前期値をそのまま使用
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

    case PARAMETER_TYPES.CASH_BEGINNING_BALANCE:
      // 前期の現預金合計（BS）を参照
      // 計算式: 前期末現預金 = 現預金合計[t-1]
      if (!parameterReferenceAccounts?.accountId) {
        throw new Error(
          `CASH_BEGINNING_BALANCE requires reference account for: ${account.accountName}`
        );
      }

      return createNode(AST_OPERATIONS.REF, {
        id: parameterReferenceAccounts.accountId,
        lag: parameterReferenceAccounts.lag || 1, // デフォルトで前期
      });

    case PARAMETER_TYPES.CASH_FLOW_TOTAL:
      // 全CF項目の合計（SUMMARY_ACCOUNTS除く）
      // この計算は動的に行われるため、専用の関数を呼び出す
      return buildCashFlowTotalFormula(account, accounts);

    case PARAMETER_TYPES.CASH_CHANGE_CALCULATION:
      // 間接法による現預金増減計算
      // 以下の3要素を合計するASTを構築
      const cashChangeArgs = [];

      console.log(`=== 現預金増減AST構築 ===`);

      // 1. baseProfit項目の処理
      const baseProfitAccounts = accounts.filter((acc) =>
        AccountUtils.getBaseProfit(acc)
      );
      baseProfitAccounts.forEach((profitAccount) => {
        cashChangeArgs.push(
          createNode(AST_OPERATIONS.REF, { id: profitAccount.id, lag: 0 })
        );
      });

      // 2. CF調整項目の処理
      const cfAdjustmentAccounts = accounts.filter(
        (acc) => AccountUtils.getCFAdjustment(acc) !== null
      );
      cfAdjustmentAccounts.forEach((cfAccount) => {
        const cfAdj = AccountUtils.getCFAdjustment(cfAccount);
        const targetAccount = accounts.find(
          (acc) => acc.id === cfAdj.targetAccountId
        );

        if (!targetAccount) {
          console.warn(
            `CF調整の対象科目が見つかりません: ${cfAdj.targetAccountId}`
          );
          return;
        }

        // 符号決定ロジック：
        // - 対象科目のisCredit === true: cfAdj.operationと同じ
        // - 対象科目のisCredit === false: cfAdj.operationと逆
        const shouldReverse = !targetAccount.isCredit;
        const effectiveOperation = shouldReverse
          ? cfAdj.operation === OPERATIONS.ADD
            ? OPERATIONS.SUB
            : OPERATIONS.ADD
          : cfAdj.operation;

        const cfNode = createNode(AST_OPERATIONS.REF, {
          id: cfAccount.id,
          lag: 0,
        });

        // SUBの場合は-1を掛けてADDに変換
        if (effectiveOperation === OPERATIONS.SUB) {
          cashChangeArgs.push(
            createNode(AST_OPERATIONS.MUL, {
              args: [createNode(AST_OPERATIONS.CONST, { value: -1 }), cfNode],
            })
          );
        } else {
          cashChangeArgs.push(cfNode);
        }
      });

      // 3. BS変動項目の処理
      const bsChangeAccounts = accounts.filter(
        (acc) =>
          AccountUtils.shouldGenerateCFItem(acc) && acc.id !== "cash-total"
      );
      bsChangeAccounts.forEach((bsAccount) => {
        // 当期値 - 前期値
        const changeNode = createNode(AST_OPERATIONS.SUB, {
          args: [
            createNode(AST_OPERATIONS.REF, { id: bsAccount.id, lag: 0 }),
            createNode(AST_OPERATIONS.REF, { id: bsAccount.id, lag: 1 }),
          ],
        });

        // 符号調整：
        // - isCredit === false（資産）: 増加は現預金減少なので符号反転
        // - isCredit === true（負債・純資産）: 増加は現預金増加なのでそのまま
        if (!bsAccount.isCredit) {
          cashChangeArgs.push(
            createNode(AST_OPERATIONS.MUL, {
              args: [
                createNode(AST_OPERATIONS.CONST, { value: -1 }),
                changeNode,
              ],
            })
          );
        } else {
          cashChangeArgs.push(changeNode);
        }
      });

      // デバッグログの追加
      console.log(`baseProfit項目数: ${baseProfitAccounts.length}`);
      console.log(`CF調整項目数: ${cfAdjustmentAccounts.length}`);
      console.log(`BS変動項目数: ${bsChangeAccounts.length}`);

      // エッジケース処理
      if (cashChangeArgs.length === 0) {
        console.warn("現預金増減計算: 要素が見つかりません");
        return createNode(AST_OPERATIONS.CONST, { value: 0 });
      }

      // 要素が1つの場合はそのまま返す（ADD不要）
      if (cashChangeArgs.length === 1) {
        return cashChangeArgs[0];
      }

      const resultAST = createNode(AST_OPERATIONS.ADD, {
        args: cashChangeArgs,
      });
      console.log(`構築されたAST:`, JSON.stringify(resultAST, null, 2));

      return resultAST;

    case PARAMETER_TYPES.CASH_ENDING_BALANCE:
      // 前期末現預金 + 当期現預金の増減
      // 計算式: 当期末現預金 = 前期末現預金 + 当期現預金の増減
      if (
        !Array.isArray(parameterReferenceAccounts) ||
        parameterReferenceAccounts.length === 0
      ) {
        throw new Error(
          `CASH_ENDING_BALANCE requires reference accounts array for: ${account.accountName}`
        );
      }

      // 複数の参照科目をADD操作で結合
      const args = parameterReferenceAccounts.map((ref) =>
        createNode(AST_OPERATIONS.REF, {
          id: ref.accountId,
          lag: ref.lag || 0,
        })
      );

      return createNode(AST_OPERATIONS.ADD, { args });

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
 * CF調整とbaseProfit調整を統合したAST式を構築
 *
 * この関数は、ストック科目に対して以下の調整を適用したAST式を構築します：
 * 1. CF調整：設備投資や減価償却費等の非資金項目の影響
 * 2. baseProfit調整：利益項目による利益剰余金への影響
 *
 * 最終的な式：ストック科目(当期) = ストック科目(前期) + CF調整 + baseProfit調整
 *
 * @param {Object} account - 対象のstock科目
 * @param {Array} accounts - 全アカウント配列
 * @returns {ASTNode} 統合された調整を適用したAST
 */
const buildCFAdjustedFormula = (account, accounts) => {
  // 前期末残高からスタート
  const args = [createNode(AST_OPERATIONS.REF, { id: account.id, lag: 1 })];

  // 1. CF調整を適用（既存ロジック）
  // 設備投資（ADD）や減価償却費（SUB）等の処理
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

  // 2. baseProfit調整を適用（新規追加）
  // 利益項目による利益剰余金への影響を処理
  const baseProfitAccounts = AccountUtils.getBaseProfitAccounts(
    account,
    accounts
  );
  baseProfitAccounts.forEach((profitAccount) => {
    const profitNode = createNode(AST_OPERATIONS.REF, {
      id: profitAccount.id,
      lag: 0,
    });
    // baseProfit は常にADD操作（利益は常に剰余金を増加）
    args.push(profitNode);
  });

  // 全ての調整をADD操作で統合
  return createNode(AST_OPERATIONS.ADD, { args });
};

/**
 * CF項目の合計を計算するAST式を構築
 *
 * この関数は、当期現預金の増減を計算するために、
 * 全てのCF項目（SUMMARY_ACCOUNTSを除く）の合計を求めるAST式を構築します。
 *
 * @param {Object} account - 現預金増減計算アカウント
 * @param {Array} accounts - 全アカウント配列
 * @returns {ASTNode} CF項目合計のAST
 */
const buildCashFlowTotalFormula = (account, accounts) => {
  // CF項目合計の対象となる科目を抽出
  const targetCFAccounts = accounts.filter((acc) =>
    AccountUtils.shouldIncludeInCashFlowTotal(acc)
  );

  // CF項目が存在しない場合は0を返す
  if (targetCFAccounts.length === 0) {
    console.warn("CF項目合計の対象科目が見つかりません");
    return createNode(AST_OPERATIONS.CONST, { value: 0 });
  }

  // 単一のCF項目の場合
  if (targetCFAccounts.length === 1) {
    return createNode(AST_OPERATIONS.REF, {
      id: targetCFAccounts[0].id,
      lag: 0,
    });
  }

  // 複数のCF項目がある場合は合計を計算
  const args = targetCFAccounts.map((cfAccount) =>
    createNode(AST_OPERATIONS.REF, {
      id: cfAccount.id,
      lag: 0,
    })
  );

  // デバッグ用ログ（開発時のみ）
  console.log(
    `CF項目合計計算対象: ${targetCFAccounts
      .map((acc) => acc.accountName)
      .join(", ")}`
  );

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
