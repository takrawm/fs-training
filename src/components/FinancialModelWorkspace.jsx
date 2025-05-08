import React, { useState, useEffect } from "react";
import FinancialModelBuilder from "./FinancialModelBuilder";
import { useFinancialModel } from "../hooks/useFinancialModel";
import { useExcelImport } from "../hooks/useExcelImport";
import "../styles/FinancialModelWorkspace.css";

/**
 * 財務モデルワークスペースコンポーネント
 * Excelデータの読み込みと初期処理を行い、
 * 財務モデル構築とパラメータ設定のタブ切り替えを提供する
 */
const FinancialModelWorkspace = ({ excelFilePath }) => {
  // 受け取ったファイルパスをログ出力
  console.log("FinancialModelEditor - 受け取ったファイルパス:", excelFilePath);

  // タブ状態
  const [activeTab, setActiveTab] = useState("data");

  // エラーメッセージ
  const [errorMessage, setErrorMessage] = useState(null);

  // フックの初期化
  const { model, updateModel } = useFinancialModel();

  // Excelデータの読み込みと処理を管理するフック
  const {
    loading: isExcelLoading, // loadingをisExcelLoadingとして使用
    error: excelError,
    flattenedData,
    readRawData, // ファイル読み込みとRawData抽出
  } = useExcelImport();

  // コンポーネントマウント時にExcelデータを読み込む
  useEffect(() => {
    const loadExcelData = async () => {
      try {
        console.log("Excel読み込み処理を開始します:", excelFilePath);
        await readRawData(excelFilePath);
      } catch (error) {
        console.error("Excel読み込みエラー:", error);
        setErrorMessage(error.message);
      }
    };

    loadExcelData();
  }, [excelFilePath, readRawData]);

  // タブ変更ハンドラ
  const handleTabChange = (tab) => {
    setActiveTab(tab);
  };

  // レンダリング制御を単純化
  const renderContent = () => {
    // エラー優先
    if (errorMessage || excelError) {
      return (
        <div className="error-container">
          <h4 className="error-heading">エラーが発生しました</h4>
          <p>{errorMessage || excelError}</p>
        </div>
      );
    }

    // Excel読み込み中
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

    // モデル表示
    return (
      <div className="tabs-container">
        <ul className="tabs-nav">
          <li className="tab-item">
            <button
              className={`tab-link ${activeTab === "data" ? "active" : ""}`}
              onClick={() => handleTabChange("data")}
            >
              データ
            </button>
          </li>
          <li className="tab-item">
            <button
              className={`tab-link ${activeTab === "params" ? "active" : ""}`}
              onClick={() => handleTabChange("params")}
            >
              パラメータ設定
            </button>
          </li>
        </ul>

        <div className="tab-content">
          {activeTab === "data" && model && (
            <FinancialModelBuilder
              model={model}
              flattenedData={flattenedData}
            />
          )}

          {activeTab === "params" && (
            <div className="params-container">
              <p>パラメータ設定画面は開発中です</p>
            </div>
          )}
        </div>
      </div>
    );
  };

  return <div className="financial-model-workspace">{renderContent()}</div>;
};

export default FinancialModelWorkspace;
