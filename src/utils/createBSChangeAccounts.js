import {
  PARAMETER_TYPES,
  OPERATIONS,
  SHEET_TYPES,
  FLOW_SHEETS,
  BS_TYPES,
} from "./constants";
import { AccountUtils } from "./accountUtils.js";

/**
 * BS変動項目を自動生成する
 * @param {Array} accounts - 全アカウント配列
 * @returns {Array} 生成されたBS変動項目の配列
 */
export const createBSChangeAccounts = (accounts) => {
  const bsChangeAccounts = [];

  // パラメータベースのBS科目を抽出（現預金以外）
  const bsAccounts = accounts.filter(
    (acc) =>
      AccountUtils.isStockAccount(acc) &&
      acc.stockAttributes?.isParameterBased === true &&
      acc.stockAttributes?.bsType !== BS_TYPES.CASH
  );

  // 資産項目と負債項目を分けて処理
  const assetAccounts = bsAccounts.filter(
    (acc) => acc.stockAttributes.bsType === BS_TYPES.ASSET
  );
  const liabilityAccounts = bsAccounts.filter(
    (acc) => acc.stockAttributes.bsType === BS_TYPES.LIABILITY_EQUITY
  );

  // 資産変動項目の作成
  assetAccounts.forEach((account, index) => {
    bsChangeAccounts.push({
      id: `cf-asset-change-${account.id}`,
      accountName: `${account.accountName}の増減`,
      parentAccountId: "cf-wc-asset-total", // 運転資本（資産）小計
      sheet: {
        sheetType: SHEET_TYPES.FLOW,
        name: FLOW_SHEETS.FINANCING,
      },
      stockAttributes: null,
      flowAttributes: {
        parameter: {
          paramType: PARAMETER_TYPES.BS_CHANGE,
          paramValue: null,
          paramReferences: {
            accountId: account.id,
            operation: OPERATIONS.SUB, // 資産増加はCFマイナス
            lag: 0,
          },
        },
        cfAdjustment: null,
      },
      displayOrder: {
        order: `CF2${index + 1}`,
        prefix: "CF",
      },
    });
  });

  // 負債変動項目の作成
  liabilityAccounts.forEach((account, index) => {
    bsChangeAccounts.push({
      id: `cf-liability-change-${account.id}`,
      accountName: `${account.accountName}の増減`,
      parentAccountId: "cf-wc-liability-total", // 運転資本（負債）小計
      sheet: {
        sheetType: SHEET_TYPES.FLOW,
        name: FLOW_SHEETS.FINANCING,
      },
      stockAttributes: null,
      flowAttributes: {
        parameter: {
          paramType: PARAMETER_TYPES.BS_CHANGE,
          paramValue: null,
          paramReferences: {
            accountId: account.id,
            operation: OPERATIONS.ADD, // 負債増加はCFプラス
            lag: 0,
          },
        },
        cfAdjustment: null,
      },
      displayOrder: {
        order: `CF3${index + 1}`,
        prefix: "CF",
      },
    });
  });

  return bsChangeAccounts;
};
