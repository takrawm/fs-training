import React, { useRef, useEffect, useState, useCallback } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import { getFilteredDataByTab } from "../display/financialDisplay";
import TabTableForRelations from "./TabTableForRelations";
import { PARAMETER_TYPES } from "../utils/constants";
import { ParameterUtils } from "../utils/parameterUtils";
import "../styles/ResultTableWithTabs.css";

// Handsontableのすべてのモジュールを登録
registerAllModules();

/**
 * 結果表示用のテーブルとタブコンポーネント
 * PL、BS、CAPEX、CF、パラメータのタブを切り替えて結果を表示します
 */
const ResultTableWithTabs = ({ financialModel, onAddPeriod }) => {
  const hotTableRef = useRef(null);
  const { accounts, periods, values } = financialModel || {};
  const [activeTab, setActiveTab] = useState("PL");
  const [filteredData, setFilteredData] = useState([]);

  // デバッグ情報：financialModelの受け取りを確認
  useEffect(() => {
    if (financialModel) {
      console.log("=== ResultTableWithTabs - financialModel受け取り ===");
      console.log("financialModel:", financialModel);

      // 期間ごとの値の数を詳細に確認
      const periodValueCounts = financialModel.periods.map((period) => {
        const periodValues = financialModel.values.filter(
          (v) => v.periodId === period.id
        );
        return {
          periodId: period.id,
          year: period.year,
          valueCount: periodValues.length,
          // 値が0のものの数を確認
          zeroValueCount: periodValues.filter((v) => v.value === 0).length,
          // 値のサンプル（最初の5つ）
          sampleValues: periodValues.slice(0, 5).map((v) => ({
            accountId: v.accountId,
            value: v.value,
          })),
        };
      });

      console.log("期間ごとの値の詳細:", periodValueCounts);
      console.log("=== デバッグ情報終了 ===");
    }
  }, [financialModel]);

  // データが変更された場合にも再描画
  useEffect(() => {
    if (financialModel && hotTableRef.current?.hotInstance) {
      // データロード後にテーブルのサイズを再計算
      requestAnimationFrame(() => {
        if (hotTableRef.current?.hotInstance) {
          hotTableRef.current.hotInstance.render();
          hotTableRef.current.hotInstance.refreshDimensions();
        }
      });
    }
  }, [financialModel]);

  // 集計結果表示用の列定義
  const getResultColumns = () => {
    if (!financialModel?.periods.length) return [];

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

    // リレーションタブが選択されている場合
    if (activeTab === "リレーション") {
      return [
        { data: 0, title: "項目", readOnly: true, width: 150 },
        { data: 1, title: "科目名", readOnly: true, width: 200 },
        { data: 2, title: "関連科目1", readOnly: true, width: 200 },
        { data: 3, title: "関連科目2", readOnly: true, width: 200 },
      ];
    }

    // 通常のタブ用
    return [
      { data: 0, title: "勘定科目", readOnly: true, width: 200 },
      ...financialModel.periods.map((p, idx) => ({
        data: idx + 1,
        title: `${p.year} ${p.isActual ? "実績" : "計画"}\n${
          p.isFromExcel ? "取込" : "計算"
        }`,
        readOnly: true,
        width: 100,
        type: "numeric",
        numericFormat: { pattern: "0,0", culture: "ja-JP" },
        renderer: (instance, td, row, col, prop, value) => {
          if (value === null || value === undefined) {
            td.innerHTML = "";
            return td;
          }
          const numValue = Number(value);
          if (isNaN(numValue)) {
            td.innerHTML = value;
            return td;
          }
          td.innerHTML = Math.round(numValue).toLocaleString("ja-JP");
          return td;
        },
      })),
    ];
  };

  // 集計行のスタイリング
  const getSummaryRowClass = (row) => {
    if (activeTab === "パラメータ") return {};

    const accountName = filteredData[row]?.[0];
    if (!accountName) return {};

    const account = financialModel?.accounts.find(
      (acc) => acc.accountName === accountName
    );

    if (!account) return {};

    // ParameterUtilsを使用してパラメータタイプを取得
    const parameterType = ParameterUtils.getParameterType(account);

    if (parameterType === PARAMETER_TYPES.CHILDREN_SUM) {
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

  // タブ切り替え処理
  const handleTabChange = useCallback(
    (tabName) => {
      console.log(`タブを ${tabName} に切り替えます`);
      setActiveTab(tabName);

      if (!financialModel) {
        console.log("財務モデルがありません");
        return;
      }

      // フィルタリングされたデータを設定
      const filtered = getFilteredDataByTab(tabName, financialModel);
      console.log("=== フィルタリングされたデータ ===");
      console.log("タブ:", tabName);
      console.log("フィルターされたデータ:", filtered);
      console.log("現在のモデル:", financialModel);
      console.log("=== フィルタリングデータのログ終了 ===");

      if (filtered.length === 0) {
        console.warn(`${tabName}タブのデータが空です`);
      }

      setFilteredData(filtered);
    },
    [financialModel]
  );

  // 初期データロード
  useEffect(() => {
    if (financialModel) {
      console.log("=== 財務モデル ===");
      console.log("アカウント:", financialModel.accounts);
      console.log("期間:", financialModel.periods);
      console.log("値:", financialModel.values);
      console.log("=== 財務モデルのログ終了 ===");
      handleTabChange("PL");
    }
  }, [financialModel, handleTabChange]);

  return (
    <>
      <div className="upper-button">
        <button
          onClick={onAddPeriod}
          className="btn-secondary"
          style={{ marginRight: "10px" }}
        >
          期間を追加
        </button>
      </div>
      <div className="sheet-tabs-container">
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
        <div
          style={
            activeTab === "リレーション" ? activeTabStyle : inactiveTabStyle
          }
          onClick={() => handleTabChange("リレーション")}
        >
          リレーション
        </div>
      </div>
      {activeTab === "リレーション" ? (
        <TabTableForRelations data={filteredData} />
      ) : (
        <div className="hot-table-container">
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
            afterRender={() => {
              console.log("テーブルがレンダリングされました");
              if (hotTableRef.current?.hotInstance) {
                hotTableRef.current.hotInstance.refreshDimensions();
              }
            }}
            cells={(row, col, prop) => ({
              className: "my-cell",
              ...getSummaryRowClass(row),
            })}
          />
        </div>
      )}
    </>
  );
};

export default ResultTableWithTabs;
