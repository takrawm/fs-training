import { useState, useCallback } from "react";
import { buildModelFromExcel } from "../utils/dataTransform.js";

/**
 * Excelファイルのインポートと処理を管理するカスタムフック
 * @returns {Object} インポート関連の状態と関数
 */
export function useExcelImport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  /**
   * ファイルをArrayBufferとして読み込む
   * @param {File} file - ファイル
   * @returns {Promise<ArrayBuffer>} ArrayBuffer
   */
  const readFileAsArrayBuffer = (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.onload = (e) => {
        resolve(e.target.result);
      };

      reader.onerror = (e) => {
        reject(new Error("ファイルの読み込みに失敗しました"));
      };

      reader.readAsArrayBuffer(file);
    });
  };

  /**
   * Excelファイルを読み込み、財務モデルを構築する
   * @param {File} file - Excelファイル
   * @returns {Promise<import('../types/models.js').FinancialModel>} 財務モデル
   */
  const importExcelFile = useCallback(async (file) => {
    setIsLoading(true);
    setError(null);

    try {
      // ファイルをArrayBufferとして読み込む
      const fileBuffer = await readFileAsArrayBuffer(file);

      // Excelデータから財務モデルを構築
      const model = buildModelFromExcel(fileBuffer);

      setIsLoading(false);
      return model;
    } catch (err) {
      console.error("Excel読み込みエラー:", err);
      setError(err.message || "Excelファイルの読み込みに失敗しました");
      setIsLoading(false);
      throw err;
    }
  }, []);

  /**
   * URLからExcelファイルをインポートする
   * @param {string} url Excelファイルへのパス
   * @returns {Promise<Object>} インポートしたモデル
   */
  const importExcelFromUrl = useCallback(async (url) => {
    if (!url) {
      const error = new Error("URLが指定されていません");
      setError(error.message);
      throw error;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Fetchでファイルを取得
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`ファイルのダウンロードに失敗: ${response.statusText}`);
      }

      const arrayBuffer = await response.arrayBuffer();
      // buildModelFromExcelを使用してExcelデータからモデルを構築
      const model = buildModelFromExcel(arrayBuffer);

      return model;
    } catch (err) {
      console.error("Excelインポートエラー:", err);
      setError(err.message);
      throw err; // エラーを再スローして呼び出し元で処理できるようにする
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    isLoading,
    error,
    importExcelFile,
    importExcelFromUrl,
  };
}
