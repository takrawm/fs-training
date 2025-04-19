import React, { useState, useEffect, useCallback, useMemo } from "react";
import DataTable from "./DataTable.jsx";
import { useFinancialModel } from "../hooks/useFinancialModel.js";
import { useExcelImport } from "../hooks/useExcelImport.js";

/**
 * 財務モデルエディタコンポーネント
 * @param {Object} props - コンポーネントプロパティ
 * @param {string} props.excelUrl - インポートするExcelファイルのURL（省略可）
 * @returns {JSX.Element} 財務モデルエディタ
 */

function FinancialModelEditor({ excelUrl }) {
  // タブの状態
  const [activeTab, setActiveTab] = useState("data");
  // パラメータグループの折りたたみ状態を管理（すべてのシートで共有）
  const [isParamGroupCollapsed, setIsParamGroupCollapsed] = useState(false);

  // 財務モデルフックの利用
  const {
    model,
    setModel,
    isLoading: modelLoading,
    error: modelError,
    isDirty,
    hfInstance,
    addAccount,
    deleteAccount,
    addPeriod,
    deletePeriod,
    updateCellValue,
    updateAccountParameter,
    addParameter,
    deleteParameter,
    updateAccount,
  } = useFinancialModel();

  //   Excelインポートフックの利用
  const {
    isLoading: importLoading,
    error: importError,
    importExcelFromUrl,
  } = useExcelImport();

  //   Excelファイルのインポート
  useEffect(() => {
    if (!excelUrl) return;

    const loadExcel = async () => {
      try {
        const importModel = await importExcelFromUrl(excelUrl);
        if (importModel) {
          setModel(importModel);
        }
      } catch (err) {
        console.error("Excelインポートエラー：", err);
      }
    };

    loadExcel();
  }, [excelUrl, importExcelFromUrl, setModel]);

  // パラメータ更新ハンドラー
  const handleUpdateParameter = React.useCallback(
    (accountId, parameterUpdates) => {
      if (parameterUpdates) {
        // パラメータを更新
        updateAccountParameter(accountId, parameterUpdates);
      } else {
        // パラメータを削除
        updateAccountParameter(accountId, null);
      }
    },
    [updateAccountParameter]
  );

  // パラメータグループの折りたたみトグル
  const handleToggleParamGroup = useCallback(() => {
    setIsParamGroupCollapsed((prev) => !prev);
  }, []);

  // 期間の実績/計画切り替えハンドラー
  const handleTogglePeriodActual = useCallback(
    (periodId) => {
      const updatedPeriods = model.periods.map((period) => {
        if (period.id === periodId) {
          return { ...period, isActual: !period.isActual };
        }
        return period;
      });

      setModel((prev) => ({
        ...prev,
        periods: updatedPeriods,
      }));
    },
    [model.periods]
  );

  // シート別にアカウントをフィルタリングする関数
  const getSheetAccounts = useCallback(
    (sheetName) => {
      if (!model || !model.accounts) return [];
      // accountsの配列
      return model.accounts.filter(
        (account) => account.sheetName === sheetName
      );
    },
    [model]
  );

  // シート別モデルを作成する関数
  const getSheetModel = useCallback(
    (sheetName) => {
      if (!model || !model.accounts) return null;

      // シートに属するアカウントのIDリスト
      const sheetAccountIds = getSheetAccounts(sheetName).map((acc) => acc.id);

      // シート別モデルを作成
      return {
        ...model,
        accounts: getSheetAccounts(sheetName),
        // シート別のモデルを作成する際に、そのシートに関連する値（セル値）だけをフィルタリング
        values: model.values.filter((value) =>
          sheetAccountIds.includes(value.accountId)
        ),
        // クロスシート参照用に全アカウントリストを保持
        allAccounts: model.accounts,
      };
    },
    [model, getSheetAccounts]
  );

  // ローディング状態（グローバルなローディング状態）
  const isLoading = modelLoading || importLoading;

  // エラー状態
  const error = modelError || importError;

  // ローディング中かどうか（実際のUIに表示する用）
  const isModelInitializing = model?.metadata?.name === "読み込み中...";
  const shouldShowLoading = isLoading || importLoading || isModelInitializing;

  const handleCellChange = useCallback(
    ({ type, accountId, ...rest }) => {
      if (type === "paramValue") {
        // ... existing code ...
      } else if (type === "referenceAccount") {
        // ... existing code ...
      } else if (type === "cellValue") {
        // ... existing code ...
      } else if (type === "paramType") {
        // ... existing code ...
      } else if (type === "cashFlowElement") {
        // キャッシュフロー要素の更新
        const { cashFlowElement } = rest;
        updateAccount(accountId, {
          cashFlowElement,
        });
      }
    },
    [model, updateAccount]
  );

  return (
    <div
      className="financial-model-editor"
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        overflow: "hidden",
      }}
    >
      {shouldShowLoading ? (
        <div className="loading-overlay">読み込み中...</div>
      ) : error ? (
        <div className="error-message">エラーが発生しました：{error}</div>
      ) : (
        <>
          <div className="editor-header">
            <h2>{model.metadata.name}</h2>
            <div className="tab-navigation">
              <button
                className={activeTab === "data" ? "active" : ""}
                onClick={() => setActiveTab("data")}
              >
                データ
              </button>
              <button
                className={activeTab === "parameters" ? "active" : ""}
                onClick={() => setActiveTab("parameters")}
              >
                パラメータ設定
              </button>
            </div>
          </div>

          <div
            className="editor-content"
            style={{
              // flex-grow: 1; flex-shrink: 1; flex-basis: 0%と同等
              // flex-grow: 1の部分で、これが「利用可能な空間をどれだけ占めるか」を制御
              flex: 1,
              overflow: "auto",
              display: "flex",
              flexDirection: "column",
            }}
          >
            {activeTab === "data" && (
              <div
                // "PL"などのh3タグとDataTableの縦並びを親要素いっぱいに広げつつ、
                // paddingを15px設ける
                style={{
                  padding: "15px",
                  width: "100%",
                }}
              >
                {["PL", "BS", "CAPEX", "CS"].map((sheetName, index, array) => {
                  const sheetModel = getSheetModel(sheetName);

                  // シートを表示すべきかどうかの条件チェック
                  const shouldRenderSheet =
                    sheetModel &&
                    sheetModel.accounts.length > 0 &&
                    (model.sheets?.includes(sheetName) ||
                      // モデルにsheetsプロパティが存在しないときは
                      // "PL"のみレンダリングする
                      (!model.sheets && sheetName === "PL"));

                  // 条件を満たさなければnullを返す
                  // Reactはnullをレンダリングしない）
                  if (!shouldRenderSheet) return null;

                  // 条件を満たす場合はシートコンポーネントを返す
                  return (
                    <div
                      key={sheetName}
                      style={{
                        display: "flex",
                        flexDirection: "column",
                        border: "1px solid #ddd",
                        borderRadius: "5px",
                        overflow: "hidden",
                        // 最後以外の要素には下に30pxの余白を設けるための処理
                        marginBottom: index < array.length - 1 ? "30px" : 0,
                      }}
                    >
                      <h3
                        style={{
                          margin: 0,
                          padding: "8px 15px",
                          backgroundColor: "#f5f5f5",
                          borderBottom: "1px solid #ddd",
                        }}
                      >
                        {sheetName}
                      </h3>
                      <div style={{ height: "400px" }}>
                        <DataTable
                          model={sheetModel}
                          onCellChange={handleCellChange}
                          onAddAccount={addAccount}
                          onDeleteAccount={deleteAccount}
                          onAddPeriod={addPeriod}
                          onDeletePeriod={deletePeriod}
                          hfInstance={hfInstance}
                          onUpdateParameter={handleUpdateParameter}
                          onTogglePeriodActual={handleTogglePeriodActual}
                          isParamGroupCollapsed={isParamGroupCollapsed}
                          onToggleParamGroup={handleToggleParamGroup}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {activeTab === "parameters" && (
              <div className="parameters-tab">
                <h3>パラメータ設定</h3>
                <p>パラメータ設定画面は開発中です。</p>
              </div>
            )}
          </div>
        </>
      )}

      {isDirty && (
        <div className="unsaved-changes-indicator">
          * 保存されていない変更があります
        </div>
      )}
    </div>
  );
}

export default FinancialModelEditor;
