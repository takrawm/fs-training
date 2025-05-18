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
        sheetType: "",
        parentAccount: "",
        parameterType: "NONE",
        relation: { type: "NONE", subType: null },
      };

      newAggregatedMap[key] = {
        id: `account-${Object.keys(newAggregatedMap).length}`,
        accountName: key,
        sheetType: defaultMapping.sheetType || "",
        parentAccount: defaultMapping.parentAccount || "",
        parameterType: defaultMapping.parameterType || "",
        parameterReferenceAccounts: defaultMapping.defaultRelationAccount
          ? [defaultMapping.defaultRelationAccount]
          : [],
        relation: {
          type: defaultMapping.relation.type,
          subType: defaultMapping.relation.subType,
        },
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
 * 集計アカウントを生成する
 * @param {Object} aggregatedMap 集計マップ
 * @returns {Array} 集計アカウント配列
 */
export const createAggregatedAccounts = (aggregatedMap) => {
  return Object.values(aggregatedMap).map(({ values, ...rest }) => {
    const account = { ...rest };

    if (!account.relation) {
      account.relation = { type: "NONE", subType: null };
    } else if (typeof account.relation !== "object") {
      account.relation = { type: "NONE", subType: null };
    }

    return account;
  });
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
      calculationType: null,
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
      calculationType: summaryAccount.calculationType,
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
