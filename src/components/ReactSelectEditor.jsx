import React from "react";
import Select from "react-select";
import Handsontable from "handsontable";
import { createRoot } from "react-dom/client";

export class ReactSelectEditor extends Handsontable.editors.BaseEditor {
  constructor(hotInstance) {
    super(hotInstance);
    this.root = null;
    this.container = null;
    this.value = [];
    this.options = [];
  }

  prepare(row, col, prop, td, originalValue, cellProperties) {
    console.log(`[prepare] (${row},${col}) originalValue =`, originalValue);
    super.prepare(row, col, prop, td, originalValue, cellProperties);
    this.options = cellProperties.source || [];
    this.row = row;
    this.col = col;

    let cellValue = this.hot.getDataAtCell(row, col);
    console.log(`[prepare] raw value in cell (${row}, ${col}):`, cellValue);

    if (!Array.isArray(cellValue)) {
      try {
        cellValue = JSON.parse(cellValue);
      } catch (e) {
        cellValue = [];
      }
    }

    if (!Array.isArray(cellValue)) cellValue = [];

    // 必ずJSON文字列でセルに保存（正規化）
    this.hot.setDataAtCell(row, col, JSON.stringify(cellValue));

    this.value = cellValue.map((id) => ({
      value: id,
      label: this.options.find((opt) => opt.value === id)?.label || id,
    }));
  }

  setValue(value) {
    console.log(`[setValue] arg for cell (${this.row}, ${this.col}):`, value);
    let ids = [];

    if (Array.isArray(value)) {
      ids = value; // 配列ならそのまま
    } else if (typeof value === "string") {
      try {
        ids = JSON.parse(value); // JSON ならパース
        if (!Array.isArray(ids)) ids = [value]; // 失敗なら「単一ID配列」とみなす
      } catch {
        ids = [value]; // 文字列一つを ID として扱う
      }
    }

    this.value = ids.map((id) => ({
      value: id,
      label: this.options.find((o) => o.value === id)?.label || id,
    }));
    console.log(
      `[setValue] (${this.row},${this.col}) this.value =`,
      this.value
    );
  }

  getValue() {
    // セルにはIDだけを保存（シンプルな配列）
    const ids = this.value.map((item) => item.value);
    const json = JSON.stringify(ids);
    console.log(`[getValue] return for cell (${this.row}, ${this.col}):`, json);
    return json;
  }

  finishEditing(...args) {
    console.log("[finishEditing] args =", args);
    super.finishEditing(...args);
  }

  open() {
    // エディタコンテナの作成
    if (!this.container) {
      this.container = document.createElement("div");

      // スタイル設定
      this.container.style.position = "absolute";
      this.container.style.width = "250px";
      this.container.style.zIndex = "1000";
      this.container.style.background = "white";
      this.container.style.boxShadow = "0 2px 8px rgba(0, 0, 0, 0.2)";
      this.container.style.borderRadius = "4px";
      this.container.style.padding = "4px";

      // ReactのルートをDOMコンテナに接続
      this.root = createRoot(this.container);
    }

    // エディタの位置を調整
    const { left, top, width, height } = this.TD.getBoundingClientRect();
    this.container.style.left = `${left}px`;
    this.container.style.top = `${top + height}px`;

    // Selectコンポーネントのレンダリング関数
    const renderSelect = () => {
      this.root.render(
        <Select
          isMulti
          autoFocus
          // menuIsOpen
          defaultMenuIsOpen
          closeMenuOnSelect={false}
          blurInputOnSelect={false}
          options={this.options}
          value={this.value}
          onBlur={() => this.finishEditing(false)}
          onChange={(selectedOptions, actionMeta) => {
            console.log("[onChange] selected =", selectedOptions);
            // 値の更新
            if (selectedOptions) {
              // 選択されたオプションをreact-select形式に変換
              this.value = selectedOptions.map((option) => {
                if (typeof option === "object" && option !== null) {
                  return {
                    value: option.value,
                    label: option.label,
                  };
                }
                return { value: option, label: option };
              });
            } else {
              this.value = [];
            }
            // UIを再描画
            renderSelect();
          }}
          onMenuClose={() => {
            console.log("onMenuClose called");
            // メニューが閉じられたタイミングで初めて確定
            this.finishEditing(false);
          }}
          styles={{
            control: (base) => ({
              ...base,
              minHeight: "34px",
            }),
            menu: (base) => ({
              ...base,
              position: "relative",
              boxShadow: "none",
            }),
            multiValue: (base) => ({
              ...base,
              backgroundColor: "#e0e0e0",
              borderRadius: "12px",
              margin: "2px",
            }),
            multiValueLabel: (base) => ({
              ...base,
              color: "#333",
              padding: "2px 6px",
            }),
            multiValueRemove: (base) => ({
              ...base,
              color: "#666",
              borderRadius: "0 12px 12px 0",
              padding: "2px 6px",
              ":hover": {
                backgroundColor: "#d0d0d0",
                color: "#333",
              },
            }),
          }}
          components={{
            MultiValueRemove: ({ children, ...props }) => {
              console.log("MultiValueRemove props:", props);
              return (
                <div
                  {...props.innerProps}
                  style={{
                    cursor: "pointer",
                    padding: "2px 6px",
                    color: "#666",
                    ":hover": {
                      backgroundColor: "#d0d0d0",
                      color: "#333",
                    },
                  }}
                  onMouseDown={(e) => {
                    console.log("MultiValueRemove mousedown");
                    e.stopPropagation();
                    e.preventDefault();
                    if (props.removeProps && props.removeProps.onClick) {
                      props.removeProps.onClick(e);
                    }
                  }}
                >
                  ×
                </div>
              );
            },
          }}
        />
      );
    };

    // 初回レンダリング
    renderSelect();

    // エディタをDOMに追加
    document.body.appendChild(this.container);

    console.log(
      "8. After renderSelect - this.value:",
      JSON.stringify(this.value, null, 2)
    );
    console.log("=== End open method Debug Info ===");
  }

  close() {
    // 値の更新および後処理
    if (this.root && this.container) {
      this.root.unmount();
      if (this.container.parentNode) {
        this.container.parentNode.removeChild(this.container);
      }
      this.container = null;
      this.root = null;
    }
  }

  focus() {
    // フォーカスはSelect自体が自動的に処理する
  }
}

// タグ(チップ)形式で選択値を表示するレンダラー
export function chipRenderer(
  instance,
  td,
  row,
  col,
  prop,
  value,
  cellProperties
) {
  td.innerHTML = "";

  let displayValues = [];
  try {
    if (typeof value === "string") {
      // JSON文字列をオブジェクトに変換
      const parsedValue = JSON.parse(value);

      if (Array.isArray(parsedValue)) {
        displayValues = parsedValue;
      } else if (parsedValue) {
        displayValues = [parsedValue];
      }
    } else if (Array.isArray(value)) {
      displayValues = value;
    } else if (value) {
      displayValues = [value];
    }
  } catch (error) {
    console.error("JSONパースエラー:", error);
    displayValues = [];
  }

  console.log(
    "6. Final displayValues:",
    JSON.stringify(displayValues, null, 2)
  );
  console.log("=== End chipRenderer Debug Info ===");

  if (!displayValues.length) {
    td.textContent = "";
    return td;
  }

  // 選択された値をタグとして表示
  const chips = document.createElement("div");
  chips.style.display = "flex";
  chips.style.flexWrap = "wrap";
  chips.style.gap = "4px";

  displayValues.forEach((item) => {
    const chip = document.createElement("div");
    chip.textContent =
      typeof item === "object" && item !== null
        ? item.label || item.accountName
        : item;
    chip.style.background = "#e0e0e0";
    chip.style.borderRadius = "12px";
    chip.style.padding = "2px 8px";
    chip.style.fontSize = "12px";
    chips.appendChild(chip);
  });

  td.appendChild(chips);
  return td;
}
