import React, { useState, useEffect, useMemo, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import AccountMappingTable from "./AccountMappingTable";
import ParentAccountSettingTable from "./ParentAccountSettingTable";
import ParameterSettingTable from "./ParameterSettingTable";
import ParameterConfiguration from "./ParameterConfiguration";
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
import { FinancialModel } from "../models/FinancialModel";
import { AccountUtils } from "../utils/accountUtils";
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
  // 財務モデル（最初からFinancialModelクラスを使用）
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

      // 新構造での更新
      const newModel = new FinancialModel();
      newModel.periods = [...financialModel.periods];
      newModel.values = [...financialModel.values];

      // アカウントを適切に分類
      updatedAccounts.forEach((account) => {
        if (AccountUtils.isCFItem(account)) {
          newModel.accounts.addCFItem(account);
        } else {
          newModel.accounts.addRegularItem(account);
        }
      });

      setFinancialModel(newModel);
      console.log("親科目設定が更新されました:", updatedAccounts);
    },
    [financialModel]
  );

  // パラメータ変更ハンドラ
  const handleParamChange = useCallback(
    (updatedAccounts) => {
      if (!financialModel) return;

      // 新構造での更新
      const newModel = new FinancialModel();
      newModel.periods = [...financialModel.periods];
      newModel.values = [...financialModel.values];

      // アカウントを適切に分類
      updatedAccounts.forEach((account) => {
        if (AccountUtils.isCFItem(account)) {
          newModel.accounts.addCFItem(account);
        } else {
          newModel.accounts.addRegularItem(account);
        }
      });

      setFinancialModel(newModel);
      console.log("パラメータ設定が更新されました:", updatedAccounts);
    },
    [financialModel]
  );

  // 期間追加ハンドラ
  const handleAddPeriod = useCallback(() => {
    if (!financialModel) return;

    // デバッグ: FinancialModelインスタンスかどうか確認
    console.log(
      "financialModel instanceof FinancialModel:",
      financialModel instanceof FinancialModel
    );
    console.log("financialModel constructor:", financialModel.constructor.name);
    console.log("financialModel:", financialModel);

    // 新しい期間を追加して値を計算
    const updatedModel = addNewPeriodToModel(financialModel);

    // 財務モデルを更新
    setFinancialModel(updatedModel);
  }, [financialModel]);

  // ステップタイトルを取得
  const getStepTitle = () => {
    switch (step) {
      case 0:
        return `Step ${step}: 勘定科目マッピング設定`;
      case 1:
        return `Step ${step}: 親科目設定`;
      case 2:
        return `Step ${step}: ソート済みアカウント確認`;
      case 3:
        return `Step ${step}: パラメータ設定`;
      case 4:
        return `Step ${step}: キャッシュフロー調整確認`;
      case 5:
        return `Step ${step}: 集計結果確認`;
      default:
        return "";
    }
  };

  // 確定ボタンハンドラ
  const handleSave = () => {
    if (step === 0) {
      // ステップ0：マッピング完了 → 親科目設定へ
      // 集計マップを作成（FinancialModelはまだ作らない）
      const newAggregatedMap = createAggregatedMap(flattenedRows, mappingData);
      console.log("newAggregatedMap: ", newAggregatedMap);
      setAggregatedMap(newAggregatedMap);

      // 次のステップへ
      setStep(1);
    } else if (step === 1) {
      // ステップ1：親科目設定完了 → ソート済みアカウント確認へ
      if (!aggregatedMap) return;

      // まず基本アカウントを取得
      const baseAccounts = Object.values(aggregatedMap).map(
        ({ values, ...account }) => account
      );

      // ソート済みアカウントを作成（SUMMARY_ACCOUNTSが追加される）
      const sortedAccounts = createSortedAccounts(baseAccounts);
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

      // 初回のFinancialModelインスタンス作成
      const newFinancialModel = new FinancialModel();
      newFinancialModel.periods = newPeriods;
      newFinancialModel.values = newAccountValues;

      // 完成されたソート済みアカウントを一度だけ追加
      sortedAccounts.forEach((account) => {
        if (AccountUtils.isCFItem(account)) {
          newFinancialModel.accounts.addCFItem(account);
        } else {
          newFinancialModel.accounts.addRegularItem(account);
        }
      });

      setFinancialModel(newFinancialModel);
      console.log("ステップ1完了時のmodel:", newFinancialModel);

      // 次のステップへ
      setStep(2);
    } else if (step === 2) {
      // ステップ2：ソート済みアカウント確認完了 → パラメータ分類設定へ
      console.log("ステップ2完了時のmodel:", financialModel);
      // 次のステップへ進むだけ
      setStep(3);
    } else if (step === 3) {
      // ステップ3：パラメータ分類設定完了 → パラメータ設定確認へ
      console.log("ステップ3完了時のmodel:", financialModel);
      // 次のステップへ進むだけ
      setStep(4);
    } else if (step === 4) {
      // ステップ4：パラメータ設定確認完了
      //
      // このステップはParameterConfiguration.jsxによる表示専用の確認画面です。
      // ユーザーは既に前のステップで設定したパラメータ内容を確認するだけで、
      // 新たなデータ変更は行いません。
      //
      // したがって、既存のfinancialModelをそのまま次のステップに渡すだけで
      // 十分であり、データの再構築や初期化処理は不要です。

      if (!financialModel) {
        console.error("財務モデルが存在しません");
        return;
      }

      console.log("ステップ4完了時のmodel:", financialModel);
      console.log("確認画面から次のステップへ遷移します");

      // 次のステップへ遷移（step5: 集計結果確認へ）
      setStep(5);
    } else if (step === 5) {
      // ステップ5：集計結果確認（最後のステップなので何もしない）
      console.log("集計結果確認完了");
    }
  };

  const handleParameterTypeChange = (accountId, newType) => {
    const allAccounts = financialModel.accounts.getAllAccounts();
    const newAccount = {
      ...allAccounts.find((a) => a.id === accountId),
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

    const updatedAccounts = allAccounts.map((a) =>
      a.id === accountId ? newAccount : a
    );

    // 新構造での更新
    const newModel = new FinancialModel();
    newModel.periods = [...financialModel.periods];
    newModel.values = [...financialModel.values];

    updatedAccounts.forEach((account) => {
      if (AccountUtils.isCFItem(account)) {
        newModel.accounts.addCFItem(account);
      } else {
        newModel.accounts.addRegularItem(account);
      }
    });

    setFinancialModel(newModel);
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
            data={
              aggregatedMap
                ? Object.values(aggregatedMap).map(
                    ({ values, ...account }) => account
                  )
                : []
            }
            onChange={handleParentAccountChange}
          />
        ) : step === 2 ? (
          // ステップ2：ソート済みアカウント確認
          <SortedAccountsTable
            data={financialModel?.accounts.getAllAccounts() || []}
          />
        ) : step === 3 ? (
          // ステップ3：パラメータ分類設定
          <ParameterSettingTable
            data={financialModel?.accounts.getAllAccounts() || []}
            onChange={handleParamChange}
          />
        ) : step === 4 ? (
          // ステップ4：パラメータ設定確認
          <ParameterConfiguration
            data={financialModel?.accounts.getAllAccounts() || []}
            financialModel={financialModel}
            onChange={handleParamChange}
          />
        ) : step === 5 ? (
          // ステップ5：集計結果確認
          <ResultTableWithTabs
            financialModel={financialModel}
            onAddPeriod={handleAddPeriod}
          />
        ) : null}
      </div>

      {/* ボタンエリア */}
      <div className="table-button-area">
        <button onClick={handleSave} className="btn-primary">
          {step === 5 ? "完了" : "次へ"}
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
