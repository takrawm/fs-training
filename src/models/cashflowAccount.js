/**
 * 営業キャッシュフロー計算用のアカウントを生成する
 * @param {Object} account - 元となるアカウント
 * @returns {Object} キャッシュフロー計算用のアカウント
 */
export const createCashflowAccount = (account) => {
  // キャッシュフロー計算用のアカウントを生成
  return {
    id: `cfAccount-${account.id}`,
    accountName: account.accountName,
    parameterType: null,
    parameterValue: null,
    parentAccount: null,
    sheetType: {
      sheet: "CF",
      attribute: "operatingCashflow",
    },
    order: null,
    // 元のアカウントの参照情報を保持
    parameterReferenceAccounts: account.parameterReferenceAccounts,
  };
};
