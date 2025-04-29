import { AccountType, ParameterType } from "../types/models.js";
import { SUMMARY_ACCOUNTS } from "./constants.js";

const {
  REVENUE_TOTAL,
  COGS_TOTAL,
  GROSS_PROFIT,
  SGA_TOTAL,
  OPERATING_PROFIT,
  CUR_ASSET_TOTAL,
  FIX_ASSET_TOTAL,
  ASSET_TOTAL,
  CUR_LIABILITY_TOTAL,
  FIX_LIABILITY_TOTAL,
  LIABILITY_TOTAL,
  EQUITY_TOTAL,
  LI_EQ_TOTAL,
  CAPEX_TOTAL,
  OPE_CF_TOTAL,
  INV_CF_TOTAL,
  CHANGE_CASH,
} = SUMMARY_ACCOUNTS;

/**
 * @return {string} ユニークID
 */
export function generateId() {
  return Math.random().toString(36).substring(2, 9);
}

/**
 * 指定された年の次の年を返す
 * @param {number} year - 基準となる年
 * @returns {number} - 1年後の年
 */
export function getNextYear(year) {
  return year + 1;
}

/**
 * 空の財務モデルを作成する
 * @returns {import('../types/models.js').FinancialModel}
 */
export function createEmptyFinancialModel() {
  const currentYear = new Date().getFullYear();

  return {
    metadata: {
      id: generateId(),
      name: "新規作成した財務モデル",
      description: "新しく作成された空の財務モデルです",
      lastModified: new Date(),
      version: 1,
    },
    accounts: [],
    periods: [
      {
        id: generateId(),
        year: currentYear - 2,
        month: null,
        isActual: true,
        isFromExcel: true,
        order: 1,
      },
      {
        id: generateId(),
        year: currentYear - 1,
        month: null,
        isActual: true,
        isFromExcel: true,
        order: 2,
      },
      {
        id: generateId(),
        year: currentYear,
        month: null,
        isActual: true,
        isFromExcel: true,
        order: 3,
      },
    ],
    values: [],
  };
}

/**
 * 期間の実績/計画フラグを更新する
 * @param {import('../types/models').Period[]} periods - 期間リスト
 * @returns {import('../types/models').Period[]} - 更新された期間リスト
 */
export function updatePeriodsActualFlag(periods) {
  const currentYear = new Date().getFullYear();
  return periods.map((period) => ({
    ...period,
    isActual: period.year <= currentYear,
  }));
}

/**
 * 勘定科目の親子関係を更新する
 * @param {import('../types/models').Account[]} accounts - 勘定科目リスト
 * @returns {import('../types/models').Account[]} - 更新された勘定科目リスト
 */
export function updateAccountParentIds(accounts) {
  let updatedAccounts = [...accounts];
  // すべてのシート（PL、BS、CAPEX、CS）の集計用勘定科目が存在するか確認します
  // 存在する場合は、定義を最新の状態（constants.jsのSUMMARY_ACCOUNTS）で上書き更新
  // 存在しない場合は新規に追加
  // ===== PL 関連の処理 =====
  // REVENUE_TOTAL処理
  const existingRevenueTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.REVENUE_TOTAL
  );
  if (existingRevenueTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.REVENUE_TOTAL
        ? // account.accountTypeがREVENUE_TOTALのaccountは、内容を定数のREVENUE_TOTALのオブジェクトに固定する
          //    {
          //   id: "rev-total",
          //   code: "A99",
          //   name: "売上高合計",
          //   accountType: AccountType.REVENUE_TOTAL,
          //   order: 99,
          //   parentId: null,
          //   aggregateMethod: "CHILDREN_SUM",
          //   parameter: null,
          //   sheetName: "PL",
          // },
          { ...REVENUE_TOTAL }
        : account
    );
  } else {
    // 新規追加
    updatedAccounts.unshift({ ...REVENUE_TOTAL });
  }

  // COGS_TOTAL処理
  const existingCogsTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.COGS_TOTAL
  );
  if (existingCogsTotal) {
    // 既存のアカウントを完全に置き換え
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.COGS_TOTAL
        ? { ...COGS_TOTAL }
        : account
    );
  } else {
    // 新規追加
    updatedAccounts.unshift({ ...COGS_TOTAL });
  }

  // GROSS_PROFIT処理
  const existingGrossProfit = updatedAccounts.find(
    (a) => a.accountType === AccountType.GROSS_MARGIN
  );
  if (existingGrossProfit) {
    // 既存のアカウントを完全に置き換え
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.GROSS_MARGIN
        ? { ...GROSS_PROFIT }
        : account
    );
  } else {
    // 新規追加
    updatedAccounts.unshift({ ...GROSS_PROFIT });
  }

  // SGA_TOTAL処理
  const existingSgaTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.SGA_TOTAL
  );
  if (existingSgaTotal) {
    // 既存のアカウントを完全に置き換え
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.SGA_TOTAL ? { ...SGA_TOTAL } : account
    );
  } else {
    // 新規追加
    updatedAccounts.unshift({ ...SGA_TOTAL });
  }

  // OPERATING_PROFIT処理
  const existingOperatingProfit = updatedAccounts.find(
    (a) => a.accountType === AccountType.OPERATING_PROFIT
  );
  if (existingOperatingProfit) {
    // 既存のアカウントを完全に置き換え
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.OPERATING_PROFIT
        ? { ...OPERATING_PROFIT }
        : account
    );
  } else {
    // 新規追加
    updatedAccounts.unshift({ ...OPERATING_PROFIT });
  }

  // ===== BS 関連の処理 =====
  // 流動資産合計
  const existingCurrentAssetTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.CUR_ASSET_TOTAL
  );
  if (existingCurrentAssetTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.CUR_ASSET_TOTAL
        ? { ...CUR_ASSET_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...CUR_ASSET_TOTAL });
  }

  // 固定資産合計
  const existingFixedAssetTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.FIX_ASSET_TOTAL
  );
  if (existingFixedAssetTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.FIX_ASSET_TOTAL
        ? { ...FIX_ASSET_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...FIX_ASSET_TOTAL });
  }

  // 資産合計
  const existingAssetTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.ASSET_TOTAL
  );
  if (existingAssetTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.ASSET_TOTAL
        ? { ...ASSET_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...ASSET_TOTAL });
  }

  // 流動負債合計
  const existingCurrentLiabilityTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.CUR_LIABILITY_TOTAL
  );
  if (existingCurrentLiabilityTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.CUR_LIABILITY_TOTAL
        ? { ...CUR_LIABILITY_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...CUR_LIABILITY_TOTAL });
  }

  // 固定負債合計
  const existingFixedLiabilityTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.FIX_LIABILITY_TOTAL
  );
  if (existingFixedLiabilityTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.FIX_LIABILITY_TOTAL
        ? { ...FIX_LIABILITY_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...FIX_LIABILITY_TOTAL });
  }

  // 負債合計
  const existingLiabilityTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.LIABILITY_TOTAL
  );
  if (existingLiabilityTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.LIABILITY_TOTAL
        ? { ...LIABILITY_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...LIABILITY_TOTAL });
  }

  // 純資産合計
  const existingEquityTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.EQUITY_TOTAL
  );
  if (existingEquityTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.EQUITY_TOTAL
        ? { ...EQUITY_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...EQUITY_TOTAL });
  }

  // 負債・純資産合計
  const existingLiEqTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.LI_EQ_TOTAL
  );
  if (existingLiEqTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.LI_EQ_TOTAL
        ? { ...LI_EQ_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...LI_EQ_TOTAL });
  }

  // ===== CAPEX 関連の処理 =====
  // 設備投資合計
  const existingCapexTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.CAPEX_TOTAL
  );
  if (existingCapexTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.CAPEX_TOTAL
        ? { ...CAPEX_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...CAPEX_TOTAL });
  }

  // ===== CS (キャッシュフロー) 関連の処理 =====
  // 営業CF合計
  const existingOpeCfTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.OPE_CF_TOTAL
  );
  if (existingOpeCfTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.OPE_CF_TOTAL
        ? { ...OPE_CF_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...OPE_CF_TOTAL });
  }

  // 投資CF合計
  const existingInvCfTotal = updatedAccounts.find(
    (a) => a.accountType === AccountType.INV_CF_TOTAL
  );
  if (existingInvCfTotal) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.INV_CF_TOTAL
        ? { ...INV_CF_TOTAL }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...INV_CF_TOTAL });
  }

  // 現預金増減
  const existingChangeCash = updatedAccounts.find(
    (a) => a.accountType === AccountType.CHANGE_CASH
  );
  if (existingChangeCash) {
    updatedAccounts = updatedAccounts.map((account) =>
      account.accountType === AccountType.CHANGE_CASH
        ? { ...CHANGE_CASH }
        : account
    );
  } else {
    updatedAccounts.unshift({ ...CHANGE_CASH });
  }

  // 各勘定科目の親子関係を更新
  updatedAccounts = updatedAccounts.map((account) => {
    // ===== PL の親子関係 =====
    // 売上科目は売上高合計に紐づける
    if (account.accountType === AccountType.REVENUE) {
      return { ...account, parentId: REVENUE_TOTAL.id };
    }
    // 売上原価科目は売上原価合計に紐づける
    if (account.accountType === AccountType.COGS) {
      return { ...account, parentId: COGS_TOTAL.id };
    }
    // 販管費科目は販管費合計に紐づける
    if (account.accountType === AccountType.SGA) {
      return { ...account, parentId: SGA_TOTAL.id };
    }

    // ===== BS の親子関係 =====
    // 流動資産科目は流動資産合計に紐づける
    if (account.accountType === AccountType.CURRENT_ASSET) {
      return { ...account, parentId: CUR_ASSET_TOTAL.id };
    }
    // 固定資産科目は固定資産合計に紐づける
    if (account.accountType === AccountType.FIXED_ASSET) {
      return { ...account, parentId: FIX_ASSET_TOTAL.id };
    }
    // 流動負債科目は流動負債合計に紐づける
    if (account.accountType === AccountType.CURRENT_LIABILITY) {
      return { ...account, parentId: CUR_LIABILITY_TOTAL.id };
    }
    // 固定負債科目は固定負債合計に紐づける
    if (account.accountType === AccountType.FIXED_LIABILITY) {
      return { ...account, parentId: FIX_LIABILITY_TOTAL.id };
    }
    // 純資産科目は純資産合計に紐づける
    if (account.accountType === AccountType.EQUITY) {
      return { ...account, parentId: EQUITY_TOTAL.id };
    }

    // ===== CAPEX の親子関係 =====
    // 設備投資科目は設備投資合計に紐づける
    if (account.accountType === AccountType.CAPEX) {
      return { ...account, parentId: CAPEX_TOTAL.id };
    }

    // ===== CS の親子関係 =====
    // 営業CFの科目は営業CF合計に紐づける
    if (account.accountType === AccountType.OPE_CF) {
      return { ...account, parentId: OPE_CF_TOTAL.id };
    }
    // 投資CFの科目は投資CF合計に紐づける
    if (account.accountType === AccountType.INV_CF) {
      return { ...account, parentId: INV_CF_TOTAL.id };
    }

    return account;
  });

  // アカウントのコードと順番を調整
  return updateAccountCodesAndOrder(updatedAccounts);
}

/**
 * 集計値を計算する
 * @param {import('../types/models').FinancialModel} model - 財務モデル
 * @returns {import('../types/models').CellValue[]} - 更新されたセル値リスト
 */
export function calculateSummaryValues(model) {
  console.log("model: ", model);
  // modelからmodel.accounts、model.periods、model.valuesを取得
  const { accounts, periods, values } = model;
  //model.valuesの配列を複製
  let updatedValues = [...values];

  // CHILDREN_SUMタイプの集計アカウントを処理
  // model.accountsを分割代入でaccountsとして扱う
  // →model.accounts.filter()と同じであり、model.accounts配列の一部が返る
  const summaryAccounts = accounts.filter(
    (a) => a.aggregateMethod === "CHILDREN_SUM"
  );

  // summaryAccount毎に処理していく
  summaryAccounts.forEach((summaryAccount) => {
    // summaryAccounts毎にparentIdが自らになっている子アカウントを抽出
    const childAccounts = accounts.filter(
      // ループが回ってきたaccountのparentIdが対象となっているsummaryAccountのid
      (a) => a.parentId === summaryAccount.id
    );

    // 各期間に対して処理を実行
    periods.forEach((period) => {
      // 各chidlAccountに対して処理を実行（childAccountのIDが、"rev-A"と"rev-B"とする）
      // まずIDがrev-Aのaccountが入る
      const sum = childAccounts.reduce((total, child) => {
        // valuesの配列から、accountIdがrev-Aで、periodIdがperiod.idと一致する要素を探索
        const childValue = updatedValues.find(
          (v) => v.accountId === child.id && v.periodId === period.id
        );
        // 該当する要素のvalue値を追加していく
        return total + (childValue?.value || 0);
      }, 0);

      // existingValueはupdatedValues配列内のオブジェクトへの参照（条件に合致するオブジェクト）
      const existingValue = updatedValues.find(
        (v) => v.accountId === summaryAccount.id && v.periodId === period.id
      );

      if (existingValue) {
        // JSでは、オブジェクトは参照型なので、その参照を通じて値を変更すると、元の配列内のオブジェクトも変更
        // →updatedValuesが更新される
        existingValue.value = sum;
        existingValue.isCalculated = true;
      } else {
        updatedValues.push({
          accountId: summaryAccount.id,
          periodId: period.id,
          value: sum,
          isCalculated: true,
        });
      }
    });
  });

  // ここで中間状態のupdatedValuesを使用するため、valuesを更新
  // これにより、FORMULAタイプの計算時に、CHILDREN_SUMで計算された最新値を参照できる
  const intermediateValues = [...updatedValues];

  // 各期間ごとに計算
  periods.forEach((period) => {
    // 特定の期間のすべての値を取得
    // periodIdが一致するものを抽出
    const periodValues = intermediateValues.filter(
      (v) => v.periodId === period.id
    );

    // 売上高合計の値を取得
    const revenueTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId && a.accountType === AccountType.REVENUE_TOTAL
      )
    );

    // 売上原価合計の値を取得
    const cogsTotal = periodValues.find((v) =>
      accounts.find(
        (a) => a.id === v.accountId && a.accountType === AccountType.COGS_TOTAL
      )
    );

    // 販管費合計の値を取得
    const sgaTotal = periodValues.find((v) =>
      accounts.find(
        (a) => a.id === v.accountId && a.accountType === AccountType.SGA_TOTAL
      )
    );

    // 売上総利益の計算：売上高合計 - 売上原価合計
    if (revenueTotal && cogsTotal) {
      const grossMarginValue = revenueTotal.value - cogsTotal.value;

      // 既存の売上総利益の値を探す
      const existingGrossMargin = periodValues.find((v) =>
        accounts.find(
          (a) =>
            a.id === v.accountId && a.accountType === AccountType.GROSS_MARGIN
        )
      );

      if (existingGrossMargin) {
        existingGrossMargin.value = grossMarginValue;
        existingGrossMargin.isCalculated = true;
      } else {
        const grossMarginAccount = accounts.find(
          (a) => a.accountType === AccountType.GROSS_MARGIN
        );
        if (grossMarginAccount) {
          updatedValues.push({
            periodId: period.id,
            accountId: grossMarginAccount.id,
            value: grossMarginValue,
            isCalculated: true,
          });
        }
      }

      // PL用の計算：営業利益 = 売上総利益 - 販管費合計
      if (existingGrossMargin && sgaTotal) {
        const operatingProfitValue = existingGrossMargin.value - sgaTotal.value;

        // 既存の営業利益の値を探す
        const existingOperatingProfit = periodValues.find((v) =>
          accounts.find(
            (a) =>
              a.id === v.accountId &&
              a.accountType === AccountType.OPERATING_PROFIT
          )
        );

        if (existingOperatingProfit) {
          existingOperatingProfit.value = operatingProfitValue;
          existingOperatingProfit.isCalculated = true;
        } else {
          const operatingProfitAccount = accounts.find(
            (a) => a.accountType === AccountType.OPERATING_PROFIT
          );
          if (operatingProfitAccount) {
            updatedValues.push({
              periodId: period.id,
              accountId: operatingProfitAccount.id,
              value: operatingProfitValue,
              isCalculated: true,
            });
          }
        }
      }
    }

    // BS用の計算：資産合計 = 流動資産合計 + 固定資産合計
    const curAssetTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId && a.accountType === AccountType.CUR_ASSET_TOTAL
      )
    );
    const fixAssetTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId && a.accountType === AccountType.FIX_ASSET_TOTAL
      )
    );

    if (curAssetTotal && fixAssetTotal) {
      const assetTotalValue = curAssetTotal.value + fixAssetTotal.value;

      // 既存の資産合計の値を探す
      const existingAssetTotal = periodValues.find((v) =>
        accounts.find(
          (a) =>
            a.id === v.accountId && a.accountType === AccountType.ASSET_TOTAL
        )
      );

      if (existingAssetTotal) {
        existingAssetTotal.value = assetTotalValue;
        existingAssetTotal.isCalculated = true;
      } else {
        const assetTotalAccount = accounts.find(
          (a) => a.accountType === AccountType.ASSET_TOTAL
        );
        if (assetTotalAccount) {
          updatedValues.push({
            periodId: period.id,
            accountId: assetTotalAccount.id,
            value: assetTotalValue,
            isCalculated: true,
          });
        }
      }
    }

    // BS用の計算：負債合計 = 流動負債合計 + 固定負債合計
    const curLiabilityTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId &&
          a.accountType === AccountType.CUR_LIABILITY_TOTAL
      )
    );
    const fixLiabilityTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId &&
          a.accountType === AccountType.FIX_LIABILITY_TOTAL
      )
    );

    if (curLiabilityTotal && fixLiabilityTotal) {
      const liabilityTotalValue =
        curLiabilityTotal.value + fixLiabilityTotal.value;

      // 既存の負債合計の値を探す
      const existingLiabilityTotal = periodValues.find((v) =>
        accounts.find(
          (a) =>
            a.id === v.accountId &&
            a.accountType === AccountType.LIABILITY_TOTAL
        )
      );

      if (existingLiabilityTotal) {
        existingLiabilityTotal.value = liabilityTotalValue;
        existingLiabilityTotal.isCalculated = true;
      } else {
        const liabilityTotalAccount = accounts.find(
          (a) => a.accountType === AccountType.LIABILITY_TOTAL
        );
        if (liabilityTotalAccount) {
          updatedValues.push({
            periodId: period.id,
            accountId: liabilityTotalAccount.id,
            value: liabilityTotalValue,
            isCalculated: true,
          });
        }
      }
    }

    // BS用の計算：負債及び純資産合計 = 負債合計 + 純資産合計
    const liabilityTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId && a.accountType === AccountType.LIABILITY_TOTAL
      )
    );
    const equityTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId && a.accountType === AccountType.EQUITY_TOTAL
      )
    );

    if (liabilityTotal && equityTotal) {
      const liEqTotalValue = liabilityTotal.value + equityTotal.value;

      // 既存の負債及び純資産合計の値を探す
      const existingLiEqTotal = periodValues.find((v) =>
        accounts.find(
          (a) =>
            a.id === v.accountId && a.accountType === AccountType.LI_EQ_TOTAL
        )
      );

      if (existingLiEqTotal) {
        existingLiEqTotal.value = liEqTotalValue;
        existingLiEqTotal.isCalculated = true;
      } else {
        const liEqTotalAccount = accounts.find(
          (a) => a.accountType === AccountType.LI_EQ_TOTAL
        );
        if (liEqTotalAccount) {
          updatedValues.push({
            periodId: period.id,
            accountId: liEqTotalAccount.id,
            value: liEqTotalValue,
            isCalculated: true,
          });
        }
      }
    }

    // CS用の計算：現預金増減 = 営業活動によるCF + 投資活動によるCF
    const opeCfTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId && a.accountType === AccountType.OPE_CF_TOTAL
      )
    );
    const invCfTotal = periodValues.find((v) =>
      accounts.find(
        (a) =>
          a.id === v.accountId && a.accountType === AccountType.INV_CF_TOTAL
      )
    );

    if (opeCfTotal && invCfTotal) {
      const changeCashValue = opeCfTotal.value + invCfTotal.value;

      // 既存の現預金増減の値を探す
      const existingChangeCash = periodValues.find((v) =>
        accounts.find(
          (a) =>
            a.id === v.accountId && a.accountType === AccountType.CHANGE_CASH
        )
      );

      if (existingChangeCash) {
        existingChangeCash.value = changeCashValue;
        existingChangeCash.isCalculated = true;
      } else {
        const changeCashAccount = accounts.find(
          (a) => a.accountType === AccountType.CHANGE_CASH
        );
        if (changeCashAccount) {
          updatedValues.push({
            periodId: period.id,
            accountId: changeCashAccount.id,
            value: changeCashValue,
            isCalculated: true,
          });
        }
      }
    }
  });

  return updatedValues;
}

/**
 * アカウントのコードと順番を調整する
 * @param {import('../types/models').Account[]} accounts - 勘定科目リスト
 * @returns {import('../types/models').Account[]} - 更新された勘定科目リスト
 */
export function updateAccountCodesAndOrder(accounts) {
  // アカウントタイプごとにグループ化
  const revenueAccounts = accounts.filter(
    (a) => a.accountType === AccountType.REVENUE
  );
  const cogsAccounts = accounts.filter(
    (a) => a.accountType === AccountType.COGS
  );
  const sgaAccounts = accounts.filter((a) => a.accountType === AccountType.SGA);
  const summaryAccounts = accounts.filter(
    (a) =>
      a.accountType === AccountType.REVENUE_TOTAL ||
      a.accountType === AccountType.COGS_TOTAL ||
      a.accountType === AccountType.GROSS_MARGIN ||
      a.accountType === AccountType.SGA_TOTAL ||
      a.accountType === AccountType.OPERATING_PROFIT
  );
  const otherAccounts = accounts.filter(
    (a) =>
      a.accountType !== AccountType.REVENUE &&
      a.accountType !== AccountType.REVENUE_TOTAL &&
      a.accountType !== AccountType.COGS &&
      a.accountType !== AccountType.COGS_TOTAL &&
      a.accountType !== AccountType.GROSS_MARGIN &&
      a.accountType !== AccountType.SGA &&
      a.accountType !== AccountType.SGA_TOTAL &&
      a.accountType !== AccountType.OPERATING_PROFIT
  );

  // 各タイプのアカウントにコードを割り当て
  let updatedAccounts = [];

  // 売上アカウント (A1-A98)
  revenueAccounts.forEach((account, index) => {
    const code = `A${index + 1}`;
    const order = index + 1;
    updatedAccounts.push({ ...account, code, order });
  });

  // 原価アカウント (B1-B98)
  cogsAccounts.forEach((account, index) => {
    const code = `B${index + 1}`;
    const order = 100 + index + 1;
    updatedAccounts.push({ ...account, code, order });
  });

  // 販管費アカウント (C1-C98)
  sgaAccounts.forEach((account, index) => {
    const code = `C${index + 1}`;
    const order = 300 + index + 1;
    updatedAccounts.push({ ...account, code, order });
  });

  // 集計アカウントは固定コードと順番を使用
  const updatedSummaryAccounts = summaryAccounts.map((account) => {
    // 該当するSUMMARY_ACCOUNTSの定義を探す
    const summaryDef = Object.values(SUMMARY_ACCOUNTS).find(
      (summary) => summary.accountType === account.accountType
    );

    if (summaryDef) {
      return {
        ...account,
        code: summaryDef.code,
        order: summaryDef.order,
      };
    }
    return account;
  });

  // 他のアカウント (D以降)
  otherAccounts.forEach((account, index) => {
    const code = `D${index + 1}`;
    const order = 500 + index + 1;
    updatedAccounts.push({ ...account, code, order });
  });

  // 集計アカウントを追加
  updatedAccounts = [...updatedAccounts, ...updatedSummaryAccounts];

  // 順番でソート
  return updatedAccounts.sort((a, b) => a.order - b.order);
}

/**
 * パラメータが設定された勘定科目の値を計算する
 * @param {import('../types/models').FinancialModel} model - 財務モデル
 * @returns {import('../types/models').CellValue[]} - 更新されたセル値の配列
 */
export function calculateValuesWithParameters(model) {
  // 注意: この関数は計算対象の値のisCalculatedフラグをtrueに設定します
  // isCalculatedフラグは値が計算によって生成されたか(true)、手動入力されたか(false)を示します
  // このフラグは主に以下の目的で使用されます:
  // 1. 手動入力値と計算値の区別
  // 2. UIでの異なる表示（色分けなど）の制御
  // 3. データの信頼性と変更履歴の追跡

  const updatedValues = [...model.values];
  const { accounts, periods } = model;

  // パラメータを持つ勘定科目を抽出
  const accountsWithParams = accounts.filter((account) => account.parameter);

  accountsWithParams.forEach((account) => {
    // パラメータが適用される期間を判定するロジック
    periods.forEach((periodToProcess) => {
      // パラメータ適用条件の判定（集約版）
      // 1. エクセルからインポートされた期間には適用しない - これが唯一の判断基準
      // isFromExcelが未定義の場合はデフォルトでtrueとして扱う（計算対象外）
      if (
        periodToProcess.isFromExcel === true ||
        periodToProcess.isFromExcel === undefined
      )
        return;

      // 実績期間かどうかに関わらず、isFromExcelフラグのみでパラメータ適用を判断
      // isActualチェックを削除

      // 2. パラメータに期間指定がある場合、指定された期間のみに適用
      const periodIdsToProcess = account.parameter.periodIds || [];
      if (
        periodIdsToProcess.length > 0 &&
        !periodIdsToProcess.includes(periodToProcess.id)
      )
        return;

      // パラメータの種類に応じた計算処理
      if (account.parameter.type === ParameterType.GROWTH_RATE) {
        // 前の期間を特定
        const prevPeriod = periods.find(
          (period) =>
            period.year === periodToProcess.year - 1 &&
            period.month === periodToProcess.month
        );
        if (!prevPeriod) return; // 前の期間がない場合はスキップ

        // 前の期間の値を取得
        const prevValue = updatedValues.find(
          (v) => v.accountId === account.id && v.periodId === prevPeriod.id
        );
        if (!prevValue) return; // 前の期間の値がない場合はスキップ

        // 新しい値を計算 (成長率が10%なら、前年値 * 1.1)
        const growthRate = account.parameter.value || 0;
        const newValue = prevValue.value * (1 + growthRate / 100);

        // 値を更新または追加
        updateOrCreateValue(
          updatedValues,
          account.id,
          periodToProcess.id,
          newValue
        );
      } else if (account.parameter.type === ParameterType.PERCENTAGE) {
        // 参照科目に対する割合を計算
        const { referenceAccountId } = account.parameter;
        if (!referenceAccountId) return; // 参照科目が設定されていない場合はスキップ

        // 参照科目が存在するか確認
        const referenceAccount = accounts.find(
          (a) => a.id === referenceAccountId
        );
        if (!referenceAccount) {
          console.error(
            `被参照科目が見つかりません - ID: ${referenceAccountId}`
          );
          return;
        }

        // 参照科目の同じ期間の値を取得
        const refValue = updatedValues.find(
          (v) =>
            v.accountId === referenceAccountId &&
            v.periodId === periodToProcess.id
        );

        // 参照値が見つからない場合はアラート
        if (!refValue) {
          console.error(`被参照科目が未計算です - ${referenceAccount.name}`);
          return;
        }

        // 割合を計算 (例: 参照値が100で割合が20%なら、100 * 0.2 = 20)
        const percentage = account.parameter.value || 0;
        const newValue = refValue.value * (percentage / 100);

        // 値を更新または追加
        updateOrCreateValue(
          updatedValues,
          account.id,
          periodToProcess.id,
          newValue
        );
      } else if (account.parameter.type === ParameterType.PROPORTIONATE) {
        // 参照科目の成長率に連動して値を調整するタイプ
        const { referenceAccountId } = account.parameter;
        if (!referenceAccountId) return; // 参照科目が設定されていない場合はスキップ

        // 参照科目が存在するか確認
        const referenceAccount = accounts.find(
          (a) => a.id === referenceAccountId
        );
        if (!referenceAccount) {
          console.error(
            `被参照科目が見つかりません - ID: ${referenceAccountId}`
          );
          return;
        }

        // 前年度の期間を特定
        const prevPeriod = periods.find(
          (period) =>
            period.year === periodToProcess.year - 1 &&
            period.month === periodToProcess.month
        );
        if (!prevPeriod) return; // 前の期間がない場合はスキップ

        // 参照科目の現在と前年の値を取得
        const refValue = updatedValues.find(
          (v) =>
            v.accountId === referenceAccountId &&
            v.periodId === periodToProcess.id
        );

        const refPrevValue = updatedValues.find(
          (v) =>
            v.accountId === referenceAccountId && v.periodId === prevPeriod.id
        );

        // 自科目の前年の値を取得
        const accountPrevValue = updatedValues.find(
          (v) => v.accountId === account.id && v.periodId === prevPeriod.id
        );

        // 必要な値がない場合はアラート
        if (!refValue || !refPrevValue) {
          console.error(`被参照科目が未計算です - ${referenceAccount.name}`);
          return;
        }
        if (!accountPrevValue) return;

        // 参照科目の成長率を計算
        const refGrowthRate =
          refPrevValue.value === 0
            ? 0
            : refValue.value / refPrevValue.value - 1;

        // 同じ成長率を適用して新しい値を計算
        const newValue = accountPrevValue.value * (1 + refGrowthRate);

        // 値を更新または追加
        updateOrCreateValue(
          updatedValues,
          account.id,
          periodToProcess.id,
          newValue
        );
      } else if (account.parameter.type === ParameterType.OTHER) {
        // 特殊計算ロジック（BSの特定項目用）
        // 前年度の期間を特定
        const prevPeriod = periods.find(
          (period) =>
            period.year === periodToProcess.year - 1 &&
            period.month === periodToProcess.month
        );
        if (!prevPeriod) return; // 前の期間がない場合はスキップ

        // 自科目の前年の値を取得
        const accountPrevValue = updatedValues.find(
          (v) => v.accountId === account.id && v.periodId === prevPeriod.id
        );
        if (!accountPrevValue) return; // 前年の値がない場合はスキップ

        let newValue = 0;

        // 勘定科目名に基づいて計算ロジックを分岐
        if (account.name.includes("有形固定資産")) {
          // 有形固定資産: 前期の残高+当期の有形資産投資-当期の減価償却費

          // 同じ期間の有形資産投資を探す (CAPEXシートから)
          const tangibleInvestment = accounts
            .filter((a) => a.sheetName === "CAPEX" && a.name.includes("有形"))
            .map((a) => {
              const value = updatedValues.find(
                (v) => v.accountId === a.id && v.periodId === periodToProcess.id
              );
              return value ? value.value : 0;
            })
            .reduce((sum, value) => sum + value, 0);

          // 同じ期間の減価償却費を探す (PLシートから)
          const depreciation = accounts
            .filter((a) => a.sheetName === "PL" && a.name.includes("減価償却"))
            .map((a) => {
              const value = updatedValues.find(
                (v) => v.accountId === a.id && v.periodId === periodToProcess.id
              );
              return value ? value.value : 0;
            })
            .reduce((sum, value) => sum + value, 0);

          // 新しい値を計算: 前期残高 + 当期投資 - 当期減価償却
          newValue = accountPrevValue.value + tangibleInvestment - depreciation;
        } else if (account.name.includes("無形固定資産")) {
          // 無形固定資産: 前期の残高+当期の無形資産投資-当期の無形固定資産償却費

          // 同じ期間の無形資産投資を探す (CAPEXシートから)
          const intangibleInvestment = accounts
            .filter((a) => a.sheetName === "CAPEX" && a.name.includes("無形"))
            .map((a) => {
              const value = updatedValues.find(
                (v) => v.accountId === a.id && v.periodId === periodToProcess.id
              );
              return value ? value.value : 0;
            })
            .reduce((sum, value) => sum + value, 0);

          // 同じ期間の無形資産償却費を探す (PLシートから)
          const amortization = accounts
            .filter(
              (a) =>
                a.sheetName === "PL" &&
                a.name.includes("無形") &&
                a.name.includes("償却")
            )
            .map((a) => {
              const value = updatedValues.find(
                (v) => v.accountId === a.id && v.periodId === periodToProcess.id
              );
              return value ? value.value : 0;
            })
            .reduce((sum, value) => sum + value, 0);

          // 新しい値を計算: 前期残高 + 当期投資 - 当期償却
          newValue =
            accountPrevValue.value + intangibleInvestment - amortization;
        } else if (account.name.includes("利益剰余金")) {
          // 利益剰余金: 前期の残高+当期の営業利益

          // 同じ期間の営業利益を探す (PLシートから)
          const operatingProfit = accounts
            .filter((a) => a.accountType === AccountType.OPERATING_PROFIT)
            .map((a) => {
              const value = updatedValues.find(
                (v) => v.accountId === a.id && v.periodId === periodToProcess.id
              );
              return value ? value.value : 0;
            })
            .reduce((sum, value) => sum + value, 0);

          // 新しい値を計算: 前期残高 + 当期営業利益
          newValue = accountPrevValue.value + operatingProfit;
        }

        // 値を更新または追加
        updateOrCreateValue(
          updatedValues,
          account.id,
          periodToProcess.id,
          newValue
        );
      }
    });
  });

  return updatedValues;
}

/**
 * 値を更新または新規作成するヘルパー関数
 * @param {Array} values - 値の配列
 * @param {string} accountId - 勘定科目ID
 * @param {string} periodId - 期間ID
 * @param {number} newValue - 新しい値
 */
function updateOrCreateValue(values, accountId, periodId, newValue) {
  const existingValue = values.find(
    (v) => v.accountId === accountId && v.periodId === periodId
  );

  if (existingValue) {
    existingValue.value = newValue;
    existingValue.isCalculated = true;
  } else {
    values.push({
      accountId,
      periodId,
      value: newValue,
      isCalculated: true,
    });
  }
}
