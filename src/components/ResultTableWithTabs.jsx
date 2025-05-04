import React, { useRef, useEffect, useState, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import { getFilteredDataByTab } from "../utils/accountMappingModel";

// Handsontableのすべてのモジュールを登録
registerAllModules();

/**
 * 結果表示用のテーブルとタブコンポーネント
 * PL、BS、CAPEX、CF、パラメータのタブを切り替えて結果を表示します
 */
const ResultTableWithTabs = ({ aggregatedValue, accounts, periods }) => {
  const hotTableRef = useRef(null);
  const [activeTab, setActiveTab] = useState("PL");
  const [filteredData, setFilteredData] = useState([]);

  // テーブル再描画
  useEffect(() => {
    if (hotTableRef.current?.hotInstance) {
      requestAnimationFrame(() => {
        if (hotTableRef.current?.hotInstance) {
          hotTableRef.current.hotInstance.render();
          hotTableRef.current.hotInstance.refreshDimensions();
        }
      });
    }
  }, [filteredData, activeTab]);

  // タブ切り替え処理
  const handleTabChange = useCallback(
    (tabName) => {
      setActiveTab(tabName);

      // フィルタリングされたデータを設定
      const filtered = getFilteredDataByTab(tabName, aggregatedValue, accounts);
      setFilteredData(filtered);
    },
    [aggregatedValue, accounts]
  );

  // 初期データロード
  useEffect(() => {
    if (aggregatedValue.length > 0 && accounts.length > 0) {
      handleTabChange("PL");
    }
  }, [aggregatedValue, accounts, handleTabChange]);

  // 集計結果表示用の列定義
  const getResultColumns = () => {
    if (periods.length === 0) return [];

    // パラメータタブが選択されている場合
    if (activeTab === "パラメータ") {
      return [
        { data: 0, title: "勘定科目", readOnly: true, width: 150 },
        { data: 1, title: "親科目", readOnly: true, width: 150 },
        { data: 2, title: "パラメータタイプ", readOnly: true, width: 150 },
        { data: 3, title: "被参照科目", readOnly: true, width: 100 },
        { data: 4, title: "リレーションタイプ", readOnly: true, width: 150 },
        { data: 5, title: "リレーション詳細", readOnly: true, width: 150 },
        { data: 6, title: "計算タイプ", readOnly: true, width: 150 },
      ];
    }

    // 通常のタブ用
    return [
      { data: 0, title: "勘定科目", readOnly: true, width: 200 },
      ...periods.map((p, idx) => ({
        data: idx + 1,
        title: `${p.year} ${p.isActual ? "実績" : "計画"}\n${
          p.isFromExcel ? "取込" : "計算"
        }`,
        readOnly: true,
        width: 100,
        type: "numeric",
        numericFormat: { pattern: "0,0", culture: "ja-JP" },
      })),
    ];
  };

  // 集計行のスタイリング
  const getSummaryRowClass = (row) => {
    if (activeTab === "パラメータ") return {};

    const accountName = filteredData[row]?.[0];
    if (!accountName) return {};

    const account = accounts.find((acc) => acc.accountName === accountName);

    if (account?.calculationType) {
      return {
        fontWeight: "bold",
        backgroundColor: "#f0f8ff",
      };
    }

    return {};
  };

  // タブスタイル
  const tabStyle = {
    display: "inline-block",
    padding: "8px 16px",
    cursor: "pointer",
    borderRadius: "4px 4px 0 0",
    marginRight: "2px",
  };

  const activeTabStyle = {
    ...tabStyle,
    backgroundColor: "#f0f0f0",
    borderBottom: "2px solid #007bff",
    fontWeight: "bold",
  };

  const inactiveTabStyle = {
    ...tabStyle,
    backgroundColor: "#e0e0e0",
    borderBottom: "1px solid #ccc",
  };

  return (
    <>
      <div className="tab-container" style={{ marginBottom: "10px" }}>
        <div
          style={activeTab === "PL" ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabChange("PL")}
        >
          PL
        </div>
        <div
          style={activeTab === "BS" ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabChange("BS")}
        >
          BS
        </div>
        <div
          style={activeTab === "CAPEX" ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabChange("CAPEX")}
        >
          CAPEX
        </div>
        <div
          style={activeTab === "CF" ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabChange("CF")}
        >
          CF
        </div>
        <div
          style={activeTab === "パラメータ" ? activeTabStyle : inactiveTabStyle}
          onClick={() => handleTabChange("パラメータ")}
        >
          パラメータ
        </div>
      </div>
      <div
        className="mapping-table-container"
        style={{ height: "55vh", width: "100%", overflow: "auto" }}
      >
        <HotTable
          ref={hotTableRef}
          data={filteredData}
          columns={getResultColumns()}
          rowHeaders={true}
          colHeaders={true}
          width="100%"
          height="100%"
          manualColumnResize
          autoColumnSize
          stretchH="all"
          licenseKey="non-commercial-and-evaluation"
          readOnly={true}
          cells={(row, col, prop) => ({
            className: "my-cell",
            ...getSummaryRowClass(row),
          })}
        />
      </div>
    </>
  );
};

export default ResultTableWithTabs;
