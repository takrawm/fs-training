import { isCFItem } from "../utils/cfItemUtils.js";

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
        if (!isCFItem(cfAccount)) {
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
          if (isCFItem(account)) {
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

    // CF項目が正しい構造を持っているかチェック
    this.accounts.getCFItems().forEach((cfAccount) => {
      if (!cfAccount.flowAttributes?.cfItemAttributes) {
        errors.push(`CF項目にcfItemAttributesが不足: ${cfAccount.accountName}`);
      }
      if (cfAccount.flowAttributes?.parameter !== null) {
        warnings.push(
          `CF項目がparameterを持っています: ${cfAccount.accountName}`
        );
      }
    });

    // 通常科目がCF項目属性を持っていないかチェック
    this.accounts.getRegularItems().forEach((account) => {
      if (account.flowAttributes?.cfItemAttributes) {
        errors.push(
          `通常科目がcfItemAttributesを持っています: ${account.accountName}`
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
