import { HyperFormula } from "hyperformula";

/**
 * HyperFormula インスタンスを初期化する
 * @returns {HyperFormula} 初期化されたHyperFormulaインスタンス
 */
export function initializeHyperFormula() {
  const hfInstance = HyperFormula.buildEmpty({
    licenseKey: "gpl-v3",
  });

  // シートの作成
  const sheetNames = ["actual", "params", "forecast", "calc", "indicators"];
  sheetNames.forEach((sheetName) => {
    if (!hfInstance.doesSheetExist(sheetName)) {
      hfInstance.addSheet(sheetName);
    }
  });

  return hfInstance;
}

export function loadModelToHyperFormula(hfInstance, model) {
  // 期間の順序でソート
  const sortedPeriods = [...model.periods].sort((a, b) => a.order - b.order);
  // 勘定科目の順序でソート
  const sortedAccounts = [...model.accounts].sort((a, b) => a.order - b.order);
  // 実績データシートの構築
  const actualSheet = [];
  // ヘッダー行の構築
  const headerRow = ["ID", "コード", "勘定科目", "タイプ"];
  sortedPeriods.forEach((period) => {
    headerRow.push(`${period.year}${period.month ? `/${period.month}` : ""}`);
  });
  actualSheet.push(headerRow);

  // データ行の構築
  sortedAccounts.forEach((account) => {
    const dataRow = [account.id, account.code, account.name, account.type];

    sortedPeriods.forEach((period) => {
      const cellValue = model.values.find(
        (v) => v.accountId === account.id && v.periodId === period.id
      );
      dataRow.push(cellValue ? cellValue.value : 0);
    });

    actualSheet.push(dataRow);
  });

  // パラメータシートの構築
  const paramsSheet = [];
  paramsSheet.push(["ID", "勘定科目", "パラメータタイプ", "値", "参照科目"]);

  // パラメータを持つ勘定科目を抽出
  const accountsWithParameters = model.accounts.filter(
    (account) => account.parameter !== null
  );
  accountsWithParameters.forEach((account) => {
    paramsSheet.push([
      account.id,
      account.name,
      account.parameter.type,
      account.parameter.value,
      account.parameter.referenceAccountId || "",
    ]);
  });

  // シートにデータをセット
  // シートIDの取得
  let actualSheetId, paramsSheetId;

  if (hfInstance.doesSheetExist) {
    // 直接HyperFormulaインスタンスの場合
    if (!hfInstance.doesSheetExist("actual")) {
      actualSheetId = hfInstance.addSheet("actual");
    } else {
      actualSheetId = hfInstance.getSheetId("actual");
    }

    if (!hfInstance.doesSheetExist("params")) {
      paramsSheetId = hfInstance.addSheet("params");
    } else {
      paramsSheetId = hfInstance.getSheetId("params");
    }
  } else {
    console.error("HyperFormulaインスタンスが正しく初期化されていません");
    return;
  }

  hfInstance.setSheetContent(actualSheetId, actualSheet);
  hfInstance.setSheetContent(paramsSheetId, paramsSheet);

  // 予測データシートの構築
  buildForecastSheet(hfInstance, model, sortedAccounts, sortedPeriods);

  return hfInstance;
}

/**
 * 予測データシートを構築する
 * @param {HyperFormula} hfInstance
 * @param {import('../types/models.js').FinancialModel} model
 * @param {import('../types/models.js').Account[]} sortedAccounts
 * @param {import('../types/models.js').Periods[]} sortedPeriods
 */

function buildForecastSheet(hfInstance, model, sortedAccounts, sortedPeriods) {
  const forecastSheet = [];

  // ヘッダー行
  const headerRow = ["ID", "コード", "勘定科目", "タイプ"];
  sortedPeriods.forEach((period) => {
    headerRow.push(`${period.year}${period.month ? `/${period.month}` : ""}`);
  });
  // forecastシートにheaderRowを追加
  forecastSheet.push(headerRow);
  // console.log("headerRow: ", headerRow);

  //   データ行
  sortedAccounts.forEach((account, rowIdx) => {
    const dataRow = [account.id, account.code, account.name, account.type];
    // console.log("dataRow-更新前: ", dataRow);
    sortedPeriods.forEach((period, colIdx) => {
      // 実績データの場合は値をそのまま使用
      if (period.isActual) {
        // console.log("Period_ID: ", period.id);
        // modelに入っているvaluesのaccountId・periodIdと、accountとperiodに入っているidを比較
        const cellValue = model.values.find(
          (v) => v.accountId === account.id && v.periodId === period.id
        );
        dataRow.push(cellValue ? cellValue.value : 0);
      }
      //   予測データの場合は単純な値を使用（計算式を使わない）
      else {
        // console.log("Period_ID: ", period.id);
        const cellValue = model.values.find(
          (v) => v.accountId === account.id && v.periodId === period.id
        );
        dataRow.push(cellValue ? cellValue.value : 0);
      }
    });
    // forecastシートにdataRowを追加
    forecastSheet.push(dataRow);
    // console.log("dataRow-更新後: ", dataRow);
  });

  // forecastシートにデータをセット
  let forecastSheetId;

  if (hfInstance.doesSheetExist) {
    // 直接HyperFormulaインスタンスの場合
    if (!hfInstance.doesSheetExist("forecast")) {
      forecastSheetId = hfInstance.addSheet("forecast");
    } else {
      forecastSheetId = hfInstance.getSheetId("forecast");
    }

    hfInstance.setSheetContent(forecastSheetId, forecastSheet);
  } else {
    console.error("HyperFormulaインスタンスが正しく初期化されていません");
  }
}

/**
 * Hyperformulaでの計算結果を取得する
 * @param {HyperFormula} hfInstance
 * @param {string} sheetName　- シート名
 * @param {number} row - 行インデックス
 * @param {number} col - 列インデックス
 * @returns {number} 計算結果
 */

// HyperFormulaスプレッドシート内の特定のセルの値を取得する。セルが空や未定義の場合は0を返す
export function getCalculatedValue(hfInstance, sheetName, row, col) {
  const sheetId = hfInstance.getSheetId(sheetName);
  const address = { sheet: sheetId, row, col };
  return hfInstance.getCellValue(address) || 0;
}

/**
 * HyperFormulaの計算結果をモデルに反映する
 * @param {HyperFormula} hfInstance - HyperFormulaインスタンス
 * @param {import('../types/models.js').FinancialModel} model - 財務モデル
 * @returns {import('../types/models.js').FinancialModel} 更新されたモデル
 */

export function updateModelFromCalculations(hfInstance, model) {
  const updatedModel = { ...model };

  let forecastSheetId;

  if (hfInstance.doesSheetExist) {
    // 直接HyperFormulaインスタンスの場合
    if (!hfInstance.doesSheetExist("forecast")) {
      forecastSheetId = hfInstance.addSheet("forecast");
    } else {
      forecastSheetId = hfInstance.getSheetId("forecast");
    }
  } else {
    console.error("HyperFormulaインスタンスが正しく初期化されていません");
    return model;
  }

  //   期間の順序でソート
  const sortedPeriods = [...model.periods].sort((a, b) => a.order - b.order);
  // console.log("sortedPeriods: ", sortedPeriods);
  //   勘定科目の順序でソート
  const sortedAccounts = [...model.accounts].sort((a, b) => a.order - b.order);

  // 予測期間のデータを更新
  const forecastPeriods = sortedPeriods.filter((p) => !p.isActual);
  // console.log("forecastPeriods: ", forecastPeriods);

  // 新しい値を格納する配列
  const updatedValues = [...model.values];

  sortedAccounts.forEach((account, rowIdx) => {
    // ヘッダー行を考慮（1行目を飛ばす）
    const row = rowIdx + 1;

    // 将来期間だけperiodsをループ
    forecastPeriods.forEach((period, colIdx) => {
      //ID, コード、名前、タイプを考慮
      const col = 4 + sortedPeriods.findIndex((p) => p.id === period.id);

      // HyperFormulaから計算結果を取得
      const calculatedValue = getCalculatedValue(
        hfInstance,
        "forecast",
        row,
        col
      );

      //   該当するセル値を検索
      const valueIndex = updatedValues.findIndex(
        (v) => v.accountId === account.id && v.periodId === period.id
      );

      if (valueIndex >= 0) {
        // 既存の値を更新
        updatedValues[valueIndex] = {
          ...updatedValues[valueIndex],
          value: calculatedValue,
          isCalculated: true,
        };
      } else {
        // 新しい値を追加
        updatedValues.push({
          accountId: account.id,
          periodId: period.id,
          value: calculatedValue,
          isCalculated: true,
          formula: null,
        });
      }
    });
  });

  updatedModel.values = updatedValues;
  return updatedModel;
}
