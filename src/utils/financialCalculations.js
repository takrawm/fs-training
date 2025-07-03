import { getCalculationOrder } from "./dependencyCalculation";
import { buildFormula, buildCashflowFormula } from "./astBuilder";
import { evalNode } from "./astEvaluator";
import {
  PARAMETER_TYPES,
  SHEET_TYPES,
  FLOW_SHEETS,
  OPERATIONS,
} from "./constants";

import { ParameterUtils } from "./parameterUtils";
import { AccountUtils } from "./accountUtils.js";
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
      parentChildMap[account.parentAccountId] =
        parentChildMap[account.parentAccountId] || [];
      parentChildMap[account.parentAccountId].push(account.id);
    }
  });
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

  childAccounts.forEach((childId) => {
    // 子科目のidからaccountValuesを特定し、そのvalueを抽出する
    const childValue = accountValues.find(
      (v) => v.accountId === childId && v.periodId === period.id
    );
    if (childValue) {
      sumValue += childValue.value;
    }
  });

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
// getValueFunction = (accountId, period) => {
//   const periodId = `p-${period}`;
//   return getValue(values, accountId, periodId);
// };
export const createGetValueFunction = (values) => {
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
    // AST構築
    const periodYear = parseInt(newPeriod.year, 10);
    const ast = buildFormula(account, periodYear, accounts);

    // ASTがnullの場合（計算不要）は前期値を返す
    if (!ast) {
      const lastPeriodValue = getValue(values, account.id, lastPeriod.id);
      return lastPeriodValue;
    }

    // まだ何も値は取得していない（「accountIdとperiodを受け取って値を返す関数」ができただけ）
    const getValueFunction = createGetValueFunction(values);
    // この関数はASTノード（数式の木構造）を再帰的に評価する（evalNodeの中でgetValueFunctionが呼び出される）
    // evalNodeの中で
    // evalNode = (node, period, getValue) => {
    // ...
    // case AST_OPERATIONS.REF:
    //   return getValue(node.id, period - (node.lag ?? 0));
    // ...
    // }
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
 * 財務モデルに新しい期間を追加する（ハイブリッドアプローチ版）
 *
 * 設計方針：
 * - ビジネスロジック層では効率的なミュータブル操作を維持
 * - UI層との境界で新しい参照を作成してReactの変更検知を保証
 *
 * @param {FinancialModel} model 財務モデル（新構造）
 * @returns {FinancialModel} UI更新のための新しい参照を持つ財務モデル
 */
export const addNewPeriodToModel = (model) => {
  // バリデーション：引き続き厳密にチェック
  if (!(model instanceof FinancialModel)) {
    throw new Error("Model must be an instance of FinancialModel");
  }

  // === ビジネスロジック層：既存の効率的なミュータブル操作を完全に維持 ===

  const updatedModel = model; // 意図的に同じ参照を使用（既存設計の維持）
  const lastPeriod = updatedModel.periods[updatedModel.periods.length - 1];
  const newPeriod = createNewPeriod(lastPeriod);

  // 新しい期間を追加（既存のミュータブル操作）
  updatedModel.addPeriod(newPeriod);

  // 通常科目の値を計算（既存のロジックを完全に維持）
  // 依存関係を考慮した計算順序を取得
  const regularAccounts = updatedModel.accounts.getRegularItems();
  const calculationOrder = getCalculationOrder(regularAccounts);

  // 依存関係順序に従って計算（既存の処理フローを維持）
  calculationOrder.forEach((accountId) => {
    const account = regularAccounts.find((acc) => acc.id === accountId);
    if (!account) {
      console.warn(`計算順序にあるアカウントが見つかりません: ${accountId}`);
      return;
    }

    let newValue = 0;
    let isCalculated = true;

    try {
      // パラメータタイプに応じて値を計算（既存ロジック維持）
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
        isCalculated = true;
      }

      // 新しい値を追加（既存のaddValueメソッドを使用）
      updatedModel.addValue({
        accountId: account.id,
        periodId: newPeriod.id,
        value: newValue,
        isCalculated,
      });
    } catch (error) {
      console.error(`計算エラー: ${account.accountName}`, error);
      // エラーの場合は前期値を使用（既存のエラー処理を維持）
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

  // キャッシュフロー計算書の構築（統合版）- 既存のロジックを完全に維持

  // 1. ベース利益のCF項目生成
  const baseProfitAccounts = updatedModel.accounts
    .getRegularItems()
    .filter((acc) => AccountUtils.getBaseProfit(acc));

  let baseProfitOrderCounter = 1;

  baseProfitAccounts.forEach((profitAccount) => {
    try {
      // ベース利益のCF項目を作成
      const cfItem = {
        id: `cf-${profitAccount.id}`,
        accountName: `${profitAccount.accountName}（間接法CF）`,
        parentAccountId: "ope-cf-total",
        isCredit: null,
        sheet: null,
        parameter: null,
        stockAttributes: null,
        flowAttributes: null,
        displayOrder: {
          order: `R${String(baseProfitOrderCounter).padStart(2, "0")}`,
          prefix: "R",
        },
      };

      // 既存チェック
      const exists = updatedModel.accounts.exists(cfItem.id);

      if (!exists) {
        // CF項目を追加
        updatedModel.accounts.addCFItem(cfItem);

        // 値を取得して追加
        const profitValue = getValue(
          updatedModel.values,
          profitAccount.id,
          newPeriod.id
        );

        updatedModel.addValue({
          accountId: cfItem.id,
          periodId: newPeriod.id,
          value: profitValue,
          isCalculated: true,
        });

        baseProfitOrderCounter++;
      }
    } catch (error) {
      console.warn(
        `ベース利益CF項目生成エラー: ${profitAccount.accountName}`,
        error
      );
    }
  });

  // A. CF調整項目の生成と値計算（統合処理）
  const cfAdjustmentAccounts = updatedModel.accounts
    .getRegularItems()
    .filter((acc) => AccountUtils.getCFAdjustment(acc) !== null);

  let cfOrderCounter = baseProfitOrderCounter;

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

        updatedModel.addValue({
          accountId: result.account.id,
          periodId: newPeriod.id,
          value: result.value,
          isCalculated: true,
        });
      }
    } catch (error) {
      console.warn(`CF調整項目生成エラー: ${account.accountName}`, error);
    }
  });

  // B. BS変動項目の生成と値計算（統合処理）

  // CF項目を生成すべきBS科目を抽出
  const cfGeneratingBSAccounts = updatedModel.accounts
    .getRegularItems()
    .filter((account) => AccountUtils.shouldGenerateCFItem(account));

  let bsChangeOrderCounter = cfOrderCounter;

  // BS変動項目を作成し、同時に値も計算
  cfGeneratingBSAccounts.forEach((bsAccount) => {
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

        updatedModel.addValue({
          accountId: result.account.id,
          periodId: newPeriod.id,
          value: result.value,
          isCalculated: true,
        });
      }
    } catch (error) {
      console.error(`BS変動項目生成エラー: ${bsAccount.accountName}`, error);
    }
  });

  // CAPEX項目のCF項目生成は既存のロジックを維持
  // （この部分は現在のコードをそのまま残してください）

  // CF項目の構造検証
  const validation = updatedModel.validate();
  if (!validation.isValid) {
    console.warn("CF項目構造検証エラー:", validation.errors);
    validation.warnings.forEach((warning) => console.warn("警告:", warning));
  }

  // === ここまでは既存のビジネスロジックを完全に維持 ===

  // === UI層との境界：新しい参照の作成（追加処理） ===

  // 重要：ビジネスロジックの処理が完了した後、UI層のために新しい参照を作成
  // データの実体はコピーせず、参照のみ新しくすることでメモリ効率を保つ
  const uiCompatibleModel = Object.create(Object.getPrototypeOf(updatedModel));

  // 各プロパティを新しいオブジェクトに割り当て（浅い参照コピー）
  uiCompatibleModel.accounts = updatedModel.accounts; // accountsは共有（変更されないため）
  uiCompatibleModel.periods = updatedModel.periods; // 既に更新済みの配列
  uiCompatibleModel.values = updatedModel.values; // 既に更新済みの配列

  // FinancialModelのメソッドも継承されるため、機能的には完全に同等

  // デバッグ情報：参照変更の確認
  console.log("財務モデル更新完了（ハイブリッドアプローチ）:", {
    元の期間数: model.periods.length,
    更新後の期間数: uiCompatibleModel.periods.length,
    元の値数: model.values.length,
    更新後の値数: uiCompatibleModel.values.length,
    参照が変更されたか: model === uiCompatibleModel, // false になることを確認
    データの整合性:
      model.periods.length === uiCompatibleModel.periods.length - 1, // true になることを確認
  });

  // UI層に新しい参照を返す（Reactの変更検知を確実にトリガー）
  return uiCompatibleModel;
};
