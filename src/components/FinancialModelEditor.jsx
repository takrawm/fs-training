import React, { useState, useEffect } from "react";
import {
  Container,
  Row,
  Col,
  Tabs,
  Tab,
  Button,
  Spinner,
} from "react-bootstrap";
import DataTable from "./DataTable";
import AccountMappingSettings from "./AccountMappingSettings";
import ParamSettings from "./ParamSettings";
import ChartSettings from "./ChartSettings";
import FinancialSummary from "./FinancialSummary";
import ButtonGroup from "react-bootstrap/ButtonGroup";
import { useFinancialModel } from "../hooks/useFinancialModel";
import { useExcelImport } from "../hooks/useExcelImport";

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

  const {
    rawData,
    loading: isExcelLoading,
    error: excelError,
    extractRawData,
    buildModelFromRawData,
  } = useExcelImport();

  // コンポーネントマウント時にExcelデータを読み込む
  useEffect(() => {
    const loadExcelData = async () => {
      if (!excelFilePath) {
        console.error("Excelファイルパスが指定されていません");
        setProcessStep("error");
        return;
      }

      console.log("Excelファイル読み込み開始:", excelFilePath);

      try {
        // ExcelからRawDataを抽出
        const extractedData = await extractRawData(excelFilePath);
        console.log("抽出されたRawData:", extractedData);

        if (extractedData) {
          setProcessStep("mapping");
        } else {
          console.error("RawDataが正しく抽出されませんでした");
          setProcessStep("error");
        }
      } catch (error) {
        console.error("Excelロードエラー（詳細）:", error);
        setErrorMessage(error.message || "Excelデータの読み込みに失敗しました");
        setProcessStep("error");
      }
    };

    loadExcelData();
  }, [excelFilePath, extractRawData]);

  // マッピング情報を更新
  const updateMapping = (accountId, mappingInfo) => {
    setAccountMappings((prevMappings) => ({
      ...prevMappings,
      [accountId]: mappingInfo,
    }));
  };

  // マッピング完了時の処理
  const finishMapping = async () => {
    setProcessStep("building");

    try {
      // RawDataとマッピング情報からモデルを構築
      const builtModel = await buildModelFromRawData(rawData, accountMappings);

      if (builtModel) {
        // モデルを更新
        updateModel(builtModel);
        setProcessStep("model");
      } else {
        setProcessStep("error");
      }
    } catch (error) {
      console.error("モデル構築エラー:", error);
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
    if (processStep === "loading" || isExcelLoading) {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Loading...</span>
          </Spinner>
          <p className="mt-3">Excelデータを読み込んでいます...</p>
        </div>
      );
    }

    if (processStep === "error") {
      return (
        <div className="alert alert-danger m-5" role="alert">
          <h4 className="alert-heading">エラーが発生しました</h4>
          <p>
            {errorMessage ||
              excelError ||
              "Excelデータの読み込みまたは処理中にエラーが発生しました。"}
          </p>
        </div>
      );
    }

    if (processStep === "mapping") {
      return (
        <AccountMappingSettings
          rawData={rawData}
          onUpdateMapping={updateMapping}
          onClose={finishMapping}
          isInitialMapping={true}
        />
      );
    }

    if (processStep === "building") {
      return (
        <div className="text-center p-5">
          <Spinner animation="border" role="status">
            <span className="visually-hidden">Building model...</span>
          </Spinner>
          <p className="mt-3">財務モデルを構築しています...</p>
        </div>
      );
    }

    // モデルのレンダリング（タブ形式）
    if (processStep === "model" && model) {
      return (
        <>
          <Tabs
            activeKey={activeTab}
            onSelect={handleTabChange}
            className="mb-3"
            fill
          >
            <Tab eventKey="data" title="データ">
              {model && (
                <DataTable
                  model={prepareModelForUI(model)}
                  isParamGroupCollapsed={isParamGroupCollapsed}
                  onCollapseParamGroup={handleCollapseParamGroup}
                />
              )}
            </Tab>
            <Tab eventKey="params" title="パラメータ設定">
              {model && (
                <ParamSettings
                  paramGroups={model.paramGroups}
                  activeParam={activeParam}
                  setActiveParam={setActiveParam}
                  onParamChange={handleParamChange}
                />
              )}
            </Tab>
            <Tab eventKey="charts" title="チャート設定">
              {model && <ChartSettings model={model} />}
            </Tab>
            <Tab eventKey="summary" title="財務サマリー">
              {model && <FinancialSummary model={model} />}
            </Tab>
          </Tabs>

          <div className="mt-3">
            <ButtonGroup className="mr-2">
              <Button
                variant={
                  displayMode === "table" ? "primary" : "outline-primary"
                }
                onClick={() => setDisplayMode("table")}
              >
                テーブル表示
              </Button>
              <Button
                variant={
                  displayMode === "chart" ? "primary" : "outline-primary"
                }
                onClick={() => setDisplayMode("chart")}
              >
                チャート表示
              </Button>
            </ButtonGroup>

            <Button
              variant="outline-secondary"
              className="ml-3"
              onClick={() => {
                setAccountMappings({});
                setProcessStep("mapping");
              }}
            >
              マッピング再設定
            </Button>
          </div>
        </>
      );
    }

    return null;
  };

  return (
    <Container fluid className="financial-model-editor">
      <Row>
        <Col>
          <h1 className="mb-4">財務モデルエディター</h1>
          {renderContent()}
        </Col>
      </Row>
    </Container>
  );
};

export default FinancialModelEditor;
