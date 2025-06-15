import {
  PARAMETER_TYPES,
  OPERATIONS,
  SHEET_TYPES,
  FLOW_SHEETS,
} from "./constants";
import { AccountUtils } from "./accountUtils.js";

/**
 * CF調整項目を自動生成する
 * @param {Array} accounts - 全アカウント配列
 * @returns {Array} 生成されたCF調整項目の配列
 */
export const createCFAdjustmentAccounts = (accounts) => {
  const cfAdjustmentAccounts = [];

  // cfAdjustmentを持つPL科目を探す
  const plAccountsWithCF = accounts.filter(
    (acc) =>
      AccountUtils.getCFAdjustment(acc) !== null &&
      AccountUtils.isFlowAccount(acc)
  );

  plAccountsWithCF.forEach((plAccount, index) => {
    const cfAdj = AccountUtils.getCFAdjustment(plAccount);

    // CF調整項目を作成
    const cfAccount = {
      id: `cf-adj-${plAccount.id}`,
      accountName: `${plAccount.accountName}（CF調整）`,
      parentAccountId: "ope-cf-total",
      sheet: {
        sheetType: SHEET_TYPES.FLOW,
        name: FLOW_SHEETS.FINANCING,
      },
      stockAttributes: null,
      flowAttributes: {
        parameter: {
          paramType: PARAMETER_TYPES.CF_ADJUSTMENT_CALC,
          paramValue: null,
          paramReferences: {
            accountId: plAccount.id,
            // 演算子を反転（重要！）
            operation:
              cfAdj.operation === OPERATIONS.SUB
                ? OPERATIONS.ADD
                : OPERATIONS.SUB,
            lag: 0,
          },
        },
        cfAdjustment: null,
      },
      displayOrder: {
        order: `CF1${index + 1}`,
        prefix: "CF",
      },
    };

    cfAdjustmentAccounts.push(cfAccount);
  });

  return cfAdjustmentAccounts;
};
