/**
 * 営業キャッシュフロー計算用のアカウントを生成する
 * @param {Array} accounts - 元となるアカウント配列
 * @returns {Array} キャッシュフロー計算用のアカウント配列
 */
export const creatingOperatingCashflow = (accounts) => {
  // キャッシュフロー計算対象のアカウントを抽出
  const targetAccounts = accounts.filter((account) => {
    // BS科目で、かつparameterReferenceAccountsを持つアカウントを抽出
    return (
      account.sheetType?.sheet === "BS" &&
      account.parameterReferenceAccounts?.length > 0
    );
  });

  // キャッシュフロー計算用のアカウントを生成
  return targetAccounts.map((account, index) => ({
    id: `cfAccount-${index + 1}`,
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
  }));
};
