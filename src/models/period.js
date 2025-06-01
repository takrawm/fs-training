/**
 * 期間情報を生成する
 * @param {Object} flattenedData - フラット化されたデータ
 * @returns {Array} 期間情報の配列
 */
export const createPeriods = (flattenedData) => {
  const newPeriods = [];
  if (flattenedData?.headerRow && flattenedData.headerRow.length > 0) {
    flattenedData.headerRow.forEach((year, index) => {
      const currentYear = new Date().getFullYear();
      const isActual = Number(year) <= currentYear;
      newPeriods.push({
        id: `p-${year}`,
        year,
        isActual,
        isFromExcel: true,
        order: index + 1,
      });
    });
  }
  return newPeriods;
};
