import { FLOW_SHEETS, STOCK_SHEETS, PARAMETER_TYPES } from "../utils/constants";
import { ParameterUtils } from "../utils/parameterUtils";

/**
 * タブに基づいてフィルタリングされたデータを生成する
 * @param {string} tabName タブ名
 * @param {Object} financialModel 財務モデル
 * @returns {Array} フィルタリングされたデータ
 */
export const getFilteredDataByTab = (tabName, financialModel) => {
  const { accounts, periods, values } = financialModel;

  // ParameterUtilsを使用してヘルパー関数を統一
  const getParameterType = (account) =>
    ParameterUtils.getParameterType(account);
  const getParameterReferences = (account) =>
    ParameterUtils.getParameterReferences(account);

  // 親科目名を取得するヘルパー関数
  const getParentAccountName = (account) => {
    // 新しい構造での親科目ID
    if (account.parentAccountId) {
      const parentAccount = accounts.find(
        (acc) => acc.id === account.parentAccountId
      );
      if (parentAccount) {
        return parentAccount.accountName;
      }
    }
    return account.parentAccount || ""; // 旧形式との互換性
  };

  // タブに応じたデータをフィルタリング
  const filteredAccounts = accounts.filter((account) => {
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
      case "CF":
        return (
          account.sheet?.name === FLOW_SHEETS.FINANCING ||
          account.sheetType?.sheet === "CF"
        );
      case "パラメータ":
        return true;
      case "リレーション":
        const paramReferences = getParameterReferences(account);
        return Array.isArray(paramReferences) && paramReferences.length > 0;
      default:
        return false;
    }
  });

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
