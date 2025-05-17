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
    super.prepare(row, col, prop, td, originalValue, cellProperties);
    this.options = cellProperties.source || [];

    // 値が文字列にキャストされている場合に対応
    if (typeof originalValue === "string" && originalValue.includes(",")) {
      // カンマ区切りの文字列を配列に分割
      this.value = originalValue.split(",").map((item) => item.trim());
    } else {
      // 通常の配列処理
      this.value = Array.isArray(originalValue)
        ? originalValue
        : originalValue
        ? [originalValue]
        : [];
    }

    // 重複の除去
    this.value = [...new Set(this.value)];
  }

  getValue() {
    return this.value;
  }

  setValue(value) {
    // 値が文字列の場合はカンマ区切りとして処理
    if (typeof value === "string" && value.includes(",")) {
      this.value = value.split(",").map((item) => item.trim());
    } else {
      this.value = Array.isArray(value) ? value : value ? [value] : [];
    }

    // 重複の除去
    this.value = [...new Set(this.value)];
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
      // 各値を確実にオブジェクトに変換
      const valueOptions = this.value.map((v) => ({ value: v, label: v }));

      this.root.render(
        <Select
          isMulti
          autoFocus
          menuIsOpen
          closeMenuOnSelect={false}
          blurInputOnSelect={false}
          options={this.options.map((option) => ({
            value: option,
            label: option,
          }))}
          value={valueOptions}
          onInputChange={(inputValue, { action }) => {
            console.log("onInputChange:", { inputValue, action });
          }}
          onKeyDown={(e) => {
            console.log("onKeyDown:", e.key);
          }}
          onMouseDown={(e) => {
            console.log("onMouseDown:", e.target);
            // イベントの伝播を確認
            console.log("Event path:", e.composedPath());
          }}
          onChange={(selectedOptions, actionMeta) => {
            console.log("onChange called with:", selectedOptions);
            console.log("Action:", actionMeta.action);
            console.log("ActionMeta:", actionMeta);
            console.log("Current value:", this.value);

            // 値の更新
            const newValue = selectedOptions
              ? selectedOptions.map((option) => option.value)
              : [];

            console.log(
              "→ newValue にセットする前:",
              this.value,
              "→ newValue:",
              newValue
            );

            // 値を更新
            this.setValue(newValue);
            console.log("→ setValue 後の this.value:", this.value);

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

  // 値が文字列の場合（カンマ区切り）は配列に分割
  let displayValues = value;
  if (typeof value === "string" && value.includes(",")) {
    displayValues = value.split(",").map((item) => item.trim());
  } else if (!Array.isArray(value)) {
    displayValues = value ? [value] : [];
  }

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
    chip.textContent = item;
    chip.style.background = "#e0e0e0";
    chip.style.borderRadius = "12px";
    chip.style.padding = "2px 8px";
    chip.style.fontSize = "12px";
    chips.appendChild(chip);
  });

  td.appendChild(chips);
  return td;
}
