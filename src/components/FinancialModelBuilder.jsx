import React, { useState, useEffect, useMemo, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import AccountMappingTable from "./AccountMappingTable";
import ParentAccountSettingTable from "./ParentAccountSettingTable";
import ParameterSettingTable from "./ParameterSettingTable";
import ParameterValueSettingTable from "./ParameterValueSettingTable";
import RelationSettingTable from "./RelationSettingTable";
import ResultTableWithTabs from "./ResultTableWithTabs";
import SortedAccountsTable from "./SortedAccountsTable";
import {
  createInitialMappingData,
  createAggregatedMap,
  createAggregatedAccounts,
  createSortedAccounts,
  createPeriods,
} from "../models/account";
import {
  createFinancialModel,
  createAccountValues,
  addNewPeriodToModel,
} from "../models/financialModel";
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
  const flattenedRows = flattenedData?.dataRows || [];
  // マッピングデータ
  const [mappingData, setMappingData] = useState([]);
  // 財務モデルを構成するアカウント
  const [accounts, setAccounts] = useState([]);
  // 期間情報
  const [periods, setPeriods] = useState([]);
  // 財務モデル
  const [financialModel, setFinancialModel] = useState(null);
  // アカウント値
  const [accountValues, setAccountValues] = useState([]);

  // 初期マッピングデータをセット
  useEffect(() => {
    if (mappingData.length === 0 && flattenedRows.length > 0) {
      const initialMappingData = createInitialMappingData(flattenedRows);
      console.log("initialMappingData: ", initialMappingData);
      setMappingData(initialMappingData);
    }
  }, [flattenedRows, mappingData.length]);

  // 被参照科目の取得（パラメータ値設定の際に渡される）
  const referenceAccounts = useMemo(() => {
    return accounts.filter((account) => account.isParameterReference);
  }, [accounts]);

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
  const handleParentAccountChange = useCallback((updatedAccounts) => {
    // アカウント配列を更新
    setAccounts(updatedAccounts);
    console.log("親科目設定が更新されました:", updatedAccounts);
  }, []);

  // パラメータ変更ハンドラ
  const handleParamChange = useCallback(
    (changes) => {
      if (!changes) return;

      // 更新されたアカウントを作成
      const updatedAccounts = [...accounts];

      changes.forEach(([r, prop, , newVal]) => {
        if (newVal != null) {
          // プロパティをネストしてアクセス・更新するための関数
          const updateNestedObjectProperty = (obj, path, value) => {
            if (path.includes(".")) {
              const [head, ...rest] = path.split(".");
              // プロパティが存在しない場合には空オブジェクトを作ってネストしていく
              if (!obj[head]) obj[head] = {};
              updateNestedObjectProperty(obj[head], rest.join("."), value);
            } else {
              // 選択されたプロパティ
              obj[path] = value;
            }
          };

          // アカウントオブジェクトのコピーを作成
          const account = { ...updatedAccounts[r] };

          // 特別な処理が必要なプロパティ
          if (prop === "relation.type") {
            if (!account.relation)
              account.relation = { type: "NONE", subType: null };
            account.relation.type = newVal;

            // typeがNONEの場合はsubTypeをnullにリセット
            if (newVal === "NONE" || !newVal) {
              account.relation.subType = null;
            }
          } else if (prop === "relation.subType") {
            if (!account.relation)
              account.relation = { type: "NONE", subType: null };
            account.relation.subType = newVal;
          } else {
            // 一般的なプロパティの更新
            updateNestedObjectProperty(account, prop, newVal);
          }

          // 更新済みアカウントを配列に戻す
          updatedAccounts[r] = account;
        }
      });

      setAccounts(updatedAccounts);
    },
    [accounts]
  );

  // パラメータ値更新ハンドラ
  const handleParameterValueChange = useCallback((updatedAccounts) => {
    // アカウント配列を更新
    setAccounts(updatedAccounts);
    console.log("パラメータ値が更新されました:", updatedAccounts);
  }, []);

  // リレーション設定更新ハンドラ
  const handleRelationChange = useCallback((updatedAccounts) => {
    // アカウント配列を更新
    setAccounts(updatedAccounts);
    console.log("リレーション設定が更新されました:", updatedAccounts);
  }, []);

  // 期間追加ハンドラ
  const handleAddPeriod = useCallback(() => {
    if (!financialModel) return;

    // 新しい期間を追加して値を計算
    const updatedModel = addNewPeriodToModel(financialModel);

    // 財務モデルを更新
    setFinancialModel(updatedModel);

    // 各状態を更新
    setAccounts(updatedModel.accounts);
    setPeriods(updatedModel.periods);
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
        return "パラメータ値設定";
      case 5:
        return "リレーション設定";
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

      // 集計アカウントを作成
      const aggregatedAccounts = createAggregatedAccounts(newAggregatedMap);
      console.log("aggregatedAccounts: ", aggregatedAccounts);

      // アカウントリストを設定
      setAccounts(aggregatedAccounts);

      // 次のステップへ
      setStep(1);
    } else if (step === 1) {
      // ステップ1：親科目設定完了 → ソート済みアカウント確認へ
      // ソートされたアカウントリストを作成
      const sortedAccounts = createSortedAccounts(accounts);
      console.log("ソート後のアカウント:", sortedAccounts);

      // アカウントリストを更新
      setAccounts(sortedAccounts);

      // 期間情報を作成
      const newPeriods = createPeriods(flattenedData);
      setPeriods(newPeriods);

      // 集計マップを作成
      const newAggregatedMap = createAggregatedMap(flattenedRows, mappingData);
      console.log("newAggregatedMap: ", newAggregatedMap);

      // アカウント値を作成
      const newAccountValues = createAccountValues(
        newAggregatedMap,
        newPeriods,
        sortedAccounts
      );
      console.log("作成されたアカウント値:", newAccountValues);

      // アカウント値を更新
      setAccountValues(newAccountValues);

      // 次のステップへ
      setStep(2);
    } else if (step === 2) {
      // ステップ2：ソート済みアカウント確認完了 → パラメータ分類設定へ
      console.log("ステップ2完了時のアカウント:", accounts);
      // 次のステップへ進むだけ
      setStep(3);
    } else if (step === 3) {
      // ステップ3：パラメータ分類設定完了 → パラメータ値設定へ
      console.log("ステップ3完了時のアカウント:", accounts);
      // 次のステップへ進むだけ
      setStep(4);
    } else if (step === 4) {
      // ステップ4：パラメータ値設定完了 → リレーション設定へ
      console.log("ステップ4完了時のアカウント:", accounts);
      // 次のステップへ進むだけ
      setStep(5);
    } else if (step === 5) {
      // ステップ5：リレーション設定完了 → 集計結果確認へ
      // 統合された財務モデルを作成
      const newFinancialModel = createFinancialModel(
        accounts,
        periods,
        accountValues
      );
      setFinancialModel(newFinancialModel);

      // 財務モデルをコンソールに出力
      console.log("=== リレーション設定完了後の財務モデル ===");
      console.log("財務モデル:", newFinancialModel);
      console.log("アカウント数:", newFinancialModel.accounts.length);
      console.log("期間数:", newFinancialModel.periods.length);
      console.log("値の数:", newFinancialModel.values.length);
      console.log(
        "リレーション設定のあるアカウント:",
        newFinancialModel.accounts.filter(
          (a) => a.relation && a.relation.type !== "NONE"
        ).length
      );
      console.log("=== 財務モデルのログ終了 ===");

      // 次のステップへ
      setStep(6);
    }
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
            data={accounts}
            onChange={handleParentAccountChange}
          />
        ) : step === 2 ? (
          // ステップ2：ソート済みアカウント確認
          <SortedAccountsTable data={accounts} />
        ) : step === 3 ? (
          // ステップ3：パラメータ分類設定
          <ParameterSettingTable data={accounts} onChange={handleParamChange} />
        ) : step === 4 ? (
          // ステップ4：パラメータ値設定
          <ParameterValueSettingTable
            accounts={accounts}
            referenceAccounts={referenceAccounts}
            onChange={handleParameterValueChange}
          />
        ) : step === 5 ? (
          // ステップ5：リレーション設定
          <RelationSettingTable
            accounts={accounts}
            onChange={handleRelationChange}
          />
        ) : (
          // ステップ6：集計結果確認（タブ付きテーブル）
          <ResultTableWithTabs
            financialModel={financialModel}
            onAddPeriod={handleAddPeriod}
          />
        )}
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
