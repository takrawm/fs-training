import React, { useMemo } from "react";
import { Card } from "react-bootstrap";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";
import { Line, Bar } from "react-chartjs-2";
import { nanoid } from "nanoid";

// Chart.jsのコンポーネントを登録
ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Title,
  Tooltip,
  Legend
);

/**
 * 財務データをグラフ表示するコンポーネント
 */
const FinancialChart = ({
  model,
  selectedAccounts = [],
  selectedPeriods = [],
  chartType = "bar",
  stacked = false,
  title = "財務チャート",
}) => {
  // 選択された期間のデータを取得
  const periods = useMemo(() => {
    if (!model || !model.periods) return [];

    return model.periods
      .filter((period) => selectedPeriods.includes(period.id))
      .sort((a, b) => a.order - b.order);
  }, [model, selectedPeriods]);

  // 選択されたアカウントのデータを取得
  const accounts = useMemo(() => {
    if (!model || !model.accounts) return [];

    return model.accounts.filter((account) =>
      selectedAccounts.includes(account.id)
    );
  }, [model, selectedAccounts]);

  // チャートデータの作成
  const chartData = useMemo(() => {
    if (!model || !periods.length || !accounts.length) {
      return { labels: [], datasets: [] };
    }

    // 期間ラベルの作成
    const labels = periods.map((period) => period.name);

    // データセットの作成（アカウントごと）
    const datasets = accounts.map((account, index) => {
      // カラーパレット
      const colors = [
        "rgba(54, 162, 235, 0.5)",
        "rgba(255, 99, 132, 0.5)",
        "rgba(75, 192, 192, 0.5)",
        "rgba(255, 159, 64, 0.5)",
        "rgba(153, 102, 255, 0.5)",
        "rgba(255, 205, 86, 0.5)",
        "rgba(201, 203, 207, 0.5)",
        "rgba(255, 99, 71, 0.5)",
        "rgba(46, 139, 87, 0.5)",
        "rgba(106, 90, 205, 0.5)",
      ];

      // 境界線カラー
      const borderColors = [
        "rgb(54, 162, 235)",
        "rgb(255, 99, 132)",
        "rgb(75, 192, 192)",
        "rgb(255, 159, 64)",
        "rgb(153, 102, 255)",
        "rgb(255, 205, 86)",
        "rgb(201, 203, 207)",
        "rgb(255, 99, 71)",
        "rgb(46, 139, 87)",
        "rgb(106, 90, 205)",
      ];

      // このアカウントの各期間の値を取得
      const data = periods.map((period) => {
        const value = model.values.find(
          (v) => v.accountId === account.id && v.periodId === period.id
        );
        return value ? value.amount : 0;
      });

      return {
        label: account.name,
        data,
        backgroundColor: colors[index % colors.length],
        borderColor: borderColors[index % borderColors.length],
        borderWidth: 1,
      };
    });

    return { labels, datasets };
  }, [model, periods, accounts]);

  // チャートオプションの設定
  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: {
          position: "top",
        },
        title: {
          display: true,
          text: title,
        },
        tooltip: {
          callbacks: {
            label: function (context) {
              let label = context.dataset.label || "";
              if (label) {
                label += ": ";
              }
              if (context.parsed.y !== null) {
                label += new Intl.NumberFormat("ja-JP", {
                  style: "currency",
                  currency: "JPY",
                }).format(context.parsed.y);
              }
              return label;
            },
          },
        },
      },
      scales: {
        x: {
          stacked: stacked,
        },
        y: {
          stacked: stacked,
          ticks: {
            callback: function (value) {
              return new Intl.NumberFormat("ja-JP", {
                style: "currency",
                currency: "JPY",
                notation: "compact",
                compactDisplay: "short",
              }).format(value);
            },
          },
        },
      },
    };
  }, [stacked, title]);

  if (!model || !selectedAccounts.length || !selectedPeriods.length) {
    return (
      <Card className="h-100">
        <Card.Header className="font-weight-bold">{title}</Card.Header>
        <Card.Body
          className="d-flex justify-content-center align-items-center"
          style={{ minHeight: "400px" }}
        >
          <p className="text-muted">データが選択されていません</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Header className="font-weight-bold">{title}</Card.Header>
      <Card.Body style={{ minHeight: "400px" }}>
        <div style={{ height: "400px" }}>
          {chartType === "bar" ? (
            <Bar data={chartData} options={chartOptions} />
          ) : (
            <Line data={chartData} options={chartOptions} />
          )}
        </div>
      </Card.Body>
    </Card>
  );
};

export default FinancialChart;
