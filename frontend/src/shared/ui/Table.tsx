import { Fragment, type ReactNode } from "react";

import { cx } from "../lib/cx";
import { EmptyState } from "./EmptyState";

export type TableColumn<Row> = {
  key: string;
  header: string;
  render: (row: Row) => ReactNode;
  className?: string;
};

type TableProps<Row> = {
  caption: string;
  columns: TableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string;
  emptyTitle: string;
  emptyDescription?: string;
  className?: string;
  rowClassName?: (row: Row) => string | undefined;
  renderExpandedRow?: (row: Row) => ReactNode;
};

export function Table<Row>({
  caption,
  className,
  columns,
  emptyDescription,
  emptyTitle,
  getRowKey,
  renderExpandedRow,
  rowClassName,
  rows
}: TableProps<Row>) {
  if (!rows.length) {
    return <EmptyState title={emptyTitle} description={emptyDescription} />;
  }

  return (
    <div className={cx("ui-table-scroll", className)}>
      <table className="ui-table">
        <caption className="ui-visually-hidden">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th className={column.className} key={column.key} scope="col">
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => {
            const rowKey = getRowKey(row);
            const expandedRow = renderExpandedRow?.(row);

            return (
              <Fragment key={rowKey}>
                <tr className={rowClassName?.(row)}>
                  {columns.map((column) => (
                    <td className={column.className} key={column.key} data-label={column.header}>
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
                {expandedRow ? (
                  <tr className="ui-table-expanded-row">
                    <td colSpan={columns.length}>{expandedRow}</td>
                  </tr>
                ) : null}
              </Fragment>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
