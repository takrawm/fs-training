import {
  SUMMARY_ACCOUNTS,
  DEFAULT_SHEET_TYPES,
  SHEET_TYPES,
} from "../utils/constants";
import { AccountUtils } from "../utils/accountUtils";

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
 * 集計マップを生成する（改善版）
 * @param {Array} flattenedRows フラット化されたデータ行
 * @param {Array} mappingData マッピングデータ
 * @returns {Object} 集計マップ
 */
export const createAggregatedMap = (flattenedRows, mappingData) => {
  const newAggregatedMap = {};
  let accountCounter = 0;

  flattenedRows.forEach((row, idx) => {
    // 1. マッピング変換
    const key = mappingData[idx]?.modelAccount || row[0];
    if (!key) return;

    // 2. 数値変換
    const values = row.slice(1).map((v) => Number(v) || 0);

    if (!newAggregatedMap[key]) {
      // 3. constants.jsからテンプレートを取得
      const template = DEFAULT_SHEET_TYPES[key];

      if (!template) {
        console.warn(`未定義の勘定科目: ${key}`);
        return;
      }

      // 4. テンプレートから実際のアカウントを作成（最小限の変更のみ）
      const account = {
        ...template, // constants.jsの構造をそのまま使用
        id: `account-${accountCounter++}`, // 動的IDのみ追加
        accountName: key, // 実際の科目名
        values: [...values], // 実際の値
      };

      newAggregatedMap[key] = account;
    } else {
      // 5. 重複時の集計処理
      newAggregatedMap[key].values = newAggregatedMap[key].values.map(
        (sum, i) => sum + (values[i] || 0)
      );
    }
  });

  return newAggregatedMap;
};

/**
 * ソートされたアカウントリストを生成する（改善版）
 * @param {Array} accounts アカウント配列
 * @returns {Array} ソートされたアカウント配列
 */
export const createSortedAccounts = (accounts) => {
  const filteredAccounts = accounts
    .filter((account) => account.parentAccountId !== null)
    .map((account) => ({
      ...account,
    }));

  const prefixMap = {};
  Object.values(SUMMARY_ACCOUNTS).forEach((account) => {
    prefixMap[account.accountName] = account.displayOrder.prefix;
  });

  const counterMap = {};

  // displayOrderを設定
  const accountsWithOrder = filteredAccounts.map((account) => {
    // 親科目名を取得（親科目IDから逆引き）
    let parentAccountName = null;
    if (account.parentAccountId) {
      const parentAccount = Object.values(SUMMARY_ACCOUNTS).find(
        (summary) => summary.id === account.parentAccountId
      );
      if (parentAccount) {
        parentAccountName = parentAccount.accountName;
      }
    }

    if (!parentAccountName) return account;

    const prefix = prefixMap[parentAccountName];
    if (!prefix) return account;

    counterMap[parentAccountName] = (counterMap[parentAccountName] || 0) + 1;

    return {
      ...account,
      displayOrder: {
        order: `${prefix}${counterMap[parentAccountName]}`,
        prefix: prefix,
      },
    };
  });

  // 集計科目を追加
  const sortedAccounts = [...accountsWithOrder];
  Object.values(SUMMARY_ACCOUNTS).forEach((summaryAccount) => {
    if (sortedAccounts.some((account) => account.id === summaryAccount.id)) {
      return;
    }

    sortedAccounts.push({
      ...summaryAccount,
      sheetType: { sheet: summaryAccount.sheet.name, attribute: null },
      parentAccount: "SUMMARY_ACCOUNTS",
    });
  });

  // ソート実行
  sortedAccounts.sort((a, b) => {
    const orderA = a.displayOrder?.order || a.order;
    const orderB = b.displayOrder?.order || b.order;

    if (!orderA) return 1;
    if (!orderB) return -1;
    if (orderA < orderB) return -1;
    if (orderA > orderB) return 1;
    return 0;
  });

  return sortedAccounts;
};
