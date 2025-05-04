import React, {
  useState,
  useEffect,
  useMemo,
  useRef,
  useCallback,
} from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import AccountMappingTable from "./AccountMappingTable";
import ParameterSettingTable from "./ParameterSettingTable";
import ParameterValueSettingTable from "./ParameterValueSettingTable";
import RelationSettingTable from "./RelationSettingTable";
import ResultTableWithTabs from "./ResultTableWithTabs";
import {
  createInitialMappingData,
  createAggregatedMap,
  createAggregatedAccounts,
  createAggregatedValue,
  createFinalAccounts,
  createPeriods,
  createAccountValues,
  createAggregatedValueForDisplay,
  getInitialSheetData,
} from "../utils/accountMappingModel";
import {
  createFinancialModel,
  createDisplayDataFromModel,
  addNewPeriodToModel,
} from "../utils/financialCalculations";

// Handsontableのすべてのモジュールを登録
registerAllModules();

/**
 * 勘定科目マッピング設定コンポーネント
 * マルチステップでデータのマッピング、パラメータ設定、結果表示を行います
 */
const AccountMappingSettings = ({
  model,
  flattenedData,
  onUpdateMapping,
  onClose,
  isInitialMapping = false,
}) => {
  // ステップ状態
  const [step, setStep] = useState(0);
  // フラット化済みデータをもとにした行情報
  const flattenedRows = flattenedData?.dataRows || [];

  // マッピングデータ
  const [mappingData, setMappingData] = useState([]);
  // 財務モデルを構成するアカウント
  const [accounts, setAccounts] = useState([]);
  // 集約マップを保持する状態
  const [aggregatedMap, setAggregatedMap] = useState({});
  // 表示用の集計値
  const [aggregatedValue, setAggregatedValue] = useState([]);
  // 期間情報
  const [periods, setPeriods] = useState([]);
  // アカウント値
  const [accountValues, setAccountValues] = useState([]);
  // 財務モデル
  const [financialModel, setFinancialModel] = useState(null);
  // 開発中画面の表示フラグ
  const [showDevelopmentMessage, setShowDevelopmentMessage] = useState(false);

  // 初期マッピングデータをセット
  useEffect(() => {
    if (mappingData.length === 0 && flattenedRows.length > 0) {
      const initial = createInitialMappingData(flattenedRows);
      setMappingData(initial);
    }
  }, [flattenedRows, mappingData.length]);

  // 被参照科目の取得
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
              if (!obj[head]) obj[head] = {};
              updateNestedObjectProperty(obj[head], rest.join("."), value);
            } else {
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

    // パラメータ設定されているアカウントをログ出力（デバッグ用）
    const accountsWithParams = updatedAccounts.filter(
      (account) => account.parameter
    );
    console.log("パラメータ設定済みアカウント:", accountsWithParams);
  }, []);

  // リレーション設定更新ハンドラ
  const handleRelationChange = useCallback((updatedAccounts) => {
    // アカウント配列を更新
    setAccounts(updatedAccounts);
    console.log("リレーション設定が更新されました:", updatedAccounts);

    // リレーション設定されているアカウントをログ出力（デバッグ用）
    const accountsWithRelations = updatedAccounts.filter(
      (account) => account.relation && account.relation.type !== "NONE"
    );
    console.log("リレーション設定済みアカウント:", accountsWithRelations);
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
    setAccountValues(updatedModel.values);

    // 表示用データを更新
    const displayData = createDisplayDataFromModel(updatedModel);
    setAggregatedValue(displayData);
  }, [financialModel]);

  // ステップタイトルを取得
  const getStepTitle = () => {
    switch (step) {
      case 0:
        return "勘定科目マッピング設定";
      case 1:
        return "パラメータ分類設定";
      case 2:
        return "パラメータ値設定";
      case 3:
        return "リレーション設定";
      case 4:
        return showDevelopmentMessage ? "開発情報" : "集計結果確認";
      default:
        return "";
    }
  };

  // 確定ボタンハンドラ
  const handleSave = () => {
    if (step === 0) {
      // ステップ0：マッピング完了 → パラメータ分類設定へ

      // 集計マップを作成
      const newAggregatedMap = createAggregatedMap(flattenedRows, mappingData);
      setAggregatedMap(newAggregatedMap);

      // 集計アカウントを作成
      const aggregatedAccounts = createAggregatedAccounts(newAggregatedMap);

      // 表示用集計値を作成
      const aggValue = createAggregatedValue(
        aggregatedAccounts,
        newAggregatedMap
      );
      setAggregatedValue(aggValue);

      // アカウントリストを設定
      setAccounts(aggregatedAccounts);

      // 次のステップへ
      setStep(1);
    } else if (step === 1) {
      // ステップ1：パラメータ分類設定完了 → パラメータ値設定へ
      console.log("ステップ1完了時のアカウント:", accounts);
      // 次のステップへ進むだけ
      setStep(2);
    } else if (step === 2) {
      // ステップ2：パラメータ値設定完了 → リレーション設定へ
      console.log("ステップ2完了時のアカウント:", accounts);

      // パラメータ値が未設定のアカウントにデフォルト値を設定する
      const updatedAccounts = [...accounts].map((account) => {
        // パラメータタイプに応じてデフォルト値を設定
        if (account.parameterType && !account.parameter) {
          switch (account.parameterType) {
            case "GROWTH_RATE":
              return {
                ...account,
                parameter: {
                  growthRate: 0.1, // デフォルト10%成長
                  referenceAccountName: null,
                  referenceAccountId: null,
                },
              };
            case "PERCENTAGE":
              // 被参照科目があれば最初のものを使用
              const defaultRefAccount =
                referenceAccounts.length > 0 ? referenceAccounts[0] : null;
              return {
                ...account,
                parameter: {
                  percentage: 0.3, // デフォルト30%
                  referenceAccountName: defaultRefAccount?.accountName || null,
                  referenceAccountId: defaultRefAccount?.id || null,
                },
              };
            case "PROPORTIONATE":
              // 被参照科目があれば最初のものを使用
              const defaultPropRefAccount =
                referenceAccounts.length > 0 ? referenceAccounts[0] : null;
              return {
                ...account,
                parameter: {
                  referenceAccountName:
                    defaultPropRefAccount?.accountName || null,
                  referenceAccountId: defaultPropRefAccount?.id || null,
                },
              };
            default:
              return account;
          }
        }
        return account;
      });

      console.log("デフォルト値反映後のアカウント:", updatedAccounts);

      // 更新されたアカウントを設定
      setAccounts(updatedAccounts);

      // 次のステップ（リレーション設定）へ
      setStep(3);
    } else if (step === 3) {
      // ステップ3：リレーション設定完了 → 結果表示へ
      console.log("ステップ3（リレーション設定）完了時のアカウント:", accounts);

      // パラメータ設定されているアカウントをログ出力（デバッグ用）
      const accountsWithParams = accounts.filter(
        (account) => account.parameter
      );
      console.log("パラメータ設定済みアカウント:", accountsWithParams);

      // リレーション設定されているアカウントをログ出力
      const accountsWithRelations = accounts.filter(
        (account) => account.relation && account.relation.type !== "NONE"
      );
      console.log("リレーション設定済みアカウント:", accountsWithRelations);

      // 最終的なアカウントリストを作成
      const finalAccounts = createFinalAccounts(accounts);
      console.log("最終アカウント:", finalAccounts);

      // パラメータとリレーションが設定されているfinalAccountsを確認
      const finalAccountsWithParams = finalAccounts.filter(
        (account) => account.parameter
      );
      const finalAccountsWithRelations = finalAccounts.filter(
        (account) => account.relation && account.relation.type !== "NONE"
      );
      console.log(
        "パラメータが設定されているfinalAccounts:",
        finalAccountsWithParams
      );
      console.log(
        "リレーションが設定されているfinalAccounts:",
        finalAccountsWithRelations
      );

      // 期間情報を作成
      const newPeriods = createPeriods(flattenedData);
      setPeriods(newPeriods);

      // アカウント値を作成
      const newAccountValues = createAccountValues(
        aggregatedMap,
        newPeriods,
        finalAccounts
      );
      setAccountValues(newAccountValues);

      // 統合された財務モデルを作成
      const newFinancialModel = createFinancialModel(
        finalAccounts,
        newPeriods,
        newAccountValues
      );
      setFinancialModel(newFinancialModel);

      // 表示用最終集計値を作成
      const aggregatedValueForDisplay = createAggregatedValueForDisplay(
        finalAccounts,
        newPeriods,
        newAccountValues
      );

      // 集計値を更新
      setAggregatedValue(aggregatedValueForDisplay);

      // アカウントリストを更新
      setAccounts(finalAccounts);
      console.log("finalAccounts:", finalAccounts);

      // 開発中フラグをリセット
      setShowDevelopmentMessage(false);

      // 次のステップへ
      setStep(4);
    } else {
      // 完了ボタンが押された時は開発中の画面を表示
      setShowDevelopmentMessage(true);
    }
  };

  return (
    <div className="account-mapping-settings">
      <h2>{getStepTitle()}</h2>

      {step === 0 ? (
        // ステップ0：勘定科目マッピング設定
        <AccountMappingTable
          data={mappingData}
          onChange={handleMappingChange}
        />
      ) : step === 1 ? (
        // ステップ1：パラメータ分類設定
        <ParameterSettingTable data={accounts} onChange={handleParamChange} />
      ) : step === 2 ? (
        // ステップ2：パラメータ値設定
        <ParameterValueSettingTable
          accounts={accounts}
          referenceAccounts={referenceAccounts}
          onChange={handleParameterValueChange}
        />
      ) : step === 3 ? (
        // ステップ3：リレーション設定
        <RelationSettingTable
          accounts={accounts}
          onChange={handleRelationChange}
        />
      ) : showDevelopmentMessage ? (
        // 開発中メッセージ
        <div
          className="mapping-table-container"
          style={{
            height: "60vh",
            width: "100%",
            overflow: "auto",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
        >
          <h3>開発中です</h3>
        </div>
      ) : (
        // ステップ4：集計結果確認（タブ付きテーブル）と期間追加ボタン
        <div>
          <div style={{ marginBottom: "10px" }}>
            <button
              onClick={handleAddPeriod}
              className="btn-secondary"
              style={{ marginRight: "10px" }}
            >
              期間を追加
            </button>
          </div>
          <ResultTableWithTabs
            aggregatedValue={aggregatedValue}
            accounts={accounts}
            periods={periods}
          />
        </div>
      )}

      {/* ボタンエリア */}
      <div className="mapping-buttons" style={{ marginTop: 20 }}>
        <button
          onClick={handleSave}
          className="btn-primary"
          style={{ marginRight: 10 }}
        >
          {step === 4 && !showDevelopmentMessage
            ? "完了"
            : step === 4 && showDevelopmentMessage
            ? "閉じる"
            : "次へ"}
        </button>
        <button
          onClick={() => {
            if (step === 0) onClose();
            else if (showDevelopmentMessage) {
              setShowDevelopmentMessage(false);
            } else setStep(step - 1);
          }}
          className="btn-secondary"
        >
          {step === 0 ? "キャンセル" : "戻る"}
        </button>
      </div>
    </div>
  );
};

export default AccountMappingSettings;
