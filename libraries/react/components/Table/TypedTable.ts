import type { PathOf } from '@basis/utilities/types/PathOf'
import type { EnumColumnProps, StandardColumnProps } from './Column'
import { Column } from './Column'
import { Table } from './Table'

interface TypedTableInterface<TRow extends object> {
  Column: {
    Boolean: (props: StandardColumnProps<TRow, PathOf<TRow>>) => React.ReactNode,
    Date: (props: StandardColumnProps<TRow, PathOf<TRow>>) => React.ReactNode,
    DateTime: (props: StandardColumnProps<TRow, PathOf<TRow>>) => React.ReactNode,
    Enum: (props: Omit<EnumColumnProps<TRow, PathOf<TRow>>, 'type'>) => React.ReactNode,
    Number: (props: StandardColumnProps<TRow, PathOf<TRow>>) => React.ReactNode,
    Text: (props: StandardColumnProps<TRow, PathOf<TRow>>) => React.ReactNode,
  },
  Table: React.ComponentType<Table<TRow>['props']>,
}

export const TypedTable = {
  of<T extends object = { id: string }>(): TypedTableInterface<T> {
    return {
      Column: Column as TypedTableInterface<T>['Column'],
      Table: Table as unknown as TypedTableInterface<T>['Table'],
    }
  },
}
