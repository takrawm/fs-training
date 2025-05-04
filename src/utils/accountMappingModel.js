import { SUMMARY_ACCOUNTS, DEFAULT_SHEET_TYPES } from "./constants";
import {
  createAccountValues,
  createAggregatedValueForDisplay,
  getFilteredDataByTab,
  getInitialSheetData,
} from "./financialCalculations";

/**
 * 初期マッピングデータを生成する
 * @param {Array} flattenedRows フラット化されたデータ行
 * @returns {Array} 初期マッピングデータ
 */
export const createInitialMappingData = (flattenedRows) => {
  if (!flattenedRows || flattenedRows.length === 0) return [];

  return flattenedRows.map((row, idx) => {
    const name = row[0]?.toString().trim();
    return {
      id: `row-${idx}`,
      originalAccount: name,
      modelAccount: name,
    };
  });
};

/**
 * 集計マップを生成する
 * @param {Array} flattenedRows フラット化されたデータ行
 * @param {Array} mappingData マッピングデータ
 * @returns {Object} 集計マップ
 */
export const createAggregatedMap = (flattenedRows, mappingData) => {
  const newAggregatedMap = {};

  flattenedRows.forEach((row, idx) => {
    // 各行のモデル勘定科目を取得（設定されていない場合は元の科目名を使用）
    const key = mappingData[idx]?.modelAccount || row[0];
    if (!key) return; // キーが空の場合はスキップ

    // 先頭要素（科目名）を除いた数値部分を抜き出し、文字列や null を数値にキャスト、空値は 0 に変換
    const values = row.slice(1).map((v) => Number(v) || 0);

    if (!newAggregatedMap[key]) {
      // 初めて出現した科目の場合
      // DEFAULT_SHEET_TYPESから該当科目のマッピング情報を取得
      const defaultMapping = DEFAULT_SHEET_TYPES[key] || {
        sheetType: "",
        parentAccount: "",
        parameterType: "NONE",
        relation: { type: "NONE", subType: null },
      };

      newAggregatedMap[key] = {
        id: `account-${Object.keys(newAggregatedMap).length}`,
        accountName: key,
        // DEFAULT_SHEET_TYPESの情報を反映
        sheetType: defaultMapping.sheetType || "",
        parentAccount: defaultMapping.parentAccount || "",
        parameterType: defaultMapping.parameterType || "",
        isParameterReference: false,
        relation: {
          type: defaultMapping.relation.type,
          subType: defaultMapping.relation.subType,
        },
        values: [...values],
      };
    } else {
      // 既に同じ科目が存在する場合、値を合算
      newAggregatedMap[key].values = newAggregatedMap[key].values.map(
        (sum, i) => sum + (values[i] || 0)
      );
    }
  });

  return newAggregatedMap;
};

/**
 * 集計アカウントを生成する
 * @param {Object} aggregatedMap 集計マップ
 * @returns {Array} 集計アカウント配列
 */
export const createAggregatedAccounts = (aggregatedMap) => {
  return Object.values(aggregatedMap).map(({ values, ...rest }) => {
    const account = { ...rest };

    // relationの値がない場合は初期化
    if (!account.relation) {
      account.relation = { type: "NONE", subType: null };
    } else if (typeof account.relation !== "object") {
      // 古い形式から新しい形式に変換
      account.relation = { type: "NONE", subType: null };
    }

    return account;
  });
};

/**
 * 表示用の集計値配列を生成する
 * @param {Array} aggregatedAccounts 集計アカウント配列
 * @param {Object} aggregatedMap 集計マップ
 * @returns {Array} 表示用集計値配列
 */
export const createAggregatedValue = (aggregatedAccounts, aggregatedMap) => {
  return aggregatedAccounts.map((item) => [
    item.accountName,
    ...(aggregatedMap[item.accountName]?.values || []),
  ]);
};

/**
 * 最終的なアカウントリストを生成する (orderを付与し、サマリーアカウントを追加)
 * @param {Array} accounts アカウント配列
 * @returns {Array} 最終的なアカウント配列
 */
export const createFinalAccounts = (accounts) => {
  console.log("createFinalAccounts入力:", accounts);

  // パラメータプロパティを持つアカウントを確認
  const accountsWithParams = accounts.filter((account) => account.parameter);
  console.log("パラメータを持つアカウント:", accountsWithParams);

  // parentAccountが""のaccountを除外し、calculationTypeをnullに設定
  const filteredAccounts = accounts
    .filter((account) => account.parentAccount !== "")
    .map((account) => {
      // 変換前の値をログ出力
      if (account.parameter) {
        console.log(
          `アカウント「${account.accountName}」のパラメータ設定:`,
          account.parameter
        );
      }

      // 新しいオブジェクトを作成し、parameterプロパティを確実に含める
      return {
        ...account,
        calculationType: null,
        parameter: account.parameter || null,
      };
    });

  // パラメータプロパティを持つフィルタリング済みアカウントを確認
  const filteredWithParams = filteredAccounts.filter(
    (account) => account.parameter
  );
  console.log("フィルタリング後パラメータ付きアカウント:", filteredWithParams);

  // 親科目ごとのプレフィックスマップを作成
  const prefixMap = {};
  Object.entries(SUMMARY_ACCOUNTS).forEach(([key, account]) => {
    // prefixプロパティを使用
    prefixMap[account.accountName] = account.prefix;
  });

  // 親科目ごとのカウンタを初期化
  const counterMap = {};

  // 親科目別に子アカウントにプレフィックス + カウンタのorderを設定
  const accountsWithOrder = filteredAccounts.map((account) => {
    const parentAccount = account.parentAccount;
    if (!parentAccount) return account; // 親科目がない場合はそのまま

    // 親科目のプレフィックスを取得
    const prefix = prefixMap[parentAccount];
    if (!prefix) return account; // プレフィックスがない場合はそのまま

    // 親科目ごとのカウンタを更新
    counterMap[parentAccount] = (counterMap[parentAccount] || 0) + 1;

    // orderを設定: プレフィックス + カウンタ (例: A1, A2, ...)
    return {
      ...account,
      order: `${prefix}${counterMap[parentAccount]}`,
    };
  });

  // パラメータプロパティを持つアカウント（順序付き）を確認
  const orderedWithParams = accountsWithOrder.filter(
    (account) => account.parameter
  );
  console.log("順序付与後パラメータ付きアカウント:", orderedWithParams);

  // SUMMARY_ACCOUNTSを追加し、calculationTypeを元の定義から取得して設定
  const finalAccounts = [...accountsWithOrder];
  Object.values(SUMMARY_ACCOUNTS).forEach((summaryAccount) => {
    finalAccounts.push({
      ...summaryAccount,
      order: summaryAccount.order,
      calculationType: summaryAccount.calculationType,
    });
  });

  // orderでソート
  finalAccounts.sort((a, b) => {
    if (!a.order) return 1;
    if (!b.order) return -1;
    if (a.order < b.order) return -1;
    if (a.order > b.order) return 1;
    return 0;
  });

  // 最終的なfinalAccountsでパラメータを持つものを確認
  const finalWithParams = finalAccounts.filter((account) => account.parameter);
  console.log("最終的なパラメータ付きアカウント:", finalWithParams);

  return finalAccounts;
};

/**
 * 期間情報を生成する
 * @param {Object} flattenedData フラット化されたデータ
 * @returns {Array} 期間情報配列
 */
export const createPeriods = (flattenedData) => {
  const newPeriods = [];
  if (flattenedData?.headerRow && flattenedData.headerRow.length > 0) {
    flattenedData.headerRow.forEach((year, index) => {
      const currentYear = new Date().getFullYear();
      const isActual = Number(year) <= currentYear;
      newPeriods.push({
        id: `p-${year}`,
        year,
        isActual,
        isFromExcel: true,
        order: index + 1,
      });
    });
  }
  return newPeriods;
};

// 以下の関数はfinancialCalculations.jsに移動したので、エクスポートのみ行う
export {
  createAccountValues,
  createAggregatedValueForDisplay,
  getFilteredDataByTab,
  getInitialSheetData,
};
