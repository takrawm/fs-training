import { SUMMARY_ACCOUNTS, DEFAULT_SHEET_TYPES } from "../utils/constants";

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
// mappingDataとしてオブジェクトの配列が返る
// [
// {id: 'row-0', originalAccount: '商品売上', modelAccount: '商品売上'},
// {id: 'row-1', originalAccount: 'サービス売上', modelAccount: 'サービス売上'}
// ...
// ]

/**
 * 集計マップを生成する
 * @param {Array} flattenedRows フラット化されたデータ行
 * @param {Array} mappingData マッピングデータ
 * @returns {Object} 集計マップ
 */
export const createAggregatedMap = (flattenedRows, mappingData) => {
  const newAggregatedMap = {};

  flattenedRows.forEach((row, idx) => {
    const key = mappingData[idx]?.modelAccount || row[0];
    if (!key) return;

    const values = row.slice(1).map((v) => Number(v) || 0);

    if (!newAggregatedMap[key]) {
      const defaultMapping = DEFAULT_SHEET_TYPES[key] || {
        sheetType: { sheet: "", attribute: null },
        parentAccount: "",
        parameterType: "NONE",
      };

      newAggregatedMap[key] = {
        id: `account-${Object.keys(newAggregatedMap).length}`,
        accountName: key,
        sheetType: defaultMapping.sheetType || { sheet: "", attribute: null },
        parentAccount: defaultMapping.parentAccount || "",
        parameterType: defaultMapping.parameterType,
        parameterValue: defaultMapping.parameterValue,
        parameterReferenceAccounts:
          defaultMapping.parameterReferenceAccounts || [],
        values: [...values],
      };
    } else {
      newAggregatedMap[key].values = newAggregatedMap[key].values.map(
        (sum, i) => sum + (values[i] || 0)
      );
    }
  });

  return newAggregatedMap;
};

/**
 * ソートされたアカウントリストを生成する
 * @param {Array} accounts アカウント配列
 * @returns {Array} ソートされたアカウント配列
 */
export const createSortedAccounts = (accounts) => {
  const filteredAccounts = accounts
    .filter((account) => account.parentAccount !== "集約科目")
    .map((account) => ({
      ...account,
    }));

  const prefixMap = {};
  Object.values(SUMMARY_ACCOUNTS).forEach((account) => {
    prefixMap[account.accountName] = account.prefix;
  });

  const counterMap = {};

  const accountsWithOrder = filteredAccounts.map((account) => {
    const parentAccount = account.parentAccount;
    if (!parentAccount) return account;

    const prefix = prefixMap[parentAccount];
    if (!prefix) return account;

    counterMap[parentAccount] = (counterMap[parentAccount] || 0) + 1;

    return {
      ...account,
      order: `${prefix}${counterMap[parentAccount]}`,
    };
  });

  const sortedAccounts = [...accountsWithOrder];
  Object.values(SUMMARY_ACCOUNTS).forEach((summaryAccount) => {
    if (sortedAccounts.some((account) => account.id === summaryAccount.id)) {
      return;
    }

    sortedAccounts.push({
      ...summaryAccount,
      order: summaryAccount.order,
    });
  });

  sortedAccounts.sort((a, b) => {
    if (!a.order) return 1;
    if (!b.order) return -1;
    if (a.order < b.order) return -1;
    if (a.order > b.order) return 1;
    return 0;
  });

  return sortedAccounts;
};
