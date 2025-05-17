import { getCalculationOrder } from "./dependencyCalculation";

/**
 * 親子関係のマップを作成する
 * @param {Array} accounts アカウント配列
 * @returns {Object} 親子関係のマップ
 */
export const createParentChildMap = (accounts) => {
  const parentChildMap = {};
  accounts.forEach((account) => {
    if (account.parentAccount) {
      // parentChildMap = {
      // "売上高": [] or ["account-0"]
      // ←parentChildMap[account.parentAccount]があるときは["account-0"]が返り、ないときは空配列
      // "売上原価": []
      // ...
      // }
      parentChildMap[account.parentAccount] =
        parentChildMap[account.parentAccount] || [];
      parentChildMap[account.parentAccount].push(account.id);
    }
  });
  return parentChildMap;
};

/**
 * サマリーアカウントの値を計算する
 * @param {Object} summaryAccount サマリーアカウント
 * @param {Object} period 期間
 * @param {Object} parentChildMap 親子関係のマップ
 * @param {Array} accountValues アカウント値配列
 * @returns {number} 計算された値
 */
export const calculateSummaryAccountValue = (
  summaryAccount,
  period,
  parentChildMap,
  accountValues
) => {
  let sumValue = 0;
  // summaryAccountを親科目に持つ科目のIdが入っている配列
  const childAccounts = parentChildMap[summaryAccount.accountName] || [];

  childAccounts.forEach((childId) => {
    // 子科目のidからaccountValuesを特定し、そのvalueを抽出する
    const childValue = accountValues.find(
      (v) => v.accountId === childId && v.periodId === period.id
    );
    if (childValue) {
      sumValue += childValue.value;
    }
  });

  return sumValue;
};

/**
 * relationMasterから依存関係を生成する関数
 * @param {Object} relationMaster - リレーションマスター
 * @param {Array} accounts - アカウント配列
 * @returns {Object} 依存関係のマップ
 */
export const createDependenciesFromRelationMaster = (
  relationMaster,
  accounts
) => {
  const dependencies = {};

  // relationMasterが存在しない場合は空の依存関係を返す
  if (!relationMaster) {
    return dependencies;
  }

  // 既存の依存関係を保持
  accounts.forEach((account) => {
    if (account.dependencies?.depends_on) {
      dependencies[account.id] = {
        depends_on: account.dependencies.depends_on.map((dep) => ({
          accountId: dep,
          periodOffset: 0,
          coefficient: 1,
        })),
      };
    }
  });

  // PP&Eの依存関係を生成
  if (relationMaster.ppe?.relations) {
    relationMaster.ppe.relations.forEach((relation) => {
      const { asset, investment, depreciation } = relation;

      // 既存の依存関係と統合
      const existingDeps = dependencies[asset.id]?.depends_on || [];
      dependencies[asset.id] = {
        depends_on: [
          ...existingDeps,
          {
            accountId: asset.id, // 前期末の資産
            periodOffset: -1, // 前期
            coefficient: 1,
          },
          {
            accountId: investment.id, // 投資
            periodOffset: 0, // 当期
            coefficient: 1,
          },
          {
            accountId: depreciation.id, // 減価償却
            periodOffset: 0, // 当期
            coefficient: -1,
          },
        ],
      };
    });
  }

  return dependencies;
};

/**
 * 特殊なアカウントの値を計算する関数（拡張版）
 * @param {Object} account - 計算対象のアカウント
 * @param {Object} period - 計算対象の期間
 * @param {Array} values - アカウント値の配列
 * @param {Array} accounts - アカウントの配列
 * @param {Object} dependencies - 依存関係のマップ
 * @param {Array} periods - 期間の配列
 * @returns {number} 計算された値
 */
export const calculateSpecialAccount = (
  account,
  period,
  values,
  accounts,
  dependencies,
  periods
) => {
  // 依存関係に基づく計算
  if (dependencies[account.id]?.depends_on) {
    const dependsOn = dependencies[account.id].depends_on;

    console.log("=== PP&E計算デバッグ ===");
    console.log("計算対象アカウント:", account);
    console.log("計算対象期間:", period);
    console.log("依存関係:", dependsOn);

    const result = dependsOn.reduce((sum, dep) => {
      // 対象期間を計算
      const targetPeriodIndex =
        periods.findIndex((p) => p.id === period.id) + dep.periodOffset;
      if (targetPeriodIndex < 0 || targetPeriodIndex >= periods.length) {
        console.log(`期間オフセット ${dep.periodOffset} は範囲外です`);
        return sum;
      }

      const targetPeriod = periods[targetPeriodIndex];

      // 値を見つける
      const value =
        values.find(
          (v) => v.accountId === dep.accountId && v.periodId === targetPeriod.id
        )?.value || 0;

      console.log(`依存アカウント ${dep.accountId} の値:`, value);
      console.log(
        `係数: ${dep.coefficient}, 期間オフセット: ${dep.periodOffset}`
      );

      // 係数を掛けて合計に加算
      return sum + value * dep.coefficient;
    }, 0);

    console.log("計算結果:", result);
    console.log("=== デバッグ終了 ===");

    return result;
  }

  return 0;
};

/**
 * パラメータに基づいてアカウントの値を計算する
 * @param {Object} account アカウント
 * @param {Object} newPeriod 新しい期間
 * @param {Object} lastPeriod 最後の期間
 * @param {Array} values 値の配列
 * @param {Array} accounts アカウント配列
 * @returns {number} 計算された値
 */
export const calculateParameterAccount = (
  account,
  newPeriod,
  lastPeriod,
  values,
  accounts
) => {
  const lastPeriodValue =
    values.find(
      (v) => v.accountId === account.id && v.periodId === lastPeriod.id
    )?.value || 0;

  switch (account.parameterType) {
    case "GROWTH_RATE":
      const growthRate = account.parameter?.growthRate || 0.05;
      return lastPeriodValue * (1 + growthRate);

    case "PERCENTAGE":
      const percentage = account.parameter?.percentage || 0.1;
      const referenceAccount = accounts.find(
        (a) => a.id === account.parameter?.referenceAccountId
      );
      if (!referenceAccount) return lastPeriodValue;

      const referenceValue =
        values.find(
          (v) =>
            v.accountId === referenceAccount.id && v.periodId === newPeriod.id
        )?.value || 0;

      return referenceValue * percentage;

    case "FIXED_VALUE":
      return account.parameter?.fixedValue || lastPeriodValue;

    case "NONE":
    default:
      return lastPeriodValue;
  }
};

/**
 * 新しい期間を作成する
 * @param {Object} lastPeriod 最後の期間
 * @returns {Object} 新しい期間
 */
export const createNewPeriod = (lastPeriod) => {
  const lastYear = parseInt(lastPeriod.year, 10);
  const newYear = lastYear + 1;

  return {
    id: `p-${newYear}`,
    year: newYear.toString(),
    isActual: false,
    isFromExcel: false,
    order: lastPeriod.order + 1,
  };
};

/**
 * 財務モデルに新しい期間を追加する
 * @param {Object} model 財務モデル
 * @returns {Object} 更新された財務モデル
 */
export const addNewPeriodToModel = (model) => {
  // 更新用のモデルを作成
  const updatedModel = {
    accounts: [...model.accounts],
    periods: [...model.periods],
    values: [...model.values],
    relationMaster: model.relationMaster || {}, // relationMasterが存在しない場合は空オブジェクトを設定
  };

  // 期間の追加
  const lastPeriod = updatedModel.periods[updatedModel.periods.length - 1];
  const newPeriod = createNewPeriod(lastPeriod);
  updatedModel.periods.push(newPeriod);

  console.log("=== 期間追加デバッグ ===");
  console.log("relationMaster:", updatedModel.relationMaster);
  console.log(
    "PP&E関連アカウント:",
    updatedModel.accounts.filter((account) => account.relation?.type === "PPE")
  );

  // 各アカウントの新しい期間の値を計算
  updatedModel.accounts.forEach((account) => {
    let newValue = 0;
    let isCalculated = true;

    // 計算タイプに応じて値を計算
    switch (account.calculationType) {
      case "CHILDREN_SUM":
        newValue = calculateSummaryAccountValue(
          account,
          newPeriod,
          createParentChildMap(updatedModel.accounts),
          updatedModel.values
        );
        break;

      case "ACCOUNT_CALC":
        console.log(`PP&E計算開始: ${account.accountName}`);
        newValue = calculateSpecialAccount(
          account,
          newPeriod,
          updatedModel.values,
          updatedModel.accounts,
          createDependenciesFromRelationMaster(
            updatedModel.relationMaster,
            updatedModel.accounts
          ),
          updatedModel.periods
        );
        console.log(`PP&E計算結果: ${account.accountName} = ${newValue}`);
        break;

      case null:
        newValue = calculateParameterAccount(
          account,
          newPeriod,
          lastPeriod,
          updatedModel.values,
          updatedModel.accounts
        );
        isCalculated = false;
        break;
    }

    // 新しい値を追加
    updatedModel.values.push({
      accountId: account.id,
      periodId: newPeriod.id,
      value: newValue,
      isCalculated,
    });
  });

  console.log("=== デバッグ終了 ===");

  return updatedModel;
};
