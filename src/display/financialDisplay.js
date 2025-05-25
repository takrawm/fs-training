/**
 * タブに基づいてフィルタリングされたデータを生成する
 * @param {string} tabName タブ名
 * @param {Object} financialModel 財務モデル
 * @returns {Array} フィルタリングされたデータ
 */
export const getFilteredDataByTab = (tabName, financialModel) => {
  const { accounts, periods, values } = financialModel;

  // タブに応じたデータをフィルタリング
  const filteredAccounts = accounts.filter((account) => {
    switch (tabName) {
      case "PL":
        return account.sheetType === "PL";
      case "BS":
        return account.sheetType === "BS";
      case "CAPEX":
        return account.sheetType === "CAPEX";
      case "CF":
        return account.sheetType === "CF";
      case "パラメータ":
        return true;
      case "リレーション":
        return account.parameterReferenceAccounts?.length > 0;
      default:
        return false;
    }
  });

  // データを整形
  return filteredAccounts.map((account) => {
    const row = [account.accountName];

    if (tabName === "パラメータ") {
      row.push(
        account.parentAccount || "",
        account.parameterType || "",
        account.parameterReferenceAccounts?.length > 0 ? "あり" : "なし",
        account.calculationType || ""
      );
    } else if (tabName === "リレーション") {
      const refAccounts = account.parameterReferenceAccounts || [];
      row.push(
        account.accountName,
        refAccounts[0]?.id || "",
        refAccounts[1]?.id || ""
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
