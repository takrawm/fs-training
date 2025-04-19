import React, { useMemo } from "react";
import { Form, ListGroup, Card, Button } from "react-bootstrap";

/**
 * 期間選択コンポーネント
 * ユーザーがチャートやテーブルに表示する期間を選択できる
 */
const PeriodSelector = ({
  model,
  selectedPeriods = [],
  onSelectionChange,
  title = "期間選択",
  groupByYear = true,
}) => {
  // 期間を年別にグループ化
  const groupedPeriods = useMemo(() => {
    if (!model || !model.periods) return {};

    if (!groupByYear) {
      return { すべての期間: model.periods };
    }

    return model.periods.reduce((groups, period) => {
      // 期間の年部分を抽出（例: "2023-Q1" -> "2023"）
      const year = period.id.split("-")[0];
      if (!groups[year]) {
        groups[year] = [];
      }
      groups[year].push(period);
      return groups;
    }, {});
  }, [model, groupByYear]);

  // グループごとの選択状態を確認
  const groupSelectionState = useMemo(() => {
    if (!model || !model.periods) return {};

    return Object.entries(groupedPeriods).reduce((result, [year, periods]) => {
      const periodIds = periods.map((period) => period.id);
      const selectedCount = periodIds.filter((id) =>
        selectedPeriods.includes(id)
      ).length;

      result[year] = {
        all: selectedCount === periodIds.length,
        some: selectedCount > 0 && selectedCount < periodIds.length,
        none: selectedCount === 0,
      };

      return result;
    }, {});
  }, [groupedPeriods, selectedPeriods]);

  // 期間の選択を処理
  const handlePeriodSelect = (periodId) => {
    if (selectedPeriods.includes(periodId)) {
      onSelectionChange(selectedPeriods.filter((id) => id !== periodId));
    } else {
      onSelectionChange([...selectedPeriods, periodId]);
    }
  };

  // グループ全体の選択を処理
  const handleGroupSelect = (year, isSelected) => {
    const periodIds = groupedPeriods[year].map((period) => period.id);

    if (isSelected) {
      // グループ内のすべての期間を選択から削除
      onSelectionChange(
        selectedPeriods.filter((id) => !periodIds.includes(id))
      );
    } else {
      // グループ内のすべての期間を選択に追加
      const newSelection = [...selectedPeriods];
      periodIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      onSelectionChange(newSelection);
    }
  };

  // 直近の四半期を選択
  const selectRecentQuarters = (count = 4) => {
    if (!model || !model.periods) return;

    const sortedPeriods = [...model.periods].sort((a, b) => {
      // 期間IDを比較してソート (例: 2023-Q4 > 2023-Q3)
      return b.id.localeCompare(a.id);
    });

    const recentPeriods = sortedPeriods.slice(0, count).map((p) => p.id);
    onSelectionChange(recentPeriods);
  };

  // すべての期間を選択
  const selectAllPeriods = () => {
    if (!model || !model.periods) return;
    onSelectionChange(model.periods.map((period) => period.id));
  };

  // 選択をクリア
  const clearSelection = () => {
    onSelectionChange([]);
  };

  if (!model || !model.periods || model.periods.length === 0) {
    return (
      <Card className="h-100">
        <Card.Header className="font-weight-bold">{title}</Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center">
          <p className="text-muted">期間が見つかりません</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Header className="font-weight-bold d-flex justify-content-between align-items-center">
        <span>{title}</span>
        <div className="btn-group btn-group-sm">
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={() => selectRecentQuarters(4)}
          >
            直近4Q
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={selectAllPeriods}
          >
            すべて
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={clearSelection}
          >
            クリア
          </Button>
        </div>
      </Card.Header>
      <Card.Body className="p-0">
        <ListGroup variant="flush">
          {Object.entries(groupedPeriods).map(([year, periods]) => (
            <React.Fragment key={year}>
              <ListGroup.Item className="bg-light">
                <Form.Check
                  type="checkbox"
                  id={`group-${year}`}
                  label={`${year} (${periods.length})`}
                  checked={groupSelectionState[year].all}
                  onChange={(e) => handleGroupSelect(year, e.target.checked)}
                  className="fw-bold"
                  indeterminate={groupSelectionState[year].some}
                />
              </ListGroup.Item>

              {periods.map((period) => (
                <ListGroup.Item key={period.id} className="ps-4">
                  <Form.Check
                    type="checkbox"
                    id={`period-${period.id}`}
                    label={period.name || period.id}
                    checked={selectedPeriods.includes(period.id)}
                    onChange={() => handlePeriodSelect(period.id)}
                  />
                </ListGroup.Item>
              ))}
            </React.Fragment>
          ))}
        </ListGroup>
      </Card.Body>
    </Card>
  );
};

export default PeriodSelector;
