import {
  SHEET_TYPES,
  FLOW_SHEETS,
  PARAMETER_TYPES,
  CF_CATEGORIES,
  OPERATIONS,
} from "../utils/constants";
import { AccountUtils } from "../utils/accountUtils.js";
import { CF_ITEM_TYPES } from "../utils/cfItemUtils.js";

/**
 * CF調整項目用のアカウントを生成する
 * @param {Object} sourceAccount - cfAdjustmentを持つ元のアカウント（PL項目など）
 * @param {number} order - 表示順序
 * @returns {Object} CF調整用アカウント
 */
export const createCFAdjustmentAccount = (sourceAccount, order = null) => {
  const cfAdj = AccountUtils.getCFAdjustment(sourceAccount);
  if (!cfAdj) {
    throw new Error("Source account does not have cfAdjustment");
  }

  // CF調整項目の名前を生成
  const accountName = `${sourceAccount.accountName}（非資金項目）`;

  return {
    id: `cf-adj-${sourceAccount.id}`,
    accountName: accountName,
    parentAccountId: getCFParentId(cfAdj.cfCategory),
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: null, // CF項目はparameterを持たない
      cfAdjustment: null, // これ自体がCF項目なので不要

      // 新しい仕様：cfItemAttributesを追加
      cfItemAttributes: {
        cfItemType: CF_ITEM_TYPES.PL_ADJUSTMENT,
        sourceAccount: {
          accountId: sourceAccount.id,
          accountName: sourceAccount.accountName,
          plCategory: "depreciation", // または適切なカテゴリ
        },
        cfImpact: {
          // PLでマイナス（費用）ならCFではプラス（加算）
          multiplier: cfAdj.operation === OPERATIONS.SUB ? 1 : -1,
        },
      },
    },
    displayOrder: {
      order: order ? `CF1${order.toString().padStart(2, "0")}` : null,
      prefix: "CF",
    },
  };
};

/**
 * BS変動項目用のアカウントを生成する
 * @param {Object} bsAccount - BS科目
 * @param {string} changeType - 'increase' or 'decrease'
 * @param {number} order - 表示順序
 * @returns {Object} BS変動用CFアカウント
 */
export const createBSChangeAccount = (bsAccount, changeType, order = null) => {
  if (!AccountUtils.isStockAccount(bsAccount)) {
    throw new Error("Account must be a stock account");
  }

  const accountName = `${bsAccount.accountName}の${
    changeType === "increase" ? "増加" : "減少"
  }`;
  const isCredit = bsAccount.isCredit;

  // 資産の増加はCFマイナス、負債の増加はCFプラス
  const operation = determineOperationForBSChange(isCredit, changeType);

  return {
    id: `cf-bs-${bsAccount.id}-${changeType}`,
    accountName: accountName,
    parentAccountId: "ope-cf-total", // 運転資本変動は営業CFに含まれる
    sheet: {
      sheetType: SHEET_TYPES.FLOW,
      name: FLOW_SHEETS.CF,
    },
    stockAttributes: null,
    flowAttributes: {
      parameter: {
        paramType: PARAMETER_TYPES.BS_CHANGE,
        paramValue: null,
        paramReferences: {
          accountId: bsAccount.id,
          operation: operation,
          lag: 0,
        },
      },
      cfAdjustment: {
        category: CF_CATEGORIES.OPERATING,
        sourceType: "WORKING_CAPITAL",
      },
    },
    displayOrder: {
      order: order ? `CF2${order.toString().padStart(2, "0")}` : null,
      prefix: "CF",
    },
  };
};

/**
 * CF区分に応じた親科目IDを取得する
 * @param {string} cfCategory - CF区分
 * @returns {string} 親科目ID
 */
const getCFParentId = (cfCategory) => {
  switch (cfCategory) {
    case CF_CATEGORIES.OPERATING:
      return "ope-cf-total";
    case CF_CATEGORIES.INVESTING:
      return "inv-cf-total";
    case CF_CATEGORIES.FINANCING:
      return "fin-cf-total";
    default:
      return "ope-cf-total";
  }
};

/**
 * BS変動のCF演算子を決定する
 * @param {boolean} isCredit - 貸方科目かどうか（false: 資産、true: 負債・純資産）
 * @param {string} changeType - 変動タイプ（increase/decrease）
 * @returns {string} 演算子
 */
const determineOperationForBSChange = (isCredit, changeType) => {
  if (isCredit === false) {
    // 資産の増加はCFマイナス、減少はプラス
    return changeType === "increase" ? OPERATIONS.SUB : OPERATIONS.ADD;
  } else {
    // 負債・資本の増加はCFプラス、減少はマイナス
    return changeType === "increase" ? OPERATIONS.ADD : OPERATIONS.SUB;
  }
};
