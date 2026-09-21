import * as React from 'react'
import type { TypeAt } from '@basis/utilities'
import type { PathOf } from '../../../utilities/types/PathOf'
import { Pin } from '../../types/Pin'
import { SortBy } from '../../types/SortBy'
import type { SortDirection } from '../../types/SortDirection'
import { TextAlign } from '../../types/TextAlign'
import { Component } from '../Component/Component'

export enum ColumnType {
  Boolean = 'boolean',
  Date = 'date',
  DateTime = 'datetime',
  Enum = 'enum',
  Number = 'number',
  Text = 'text',
}

export interface CellProps<T, R = unknown, F extends PathOf<R> = PathOf<R>> {
  column: ColumnProps<R, F>,
  field: F,
  row: R,
  value: T,
}

/** Props shared by every column type. */
interface BaseColumnProps<TRow = unknown, TField extends PathOf<TRow> = PathOf<TRow>> {
  align?: TextAlign,
  component?: React.ComponentType<CellProps<TypeAt<TRow, TField>, TRow, TField>>,
  field: TField,
  header?: boolean,
  pin?: Pin,
  sortBy?: SortBy,
  sortDirection?: SortDirection | null,
  sortable?: boolean,
  title?: string,
  width?: string | number,
}

/** Props for an enum column. The `enum` definition is required so cells can render its options. */
export interface EnumColumnProps<TRow = unknown, TField extends PathOf<TRow> = PathOf<TRow>>
  extends BaseColumnProps<TRow, TField> {
  enum: Record<string, string | number>,
  type: ColumnType.Enum,
}

/** Props for every non-enum column. An `enum` definition is not applicable. */
export interface StandardColumnProps<TRow = unknown, TField extends PathOf<TRow> = PathOf<TRow>>
  extends BaseColumnProps<TRow, TField> {
  enum?: never,
  type?: Exclude<ColumnType, ColumnType.Enum>,
}

/** Props for a table column, discriminated by `type` so enum columns require their `enum`. */
export type ColumnProps<TRow = unknown, TField extends PathOf<TRow> = PathOf<TRow>> =
  | EnumColumnProps<TRow, TField>
  | StandardColumnProps<TRow, TField>

export class Column<TRow, TField extends PathOf<TRow> = PathOf<TRow>>
  extends Component<ColumnProps<TRow, TField>> {
  static displayName = 'Table.Column'

  static get defaultProps() {
    return {
      ...super.defaultProps,
      pin: Pin.Unpinned,
      sortDirection: null,
      sortable: true,
      width: 'auto',
    }
  }

  // Static column type components
  static Boolean<TRow, TField extends PathOf<TRow> = PathOf<TRow>>(declaration: StandardColumnProps<TRow, TField>) {
    const props: StandardColumnProps<TRow, TField> = {
      ...Column.defaultProps,
      align: TextAlign.Center,
      sortBy: SortBy.Value,
      ...declaration,
      type: ColumnType.Boolean,
    }
    return <Column<TRow, TField> {...props} />
  }
  static Date<TRow, TField extends PathOf<TRow> = PathOf<TRow>>(declaration: StandardColumnProps<TRow, TField>) {
    const props: StandardColumnProps<TRow, TField> = {
      ...Column.defaultProps,
      align: TextAlign.Center,
      sortBy: SortBy.Value,
      ...declaration,
      type: ColumnType.Date,
    }
    return <Column<TRow, TField> {...props} />
  }
  static DateTime<TRow, TField extends PathOf<TRow> = PathOf<TRow>>(declaration: StandardColumnProps<TRow, TField>) {
    const props: StandardColumnProps<TRow, TField> = {
      ...Column.defaultProps,
      align: TextAlign.Center,
      sortBy: SortBy.Value,
      ...declaration,
      type: ColumnType.DateTime,
    }
    return <Column<TRow, TField> {...props} />
  }
  static Enum<TRow, TField extends PathOf<TRow> = PathOf<TRow>>(
    declaration: Omit<EnumColumnProps<TRow, TField>, 'type'>,
  ) {
    const props: EnumColumnProps<TRow, TField> = {
      ...Column.defaultProps,
      align: TextAlign.Left,
      sortBy: SortBy.Name,
      ...declaration,
      type: ColumnType.Enum,
    }
    return <Column<TRow, TField> {...props} />
  }
  static Number<TRow, TField extends PathOf<TRow> = PathOf<TRow>>(
    declaration: StandardColumnProps<TRow, TField>,
  ) {
    const props: StandardColumnProps<TRow, TField> = {
      ...Column.defaultProps,
      align: TextAlign.Right,
      sortBy: SortBy.Value,
      ...declaration,
      type: ColumnType.Number,
    }
    return <Column<TRow, TField> {...props} />
  }
  static Text<TRow, TField extends PathOf<TRow> = PathOf<TRow>>(declaration: StandardColumnProps<TRow, TField>) {
    const props: StandardColumnProps<TRow, TField> = {
      ...Column.defaultProps,
      align: TextAlign.Left,
      sortBy: SortBy.Name,
      ...declaration,
      type: ColumnType.Text,
    }
    return <Column<TRow, TField> {...props} />
  }

  /*
   * This component doesn't render anything directly
   * It's used by Table to extract column configuration
   */
  content(): React.ReactNode { return null }
}
