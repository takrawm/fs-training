import React, { useMemo } from "react";
import { Card, Form, ListGroup, Button } from "react-bootstrap";

/**
 * パラメータ選択コンポーネント
 * ユーザーがチャートやテーブルに表示するパラメータを選択できる
 */
const ParameterSelector = ({
  model,
  selectedParameters = [],
  onSelectionChange,
  title = "パラメータ選択",
  groupByType = true,
}) => {
  // パラメータをタイプ別にグループ化
  const groupedParameters = useMemo(() => {
    if (!model || !model.parameters) return {};

    if (!groupByType) {
      return { すべてのパラメータ: model.parameters };
    }

    // パラメータをタイプごとにグループ化
    return model.parameters.reduce((groups, param) => {
      const type = param.type || "未分類";
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(param);
      return groups;
    }, {});
  }, [model, groupByType]);

  // グループ名の日本語表示
  const typeNames = {
    amount: "金額",
    percentage: "パーセント",
    ratio: "比率",
    headcount: "人数",
    rate: "レート",
    count: "数量",
    price: "価格",
    未分類: "未分類",
  };

  // グループごとの選択状態を確認
  const groupSelectionState = useMemo(() => {
    if (!model || !model.parameters) return {};

    return Object.entries(groupedParameters).reduce(
      (result, [type, params]) => {
        const paramIds = params.map((param) => param.id);
        const selectedCount = paramIds.filter((id) =>
          selectedParameters.includes(id)
        ).length;

        result[type] = {
          all: selectedCount === paramIds.length,
          some: selectedCount > 0 && selectedCount < paramIds.length,
          none: selectedCount === 0,
        };

        return result;
      },
      {}
    );
  }, [groupedParameters, selectedParameters]);

  // パラメータの選択を処理
  const handleParameterSelect = (paramId) => {
    if (selectedParameters.includes(paramId)) {
      onSelectionChange(selectedParameters.filter((id) => id !== paramId));
    } else {
      onSelectionChange([...selectedParameters, paramId]);
    }
  };

  // グループ全体の選択を処理
  const handleGroupSelect = (type, isSelected) => {
    const paramIds = groupedParameters[type].map((param) => param.id);

    if (isSelected) {
      // グループ内のすべてのパラメータを選択から削除
      onSelectionChange(
        selectedParameters.filter((id) => !paramIds.includes(id))
      );
    } else {
      // グループ内のすべてのパラメータを選択に追加
      const newSelection = [...selectedParameters];
      paramIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      onSelectionChange(newSelection);
    }
  };

  // 主要パラメータを選択（金額と比率）
  const selectMainParameters = () => {
    if (!model || !model.parameters) return;

    const mainTypes = ["amount", "ratio", "percentage"];
    const mainParams = model.parameters
      .filter((param) => mainTypes.includes(param.type))
      .map((param) => param.id);

    onSelectionChange(mainParams);
  };

  // すべてのパラメータを選択
  const selectAllParameters = () => {
    if (!model || !model.parameters) return;
    onSelectionChange(model.parameters.map((param) => param.id));
  };

  // 選択をクリア
  const clearSelection = () => {
    onSelectionChange([]);
  };

  if (!model || !model.parameters || model.parameters.length === 0) {
    return (
      <Card className="h-100">
        <Card.Header className="font-weight-bold">{title}</Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center">
          <p className="text-muted">パラメータが見つかりません</p>
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
            onClick={selectMainParameters}
          >
            主要
          </Button>
          <Button
            size="sm"
            variant="outline-secondary"
            onClick={selectAllParameters}
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
          {Object.entries(groupedParameters).map(([type, params]) => (
            <React.Fragment key={type}>
              <ListGroup.Item className="bg-light">
                <Form.Check
                  type="checkbox"
                  id={`group-${type}`}
                  label={`${typeNames[type] || type} (${params.length})`}
                  checked={groupSelectionState[type].all}
                  onChange={(e) => handleGroupSelect(type, e.target.checked)}
                  className="fw-bold"
                  indeterminate={groupSelectionState[type].some}
                />
              </ListGroup.Item>

              {params.map((param) => (
                <ListGroup.Item key={param.id} className="ps-4">
                  <Form.Check
                    type="checkbox"
                    id={`param-${param.id}`}
                    label={param.name || param.id}
                    checked={selectedParameters.includes(param.id)}
                    onChange={() => handleParameterSelect(param.id)}
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

export default ParameterSelector;
