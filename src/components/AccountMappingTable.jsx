import React, { useRef, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import { MODEL_ACCOUNTS } from "../utils/constants";

// Handsontableのすべてのモジュールを登録
registerAllModules();

/**
 * 勘定科目マッピングテーブルコンポーネント
 * 元の科目名とモデル科目名のマッピング設定を表示します
 */
const AccountMappingTable = ({ data, onChange }) => {
  const hotTableRef = useRef(null);

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
  }, [data]);

  // 列定義
  const columns = [
    {
      data: "originalAccount",
      title: "元の勘定科目",
      readOnly: true,
      width: 200,
    },
    {
      data: "modelAccount",
      title: "モデル勘定科目",
      type: "dropdown",
      width: 200,
      source(query, process) {
        const rowIdx = this.row;
        const original = data[rowIdx]?.originalAccount;
        const options = [original, ...MODEL_ACCOUNTS].filter(
          (v, i, a) => v && a.indexOf(v) === i
        );
        process(options);
      },
    },
  ];

  // データ変更ハンドラ
  const handleChange = (changes) => {
    if (!changes || !onChange) return;
    onChange(changes);
  };

  return (
    <div className="hot-table-container">
      <HotTable
        ref={hotTableRef}
        data={data}
        columns={columns}
        rowHeaders
        colHeaders
        width="100%"
        height="100%"
        manualColumnResize
        autoColumnSize
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        afterChange={(changes, source) => {
          if (source === "edit") handleChange(changes);
        }}
      />
    </div>
  );
};

export default AccountMappingTable;
