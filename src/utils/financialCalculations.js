import { getCalculationOrder } from "./dependencyCalculation";
import { buildFormula, buildCashflowFormula } from "./astBuilder";
import { evalNode } from "./astEvaluator";
import {
  PARAMETER_TYPES,
  SHEET_TYPES,
  FLOW_SHEETS,
  OPERATIONS,
} from "./constants";
import { calculateBSDifference } from "./cashflowCalc.js";

import { ParameterUtils } from "./parameterUtils";
import { AccountUtils } from "./accountUtils.js";
import {
  calculateStockAccountWithCFAdjustment,
  isCFAdjustmentTarget,
} from "./balanceSheetCalculator";
import { calculateCashBalance } from "./cashCalculator";
import {
  createCFAdjustmentAccountWithValue,
  createBSChangeAccountWithValue,
} from "../models/cashflowAccount";
import { FinancialModel } from "../models/FinancialModel.js";

/**
 * 親子関係のマップを作成する
 * @param {Array} accounts アカウント配列
 * @returns {Object} 親子関係のマップ
 */
export const createParentChildMap = (accounts) => {
  const parentChildMap = {};
  accounts.forEach((account) => {
    if (account.parentAccountId) {
      // parentChildMap = {
      // "rev-total": [] or ["account-0"]
      // ←parentChildMap[account.parentAccountId]があるときは["account-0"]が返り、ないときは空配列
      // "cogs-total": []
      // ...
      // }
      parentChildMap[account.parentAccountId] =
        parentChildMap[account.parentAccountId] || [];
      parentChildMap[account.parentAccountId].push(account.id);
    }
  });
  console.log("=== 親子関係マップ ===", parentChildMap);
  return parentChildMap;
};

/**
 * サマリーアカウントの値を計算する
 * @param {Object} summaryAccount サマリーアカウント
 * @param {Object} period 期間
 * @param {Object} parentChildMap 親子関係のマップ
 * @param {Array} accountValues アカウント値配列
 * @returns {number} 計算された値
 */
export const calculateSummaryAccountValue = (
  summaryAccount,
  period,
  parentChildMap,
  accountValues
) => {
  let sumValue = 0;
  // summaryAccountを親科目に持つ科目のIdが入っている配列
  const childAccounts = parentChildMap[summaryAccount.id] || [];

  console.log(
    `=== 合計値計算: ${summaryAccount.accountName} (${summaryAccount.id}) ===`
  );
  console.log(`子科目数: ${childAccounts.length}`);

  childAccounts.forEach((childId) => {
    // 子科目のidからaccountValuesを特定し、そのvalueを抽出する
    const childValue = accountValues.find(
      (v) => v.accountId === childId && v.periodId === period.id
    );
    if (childValue) {
      console.log(`  子科目 ${childId}: ${childValue.value}`);
      sumValue += childValue.value;
    } else {
      console.log(`  子科目 ${childId}: 値が見つかりません`);
    }
  });

  console.log(`合計値: ${sumValue}`);
  return sumValue;
};

/**
 * 値の配列から指定されたアカウントと期間の値を取得する
 * @param {Array} values 値の配列
 * @param {string} accountId アカウントID
 * @param {string} periodId 期間ID
 * @returns {number} 値（見つからない場合は0）
 */
export const getValue = (values, accountId, periodId) => {
  return (
    values.find((v) => v.accountId === accountId && v.periodId === periodId)
      ?.value || 0
  );
};

/**
 * AST評価用の値取得関数を作成
 * @param {Array} values 値の配列
 * @param {number} targetPeriod 対象期間の年
 * @returns {Function} getValue関数
 */
export const createGetValueFunction = (values, targetPeriod) => {
  return (accountId, period) => {
    const periodId = `p-${period}`;
    return getValue(values, accountId, periodId);
  };
};

/**
 * パラメータタイプに基づいてアカウントの値を計算する
 * @param {Object} account アカウント
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 最後の期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
export const calculateParameterAccount = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  try {
    const parameterType = ParameterUtils.getParameterType(account);

    // 現預金計算の特別処理
    if (parameterType === PARAMETER_TYPES.CASH_CALCULATION) {
      return calculateCashBalance(
        account,
        newPeriod,
        lastPeriod,
        values,
        accounts
      );
    }

    // stock科目でパラメータがない場合の特別処理
    if (
      AccountUtils.isStockAccount(account) &&
      !ParameterUtils.hasParameter(account)
    ) {
      // CF調整がある場合
      if (isCFAdjustmentTarget(account, accounts)) {
        return calculateStockAccountWithCFAdjustment(
          account,
          newPeriod,
          lastPeriod,
          values,
          accounts
        );
      }
      // CF調整もない場合は前期値をそのまま使用
      const lastPeriodValue = getValue(values, account.id, lastPeriod.id);
      return lastPeriodValue;
    }

    // AST構築（GROWTH_RATEなどはここで処理）
    const periodYear = parseInt(newPeriod.year, 10);
    const ast = buildFormula(account, periodYear, accounts);

    // ASTがnullの場合（計算不要）は前期値を返す
    if (!ast) {
      const lastPeriodValue = getValue(values, account.id, lastPeriod.id);
      return lastPeriodValue;
    }

    // AST評価
    const getValueFunction = createGetValueFunction(values, periodYear);
    const result = evalNode(ast, periodYear, getValueFunction);

    if (result === undefined || result === null) {
      throw new Error(
        `AST evaluation failed for account ${account.accountName}`
      );
    }

    return result;
  } catch (error) {
    console.error(`Calculation failed for ${account.accountName}:`, error);
    throw new Error(
      `Failed to calculate value for ${account.accountName}: ${error.message}`
    );
  }
};

/**
 * 新しい期間を作成する
 * @param {Object} lastPeriod 最後の期間
 * @returns {Object} 新しい期間
 */
export const createNewPeriod = (lastPeriod) => {
  const lastYear = parseInt(lastPeriod.year, 10);
  const newYear = lastYear + 1;

  return {
    id: `p-${newYear}`,
    year: newYear.toString(),
    isActual: false,
    isFromExcel: false,
    order: lastPeriod.order + 1,
  };
};

/**
 * 財務モデルに新しい期間を追加する
 * @param {FinancialModel} model 財務モデル（新構造）
 * @returns {FinancialModel} 更新された財務モデル
 */
export const addNewPeriodToModel = (model) => {
  // 既に新構造のFinancialModelとして処理
  if (!(model instanceof FinancialModel)) {
    throw new Error("Model must be an instance of FinancialModel");
  }

  const updatedModel = model;
  const lastPeriod = updatedModel.periods[updatedModel.periods.length - 1];
  const newPeriod = createNewPeriod(lastPeriod);

  // 新しい期間を追加
  updatedModel.addPeriod(newPeriod);

  // 通常科目の値を計算（CF項目は後で処理）
  // 依存関係を考慮した計算順序を取得
  const regularAccounts = updatedModel.accounts.getRegularItems();
  const calculationOrder = getCalculationOrder(regularAccounts);

  // 依存関係順序に従って計算
  calculationOrder.forEach((accountId) => {
    const account = regularAccounts.find((acc) => acc.id === accountId);
    if (!account) {
      console.warn(`計算順序にあるアカウントが見つかりません: ${accountId}`);
      return;
    }

    let newValue = 0;
    let isCalculated = true;

    try {
      // パラメータタイプに応じて値を計算
      const parameterType = ParameterUtils.getParameterType(account);
      if (parameterType === PARAMETER_TYPES.CHILDREN_SUM) {
        newValue = calculateSummaryAccountValue(
          account,
          newPeriod,
          createParentChildMap(updatedModel.accounts.getAllAccounts()),
          updatedModel.values
        );
      } else {
        newValue = calculateParameterAccount(
          account,
          newPeriod,
          lastPeriod,
          updatedModel.values,
          updatedModel.accounts.getAllAccounts()
        );
        isCalculated = false;
      }

      // 新しい値を追加
      updatedModel.addValue({
        accountId: account.id,
        periodId: newPeriod.id,
        value: newValue,
        isCalculated,
      });

      console.log(`計算完了: ${account.accountName} = ${newValue}`);
    } catch (error) {
      console.error(`計算エラー: ${account.accountName}`, error);
      // エラーの場合は前期値を使用
      const lastValue = getValue(
        updatedModel.values,
        account.id,
        lastPeriod.id
      );
      updatedModel.addValue({
        accountId: account.id,
        periodId: newPeriod.id,
        value: lastValue,
        isCalculated: false,
      });
    }
  });

  console.log("=== デバッグ終了 ===");

  // キャッシュフロー計算書の構築（統合版）
  console.log("=== CF項目自動生成開始 ===");

  // A. CF調整項目の生成と値計算（統合処理）
  const cfAdjustmentAccounts = updatedModel.accounts
    .getRegularItems()
    .filter((acc) => AccountUtils.getCFAdjustment(acc) !== null);
  console.log("CF調整対象アカウント:", cfAdjustmentAccounts);

  let cfOrderCounter = 1;

  // CF調整項目を作成し、同時に値も計算
  cfAdjustmentAccounts.forEach((account) => {
    try {
      // アカウント作成と値計算を同時実行
      const result = createCFAdjustmentAccountWithValue(
        account,
        cfOrderCounter++,
        newPeriod,
        lastPeriod,
        updatedModel.values
      );

      // 既存チェック
      const exists = updatedModel.accounts.exists(result.account.id);

      if (!exists) {
        // アカウントと値を追加
        updatedModel.accounts.addCFItem(result.account);
        console.log("CF調整項目を追加:", result.account.accountName);

        updatedModel.addValue({
          accountId: result.account.id,
          periodId: newPeriod.id,
          value: result.value,
          isCalculated: true,
        });

        console.log(
          `CF調整項目値: ${result.account.accountName} = ${result.value}`
        );
      }
    } catch (error) {
      console.warn(`CF調整項目生成エラー: ${account.accountName}`, error);
    }
  });

  // B. BS変動項目の生成と値計算（統合処理）
  console.log("=== BS変動項目生成開始 ===");

  // パラメータベースのBS科目を抽出
  const parameterBasedBSAccounts = updatedModel.accounts
    .getRegularItems()
    .filter((account) => {
      return (
        AccountUtils.isStockAccount(account) &&
        account.stockAttributes?.isParameterBased === true
      );
    });

  console.log("パラメータベースBS科目:", parameterBasedBSAccounts);

  let bsChangeOrderCounter = 1;

  // BS変動項目を作成し、同時に値も計算
  parameterBasedBSAccounts.forEach((bsAccount) => {
    try {
      // アカウント作成と値計算を同時実行
      const result = createBSChangeAccountWithValue(
        bsAccount,
        bsChangeOrderCounter++,
        newPeriod,
        lastPeriod,
        updatedModel.values
      );

      // 既存チェック
      const exists = updatedModel.accounts.exists(result.account.id);

      if (!exists) {
        // アカウントと値を追加
        updatedModel.accounts.addCFItem(result.account);
        console.log("BS変動項目を追加:", result.account.accountName);

        updatedModel.addValue({
          accountId: result.account.id,
          periodId: newPeriod.id,
          value: result.value,
          isCalculated: true,
        });

        console.log(
          `BS変動項目値: ${result.account.accountName} = ${result.value}`
        );
      }
    } catch (error) {
      console.error(`BS変動項目生成エラー: ${bsAccount.accountName}`, error);
    }
  });

  console.log("=== BS変動項目生成終了 ===");

  // CAPEX項目のCF項目生成は既存のロジックを維持
  // （この部分は現在のコードをそのまま残してください）

  console.log("=== CF項目自動生成終了 ===");

  // CF項目の構造検証
  const validation = updatedModel.validate();
  if (!validation.isValid) {
    console.warn("CF項目構造検証エラー:", validation.errors);
    validation.warnings.forEach((warning) => console.warn("警告:", warning));
  } else {
    console.log("CF項目構造検証成功:", validation.stats);
  }

  return updatedModel;
};
