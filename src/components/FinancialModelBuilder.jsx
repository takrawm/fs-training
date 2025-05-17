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
import { RELATION_TYPES, RELATION_SUB_TYPES } from "../utils/constants";
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
} from "../models/financialModel";
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
  const flattenedRows = flattenedData?.dataRows || [];
  // マッピングデータ
  const [mappingData, setMappingData] = useState([]);
  // 財務モデル
  const [financialModel, setFinancialModel] = useState(null);

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
    return (
      financialModel?.accounts.filter(
        (account) => account.isParameterReference
      ) || []
    );
  }, [financialModel]);

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

  // パラメータ値更新ハンドラ
  const handleParameterValueChange = useCallback(
    (updatedAccounts) => {
      if (!financialModel) return;
      setFinancialModel({
        ...financialModel,
        accounts: updatedAccounts,
      });
      console.log("パラメータ値が更新されました:", updatedAccounts);
    },
    [financialModel]
  );

  // リレーション設定更新ハンドラ
  const handleRelationChange = useCallback(
    (updatedAccounts) => {
      if (!financialModel) return;
      setFinancialModel({
        ...financialModel,
        accounts: updatedAccounts,
      });
      console.log("リレーション設定が更新されました:", updatedAccounts);
    },
    [financialModel]
  );

  // relationMasterの作成
  const createRelationMaster = useCallback(() => {
    if (!financialModel) return null;
    const { accounts } = financialModel;

    const ppeAccounts = accounts.filter(
      (account) => account.relation?.type === RELATION_TYPES.PPE
    );
    const retainedEarningsAccounts = accounts.filter(
      (account) => account.relation?.type === RELATION_TYPES.RETAINED_EARNINGS
    );
    const workingCapitalAccounts = accounts.filter(
      (account) => account.relation?.type === RELATION_TYPES.WORKING_CAPITAL
    );

    const assetAccounts = ppeAccounts.filter(
      (account) => account.relation?.subType === RELATION_SUB_TYPES.ASSET
    );
    const investmentAccounts = ppeAccounts.filter(
      (account) => account.relation?.subType === RELATION_SUB_TYPES.INVESTMENT
    );
    const depreciationAccounts = ppeAccounts.filter(
      (account) => account.relation?.subType === RELATION_SUB_TYPES.DEPRECIATION
    );
    const retainedEarningsAssetAccounts = retainedEarningsAccounts.filter(
      (account) => account.relation?.subType === RELATION_SUB_TYPES.RETAINED
    );
    const profitAccounts = accounts.filter(
      (account) => account.relation?.subType === RELATION_SUB_TYPES.PROFIT
    );
    const workingCapitalAssetAccounts = workingCapitalAccounts.filter(
      (account) => account.relation?.subType === RELATION_SUB_TYPES.WC_ASSET
    );
    const workingCapitalLiabilityAccounts = workingCapitalAccounts.filter(
      (account) => account.relation?.subType === RELATION_SUB_TYPES.WC_LIABILITY
    );

    return {
      ppe: {
        type: RELATION_TYPES.PPE,
        relations: assetAccounts.map((asset) => {
          const investment = investmentAccounts.find(
            (inv) => inv.accountName === asset.relation?.investmentAccount
          );
          const depreciation = depreciationAccounts.find(
            (dep) => dep.accountName === asset.relation?.depreciationAccount
          );

          return {
            asset: { id: asset.id, name: asset.accountName },
            investment: investment
              ? { id: investment.id, name: investment.accountName }
              : null,
            depreciation: depreciation
              ? { id: depreciation.id, name: depreciation.accountName }
              : null,
          };
        }),
      },
      retainedEarnings: {
        type: RELATION_TYPES.RETAINED_EARNINGS,
        relation:
          retainedEarningsAssetAccounts.map((retained) => {
            const profit = profitAccounts.find(
              (p) => p.accountName === retained.relation?.profitAccount
            );

            return {
              retained: { id: retained.id, name: retained.accountName },
              profit: profit
                ? { id: profit.id, name: profit.accountName }
                : null,
            };
          })[0] || null,
      },
      workingCapital: {
        type: RELATION_TYPES.WORKING_CAPITAL,
        relations: {
          assets: workingCapitalAssetAccounts.map((account) => ({
            id: account.id,
            name: account.accountName,
          })),
          liabilities: workingCapitalLiabilityAccounts.map((account) => ({
            id: account.id,
            name: account.accountName,
          })),
        },
      },
    };
  }, [financialModel]);

  // 期間追加ハンドラ
  const handleAddPeriod = useCallback(() => {
    if (!financialModel) return;

    // 新しい期間を追加して値を計算
    const updatedModel = addNewPeriodToModel(financialModel);

    // デバッグ出力
    console.log("=== 期間追加後のモデル ===");
    console.log("更新前のfinancialModel:", financialModel);
    console.log("更新後のupdatedModel:", updatedModel);
    console.log(
      "新しい期間:",
      updatedModel.periods[updatedModel.periods.length - 1]
    );
    console.log(
      "新しい期間の値の数:",
      updatedModel.values.filter(
        (v) =>
          v.periodId ===
          updatedModel.periods[updatedModel.periods.length - 1].id
      ).length
    );
    console.log("=== デバッグ情報終了 ===");

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

      // 財務モデルを作成
      const newFinancialModel = {
        accounts: aggregatedAccounts,
        periods: [],
        values: [],
        relationMaster: null,
      };
      setFinancialModel(newFinancialModel);

      // 次のステップへ
      setStep(1);
    } else if (step === 1) {
      // ステップ1：親科目設定完了 → ソート済みアカウント確認へ
      if (!financialModel) return;

      // ソートされたアカウントリストを作成
      const sortedAccounts = createSortedAccounts(financialModel.accounts);
      console.log("ソート後のアカウント:", sortedAccounts);

      // 期間情報を作成
      const newPeriods = createPeriods(flattenedData);

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
      // ステップ3：パラメータ分類設定完了 → パラメータ値設定へ
      console.log("ステップ3完了時のアカウント:", financialModel?.accounts);
      // 次のステップへ進むだけ
      setStep(4);
    } else if (step === 4) {
      // ステップ4：パラメータ値設定完了 → リレーション設定へ
      console.log("ステップ4完了時のアカウント:", financialModel?.accounts);
      // 次のステップへ進むだけ
      setStep(5);
    } else if (step === 5) {
      // ステップ5：リレーション設定完了 → 集計結果確認へ
      if (!financialModel) return;

      // relationMasterを更新
      const newRelationMaster = createRelationMaster();

      // 財務モデルを更新
      setFinancialModel({
        ...financialModel,
        relationMaster: newRelationMaster,
      });

      // 財務モデルをコンソールに出力
      console.log("=== リレーション設定完了後の財務モデル ===");
      console.log("財務モデル:", financialModel);
      console.log("アカウント数:", financialModel.accounts.length);
      console.log("期間数:", financialModel.periods.length);
      console.log("値の数:", financialModel.values.length);
      console.log("relationMasterの内容:", newRelationMaster);
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
          // ステップ4：パラメータ値設定
          <ParameterValueSettingTable
            accounts={financialModel?.accounts || []}
            referenceAccounts={referenceAccounts}
            onChange={handleParameterValueChange}
          />
        ) : step === 5 ? (
          // ステップ5：リレーション設定
          <RelationSettingTable
            accounts={financialModel?.accounts || []}
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
