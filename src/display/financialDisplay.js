/**
 * タブに基づいてフィルタリングされたデータを生成する
 * @param {string} tabName タブ名
 * @param {Object} financialModel 財務モデル
 * @returns {Array} フィルタリングされたデータ
 */
export const getFilteredDataByTab = (tabName, financialModel) => {
  const { accounts, periods, values, relationMaster } = financialModel;

  // パラメータタブの場合
  if (tabName === "パラメータ") {
    return accounts.map((account) => {
      return [
        account.accountName,
        account.parentAccount || "",
        account.parameterType || "NONE",
        account.isParameterReference ? "true" : "false",
        account.relation?.type || "NONE",
        account.relation?.subType || "",
        account.calculationType || "null",
      ];
    });
  }

  // リレーションタブの場合
  if (tabName === "リレーション") {
    const ppeData = [];
    const retainedEarningsData = [];
    const workingCapitalData = [];

    if (!relationMaster)
      return { ppeData, retainedEarningsData, workingCapitalData };

    // PP&E情報
    if (relationMaster.ppe?.relations?.length > 0) {
      relationMaster.ppe.relations.forEach((relation) => {
        ppeData.push([
          relation.asset.name,
          relation.investment?.name || "未設定",
          relation.depreciation?.name || "未設定",
        ]);
      });
    }

    // 利益剰余金情報
    if (relationMaster.retainedEarnings?.relation) {
      retainedEarningsData.push([
        relationMaster.retainedEarnings.relation.retained.name,
        relationMaster.retainedEarnings.relation.profit?.name || "未設定",
      ]);
    }

    // 運転資本情報
    if (relationMaster.workingCapital?.relations) {
      const assets = relationMaster.workingCapital.relations.assets || [];
      const liabilities =
        relationMaster.workingCapital.relations.liabilities || [];
      const maxLength = Math.max(assets.length, liabilities.length);

      for (let i = 0; i < maxLength; i++) {
        workingCapitalData.push([
          assets[i]?.name || "",
          liabilities[i]?.name || "",
        ]);
      }
    }

    return {
      ppeData,
      retainedEarningsData,
      workingCapitalData,
    };
  }

  // 財務3表示用のデータテーブルを生成
  const dataTable = [];

  // 各勘定科目について処理
  accounts.forEach((account) => {
    // 各行の配列を作成（最初の要素は勘定科目名）
    const row = [account.accountName];

    // 各期間の値を取得して配列に追加
    periods.forEach((period) => {
      // 該当する勘定科目と期間の値を検索
      const value = values.find(
        (v) => v.accountId === account.id && v.periodId === period.id
      );
      // 値が見つかった場合はその値、見つからない場合は0を追加
      row.push(value ? value.value : 0);
    });

    // 完成した行をdataTableに追加
    dataTable.push(row);
  });

  // タブに該当する勘定科目のみをフィルタリング
  return dataTable.filter((row) => {
    const accountName = row[0];
    const account = accounts.find((acc) => acc.accountName === accountName);
    return account && account.sheetType === tabName;
  });
};
