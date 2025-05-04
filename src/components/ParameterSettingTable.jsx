import React, { useRef, useEffect } from "react";
import { HotTable } from "@handsontable/react";
import { registerAllModules } from "handsontable/registry";
import "handsontable/dist/handsontable.full.min.css";
import {
  PARENT_ACCOUNTS,
  PARAMETER_TYPES,
  RELATIONS,
} from "../utils/accountMappingConstants";

// Handsontableのすべてのモジュールを登録
registerAllModules();

/**
 * パラメータ設定テーブルコンポーネント
 * 勘定科目ごとのパラメータ、親科目、リレーションなどの設定を表示・編集します
 */
const ParameterSettingTable = ({ data, onChange }) => {
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

  // 列定義 - パラメータ設定用
  const columns = [
    {
      data: "accountName",
      title: "モデル勘定科目",
      readOnly: true,
      width: 150,
    },
    {
      data: "parentAccount",
      title: "親科目",
      type: "dropdown",
      source: PARENT_ACCOUNTS,
      width: 150,
    },
    {
      data: "parameterType",
      title: "パラメータタイプ",
      type: "dropdown",
      source: PARAMETER_TYPES,
      width: 150,
    },
    {
      data: "isParameterReference",
      title: "被参照科目",
      type: "dropdown",
      source: [true, false],
      width: 150,
    },
    {
      data: "relation.type",
      title: "リレーションタイプ",
      type: "dropdown",
      source: Object.keys(RELATIONS),
      width: 150,
    },
    {
      data: "relation.subType",
      title: "リレーション詳細",
      type: "dropdown",
      source: function (query, process) {
        const row = this.row;
        const relationType = this.instance.getDataAtRowProp(
          row,
          "relation.type"
        );

        if (!relationType || relationType === "NONE") {
          process([]);
          return;
        }

        // 選択された関連タイプに基づいてサブタイプのリストを生成
        const relation = RELATIONS[relationType];
        if (relation && typeof relation === "object") {
          process(Object.keys(relation));
        } else {
          process([]);
        }
      },
      width: 150,
    },
  ];

  // パラメータ変更ハンドラ
  const handleParamChange = (changes) => {
    if (!changes || !onChange) return;
    onChange(changes);
  };

  return (
    <div
      className="mapping-table-container"
      style={{
        height: "60vh",
        width: "100%",
        overflow: "auto",
        marginBottom: 15,
      }}
    >
      <h3>パラメータ設定</h3>
      <HotTable
        ref={hotTableRef}
        data={data}
        columns={columns}
        rowHeaders={true}
        colHeaders={true}
        width="100%"
        height="100%"
        manualColumnResize
        autoColumnSize
        stretchH="all"
        licenseKey="non-commercial-and-evaluation"
        afterChange={(changes, source) => {
          if (source === "edit") handleParamChange(changes);
        }}
      />
    </div>
  );
};

export default ParameterSettingTable;
