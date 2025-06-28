import { CASH_CALCULATION_ACCOUNTS, OPERATIONS } from "../utils/constants.js";
import { AccountUtils } from "../utils/accountUtils.js";
import { getValue } from "../utils/financialCalculations.js";

/**
 * 現預金計算を一元管理するクラス
 * 期首残高取得・増減計算・期末算出の一連の処理をカプセル化
 */
export class CashFlowCalculator {
  constructor(financialModel) {
    this.model = financialModel;
  }

  /**
   * 現預金計算の完全な実行
   * @param {Object} period - 対象期間
   * @returns {Object} 計算結果 { beginningBalance, change, endingBalance }
   */
  calculateCashFlow(period) {
    // 1. 現預金計算科目を追加（まだ存在しない場合）
    this.ensureCashCalculationAccounts();

    // 2. 前期を特定
    const lastPeriod = this.findPreviousPeriod(period);
    if (!lastPeriod) {
      return this.getInitialPeriodCashFlow();
    }

    // 3. 期首残高を取得
    const beginningBalance = this.getBeginningBalance(period, lastPeriod);

    // 4. 当期の現預金増減を計算
    const change = this.calculateCashChange(period, lastPeriod);

    // 5. 期末残高を算出
    const endingBalance = beginningBalance + change;

    // 6. 計算結果をモデルに反映
    this.updateModelWithResults(period, {
      beginningBalance,
      change,
      endingBalance,
    });

    // 7. BS現預金科目も更新
    this.updateBSCashAccount(period, endingBalance);

    return { beginningBalance, change, endingBalance };
  }

  /**
   * 現預金計算科目が存在することを保証
   */
  ensureCashCalculationAccounts() {
    Object.values(CASH_CALCULATION_ACCOUNTS).forEach((account) => {
      if (!this.model.accounts.exists(account.id)) {
        this.model.accounts.addRegularItem(account);
      }
    });
  }

  /**
   * 前期を特定
   */
  findPreviousPeriod(currentPeriod) {
    const periods = this.model.periods;
    const currentIndex = periods.findIndex((p) => p.id === currentPeriod.id);
    return currentIndex > 0 ? periods[currentIndex - 1] : null;
  }

  /**
   * 初期期間の現預金フロー
   */
  getInitialPeriodCashFlow() {
    return {
      beginningBalance: 0,
      change: 0,
      endingBalance: 0,
    };
  }

  /**
   * 期首残高を取得（前期末のBS現預金）
   */
  getBeginningBalance(period, lastPeriod) {
    return getValue(this.model.values, "cash-total", lastPeriod.id);
  }

  /**
   * 現預金の増減を計算（間接法）
   */
  calculateCashChange(period, lastPeriod) {
    let cashChange = 0;

    // 1. 営業利益を加算
    cashChange += this.getOperatingProfit(period);

    // 2. CF調整項目の処理
    cashChange += this.calculateCFAdjustments(period);

    // 3. BS変動の処理
    cashChange += this.calculateBSChanges(period, lastPeriod);

    return cashChange;
  }

  /**
   * 営業利益を取得
   */
  getOperatingProfit(period) {
    const opAccount = this.model.accounts
      .getAllAccounts()
      .find((acc) => acc.id === "op-profit" || acc.accountName === "営業利益");

    if (!opAccount) {
      console.warn("営業利益科目が見つかりません");
      return 0;
    }

    return getValue(this.model.values, opAccount.id, period.id);
  }

  /**
   * CF調整項目の影響を計算
   */
  calculateCFAdjustments(period) {
    let adjustment = 0;
    const accounts = this.model.accounts.getAllAccounts();

    const cfAdjustmentAccounts = accounts.filter(
      (acc) => AccountUtils.getCFAdjustment(acc) !== null
    );

    cfAdjustmentAccounts.forEach((account) => {
      const cfAdj = AccountUtils.getCFAdjustment(account);
      const value = getValue(this.model.values, account.id, period.id);

      // 演算子を逆にして適用
      if (cfAdj.operation === OPERATIONS.SUB) {
        adjustment += value;
      } else if (cfAdj.operation === OPERATIONS.ADD) {
        adjustment -= value;
      }
    });

    return adjustment;
  }

  /**
   * BS項目の変動によるキャッシュフローへの影響を計算
   */
  calculateBSChanges(period, lastPeriod) {
    let bsImpact = 0;
    const accounts = this.model.accounts.getAllAccounts();

    const bsAccounts = accounts.filter(
      (acc) =>
        AccountUtils.shouldGenerateCFItem(acc) && acc.id !== "cash-total"
    );

    bsAccounts.forEach((account) => {
      const currentValue = getValue(this.model.values, account.id, period.id);
      const previousValue = getValue(
        this.model.values,
        account.id,
        lastPeriod.id
      );

      const change = currentValue - previousValue;
      const isCredit = account.isCredit;

      // 資産の増加はキャッシュの減少、負債・資本の増加はキャッシュの増加
      if (isCredit === false) {
        bsImpact -= change; // 資産増加はマイナス
      } else if (isCredit === true) {
        bsImpact += change; // 負債・資本増加はプラス
      }
    });

    return bsImpact;
  }

  /**
   * 計算結果をモデルに反映
   */
  updateModelWithResults(period, results) {
    // 期首残高
    this.model.addValue({
      accountId: "cash-beginning-balance",
      periodId: period.id,
      value: results.beginningBalance,
    });

    // 当期増減
    this.model.addValue({
      accountId: "cash-flow-change",
      periodId: period.id,
      value: results.change,
    });

    // 期末残高
    this.model.addValue({
      accountId: "cash-ending-balance",
      periodId: period.id,
      value: results.endingBalance,
    });
  }

  /**
   * BS現預金科目を更新
   */
  updateBSCashAccount(period, cashBalance) {
    // 既存の値を更新または新規追加
    const existingValueIndex = this.model.values.findIndex(
      (v) => v.accountId === "cash-total" && v.periodId === period.id
    );

    if (existingValueIndex >= 0) {
      this.model.values[existingValueIndex].value = cashBalance;
    } else {
      this.model.addValue({
        accountId: "cash-total",
        periodId: period.id,
        value: cashBalance,
      });
    }
  }
}