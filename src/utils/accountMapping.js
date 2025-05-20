/**
 * 科目IDと科目名のマッピングを作成する
 * @param {Array} accounts アカウント配列
 * @returns {Object} 科目IDと科目名のマッピング
 */
export const createAccountMap = (accounts) => {
  return accounts.reduce((map, account) => {
    map[account.id] = account.accountName;
    return map;
  }, {});
};
