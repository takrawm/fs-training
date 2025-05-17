import React, { useRef, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";

// Handsontableのすべてのモジュールを登録
registerAllModules();

/**
 * リレーション設定表示用のテーブルコンポーネント
 */
const TabTableForRelations = ({ data }) => {
  const ppeTableRef = useRef(null);
  const retainedEarningsTableRef = useRef(null);
  const workingCapitalTableRef = useRef(null);

  // 列定義
  const ppeColumns = [
    { data: 0, title: "資産科目", readOnly: true, width: 200 },
    { data: 1, title: "投資科目", readOnly: true, width: 200 },
    { data: 2, title: "償却科目", readOnly: true, width: 200 },
  ];

  const retainedEarningsColumns = [
    { data: 0, title: "純資産科目", readOnly: true, width: 200 },
    { data: 1, title: "利益科目", readOnly: true, width: 200 },
  ];

  const workingCapitalColumns = [
    { data: 0, title: "運転資本：資産", readOnly: true, width: 200 },
    { data: 1, title: "運転資本：負債", readOnly: true, width: 200 },
  ];

  // データが変更された場合にも再描画
  useEffect(() => {
    const tables = [
      { ref: ppeTableRef, data: data.ppeData },
      { ref: retainedEarningsTableRef, data: data.retainedEarningsData },
      { ref: workingCapitalTableRef, data: data.workingCapitalData },
    ];

    tables.forEach(({ ref, data }) => {
      if (data && ref.current?.hotInstance) {
        requestAnimationFrame(() => {
          if (ref.current?.hotInstance) {
            ref.current.hotInstance.render();
            ref.current.hotInstance.refreshDimensions();
          }
        });
      }
    });
  }, [data]);

  const renderTable = (ref, tableData, title, columns) => {
    if (!tableData || tableData.length === 0) return null;

    return (
      <div className="relation-table-section">
        <h3>{title}</h3>
        <div className="hot-table-container">
          <HotTable
            ref={ref}
            data={tableData}
            columns={columns}
            rowHeaders={true}
            colHeaders={true}
            width="100%"
            height="auto"
            manualColumnResize
            autoColumnSize
            stretchH="all"
            licenseKey="non-commercial-and-evaluation"
            readOnly={true}
            afterRender={() => {
              if (ref.current?.hotInstance) {
                ref.current.hotInstance.refreshDimensions();
              }
            }}
            cells={(row, col, prop) => ({
              className: "my-cell",
            })}
          />
        </div>
      </div>
    );
  };

  return (
    <div className="relation-tables-container">
      {renderTable(
        ppeTableRef,
        data.ppeData,
        "有形固定資産(PPE)設定",
        ppeColumns
      )}
      {renderTable(
        retainedEarningsTableRef,
        data.retainedEarningsData,
        "利益剰余金設定",
        retainedEarningsColumns
      )}
      {renderTable(
        workingCapitalTableRef,
        data.workingCapitalData,
        "運転資本設定",
        workingCapitalColumns
      )}
    </div>
  );
};

export default TabTableForRelations;
