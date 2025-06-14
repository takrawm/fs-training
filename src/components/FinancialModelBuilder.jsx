import React, { useState, useEffect, useMemo, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import AccountMappingTable from "./AccountMappingTable";
import ParentAccountSettingTable from "./ParentAccountSettingTable";
import ParameterSettingTable from "./ParameterSettingTable";
import ParameterConfiguration from "./ParameterConfiguration";
import CFAdjustmentTable from "./CFAdjustmentTable";
import ResultTableWithTabs from "./ResultTableWithTabs";
import SortedAccountsTable from "./SortedAccountsTable";
import { PARAMETER_TYPES, DEFAULT_PARAMETER_VALUES } from "../utils/constants";
import {
  createInitialMappingData,
  createAggregatedMap,
  createSortedAccounts,
} from "../models/account";
import { createAccountValues } from "../models/accountValue";
import { createPeriods } from "../models/period";
import { addNewPeriodToModel } from "../utils/financialCalculations";
import "../styles/FinancialModelBuilder.css";

// Handsontableのすべてのモジュールを登録
registerAllModules();

/**
 * 勘定科目マッピング設定コンポーネント
 * マルチステップでデータのマッピング、パラメータ設定、結果表示を行います
 */
const FinancialModelBuilder = ({ model, flattenedData }) => {
  // ステップ状態
  const [step, setStep] = useState(0);
  // フラット化済みデータをもとにした行情報
  // [
  //   ['商品売上', 100, 120, 140, 160, 180, 200, 220, 240, 260],
  //   ['サービス売上', 10, 25, 35, 45, 55, 65, 75, 85, 95],
  //   ...
  // ]
  const flattenedRows = flattenedData?.dataRows || [];
  // マッピングデータ
  const [mappingData, setMappingData] = useState([]);
  // 財務モデル
  const [financialModel, setFinancialModel] = useState(null);
  // 集計マップ
  const [aggregatedMap, setAggregatedMap] = useState(null);

  // 初期マッピングデータをセット
  useEffect(() => {
    if (mappingData.length === 0 && flattenedRows.length > 0) {
      const initialMappingData = createInitialMappingData(flattenedRows);
      // [
      // {id: 'row-0', originalAccount: '商品売上', modelAccount: '商品売上'},
      // {id: 'row-1', originalAccount: 'サービス売上', modelAccount: 'サービス売上'}
      // ]
      console.log("initialMappingData: ", initialMappingData);
      setMappingData(initialMappingData);
    }
  }, [flattenedRows, mappingData.length]);

  // マッピングデータ変更ハンドラ
  const handleMappingChange = useCallback(
    (changes) => {
      if (!changes) return;
      const newData = [...mappingData];
      changes.forEach(([r, prop, , newVal]) => {
        if (newVal != null) newData[r][prop] = newVal;
      });
      setMappingData(newData);
    },
    [mappingData]
  );

  // 親科目設定更新ハンドラ
  const handleParentAccountChange = useCallback(
    (updatedAccounts) => {
      if (!financialModel) return;
      setFinancialModel({
        ...financialModel,
        accounts: updatedAccounts,
      });
      console.log("親科目設定が更新されました:", updatedAccounts);
    },
    [financialModel]
  );

  // パラメータ変更ハンドラ
  const handleParamChange = useCallback(
    (updatedAccounts) => {
      if (!financialModel) return;
      setFinancialModel({
        ...financialModel,
        accounts: updatedAccounts,
      });
      console.log("パラメータ設定が更新されました:", updatedAccounts);
    },
    [financialModel]
  );

  // 期間追加ハンドラ
  const handleAddPeriod = useCallback(() => {
    if (!financialModel) return;

    // 新しい期間を追加して値を計算
    const updatedModel = addNewPeriodToModel(financialModel);

    // 財務モデルを更新
    setFinancialModel(updatedModel);
  }, [financialModel]);

  // ステップタイトルを取得
  const getStepTitle = () => {
    switch (step) {
      case 0:
        return "勘定科目マッピング設定";
      case 1:
        return "親科目設定";
      case 2:
        return "ソート済みアカウント確認";
      case 3:
        return "パラメータ分類設定";
      case 4:
        return "パラメータ設定確認";
      case 5:
        return "CF調整設定";
      case 6:
        return "集計結果確認";
      default:
        return "";
    }
  };

  // 確定ボタンハンドラ
  const handleSave = () => {
    if (step === 0) {
      // ステップ0：マッピング完了 → 親科目設定へ
      // 集計マップを作成
      const newAggregatedMap = createAggregatedMap(flattenedRows, mappingData);
      console.log("newAggregatedMap: ", newAggregatedMap);
      setAggregatedMap(newAggregatedMap);

      // 財務モデルを作成（集計マップから直接作成）
      const newFinancialModel = {
        accounts: Object.values(newAggregatedMap).map(
          ({ values, ...rest }) => rest
        ),
        periods: [],
        values: [],
      };
      setFinancialModel(newFinancialModel);

      // 次のステップへ
      setStep(1);
    } else if (step === 1) {
      // ステップ1：親科目設定完了 → ソート済みアカウント確認へ
      if (!financialModel || !aggregatedMap) return;

      // ソートされたアカウントリストを作成
      const sortedAccounts = createSortedAccounts(financialModel.accounts);
      console.log("sortedAccounts:", sortedAccounts);

      // 期間情報を作成
      const newPeriods = createPeriods(flattenedData);

      // アカウント値を作成
      const newAccountValues = createAccountValues(
        aggregatedMap,
        newPeriods,
        sortedAccounts
      );
      console.log("newAccountValues:", newAccountValues);

      // 財務モデルを更新
      setFinancialModel({
        ...financialModel,
        accounts: sortedAccounts,
        periods: newPeriods,
        values: newAccountValues,
      });

      // 次のステップへ
      setStep(2);
    } else if (step === 2) {
      // ステップ2：ソート済みアカウント確認完了 → パラメータ分類設定へ
      console.log("ステップ2完了時のアカウント:", financialModel?.accounts);
      // 次のステップへ進むだけ
      setStep(3);
    } else if (step === 3) {
      // ステップ3：パラメータ分類設定完了 → パラメータ設定確認へ
      console.log("ステップ3完了時のアカウント:", financialModel?.accounts);
      // 次のステップへ進むだけ
      setStep(4);
    } else if (step === 4) {
      /***** パラメータ設定確認 (Step 4) *****/
      // ParameterConfiguration で表示されているデフォルト値や参照設定を
      // ボタン押下（Next）時に accounts 配列へ確定反映させる
      if (!financialModel) return;

      const updatedAccounts = financialModel.accounts.map((account) => {
        const newAccount = { ...account };

        // 1. 単一値パラメータ型（成長率 / 他科目割合）
        //    画面遷移時に表示したデフォルト値がまだ保存されていないケースを補完
        const singleValueTypes = [
          PARAMETER_TYPES.GROWTH_RATE,
          PARAMETER_TYPES.PERCENTAGE,
        ];

        if (
          singleValueTypes.includes(newAccount.parameterType) &&
          newAccount.parameterValue == null
        ) {
          const paramKey = Object.keys(PARAMETER_TYPES).find(
            (k) => PARAMETER_TYPES[k] === newAccount.parameterType
          );
          newAccount.parameterValue = DEFAULT_PARAMETER_VALUES[paramKey] ?? 0;
        }

        // 2. 参照型／期末残高+/-変動型／他科目連動型
        //    デフォルトで定義済みの parameterReferenceAccounts が onChange 未発火で
        //    undefined のままの場合は空配列を入れて後段エラーを防ぐ
        if (
          [
            PARAMETER_TYPES.CALCULATION,
            PARAMETER_TYPES.BALANCE_AND_CHANGE,
            PARAMETER_TYPES.PROPORTIONATE,
          ].includes(newAccount.parameterType) &&
          !Array.isArray(newAccount.parameterReferenceAccounts)
        ) {
          newAccount.parameterReferenceAccounts = [];
        }

        return newAccount;
      });

      // FinancialModel に確定値を保存
      setFinancialModel({
        ...financialModel,
        accounts: updatedAccounts,
      });

      console.log("ステップ4でパラメータ設定を確定:", updatedAccounts);

      // 次のステップへ遷移（step5: CF調整設定へ）
      setStep(5);
    } else if (step === 5) {
      // ステップ5：CF調整設定完了 → 集計結果確認へ
      console.log("ステップ5完了時のアカウント:", financialModel?.accounts);
      // 次のステップへ進むだけ
      setStep(6);
    } else if (step === 6) {
      // ステップ6：集計結果確認（最後のステップなので何もしない）
      console.log("集計結果確認完了");
    }
  };

  const handleParameterTypeChange = (accountId, newType) => {
    const newAccount = {
      ...financialModel.accounts.find((a) => a.id === accountId),
    };
    newAccount.parameterType = newType;

    // パラメータタイプが変更された場合、関連する値をリセット
    if (newType === PARAMETER_TYPES.CALCULATION) {
      if (!Array.isArray(newAccount.parameterReferenceAccounts)) {
        newAccount.parameterReferenceAccounts = [];
      }
    } else {
      newAccount.parameterReferenceAccounts = [];
    }

    const updatedAccounts = financialModel.accounts.map((a) =>
      a.id === accountId ? newAccount : a
    );
    setFinancialModel({
      ...financialModel,
      accounts: updatedAccounts,
    });
  };

  return (
    <>
      {/* タイトルエリア */}
      <div className="table-title-area">
        <h2>{getStepTitle()}</h2>
      </div>

      {/* テーブルコンテンツエリア */}
      <div className="table-content-area">
        {step === 0 ? (
          // ステップ0：勘定科目マッピング設定
          <AccountMappingTable
            data={mappingData}
            onChange={handleMappingChange}
          />
        ) : step === 1 ? (
          // ステップ1：親科目設定
          <ParentAccountSettingTable
            data={financialModel?.accounts || []}
            onChange={handleParentAccountChange}
          />
        ) : step === 2 ? (
          // ステップ2：ソート済みアカウント確認
          <SortedAccountsTable data={financialModel?.accounts || []} />
        ) : step === 3 ? (
          // ステップ3：パラメータ分類設定
          <ParameterSettingTable
            data={financialModel?.accounts || []}
            onChange={handleParamChange}
          />
        ) : step === 4 ? (
          // ステップ4：パラメータ設定確認
          <ParameterConfiguration
            data={financialModel?.accounts || []}
            financialModel={financialModel}
            onChange={handleParamChange}
          />
        ) : step === 5 ? (
          // ステップ5：CF調整設定
          <CFAdjustmentTable
            data={financialModel?.accounts || []}
            onChange={handleParamChange}
          />
        ) : step === 6 ? (
          // ステップ6：集計結果確認
          <ResultTableWithTabs
            financialModel={financialModel}
            onAddPeriod={handleAddPeriod}
          />
        ) : null}
      </div>

      {/* ボタンエリア */}
      <div className="table-button-area">
        <button onClick={handleSave} className="btn-primary">
          {step === 6 ? "完了" : "次へ"}
        </button>
        <button
          onClick={() => {
            console.log("戻るボタンがクリックされました。現在のstep:", step);
            setStep(step - 1);
          }}
          className="btn-secondary"
          disabled={step === 0}
        >
          {step === 0 ? "キャンセル" : "戻る"}
        </button>
      </div>
    </>
  );
};

export default FinancialModelBuilder;
