import React, { useState, useEffect } from "react";
import { Row, Col, Form, Button, Card } from "react-bootstrap";

/**
 * 財務データのチャート表示設定を管理するコンポーネント
 */
const ChartSettings = ({ model }) => {
  const [chartType, setChartType] = useState("line");
  const [selectedAccounts, setSelectedAccounts] = useState([]);
  const [selectedPeriods, setSelectedPeriods] = useState([]);
  const [comparisonType, setComparisonType] = useState("absolute");

  // モデルデータが変更されたら選択をリセット
  useEffect(() => {
    if (model) {
      // 主要なアカウントをデフォルト選択
      const defaultAccounts = model.accounts
        .filter(
          (account) =>
            account.isReferenceAccount ||
            account.accountType === "REVENUE_TOTAL" ||
            account.name.includes("合計")
        )
        .slice(0, 5)
        .map((account) => account.id);

      setSelectedAccounts(defaultAccounts);

      // すべての期間をデフォルト選択
      setSelectedPeriods(model.periods.map((period) => period.id));
    }
  }, [model]);

  // アカウント選択の変更ハンドラー
  const handleAccountChange = (accountId) => {
    setSelectedAccounts((prev) => {
      if (prev.includes(accountId)) {
        return prev.filter((id) => id !== accountId);
      } else {
        return [...prev, accountId];
      }
    });
  };

  // 期間選択の変更ハンドラー
  const handlePeriodChange = (periodId) => {
    setSelectedPeriods((prev) => {
      if (prev.includes(periodId)) {
        return prev.filter((id) => id !== periodId);
      } else {
        return [...prev, periodId];
      }
    });
  };

  // 全期間選択/解除ハンドラー
  const handleToggleAllPeriods = () => {
    if (selectedPeriods.length === model.periods.length) {
      setSelectedPeriods([]);
    } else {
      setSelectedPeriods(model.periods.map((period) => period.id));
    }
  };

  // シートごとのアカウントを取得
  const getAccountsBySheet = (sheetName) => {
    return model.accounts.filter((account) => account.sheetName === sheetName);
  };

  return (
    <div className="chart-settings p-3">
      <h3 className="mb-4">チャート設定</h3>

      <Row>
        <Col md={4}>
          <Card className="mb-4">
            <Card.Header>チャートタイプ</Card.Header>
            <Card.Body>
              <Form.Group>
                <Form.Select
                  value={chartType}
                  onChange={(e) => setChartType(e.target.value)}
                >
                  <option value="line">折れ線グラフ</option>
                  <option value="bar">棒グラフ</option>
                  <option value="stacked-bar">積み上げ棒グラフ</option>
                  <option value="area">エリアチャート</option>
                </Form.Select>
              </Form.Group>

              <Form.Group className="mt-3">
                <Form.Label>表示形式</Form.Label>
                <Form.Select
                  value={comparisonType}
                  onChange={(e) => setComparisonType(e.target.value)}
                >
                  <option value="absolute">絶対値</option>
                  <option value="yoy">前年比</option>
                  <option value="percentage">構成比</option>
                </Form.Select>
              </Form.Group>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>期間選択</Card.Header>
            <Card.Body>
              <div className="d-flex justify-content-between mb-2">
                <Form.Label>表示期間</Form.Label>
                <Button
                  variant="outline-secondary"
                  size="sm"
                  onClick={handleToggleAllPeriods}
                >
                  {selectedPeriods.length === model.periods.length
                    ? "全て解除"
                    : "全て選択"}
                </Button>
              </div>

              {model.periods.map((period) => (
                <Form.Check
                  key={period.id}
                  type="checkbox"
                  id={`period-${period.id}`}
                  label={`${period.year}${
                    period.month ? `/${period.month}` : ""
                  }`}
                  checked={selectedPeriods.includes(period.id)}
                  onChange={() => handlePeriodChange(period.id)}
                  className="mb-2"
                />
              ))}
            </Card.Body>
          </Card>
        </Col>

        <Col md={8}>
          <Card>
            <Card.Header>表示科目選択</Card.Header>
            <Card.Body>
              <Row>
                {["PL", "BS", "CAPEX", "CS"].map((sheetName) => {
                  const sheetAccounts = getAccountsBySheet(sheetName);

                  if (sheetAccounts.length === 0) return null;

                  return (
                    <Col md={6} key={sheetName}>
                      <h5>{sheetName}</h5>
                      <div style={{ maxHeight: "300px", overflowY: "auto" }}>
                        {sheetAccounts.map((account) => (
                          <Form.Check
                            key={account.id}
                            type="checkbox"
                            id={`account-${account.id}`}
                            label={account.name}
                            checked={selectedAccounts.includes(account.id)}
                            onChange={() => handleAccountChange(account.id)}
                            className="mb-2"
                          />
                        ))}
                      </div>
                    </Col>
                  );
                })}
              </Row>
            </Card.Body>
          </Card>

          <div className="text-center mt-4">
            <p className="text-muted mb-0">
              選択した{selectedAccounts.length}科目 × {selectedPeriods.length}
              期間のデータをチャート表示します
            </p>
            <p className="text-muted">
              <small>
                ※
                チャート設定は「テーブル表示」ボタンと「チャート表示」ボタンで切り替えられます
              </small>
            </p>
          </div>
        </Col>
      </Row>
    </div>
  );
};

export default ChartSettings;
