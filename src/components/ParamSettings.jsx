import React, { useState, useEffect } from "react";
import { Row, Col, Card, ListGroup, Form, InputGroup } from "react-bootstrap";

/**
 * パラメータ設定コンポーネント
 * モデルのパラメータグループとパラメータを編集する
 */
const ParamSettings = ({
  paramGroups,
  activeParam,
  setActiveParam,
  onParamChange,
}) => {
  const [localValues, setLocalValues] = useState({});
  const [searchTerm, setSearchTerm] = useState("");

  // コンポーネントマウント時にパラメータの値をローカル状態に設定
  useEffect(() => {
    const initialValues = {};

    paramGroups.forEach((group) => {
      group.params.forEach((param) => {
        initialValues[`${group.id}-${param.id}`] = param.value;
      });
    });

    setLocalValues(initialValues);
  }, [paramGroups]);

  // パラメータの変更ハンドラ
  const handleParamChange = (groupId, paramId, value) => {
    // 数値変換（必要に応じて）
    const numericValue = value === "" ? "" : parseFloat(value);

    // ローカル状態を更新
    setLocalValues((prev) => ({
      ...prev,
      [`${groupId}-${paramId}`]: value,
    }));

    // 親コンポーネントに変更を通知（数値のみ）
    if (value !== "" && !isNaN(numericValue)) {
      onParamChange(groupId, paramId, numericValue);
    }
  };

  // パラメータのフォーカス時の処理
  const handleParamFocus = (groupId, paramId) => {
    setActiveParam({ groupId, paramId });
  };

  // パラメータのブラー時の処理
  const handleParamBlur = (groupId, paramId) => {
    // 空の値を0に設定
    if (localValues[`${groupId}-${paramId}`] === "") {
      handleParamChange(groupId, paramId, 0);
    }
  };

  // 検索条件に一致するパラメータをフィルタリング
  const filteredParamGroups = searchTerm
    ? paramGroups
        .map((group) => ({
          ...group,
          params: group.params.filter(
            (param) =>
              param.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
              param.description
                ?.toLowerCase()
                .includes(searchTerm.toLowerCase())
          ),
        }))
        .filter((group) => group.params.length > 0)
    : paramGroups;

  return (
    <div className="param-settings">
      <Row className="mb-4">
        <Col>
          <Form.Group>
            <InputGroup>
              <InputGroup.Text>
                <i className="bi bi-search"></i>
              </InputGroup.Text>
              <Form.Control
                type="text"
                placeholder="パラメータを検索..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
              {searchTerm && (
                <InputGroup.Text
                  style={{ cursor: "pointer" }}
                  onClick={() => setSearchTerm("")}
                >
                  <i className="bi bi-x-circle"></i>
                </InputGroup.Text>
              )}
            </InputGroup>
          </Form.Group>
        </Col>
      </Row>

      <Row>
        {filteredParamGroups.map((group) => (
          <Col md={6} lg={4} key={group.id} className="mb-4">
            <Card>
              <Card.Header className="bg-light">
                <h5 className="mb-0">{group.name}</h5>
                {group.description && (
                  <small className="text-muted">{group.description}</small>
                )}
              </Card.Header>
              <ListGroup variant="flush">
                {group.params.map((param) => {
                  const paramKey = `${group.id}-${param.id}`;
                  const isActive =
                    activeParam &&
                    activeParam.groupId === group.id &&
                    activeParam.paramId === param.id;

                  return (
                    <ListGroup.Item
                      key={param.id}
                      className={isActive ? "active" : ""}
                    >
                      <Form.Group>
                        <Form.Label>
                          {param.name}
                          {param.unit && (
                            <span className="text-muted ml-1">
                              ({param.unit})
                            </span>
                          )}
                        </Form.Label>
                        {param.description && (
                          <Form.Text className="text-muted mb-2">
                            {param.description}
                          </Form.Text>
                        )}
                        <InputGroup size="sm">
                          <Form.Control
                            type="number"
                            step="any"
                            value={
                              localValues[paramKey] !== undefined
                                ? localValues[paramKey]
                                : ""
                            }
                            onChange={(e) =>
                              handleParamChange(
                                group.id,
                                param.id,
                                e.target.value
                              )
                            }
                            onFocus={() => handleParamFocus(group.id, param.id)}
                            onBlur={() => handleParamBlur(group.id, param.id)}
                            className={isActive ? "border-primary" : ""}
                          />
                          {param.unit && (
                            <InputGroup.Text>{param.unit}</InputGroup.Text>
                          )}
                        </InputGroup>

                        {param.min !== undefined && param.max !== undefined && (
                          <Form.Range
                            min={param.min}
                            max={param.max}
                            step={param.step || 0.01}
                            value={
                              localValues[paramKey] !== undefined
                                ? localValues[paramKey]
                                : 0
                            }
                            onChange={(e) =>
                              handleParamChange(
                                group.id,
                                param.id,
                                parseFloat(e.target.value)
                              )
                            }
                            className="mt-2"
                          />
                        )}
                      </Form.Group>
                    </ListGroup.Item>
                  );
                })}
              </ListGroup>
            </Card>
          </Col>
        ))}

        {filteredParamGroups.length === 0 && (
          <Col>
            <div className="alert alert-info">
              検索条件に一致するパラメータがありません。
            </div>
          </Col>
        )}
      </Row>
    </div>
  );
};

export default ParamSettings;
