import React, { useMemo } from "react";
import { Table, Card, Row, Col, Badge } from "react-bootstrap";

/**
 * 財務モデルのサマリー情報を表示するコンポーネント
 */
const FinancialSummary = ({ model }) => {
  // キー財務指標を計算
  const financialMetrics = useMemo(() => {
    if (!model || !model.accounts || !model.values || !model.periods) {
      return {};
    }

    // 主要な会計科目を特定
    const revenue = model.accounts.find(
      (a) => a.accountType === "REVENUE_TOTAL"
    );
    const operatingProfit = model.accounts.find(
      (a) => a.accountType === "OPERATING_PROFIT"
    );
    const netProfit = model.accounts.find(
      (a) => a.accountType === "NET_PROFIT"
    );
    const totalAssets = model.accounts.find(
      (a) => a.accountType === "TOTAL_ASSETS"
    );
    const totalEquity = model.accounts.find(
      (a) => a.accountType === "TOTAL_EQUITY"
    );

    // 期間ごとに指標を計算
    const metrics = {};

    model.periods.forEach((period) => {
      const periodMetrics = {};

      // 各会計科目の値を取得
      const revenueValue = revenue
        ? model.values.find(
            (v) => v.accountId === revenue.id && v.periodId === period.id
          )?.value || 0
        : 0;

      const operatingProfitValue = operatingProfit
        ? model.values.find(
            (v) =>
              v.accountId === operatingProfit.id && v.periodId === period.id
          )?.value || 0
        : 0;

      const netProfitValue = netProfit
        ? model.values.find(
            (v) => v.accountId === netProfit.id && v.periodId === period.id
          )?.value || 0
        : 0;

      const totalAssetsValue = totalAssets
        ? model.values.find(
            (v) => v.accountId === totalAssets.id && v.periodId === period.id
          )?.value || 0
        : 0;

      const totalEquityValue = totalEquity
        ? model.values.find(
            (v) => v.accountId === totalEquity.id && v.periodId === period.id
          )?.value || 0
        : 0;

      // 各種財務指標を計算
      periodMetrics.revenue = revenueValue;
      periodMetrics.operatingProfit = operatingProfitValue;
      periodMetrics.netProfit = netProfitValue;
      periodMetrics.totalAssets = totalAssetsValue;
      periodMetrics.totalEquity = totalEquityValue;

      // 売上高営業利益率
      periodMetrics.operatingMargin = revenueValue
        ? (operatingProfitValue / revenueValue) * 100
        : 0;

      // 売上高純利益率
      periodMetrics.netProfitMargin = revenueValue
        ? (netProfitValue / revenueValue) * 100
        : 0;

      // 自己資本比率
      periodMetrics.equityRatio = totalAssetsValue
        ? (totalEquityValue / totalAssetsValue) * 100
        : 0;

      // ROA (総資産利益率)
      periodMetrics.roa = totalAssetsValue
        ? (netProfitValue / totalAssetsValue) * 100
        : 0;

      // ROE (自己資本利益率)
      periodMetrics.roe = totalEquityValue
        ? (netProfitValue / totalEquityValue) * 100
        : 0;

      metrics[period.id] = periodMetrics;
    });

    return metrics;
  }, [model]);

  // ソートされた期間
  const sortedPeriods = useMemo(() => {
    if (!model || !model.periods) return [];
    return [...model.periods].sort((a, b) => a.order - b.order);
  }, [model]);

  const formatValue = (value, isPercentage = false) => {
    if (value === undefined || value === null) return "-";

    if (isPercentage) {
      return `${value.toFixed(2)}%`;
    }

    // 金額を1000単位でフォーマット
    return new Intl.NumberFormat("ja-JP").format(Math.round(value));
  };

  if (!model || Object.keys(financialMetrics).length === 0) {
    return (
      <div className="text-center p-4">
        <p>利用可能な財務データがありません</p>
      </div>
    );
  }

  return (
    <div className="financial-summary p-3">
      <h3 className="mb-4">財務サマリー</h3>

      <Row>
        <Col md={12}>
          <Card className="mb-4">
            <Card.Header>
              <h5 className="mb-0">主要財務指標</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>指標</th>
                    {sortedPeriods.map((period) => (
                      <th key={period.id} className="text-center">
                        {period.year}
                        {period.month ? `/${period.month}` : ""}
                        {period.isActual && (
                          <Badge bg="secondary" className="ms-1">
                            実績
                          </Badge>
                        )}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>売上高</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(financialMetrics[period.id]?.revenue)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>営業利益</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(
                          financialMetrics[period.id]?.operatingProfit
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>純利益</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(financialMetrics[period.id]?.netProfit)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>総資産</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(financialMetrics[period.id]?.totalAssets)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>純資産</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(financialMetrics[period.id]?.totalEquity)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>

          <Card>
            <Card.Header>
              <h5 className="mb-0">収益性・効率性指標</h5>
            </Card.Header>
            <Card.Body className="p-0">
              <Table striped bordered hover responsive>
                <thead>
                  <tr>
                    <th>指標</th>
                    {sortedPeriods.map((period) => (
                      <th key={period.id} className="text-center">
                        {period.year}
                        {period.month ? `/${period.month}` : ""}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td>営業利益率</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(
                          financialMetrics[period.id]?.operatingMargin,
                          true
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>純利益率</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(
                          financialMetrics[period.id]?.netProfitMargin,
                          true
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>自己資本比率</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(
                          financialMetrics[period.id]?.equityRatio,
                          true
                        )}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>ROA</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(financialMetrics[period.id]?.roa, true)}
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <td>ROE</td>
                    {sortedPeriods.map((period) => (
                      <td key={period.id} className="text-end">
                        {formatValue(financialMetrics[period.id]?.roe, true)}
                      </td>
                    ))}
                  </tr>
                </tbody>
              </Table>
            </Card.Body>
          </Card>
        </Col>
      </Row>
    </div>
  );
};

export default FinancialSummary;
