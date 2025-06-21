import { FLOW_SHEETS, STOCK_SHEETS, PARAMETER_TYPES } from "../utils/constants";
import { ParameterUtils } from "../utils/parameterUtils";
import { AccountUtils } from "../utils/accountUtils";

/**
 * タブに基づいてフィルタリングされたデータを生成する
 * @param {string} tabName タブ名
 * @param {Object} financialModel 財務モデル
 * @returns {Array} フィルタリングされたデータ
 */
export const getFilteredDataByTab = (tabName, financialModel) => {
  const { periods, values } = financialModel;

  // 新構造のFinancialModelのみをサポート
  if (!financialModel.accounts?.getAllAccounts) {
    throw new Error(
      "FinancialModel must use the new structure with AccountManager"
    );
  }

  let accounts;

  if (tabName === "CF") {
    // CF項目は構造的に分離されているので直接取得
    accounts = financialModel.accounts.getCFItems();
  } else if (tabName === "CASH_CALC") {
    // 現預金計算科目のみを取得
    console.log("=== CASH_CALC フィルタリング開始 ===");
    console.log("全regularItems:", financialModel.accounts.getRegularItems());

    accounts = financialModel.accounts.getRegularItems().filter((account) => {
      const isCashCalc = AccountUtils.isCashCalcAccount(account);
      console.log(
        `科目: ${account.accountName}, isCashCalc: ${isCashCalc}, sheet:`,
        account.sheet
      );
      return isCashCalc;
    });

    console.log("フィルタリング後の現預金計算科目:", accounts);
    console.log("=== CASH_CALC フィルタリング終了 ===");
  } else {
    // 他のタブは通常項目のみ
    accounts = financialModel.accounts.getRegularItems();
  }

  // ParameterUtilsを使用してヘルパー関数を統一
  const getParameterType = (account) =>
    ParameterUtils.getParameterType(account);
  const getParameterReferences = (account) =>
    ParameterUtils.getParameterReferences(account);

  // 親科目名を取得するヘルパー関数
  const getParentAccountName = (account) => {
    if (account.parentAccountId) {
      // CF項目の場合は、regularItemsとcfItemsの両方から検索
      const allAccounts = financialModel.accounts.getAllAccounts();
      const parentAccount = allAccounts.find(
        (acc) => acc.id === account.parentAccountId
      );
      if (parentAccount) {
        return parentAccount.accountName;
      }
    }
    return ""; // 親科目が見つからない場合
  };

  // タブに応じたデータをフィルタリング
  let filteredAccounts;

  if (tabName === "CF") {
    // CF項目は既に取得済みなのでそのまま使用（現預金計算科目は除外）
    filteredAccounts = accounts.filter(
      (account) => !AccountUtils.isCashCalcAccount(account)
    );
  } else if (tabName === "CASH_CALC") {
    // 現預金計算科目は既にフィルタリング済みなのでそのまま使用
    // 表示順序でソート
    filteredAccounts = accounts.sort((a, b) => {
      const orderA = a.displayOrder?.order || "";
      const orderB = b.displayOrder?.order || "";
      return orderA.localeCompare(orderB);
    });
  } else {
    // 通常項目のフィルタリング
    filteredAccounts = accounts.filter((account) => {
      switch (tabName) {
        case "PL":
          return (
            account.sheet?.name === FLOW_SHEETS.PL ||
            account.sheetType?.sheet === "PL"
          );
        case "BS":
          return (
            account.sheet?.name === STOCK_SHEETS.BS ||
            account.sheetType?.sheet === "BS"
          );
        case "CAPEX":
          return (
            account.sheet?.name === FLOW_SHEETS.PPE ||
            account.sheetType?.sheet === "CAPEX"
          );
        case "パラメータ":
          return true; // 通常項目は全て対象
        case "リレーション":
          const paramReferences = getParameterReferences(account);
          return Array.isArray(paramReferences) && paramReferences.length > 0;
        default:
          return false;
      }
    });
  }

  // データを整形
  return filteredAccounts.map((account) => {
    const row = [account.accountName];

    if (tabName === "パラメータ") {
      row.push(
        getParentAccountName(account),
        getParameterType(account),
        account.isReferenced ? "○" : "",
        "", // リレーションタイプ（削除済み）
        "", // リレーション詳細（削除済み）
        "" // 計算タイプ（削除済み）
      );
    } else if (tabName === "リレーション") {
      const refAccounts = getParameterReferences(account);
      row.push(
        account.accountName,
        refAccounts[0]?.accountId || refAccounts[0]?.id || "",
        refAccounts[1]?.accountId || refAccounts[1]?.id || ""
      );
    } else {
      // 通常のタブの場合、期間ごとの値を追加
      periods.forEach((period) => {
        const value = values.find(
          (v) => v.accountId === account.id && v.periodId === period.id
        );
        row.push(value?.value || 0);
      });
    }

    return row;
  });
};

// 現預金計算データを取得するためのヘルパー関数
export const getCashCalculationData = (financialModel) => {
  return getFilteredDataByTab("CASH_CALC", financialModel);
};
