import { useState, useEffect, useCallback, useRef } from "react";
import {
  createEmptyFinancialModel,
  generateId,
  getNextYear,
  calculateSummaryValues,
  updatePeriodsActualFlag,
  updateAccountParentIds,
  updateAccountCodesAndOrder,
  calculateValuesWithParameters,
} from "../utils/financialUtils.js";
import {
  initializeHyperFormula,
  loadModelToHyperFormula,
  updateModelFromCalculations,
} from "../utils/formulaEngine.js";
import { DEFAULT_PARAMETER_VALUES } from "../utils/constants.js";
import { AccountType, ParameterType } from "../types/models.js";
import * as XLSX from "xlsx";

/**
 * モデルデータをUI用に整形する
 * @param {import('../types/models.js').FinancialModel} model - 財務モデル
 * @returns {import('../types/models.js').FinancialModel} 整形されたモデルデータ
 */
function prepareModelForUI(model) {
  // modelオブジェクト自体又はaccounts/values/periodsプロパティが存在するかどうか
  // 初期ロード時などでモデルがまだ完全に構築されていないときは、
  // エラーをスローする代わりに、入力をそのまま返す「フェイルセーフ」アプローチ
  if (!model || !model.accounts || !model.values || !model.periods) {
    return model;
  }

  return model;
}

/**
 * 財務モデルの状態と操作を管理するカスタムフック
 * @param {import('../types/models.js').FinancialModel} initialModel - 初期モデル（省略可）
 * @returns {Object} モデル状態と操作関数
 * @returns {Object} 以下のプロパティを持つオブジェクト
 * @returns {import('../types/models.js').FinancialModel} model - 現在の財務モデル
 * @returns {Function} setModel - モデルを直接設定する関数
 * @returns {Object} hfInstance - HyperFormulaインスタンス
 * @returns {boolean} isLoading - ロード中かどうか
 * @returns {Object|null} error - エラー情報
 * @returns {boolean} isDirty - 保存されていない変更があるかどうか
 * @returns {Function} addAccount - 勘定科目を追加する関数
 * @returns {Function} updateAccount - 勘定科目を更新する関数
 * @returns {Function} deleteAccount - 勘定科目を削除する関数
 * @returns {Function} addPeriod - 期間を追加する関数
 * @returns {Function} deletePeriod - 期間を削除する関数
 * @returns {Function} updateCellValue - セル値を更新する関数
 * @returns {Function} updateAccountParameter - 勘定科目のパラメータを更新する関数
 * @returns {Function} removeAccountParameter - 勘定科目のパラメータを削除する関数
 * @returns {Function} resetDefaultParameters - パラメータをデフォルト設定にリセットする関数
 * @returns {Function} togglePeriodActual - 期間の実績/計画フラグを切り替える関数
 * @returns {Function} prepareForUI - モデルをUI用に整形する関数
 */
export function useFinancialModel(initialModel = null) {
  // モデルの状態（初期状態ではロード中を示す一時的なモデルを使用）
  const [model, setModel] = useState(() => {
    if (initialModel) return initialModel;

    // 一時的な初期モデル（ロード中状態）
    return {
      metadata: {
        id: generateId(),
        name: "読み込み中...",
        description: "",
        lastModified: new Date(),
        version: 1,
      },
      accounts: [],
      periods: [],
      values: [],
      isInitialState: true, // 初期状態フラグ
    };
  });

  // HyperFormulaインスタンス - useRefを使わない
  const [hfInstance] = useState(() => initializeHyperFormula());
  // ロード中フラグ
  const [isLoading, setIsLoading] = useState(true);
  // エラー状態
  const [error, setError] = useState(null);
  // 保存状態
  const [isDirty, setIsDirty] = useState(false);
  // 初期化完了フラグ
  const [isInitialized, setIsInitialized] = useState(false);

  // 初期化処理
  useEffect(() => {
    // モデルが既に提供されていたり、初期化済みならスキップ
    if (initialModel || isInitialized) {
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    try {
      // 新しいモデルを作成
      let newModel = createEmptyFinancialModel();
      setModel(newModel);
      setIsInitialized(true);
    } catch (err) {
      console.error("モデル初期化エラー:", err);
      setError("モデルの初期化に失敗しました: " + err.message);
    } finally {
      setIsLoading(false);
    }
  }, [initialModel, isInitialized]);

  // モデルが変更されたらHyperFormulaに反映する
  useEffect(() => {
    if (model && !model.isInitialState) {
      try {
        loadModelToHyperFormula(hfInstance, model);
        // 計算結果をモデルに反映
        const updatedModel = updateModelFromCalculations(hfInstance, model);
        if (
          JSON.stringify(updatedModel.values) !== JSON.stringify(model.values)
        ) {
          setModel(updatedModel);
        }
      } catch (err) {
        console.error("HyperFormula更新エラー: ", err);
        setError("計算エンジンの更新に失敗しました: " + err.message);
      }
    }
  }, [model, hfInstance]);

  /**
   * 参照科目が必要なパラメータにデフォルトの参照科目IDを設定するヘルパー関数
   * @param {Object} parameter - パラメータオブジェクト
   * @param {Array} accounts - 勘定科目リスト
   * @returns {Object} 更新されたパラメータオブジェクト
   */
  const ensureReferenceAccountId = useCallback((parameter, accounts) => {
    // パラメータがないか、参照科目が必要ないタイプの場合はそのまま返す
    if (
      !parameter ||
      (parameter.type !== ParameterType.PERCENTAGE &&
        parameter.type !== ParameterType.PROPORTIONATE)
    ) {
      return parameter;
    }

    // 参照科目IDが既に設定されている場合はそのまま返す
    if (parameter.referenceAccountId) {
      return parameter;
    }

    // 参照科目IDが設定されていない場合は売上高合計を探す
    const revenueTotal = accounts.find(
      (a) => a.accountType === AccountType.REVENUE_TOTAL
    );

    // 売上高合計が見つからない場合は別の重要な指標を探す（例：資産合計など）
    if (!revenueTotal) {
      // BSシート向けのデフォルト参照の場合は売上合計が存在しない可能性があるため、代替の参照を探す
      const alternativeRef = accounts.find(
        (a) =>
          a.accountType === AccountType.ASSET_TOTAL ||
          a.accountType === AccountType.OPERATING_PROFIT
      );

      return {
        ...parameter,
        referenceAccountId: alternativeRef ? alternativeRef.id : null,
      };
    }

    return {
      ...parameter,
      referenceAccountId: revenueTotal ? revenueTotal.id : null,
    };
  }, []);

  /**
   * 財務モデルを設定する
   * @param {import('../types/models.js').FinancialModel} newModel - 新しいモデル
   */
  const setFinancialModel = useCallback((newModel) => {
    setModel({
      ...newModel,
      isInitialState: false, // 初期状態フラグをクリア
    });
    setIsDirty(true);
    setIsInitialized(true);
  }, []);

  /**
   * 勘定科目を追加する
   * @param {Partial<import('../types/models.js').Accounts} accountData - 勘定科目データ
   */
  const addAccount = useCallback((accountData) => {
    setModel((prevModel) => {
      const newAccount = {
        id: generateId(),
        // nullish合体演算子（??）を使用してより明示的に
        code: accountData.code ?? `A${prevModel.accounts.length + 1}`,
        name: accountData.name ?? "新規勘定科目",
        accountType: accountData.accountType ?? AccountType.REVENUE,
        order: prevModel.accounts.length + 1,
        parentId: accountData.parentId ?? null,
        sheetName: accountData.sheetName ?? "PL",
      };

      // CAPEX科目の場合、自動的にPROPORTIONATEパラメータと売上高合計への参照を設定
      if (newAccount.accountType === AccountType.CAPEX) {
        // 売上高合計アカウントを探す
        const revenueTotalAccount = prevModel.accounts.find(
          (a) => a.accountType === AccountType.REVENUE_TOTAL
        );

        // パラメータを設定
        newAccount.parameter = {
          type: ParameterType.PROPORTIONATE,
          value: 5.0, // デフォルト値は5%
          referenceAccountId: revenueTotalAccount
            ? revenueTotalAccount.id
            : "rev-total",
          periodIds: prevModel.periods
            .filter((p) => !p.isActual)
            .map((p) => p.id),
          isEditable: true,
        };
      }

      //   新しいセル値を作成
      const newValues = prevModel.periods.map((period) => ({
        accountId: newAccount.id,
        periodId: period.id,
        value: 0,
        isCalculated: false,
      }));
      return {
        ...prevModel,
        accounts: [...prevModel.accounts, newAccount],
        values: [...prevModel.values, ...newValues],
      };
    });
    setIsDirty(true);
  }, []);

  /**
   * 勘定科目を削除する
   * @param {string} accountId - 勘定科目ID
   */
  const deleteAccount = useCallback((accountId) => {
    setModel((prevModel) => {
      // 関連する値も削除
      const filterValues = prevModel.values.filter(
        (v) => v.accountId !== accountId
      );

      // パラメータからも対象勘定科目を削除
      const updatedParameters = prevModel.parameters.map((param) => ({
        ...param,
        accountIds: param.accountIds.filter((id) => id !== accountId),
      }));
      return {
        ...prevModel,
        accounts: prevModel.accounts.filter((a) => a.id !== accountId),
        values: filterValues,
        parameters: updatedParameters,
      };
    });
    setIsDirty(true);
  }, []);

  /**
   * 期間を追加する
   * @param {Partial<import('../types/models.js').Period>} periodData - 期間データ
   */
  const addPeriod = useCallback(() => {
    setModel((prev) => {
      // 既存の期間をソート
      const sortedPeriods = [...prev.periods].sort(
        (a, b) => b.year - a.year || (b.month || 0) - (a.month || 0)
      );

      // 最新の期間を取得
      const latestPeriod = sortedPeriods[0];
      if (!latestPeriod) return prev;

      console.log("latestPeriod:", latestPeriod);

      // 最新期間のisFromExcelフラグを確認 - 未設定の場合はデフォルトでtrueと見なす
      // 既存のデータはパラメータ計算の対象から除外するための安全措置
      if (latestPeriod.isFromExcel === undefined) {
        latestPeriod.isFromExcel = true;
      }

      // 次の期間を作成
      const nextYear = getNextYear(latestPeriod.year); // 引数はyearのみ
      const nextMonth = latestPeriod.month;
      const newPeriodId = `p-${nextYear}${nextMonth ? `-${nextMonth}` : ""}`;

      // 既存の期間の最大順序を取得
      const maxOrder = Math.max(...prev.periods.map((p) => p.order), 0);

      // 新しい期間を作成
      const newPeriod = {
        id: newPeriodId,
        year: nextYear,
        month: nextMonth,
        isActual: false,
        isFromExcel: false, // ユーザーが手動で追加した期間
        order: maxOrder + 1,
      };

      // 新しいセル値を作成
      const newValues = prev.accounts.map((account) => {
        // 前期間の値を取得
        const prevValue = prev.values.find(
          (v) => v.accountId === account.id && v.periodId === latestPeriod.id
        );

        // 基本値（前期間の値、もしくは0）- 初期値としては単純に前期間の値を使用
        const baseValue = prevValue ? prevValue.value : 0;

        return {
          accountId: account.id,
          periodId: newPeriod.id,
          value: baseValue,
          isCalculated: false, // パラメータ計算は後のcalculateValuesWithParametersで行うため、初期状態ではfalse
          formula: null,
        };
      });

      // 各勘定科目のパラメータの適用期間を更新
      const updatedAccounts = prev.accounts.map((account) => {
        // パラメータがない場合はそのまま返す
        if (!account.parameter) return account;

        // 実際の適用判断はisFromExcelフラグによってcalculateValuesWithParameters内で行われる
        return {
          ...account,
          parameter: {
            ...account.parameter,
            periodIds: [...account.parameter.periodIds, newPeriod.id],
          },
        };
      });

      const intermediateModel = {
        ...prev,
        accounts: updatedAccounts,
        periods: [...prev.periods, newPeriod],
        values: [...prev.values, ...newValues],
      };

      // まず基本的な集計値を計算
      let updatedValues = calculateSummaryValues(intermediateModel);

      // 次にパラメータを使って値を計算 - isFromExcelフラグがfalseの期間（追加された期間）のみに適用
      // calculateValuesWithParameters関数内で期間のisFromExcelフラグをチェックしてパラメータを適用
      updatedValues = calculateValuesWithParameters({
        ...intermediateModel,
        values: updatedValues,
      });

      // 最後に、パラメータ適用後の値で再度集計値を計算
      updatedValues = calculateSummaryValues({
        ...intermediateModel,
        values: updatedValues,
      });

      // 最終モデルを返す
      return {
        ...intermediateModel,
        values: updatedValues,
      };
    });

    setIsDirty(true);
  }, []);

  /**
   * 期間を削除する
   * @param {string} periodId - 期間ID
   */
  const deletePeriod = useCallback((periodId) => {
    setModel((prevModel) => {
      // 関連する値も削除
      const filteredValues = prevModel.values.filter(
        (v) => v.periodId !== periodId
      );

      // 各勘定科目のパラメータから対象期間を削除
      const updatedAccounts = prevModel.accounts.map((account) => {
        // パラメータがない場合はそのまま返す
        if (!account.parameter) return account;

        return {
          ...account,
          parameter: {
            ...account.parameter,
            periodIds: account.parameter.periodIds.filter(
              (id) => id !== periodId
            ),
          },
        };
      });

      return {
        ...prevModel,
        accounts: updatedAccounts,
        periods: prevModel.periods.filter((p) => p.id !== periodId),
        values: filteredValues,
      };
    });

    setIsDirty(true);
  }, []);

  /**
   * セル値を更新する
   * @param {string} accountId - 勘定科目ID
   * @param {string} periodId - 期間ID
   * @param {number} value - 新しい値
   */
  const updateCellValue = useCallback((accountId, periodId, value) => {
    setModel((prevModel) => {
      const valueIndex = prevModel.values.findIndex(
        (v) => v.accountId === accountId && v.periodId === periodId
      );

      const account = prevModel.accounts.find((acc) => acc.id === accountId);
      const period = prevModel.periods.find((p) => p.id === periodId);

      // 値が見つからない場合は処理しない
      if (valueIndex < 0 || !account || !period) {
        return prevModel;
      }

      const newValues = [...prevModel.values];

      // 既存の値を更新
      newValues[valueIndex] = {
        ...newValues[valueIndex],
        value: Number(value),
        isCalculated: false, // 手動入力値なのでfalse
      };

      // 更新された値を含む中間モデル
      const updatedModel = {
        ...prevModel,
        values: newValues,
      };

      // 集計値を計算して更新されたモデルを返す
      return {
        ...updatedModel,
        values: calculateSummaryValues(updatedModel),
      };
    });

    setIsDirty(true);
  }, []);

  /**
   * パラメータを更新する
   * @param {string} accountId - 勘定科目ID
   * @param {Object} parameterUpdates - パラメータの更新内容
   */
  const updateAccountParameter = useCallback(
    (accountId, parameterUpdates) => {
      // 単一のstate更新フローとして実装
      // すべてのパラメータ更新と値の再計算をここで一元的に処理する
      setModel((prevModel) => {
        // 指定されたIDの勘定科目をモデルから検索
        const accountIndex = prevModel.accounts.findIndex(
          (a) => a.id === accountId
        );

        // 指定されたIDの勘定科目がモデルから見つからなければ処理を中止
        if (accountIndex < 0) {
          return prevModel;
        }

        // 既存のmodelのaccountsプロパティ
        const updatedAccounts = [...prevModel.accounts];
        // 既存のmodelのaccountsプロパティのうち、(accountIndex - 1)番目のレコード
        const currentAccount = updatedAccounts[accountIndex];

        // currentAccountのパラメータが存在する場合、currentAccountのパラメータ特定
        // →currentParameterに格納
        // パラメータが存在しない場合は新規作成
        const currentParameter = currentAccount.parameter || {
          type: ParameterType.GROWTH_RATE,
          value: DEFAULT_PARAMETER_VALUES[ParameterType.GROWTH_RATE],
          referenceAccountId: null,
          periodIds: prevModel.periods
            .filter((p) => !p.isFromExcel)
            .map((p) => p.id),
          isEditable: true,
        };

        // パラメータ全体を更新する
        let updatedParameter = null;
        if (parameterUpdates !== null) {
          // パラメータ更新の場合
          updatedParameter = {
            ...currentParameter,
            ...parameterUpdates,
          };

          // PERCENTAGEタイプの場合、参照科目IDが設定されているか確認
          updatedParameter = ensureReferenceAccountId(
            updatedParameter,
            prevModel.accounts
          );
        }

        // 更新対象のレコードを
        updatedAccounts[accountIndex] = {
          ...currentAccount,
          // パラメータだけ更新
          parameter: updatedParameter,
        };

        const updatedModel = {
          ...prevModel,
          accounts: updatedAccounts,
        };

        // パラメータ変更後、関連する値を再計算
        let recalculatedValues = calculateValuesWithParameters(updatedModel);

        // パラメータ変更後に、再度集計値の計算を行う
        recalculatedValues = calculateSummaryValues({
          ...updatedModel,
          values: recalculatedValues,
        });

        return {
          ...updatedModel,
          values: recalculatedValues,
        };
      });

      setIsDirty(true);
    },
    [ensureReferenceAccountId]
  );

  /**
   * 勘定科目のパラメータを削除する
   * @param {string} accountId - 勘定科目ID
   */
  const removeAccountParameter = useCallback((accountId) => {
    setModel((prevModel) => {
      const updatedAccounts = prevModel.accounts.map((account) => {
        if (account.id === accountId) {
          return {
            ...account,
            parameter: null,
          };
        }
        return account;
      });

      const updatedModel = {
        ...prevModel,
        accounts: updatedAccounts,
      };

      // パラメータ削除後、関連する値を再計算
      let recalculatedValues = calculateValuesWithParameters(updatedModel);

      // パラメータ削除後に、再度集計値の計算を行う
      recalculatedValues = calculateSummaryValues({
        ...updatedModel,
        values: recalculatedValues,
      });

      return {
        ...updatedModel,
        values: recalculatedValues,
      };
    });

    setIsDirty(true);
  }, []);

  /**
   * パラメータをデフォルト設定にリセットする
   */
  const resetDefaultParameters = useCallback(() => {
    setModel((prevModel) => {
      // 勘定科目タイプに基づいてデフォルトパラメータを割り当て
      const resetAccounts = prevModel.accounts.map((account) => {
        let parameter = null;

        // 勘定科目タイプに基づいて標準パラメータを割り当て
        if (account.type === AccountType.REVENUE) {
          parameter = {
            type: ParameterType.GROWTH_RATE,
            value: DEFAULT_PARAMETER_VALUES[ParameterType.GROWTH_RATE],
            referenceAccountId: null,
            periodIds: prevModel.periods
              .filter((p) => !p.isFromExcel)
              .map((p) => p.id),
            isEditable: true,
          };
        } else if (account.type === AccountType.COGS) {
          // 売上高合計を参照科目として探す
          const revenueTotal = prevModel.accounts.find(
            (a) => a.type === AccountType.REVENUE_TOTAL
          );

          parameter = {
            type: ParameterType.PERCENTAGE,
            value: DEFAULT_PARAMETER_VALUES[ParameterType.PERCENTAGE],
            referenceAccountId: revenueTotal ? revenueTotal.id : null,
            periodIds: prevModel.periods
              .filter((p) => !p.isFromExcel)
              .map((p) => p.id),
            isEditable: true,
          };
        } else if (account.type === AccountType.SGA) {
          parameter = {
            type: ParameterType.GROWTH_RATE,
            value: DEFAULT_PARAMETER_VALUES[ParameterType.GROWTH_RATE],
            referenceAccountId: null,
            periodIds: prevModel.periods
              .filter((p) => !p.isFromExcel)
              .map((p) => p.id),
            isEditable: true,
          };
        }

        return {
          ...account,
          parameter,
        };
      });

      const updatedModel = {
        ...prevModel,
        accounts: resetAccounts,
      };

      // パラメータリセット後、関連する値を再計算
      let recalculatedValues = calculateValuesWithParameters(updatedModel);

      // パラメータリセット後に、再度集計値の計算を行う
      recalculatedValues = calculateSummaryValues({
        ...updatedModel,
        values: recalculatedValues,
      });

      return {
        ...updatedModel,
        values: recalculatedValues,
      };
    });

    setIsDirty(true);
  }, []);

  // アカウントの更新
  const updateAccount = useCallback(
    (accountId, updates) => {
      setModel((prevModel) => {
        // アカウントを見つける
        const accountIndex = prevModel.accounts.findIndex(
          (acc) => acc.id === accountId
        );

        if (accountIndex === -1) return prevModel;

        // アカウントを更新
        const updatedAccounts = [...prevModel.accounts];
        updatedAccounts[accountIndex] = {
          ...updatedAccounts[accountIndex],
          ...updates,
        };

        return {
          ...prevModel,
          accounts: updatedAccounts,
        };
      });
    },
    [setModel]
  );

  // 勘定科目マッピングの更新
  const updateAccountMapping = useCallback((accountId, mappingData) => {
    setModel((prevModel) => {
      const updatedAccounts = prevModel.accounts.map((account) => {
        if (account.id === accountId) {
          return {
            ...account,
            accountMapping: mappingData,
          };
        }
        return account;
      });

      return {
        ...prevModel,
        accounts: updatedAccounts,
      };
    });
    setIsDirty(true);
  }, []);

  // モデルを返す際にUI用に整形したデータも含める
  return {
    model,
    setModel: setFinancialModel,
    isLoading,
    error,
    isDirty,
    setIsDirty,
    hfInstance,
    addAccount,
    deleteAccount,
    addPeriod,
    deletePeriod,
    updateCellValue,
    updateAccountParameter,
    removeAccountParameter,
    resetDefaultParameters,
    updateAccount,
    updateAccountMapping,
  };
}

export default useFinancialModel;
