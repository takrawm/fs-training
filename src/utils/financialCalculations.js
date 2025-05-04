import { SUMMARY_ACCOUNTS } from "./constants";
import { getCalculationOrder } from "./dependencyCalculation";

/**
 * 勘定科目と期間に紐づく値を生成する
 * @param {Object} aggregatedMap 集計マップ
 * @param {Array} periods 期間配列
 * @param {Array} finalAccounts 最終的なアカウント配列
 * @returns {Array} アカウント値配列
 */
export const createAccountValues = (aggregatedMap, periods, finalAccounts) => {
  // valuesを入れる空配列を用意
  const accountValues = [];

  // 通常アカウントのvalueを追加
  Object.entries(aggregatedMap).forEach(([accountName, account]) => {
    // 列ごとの値を処理
    account.values.forEach((value, index) => {
      if (index >= periods.length) return; // 期間数を超える場合はスキップ

      accountValues.push({
        accountId: account.id,
        periodId: periods[index].id,
        value: value,
        isCalculated: false,
      });
    });
  });

  // トポロジカルソートを使用して計算順序を決定
  const calculationOrder = getCalculationOrder(finalAccounts);

  // 親子関係のマップを作成
  const parentChildMap = createParentChildMap(finalAccounts);

  // 計算順序に従って値を計算
  calculationOrder.forEach((accountId) => {
    const summaryAccount = finalAccounts.find((a) => a.id === accountId);
    if (!summaryAccount) return;

    if (summaryAccount.calculationType === "CHILDREN_SUM") {
      // 子アカウントの合計を求めるアカウント
      // 各期間についてSUMMARY_ACCOUNTの値を計算
      periods.forEach((period) => {
        const sumValue = calculateSummaryAccountValue(
          summaryAccount,
          period,
          parentChildMap,
          accountValues
        );

        // SUMMARY_ACCOUNTの値を追加
        accountValues.push({
          accountId: summaryAccount.id,
          periodId: period.id,
          value: sumValue,
          isCalculated: true,
        });
      });
    } else if (summaryAccount.calculationType === "ACCOUNT_CALC") {
      // 特殊計算式を持つアカウント（例: 売上総利益、営業利益）
      periods.forEach((period) => {
        const calculatedValue = calculateSpecialAccount(
          summaryAccount,
          period,
          accountValues,
          finalAccounts
        );

        // 計算値を追加
        accountValues.push({
          accountId: summaryAccount.id,
          periodId: period.id,
          value: calculatedValue,
          isCalculated: true,
        });
      });
    }
  });

  return accountValues;
};

/**
 * 親子関係のマップを作成する
 * @param {Array} accounts アカウント配列
 * @returns {Object} 親子関係のマップ
 */
const createParentChildMap = (accounts) => {
  const parentChildMap = {};
  accounts.forEach((account) => {
    if (account.parentAccount) {
      parentChildMap[account.parentAccount] =
        parentChildMap[account.parentAccount] || [];
      parentChildMap[account.parentAccount].push(account.id);
    }
  });
  return parentChildMap;
};

/**
 * 依存関係に基づいてソートされたSUMMARY_ACCOUNTSを取得する
 * @returns {Array} ソートされたSUMMARY_ACCOUNTS配列
 */
export const getSortedSummaryAccounts = () => {
  const summaryAccountsArray = Object.values(SUMMARY_ACCOUNTS);

  // トポロジカルソートを利用して依存関係でソート
  return getCalculationOrder(summaryAccountsArray);
};

/**
 * サマリーアカウントの値を計算する
 * @param {Object} summaryAccount サマリーアカウント
 * @param {Object} period 期間
 * @param {Object} parentChildMap 親子関係のマップ
 * @param {Array} accountValues アカウント値配列
 * @returns {number} 計算された値
 */
const calculateSummaryAccountValue = (
  summaryAccount,
  period,
  parentChildMap,
  accountValues
) => {
  let sumValue = 0;
  const childAccounts = parentChildMap[summaryAccount.accountName] || [];

  // 子アカウントの値を合計
  childAccounts.forEach((childId) => {
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
 * 表示用の最終集計値を生成する
 * @param {Array} finalAccounts 最終的なアカウント配列
 * @param {Array} periods 期間配列
 * @param {Array} accountValues アカウント値配列
 * @returns {Array} 表示用最終集計値配列
 */
export const createAggregatedValueForDisplay = (
  finalAccounts,
  periods,
  accountValues
) => {
  return finalAccounts.map((account) => {
    const valuesRow = periods.map((p) => {
      const v = accountValues.find(
        (av) => av.accountId === account.id && av.periodId === p.id
      );
      const raw = v ? v.value : 0;
      return Math.trunc(raw);
    });
    return [account.accountName, ...valuesRow];
  });
};

/**
 * タブに基づいてフィルタリングされたデータを生成する
 * @param {string} tabName タブ名
 * @param {Array} aggregatedValue 集計値配列
 * @param {Array} accounts アカウント配列
 * @returns {Array} フィルタリングされたデータ
 */
export const getFilteredDataByTab = (tabName, aggregatedValue, accounts) => {
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

  // タブに該当する勘定科目のみをフィルタリング
  return aggregatedValue.filter((row) => {
    const accountName = row[0];
    const account = accounts.find((acc) => acc.accountName === accountName);
    return account && account.sheetType === tabName;
  });
};

/**
 * 特定のシートタイプのデータを取得する (初期表示用)
 * @param {string} sheetType シートタイプ
 * @param {Array} aggregatedValueForDisplay 表示用集計値配列
 * @param {Array} finalAccounts 最終的なアカウント配列
 * @returns {Array} フィルタリングされたデータ
 */
export const getInitialSheetData = (
  sheetType,
  aggregatedValueForDisplay,
  finalAccounts
) => {
  return aggregatedValueForDisplay.filter((row) => {
    const accountName = row[0];
    const account = finalAccounts.find(
      (acc) => acc.accountName === accountName
    );
    return account && account.sheetType === sheetType;
  });
};

/**
 * 財務モデルを作成する関数
 * @param {Array} accounts 勘定科目の定義
 * @param {Array} periods 期間情報
 * @param {Array} values 勘定科目と期間に紐づく値
 * @returns {Object} 統合された財務モデル
 */
export const createFinancialModel = (accounts, periods, values) => {
  return {
    accounts,
    periods,
    values,
  };
};

/**
 * 財務モデルから表示用データを生成する
 * @param {Object} model 財務モデル
 * @returns {Object} 表示用データ
 */
export const createDisplayDataFromModel = (model) => {
  const { accounts, periods, values } = model;
  return createAggregatedValueForDisplay(accounts, periods, values);
};

/**
 * 期間を1年追加し、新しい期間の値を計算する
 * @param {Object} model 財務モデル
 * @returns {Object} 更新された財務モデル
 */
export const addNewPeriodToModel = (model) => {
  // モデルのディープコピーを作成
  const updatedModel = {
    accounts: [...model.accounts],
    periods: [...model.periods],
    values: [...model.values],
  };

  // 最後の期間を取得
  const lastPeriod = updatedModel.periods[updatedModel.periods.length - 1];
  const lastYear = parseInt(lastPeriod.year, 10);

  // 新しい期間を作成
  const newYear = lastYear + 1;
  const newPeriod = {
    id: `p-${newYear}`,
    year: newYear.toString(),
    isActual: false, // 将来の期間は実績ではなく予測
    isFromExcel: false, // ExcelからではなくシステムによるSimulation
    order: lastPeriod.order + 1,
  };

  // 期間配列に新しい期間を追加
  updatedModel.periods.push(newPeriod);

  // トポロジカルソートを使って計算順序を決定
  const calculationOrder = getCalculationOrder(updatedModel.accounts);

  // 計算順序に従って値を順次計算
  calculationOrder.forEach((accountId) => {
    const account = updatedModel.accounts.find((a) => a.id === accountId);
    if (!account) return;

    if (account.calculationType === null) {
      // 通常アカウント: パラメータとリレーションに基づいて値を計算
      const newValue = calculateAccountValueForNewPeriod(
        account,
        newPeriod,
        lastPeriod,
        updatedModel.values,
        updatedModel.accounts
      );

      // 計算した値をvalues配列に追加
      updatedModel.values.push({
        accountId: account.id,
        periodId: newPeriod.id,
        value: newValue,
        isCalculated: false,
      });
    } else if (account.calculationType === "CHILDREN_SUM") {
      // 子アカウントの合計を求めるアカウント
      // 注: 依存関係の順序が正しく設定されていれば、
      // この時点で子アカウントの値は既に計算済み

      const childAccounts = updatedModel.accounts.filter(
        (a) => a.parentAccount === account.accountName
      );

      let sumValue = 0;
      childAccounts.forEach((child) => {
        const childValue = updatedModel.values.find(
          (v) => v.accountId === child.id && v.periodId === newPeriod.id
        );
        if (childValue) {
          sumValue += childValue.value;
        }
      });

      updatedModel.values.push({
        accountId: account.id,
        periodId: newPeriod.id,
        value: sumValue,
        isCalculated: true,
      });
    } else if (account.calculationType === "ACCOUNT_CALC") {
      // 特定の計算式を持つアカウント（例: 売上総利益）
      // 依存するアカウントから計算

      const calculatedValue = calculateSpecialAccount(
        account,
        newPeriod,
        updatedModel.values,
        updatedModel.accounts
      );

      updatedModel.values.push({
        accountId: account.id,
        periodId: newPeriod.id,
        value: calculatedValue,
        isCalculated: true,
      });
    }
  });

  return updatedModel;
};

/**
 * 特殊計算を行うアカウントの値を計算する
 * @param {Object} account アカウント
 * @param {Object} period 期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
const calculateSpecialAccount = (account, period, values, accounts) => {
  // 売上総利益の計算（売上高合計 - 売上原価合計）
  if (account.accountName === "売上総利益") {
    const revTotal = accounts.find((a) => a.accountName === "売上高合計");
    const cogsTotal = accounts.find((a) => a.accountName === "売上原価合計");

    const revValue =
      values.find(
        (v) => v.accountId === revTotal?.id && v.periodId === period.id
      )?.value || 0;

    const cogsValue =
      values.find(
        (v) => v.accountId === cogsTotal?.id && v.periodId === period.id
      )?.value || 0;

    return revValue - cogsValue;
  }

  // 営業利益の計算（売上総利益 - 販管費合計）
  if (account.accountName === "営業利益") {
    const grossProfit = accounts.find((a) => a.accountName === "売上総利益");
    const sgaTotal = accounts.find((a) => a.accountName === "販管費合計");

    const grossProfitValue =
      values.find(
        (v) => v.accountId === grossProfit?.id && v.periodId === period.id
      )?.value || 0;

    const sgaValue =
      values.find(
        (v) => v.accountId === sgaTotal?.id && v.periodId === period.id
      )?.value || 0;

    return grossProfitValue - sgaValue;
  }

  // 汎用的な依存関係に基づく計算
  if (
    account.dependencies &&
    account.dependencies.depends_on &&
    account.dependencies.depends_on.length > 0
  ) {
    // 売上総利益と営業利益の一般的なケース: 最初の依存値から二番目の依存値を引く
    if (account.dependencies.depends_on.length === 2) {
      const firstDepId = account.dependencies.depends_on[0];
      const secondDepId = account.dependencies.depends_on[1];

      const firstValue =
        values.find(
          (v) => v.accountId === firstDepId && v.periodId === period.id
        )?.value || 0;

      const secondValue =
        values.find(
          (v) => v.accountId === secondDepId && v.periodId === period.id
        )?.value || 0;

      return firstValue - secondValue;
    }
  }

  // 他の特殊計算...
  return 0;
};

/**
 * アカウントの新しい期間の値をパラメータとリレーションに基づいて計算する
 * @param {Object} account アカウント
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 最後の期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
const calculateAccountValueForNewPeriod = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  // 前期の値を取得
  const lastPeriodValue =
    values.find(
      (v) => v.accountId === account.id && v.periodId === lastPeriod.id
    )?.value || 0;

  // パラメータタイプに基づいて値を計算
  switch (account.parameterType) {
    case "GROWTH_RATE":
      // 前期の値に成長率を適用
      const growthRate = account.parameter?.growthRate || 0.05; // デフォルト5%成長
      return lastPeriodValue * (1 + growthRate);

    case "PERCENTAGE":
      // 参照科目に対する割合として計算
      const percentage = account.parameter?.percentage || 0.1; // デフォルト10%

      // 参照科目を特定（例：売上高合計）
      const referenceAccount = accounts.find((a) => a.isReferenceAccount);
      if (!referenceAccount) return lastPeriodValue;

      // 参照科目の新期間の値を取得（既に計算済みの前提）
      const referenceValue =
        values.find(
          (v) =>
            v.accountId === referenceAccount.id && v.periodId === newPeriod.id
        )?.value || 0;

      return referenceValue * percentage;

    case "FIXED_AMOUNT":
      // 固定金額
      return account.parameter?.fixedAmount || lastPeriodValue;

    case "NONE":
    default:
      // パラメータなしの場合は前期と同額
      return lastPeriodValue;
  }
};

/**
 * 集計値を計算する
 * @param {Array} values 値の配列
 * @returns {Array} 合計値の配列
 */
export const calculateSumValues = (values) => {
  if (!values || values.length === 0) return [];
  return values.map((sum, i) => sum + (values[i] || 0));
};
