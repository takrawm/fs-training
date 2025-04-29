import React, { useState, useEffect } from "react";
import DataTable from "./DataTable";
import AccountMappingSettings from "./AccountMappingSettings";
import ParamSettings from "./ParamSettings";
import ChartSettings from "./ChartSettings";
import FinancialSummary from "./FinancialSummary";
import { useFinancialModel } from "../hooks/useFinancialModel";
import { useExcelImport } from "../hooks/useExcelImport";
import "../styles/FinancialModelEditor.css";

/**
 * 財務モデルエディターコンポーネント
 * RawData → マッピング → モデル構築の2ステップデータ処理フローをサポート
 */
const FinancialModelEditor = ({ excelFilePath }) => {
  // 受け取ったファイルパスをログ出力
  console.log("FinancialModelEditor - 受け取ったファイルパス:", excelFilePath);

  // タブ状態
  const [activeTab, setActiveTab] = useState("data");
  const [activeParam, setActiveParam] = useState(null);
  const [isParamGroupCollapsed, setIsParamGroupCollapsed] = useState({});

  // 処理ステップ管理
  // 'loading', 'mapping', 'model'
  const [processStep, setProcessStep] = useState("loading");

  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState(null);

  // アカウントマッピング情報
  const [accountMappings, setAccountMappings] = useState({});

  // 表示モード
  const [displayMode, setDisplayMode] = useState("table"); // 'table', 'chart'

  // フックの初期化
  const {
    model,
    updateModel,
    recalculateModel,
    isModelLoading,
    prepareModelForUI,
  } = useFinancialModel();

  // Excelデータの読み込みと処理を管理するフック
  // ファイルの取得と変換はuseExcelImportが担当し、データの解析と処理はdataTransform.jsが担当
  const {
    rawData, // excelData（シートごとの2次元配列）
    flattenedData, // フラット化済みデータ（{ headerRow, dataRows }）
    loading: isExcelLoading, // loadingをisExcelLoadingとして使用
    error: excelError,
    extractRawData, // ファイル読み込みとRawData抽出
    buildModelFromRawData, // RawDataとマッピングからモデル構築
  } = useExcelImport();

  // コンポーネントマウント時にExcelデータを読み込む
  useEffect(() => {
    const loadExcelData = async () => {
      try {
        console.log("Excel読み込み処理を開始します:", excelFilePath);
        // ExcelからRawDataを抽出
        const extractedData = await extractRawData(excelFilePath);
        setProcessStep("mapping");
      } catch (error) {
        console.error("Excel読み込みエラー:", error);
        setErrorMessage(error.message);
        setProcessStep("error");
      }
    };

    loadExcelData();
  }, [excelFilePath, extractRawData]);

  // マッピング情報を更新
  const updateMapping = (sheetType, sheetAccounts) => {
    console.log(`シート「${sheetType}」のマッピング情報を更新:`, sheetAccounts);
    setAccountMappings((prevMappings) => ({
      ...prevMappings,
      [sheetType]: sheetAccounts,
    }));
  };

  // マッピング完了時の処理
  const finishMapping = async () => {
    setProcessStep("building");
    console.log("マッピング完了 - 財務モデルの構築を開始します");
    console.log("アカウントマッピング:", accountMappings);

    try {
      // マッピング情報とExcelデータからモデルを構築
      const builtModel = await buildModelFromRawData(rawData, accountMappings);
      updateModel(builtModel);
      setProcessStep("model");
    } catch (error) {
      console.error("モデル構築エラー:", error);
      setErrorMessage(error.message);
      setProcessStep("error");
    }
  };

  // パラメータ変更ハンドラ
  const handleParamChange = (groupId, paramId, newValue) => {
    // モデルのパラメータを更新
    const updatedModel = { ...model };
    const groupIndex = updatedModel.paramGroups.findIndex(
      (g) => g.id === groupId
    );

    if (groupIndex >= 0) {
      const paramIndex = updatedModel.paramGroups[groupIndex].params.findIndex(
        (p) => p.id === paramId
      );

      if (paramIndex >= 0) {
        updatedModel.paramGroups[groupIndex].params[paramIndex].value =
          newValue;
        // モデルを更新して再計算
        updateModel(updatedModel);
        recalculateModel();
      }
    }
  };

  // パラメータグループの折りたたみハンドラ
  const handleCollapseParamGroup = (groupId) => {
    setIsParamGroupCollapsed((prev) => ({
      ...prev,
      [groupId]: !prev[groupId],
    }));
  };

  // タブ変更ハンドラ
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // 処理ステップに応じたコンテンツをレンダリング
  const renderContent = () => {
    // ローディング中はローディング表示を優先
    if (isExcelLoading) {
      return (
        <div className="loading-container">
          <div className="spinner" role="status">
            <span className="visually-hidden">Loading...</span>
          </div>
          <p className="loading-text">Excelデータを読み込んでいます...</p>
        </div>
      );
    }

    // processStepに基づいてコンテンツを切り替え
    switch (processStep) {
      case "loading":
        return (
          <div className="loading-container">
            <div className="spinner" role="status">
              <span className="visually-hidden">Loading...</span>
            </div>
            <p className="loading-text">Excelデータを読み込んでいます...</p>
          </div>
        );

      case "error":
        return (
          <div className="error-container">
            <h4 className="error-heading">エラーが発生しました</h4>
            <p>
              {errorMessage ||
                excelError ||
                "Excelデータの読み込みまたは処理中にエラーが発生しました。"}
            </p>
          </div>
        );

      case "mapping":
        console.log("マッピングステップのフラットデータ:", flattenedData);
        return (
          <AccountMappingSettings
            model={null}
            flattenedData={flattenedData}
            onUpdateMapping={updateMapping}
            onClose={finishMapping}
            isInitialMapping={true}
          />
        );

      case "building":
        return (
          <div className="loading-container">
            <div className="spinner" role="status">
              <span className="visually-hidden">Building model...</span>
            </div>
            <p className="loading-text">財務モデルを構築しています...</p>
          </div>
        );

      case "model":
        if (!model) {
          return null;
        }
        return (
          <>
            <div className="tabs-container">
              <ul className="tabs-nav">
                <li className="tab-item">
                  <button
                    className={`tab-link ${
                      activeTab === "data" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("data")}
                  >
                    データ
                  </button>
                </li>
                <li className="tab-item">
                  <button
                    className={`tab-link ${
                      activeTab === "params" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("params")}
                  >
                    パラメータ設定
                  </button>
                </li>
                <li className="tab-item">
                  <button
                    className={`tab-link ${
                      activeTab === "charts" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("charts")}
                  >
                    チャート設定
                  </button>
                </li>
                <li className="tab-item">
                  <button
                    className={`tab-link ${
                      activeTab === "summary" ? "active" : ""
                    }`}
                    onClick={() => handleTabChange("summary")}
                  >
                    財務サマリー
                  </button>
                </li>
              </ul>

              <div className="tab-content">
                <div
                  className={`tab-pane ${activeTab === "data" ? "active" : ""}`}
                >
                  {activeTab === "data" && (
                    <DataTable
                      model={prepareModelForUI(model)}
                      isParamGroupCollapsed={isParamGroupCollapsed}
                      onCollapseParamGroup={handleCollapseParamGroup}
                    />
                  )}
                </div>
                <div
                  className={`tab-pane ${
                    activeTab === "params" ? "active" : ""
                  }`}
                >
                  {activeTab === "params" && (
                    <ParamSettings
                      paramGroups={model.paramGroups}
                      activeParam={activeParam}
                      setActiveParam={setActiveParam}
                      onParamChange={handleParamChange}
                    />
                  )}
                </div>
                <div
                  className={`tab-pane ${
                    activeTab === "charts" ? "active" : ""
                  }`}
                >
                  {activeTab === "charts" && <ChartSettings model={model} />}
                </div>
                <div
                  className={`tab-pane ${
                    activeTab === "summary" ? "active" : ""
                  }`}
                >
                  {activeTab === "summary" && (
                    <FinancialSummary model={model} />
                  )}
                </div>
              </div>
            </div>

            <div className="button-toolbar">
              <div className="button-group">
                <button
                  className={`btn ${
                    displayMode === "table"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => setDisplayMode("table")}
                >
                  テーブル表示
                </button>
                <button
                  className={`btn ${
                    displayMode === "chart"
                      ? "btn-primary"
                      : "btn-outline-primary"
                  }`}
                  onClick={() => setDisplayMode("chart")}
                >
                  チャート表示
                </button>
              </div>

              <button
                className="btn btn-outline-secondary ml-3"
                onClick={() => {
                  setAccountMappings({});
                  setProcessStep("mapping");
                }}
              >
                マッピング再設定
              </button>
            </div>
          </>
        );

      default:
        return null;
    }
  };

  return (
    <div className="financial-model-editor full-width-container">
      <div className="editor-header">
        <h1>財務モデルエディター</h1>
      </div>
      <div className="editor-content">{renderContent()}</div>
    </div>
  );
};

export default FinancialModelEditor;
