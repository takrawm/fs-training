import React, { useMemo } from "react";
import { Form, ListGroup, Card } from "react-bootstrap";

/**
 * アカウント選択コンポーネント
 * ユーザーがチャートやテーブルに表示するアカウントを選択できる
 */
const AccountSelector = ({
  model,
  selectedAccounts = [],
  onSelectionChange,
  title = "アカウント選択",
  groupByType = true,
}) => {
  // アカウントをタイプ別にグループ化
  const groupedAccounts = useMemo(() => {
    if (!model || !model.accounts) return {};

    if (!groupByType) {
      return { すべてのアカウント: model.accounts };
    }

    return model.accounts.reduce((groups, account) => {
      const type = account.accountType || "未分類";
      if (!groups[type]) {
        groups[type] = [];
      }
      groups[type].push(account);
      return groups;
    }, {});
  }, [model, groupByType]);

  // グループごとの選択状態を確認
  const groupSelectionState = useMemo(() => {
    if (!model || !model.accounts) return {};

    return Object.entries(groupedAccounts).reduce(
      (result, [type, accounts]) => {
        const accountIds = accounts.map((account) => account.id);
        const selectedCount = accountIds.filter((id) =>
          selectedAccounts.includes(id)
        ).length;

        result[type] = {
          all: selectedCount === accountIds.length,
          some: selectedCount > 0 && selectedCount < accountIds.length,
          none: selectedCount === 0,
        };

        return result;
      },
      {}
    );
  }, [groupedAccounts, selectedAccounts]);

  // アカウントの選択を処理
  const handleAccountSelect = (accountId) => {
    if (selectedAccounts.includes(accountId)) {
      onSelectionChange(selectedAccounts.filter((id) => id !== accountId));
    } else {
      onSelectionChange([...selectedAccounts, accountId]);
    }
  };

  // グループ全体の選択を処理
  const handleGroupSelect = (type, isSelected) => {
    const accountIds = groupedAccounts[type].map((account) => account.id);

    if (isSelected) {
      // グループ内のすべてのアカウントを選択に追加
      const newSelection = [...selectedAccounts];
      accountIds.forEach((id) => {
        if (!newSelection.includes(id)) {
          newSelection.push(id);
        }
      });
      onSelectionChange(newSelection);
    } else {
      // グループ内のすべてのアカウントを選択から削除
      onSelectionChange(
        selectedAccounts.filter((id) => !accountIds.includes(id))
      );
    }
  };

  if (!model || !model.accounts || model.accounts.length === 0) {
    return (
      <Card className="h-100">
        <Card.Header className="font-weight-bold">{title}</Card.Header>
        <Card.Body className="d-flex justify-content-center align-items-center">
          <p className="text-muted">アカウントが見つかりません</p>
        </Card.Body>
      </Card>
    );
  }

  return (
    <Card className="h-100">
      <Card.Header className="font-weight-bold">{title}</Card.Header>
      <Card.Body className="p-0">
        <ListGroup variant="flush">
          {Object.entries(groupedAccounts).map(([type, accounts]) => (
            <React.Fragment key={type}>
              <ListGroup.Item className="bg-light">
                <Form.Check
                  type="checkbox"
                  id={`group-${type}`}
                  label={`${type} (${accounts.length})`}
                  checked={groupSelectionState[type].all}
                  onChange={(e) => handleGroupSelect(type, e.target.checked)}
                  className="fw-bold"
                  indeterminate={groupSelectionState[type].some}
                />
              </ListGroup.Item>

              {accounts.map((account) => (
                <ListGroup.Item key={account.id} className="ps-4">
                  <Form.Check
                    type="checkbox"
                    id={`account-${account.id}`}
                    label={account.name}
                    checked={selectedAccounts.includes(account.id)}
                    onChange={() => handleAccountSelect(account.id)}
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

export default AccountSelector;
