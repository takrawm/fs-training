import { AccountUtils } from "../utils/accountUtils.js";
import { CASH_CALCULATION_ACCOUNTS } from "../utils/constants.js";
import { CashFlowCalculator } from "./CashFlowCalculator.js";

/**
 * 財務モデルクラス
 * 通常科目とCF項目を構造的に分離して管理
 */
export class FinancialModel {
  constructor() {
    this.accounts = {
      regularItems: [], // 通常の勘定科目
      cfItems: [], // CF項目

      /**
       * 全ての科目を取得（通常科目 + CF項目）
       * @returns {Array} 全科目の配列
       */
      getAllAccounts() {
        return [...this.regularItems, ...this.cfItems];
      },

      /**
       * IDで科目を検索
       * @param {string} id 科目ID
       * @returns {Object|undefined} 見つかった科目
       */
      findById(id) {
        // findメソッドは、条件を最初に満たした要素を返す
        return this.getAllAccounts().find((acc) => acc.id === id);
      },

      /**
       * 通常科目のみを取得
       * @returns {Array} 通常科目の配列
       */
      getRegularItems() {
        return this.regularItems;
      },

      /**
       * CF項目のみを取得
       * @returns {Array} CF項目の配列
       */
      getCFItems() {
        return this.cfItems;
      },

      /**
       * 通常の勘定科目を追加
       * @param {Object} account - 追加する勘定科目
       */
      addRegularItem(account) {
        if (account.type === "cf") {
          throw new Error(
            `通常の科目はaddRegularItem()を使用してください: ${
              account.name || account.id
            }`
          );
        }
        this.regularItems.push(account);
      },

      /**
       * CF項目を追加
       * @param {Object} cfAccount 追加するCF項目
       * @throws {Error} 通常科目を追加しようとした場合
       */
      addCFItem(cfAccount) {
        if (!AccountUtils.isCFItem(cfAccount)) {
          throw new Error(
            `通常の科目はaddRegularItem()を使用してください: ${
              cfAccount.accountName || cfAccount.id
            }`
          );
        }
        this.cfItems.push(cfAccount);
      },

      /**
       * 複数の通常の勘定科目を一括追加
       * @param {Array} accounts - 追加する勘定科目の配列
       */
      addRegularBatch(accounts) {
        accounts.forEach((account) => this.addRegularItem(account));
      },

      /**
       * 複数のCF項目を一括追加
       * @param {Array} cfAccounts 追加するCF項目の配列
       */
      addCFItemBatch(cfAccounts) {
        cfAccounts.forEach((cfAccount) => this.addCFItem(cfAccount));
      },

      /**
       * 科目が存在するかチェック
       * @param {string} id 科目ID
       * @returns {boolean} 存在する場合true
       */
      exists(id) {
        return this.findById(id) !== undefined;
      },

      /**
       * 既存の配列からの移行用
       * 各科目を種類に応じて適切な配列に分類
       * @param {Array} accountsArray 既存の科目配列
       */
      migrateFromArray(accountsArray) {
        accountsArray.forEach((account) => {
          if (AccountUtils.isCFItem(account)) {
            this.cfItems.push(account);
          } else {
            this.regularItems.push(account);
          }
        });
      },

      /**
       * 統計情報を取得
       * @returns {Object} 統計情報
       */
      getStats() {
        return {
          regularItemsCount: this.regularItems.length,
          cfItemCount: this.cfItems.length,
          totalCount: this.getAllAccounts().length,
          breakdown: {
            regularItems: this.regularItems.map((acc) => ({
              ...acc,
              type: "regular",
            })),
            cfItems: this.cfItems.map((acc) => ({
              id: acc.id,
              name: acc.accountName,
              type: "cfItem",
              cfType: acc.flowAttributes?.cfItemAttributes?.cfItemType,
            })),
          },
        };
      },
    };

    this.periods = []; // 期間情報
    this.values = []; // 勘定科目の値
  }

  /**
   * 期間を追加
   * @param {Object} period 期間オブジェクト
   */
  addPeriod(period) {
    this.periods.push(period);
  }

  /**
   * 値を追加
   * @param {Object} value 値オブジェクト
   */
  addValue(value) {
    this.values.push(value);
  }

  /**
   * 現預金計算科目を一括追加
   */
  addCashCalculationAccounts() {
    Object.values(CASH_CALCULATION_ACCOUNTS).forEach((account) => {
      // 既に存在しない場合のみ追加
      if (!this.accounts.exists(account.id)) {
        this.accounts.addRegularItem(account);
        console.log(
          `現預金計算科目を追加: ${account.accountName} (ID: ${account.id})`
        );
      } else {
        console.log(
          `現預金計算科目は既に存在: ${account.accountName} (ID: ${account.id})`
        );
      }
    });
  }

  /**
   * 複数の値を一括追加
   * @param {Array} values 値の配列
   */
  addValueBatch(values) {
    this.values.push(...values);
  }

  /**
   * 特定の科目・期間の値を取得
   * @param {string} accountId 科目ID
   * @param {string} periodId 期間ID
   * @returns {number} 値（見つからない場合は0）
   */
  getValue(accountId, periodId) {
    const value = this.values.find(
      (v) => v.accountId === accountId && v.periodId === periodId
    );
    return value?.value || 0;
  }

  /**
   * モデルの検証
   * 構造の整合性をチェック
   * @returns {Object} 検証結果
   */
  validate() {
    const errors = [];
    const warnings = [];

    // CF項目が正しいシンプル構造を持っているかチェック
    this.accounts.getCFItems().forEach((cfAccount) => {
      // 新しいシンプル構造の検証
      if (cfAccount.sheet !== null) {
        errors.push(
          `CF項目のsheetはnullである必要があります: ${cfAccount.accountName}`
        );
      }
      if (cfAccount.flowAttributes !== null) {
        errors.push(
          `CF項目のflowAttributesはnullである必要があります: ${cfAccount.accountName}`
        );
      }
      if (cfAccount.stockAttributes !== null) {
        errors.push(
          `CF項目のstockAttributesはnullである必要があります: ${cfAccount.accountName}`
        );
      }
      if (cfAccount.isCredit !== null) {
        errors.push(
          `CF項目のisCreditはnullである必要があります: ${cfAccount.accountName}`
        );
      }

      // 必須プロパティの存在チェック
      if (!cfAccount.displayOrder?.order) {
        warnings.push(`CF項目にdisplayOrderが不足: ${cfAccount.accountName}`);
      }
      if (!cfAccount.parentAccountId) {
        warnings.push(
          `CF項目にparentAccountIdが不足: ${cfAccount.accountName}`
        );
      }
    });

    // 通常科目がCF項目属性を持っていないかチェック
    this.accounts.getRegularItems().forEach((account) => {
      // 通常科目は適切なsheet情報を持つべき
      if (!account.sheet?.sheetType) {
        warnings.push(`通常科目にsheet情報が不足: ${account.accountName}`);
      }

      // 通常科目がCF項目のような構造を持っていないかチェック
      if (
        account.sheet === null &&
        account.flowAttributes === null &&
        account.stockAttributes === null
      ) {
        errors.push(
          `通常科目がCF項目のような構造を持っています: ${account.accountName}`
        );
      }
    });

    return {
      isValid: errors.length === 0,
      errors,
      warnings,
      stats: this.accounts.getStats(),
    };
  }

  /**
   * モデルを JSON で出力（デバッグ用）
   * @returns {Object} JSONシリアライズ可能なオブジェクト
   */
  toJSON() {
    return {
      accounts: {
        regularItems: this.accounts.regularItems,
        cfItems: this.accounts.cfItems,
        stats: this.accounts.getStats(),
      },
      periods: this.periods,
      values: this.values,
    };
  }

  /**
   * 現預金計算を実行
   * 期首残高取得・増減計算・期末算出まで一括処理
   * @param {Object} period - 対象期間
   * @returns {Object} 計算結果 { beginningBalance, change, endingBalance }
   */
  calculateCashFlow(period) {
    const calculator = new CashFlowCalculator(this);
    return calculator.calculateCashFlow(period);
  }

  /**
   * 古い形式のモデルから移行
   * @param {Object} oldModel 古い形式のモデル
   * @returns {FinancialModel} 新しいFinancialModelインスタンス
   */
  static fromOldModel(oldModel) {
    const newModel = new FinancialModel();

    // アカウントの移行
    if (oldModel.accounts) {
      newModel.accounts.migrateFromArray(oldModel.accounts);
    }

    // 期間の移行
    if (oldModel.periods) {
      newModel.periods = [...oldModel.periods];
    }

    // 値の移行
    if (oldModel.values) {
      newModel.values = [...oldModel.values];
    }

    return newModel;
  }
}
