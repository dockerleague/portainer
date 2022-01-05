import { useEffect } from 'react';
import {
  useTable,
  useSortBy,
  useFilters,
  useGlobalFilter,
  usePagination,
  Row,
} from 'react-table';
import { useRowSelectColumn } from '@lineup-lite/hooks';

import { Environment } from "Portainer/environments/types";
import { PaginationControls } from 'Portainer/components/pagination-controls';
import {
  Table,
  TableActions,
  TableContainer,
  TableHeaderRow,
  TableRow,
  TableSettingsMenu,
  TableTitle,
  TableTitleActions,
} from 'Portainer/components/datatables/components';
import { multiple } from 'Portainer/components/datatables/components/filter-types';
import { useTableSettings } from 'Portainer/components/datatables/components/useTableSettings';
import { ColumnVisibilityMenu } from 'Portainer/components/datatables/components/ColumnVisibilityMenu';
import { useRepeater } from 'Portainer/components/datatables/components/useRepeater';
import { useDebounce } from 'Portainer/hooks/useDebounce';
import {
  useSearchBarContext,
  SearchBar,
} from 'Portainer/components/datatables/components/SearchBar';
import { useRowSelect } from 'Portainer/components/datatables/components/useRowSelect';
import { Checkbox } from 'Portainer/components/form-components/Checkbox';
import { TableFooter } from 'Portainer/components/datatables/components/TableFooter';
import { SelectedRowsCount } from 'Portainer/components/datatables/components/SelectedRowsCount';
import {EdgeDeviceTableSettings} from "@/edge/devices/types";
import {EdgeDevicesDatatableSettings} from "@/edge/devices/components/EdgeDevicesDatatable/EdgeDevicesDatatableSettings";
import {EdgeDevicesDatatableActions} from "@/edge/devices/components/EdgeDevicesDatatable/EdgeDevicesDatatableActions";

import { useColumns } from './columns';

export interface EdgeDevicesTableProps {
  isAddActionVisible: boolean;
  dataset: Environment[];
  onRefresh(): Promise<void>;
}

export function EdgeDevicesDatatable({
                                      isAddActionVisible,
                                      dataset,
                                      onRefresh,
                                    }: EdgeDevicesTableProps) {

  console.log("EdgeDevicesDatatable:");
  console.log(dataset);

  const { settings, setTableSettings } = useTableSettings<EdgeDeviceTableSettings>();
  const [searchBarValue, setSearchBarValue] = useSearchBarContext();

  const columns = useColumns();

  useRepeater(settings.autoRefreshRate, onRefresh);

  const {
    getTableProps,
    getTableBodyProps,
    headerGroups,
    page,
    prepareRow,
    selectedFlatRows,
    allColumns,
    gotoPage,
    setPageSize,
    setHiddenColumns,
    setGlobalFilter,
    state: { pageIndex, pageSize },
  } = useTable<Environment>(
      {
        defaultCanFilter: false,
        columns,
        data: dataset,
        filterTypes: { multiple },
        initialState: {
          pageSize: settings.pageSize || 10,
          hiddenColumns: settings.hiddenColumns,
          sortBy: [settings.sortBy],
          globalFilter: searchBarValue,
        },
        isRowSelectable(row: Row<Environment>) {
          // return !row.original.IsPortainer; TODO mrydel
          return row.original.Name !== "";
        },
        selectCheckboxComponent: Checkbox,
      },
      useFilters,
      useGlobalFilter,
      useSortBy,
      usePagination,
      useRowSelect,
      useRowSelectColumn
  );

  const debouncedSearchValue = useDebounce(searchBarValue);

  useEffect(() => {
    setGlobalFilter(debouncedSearchValue);
  }, [debouncedSearchValue, setGlobalFilter]);

  const columnsToHide = allColumns.filter((colInstance) => {
    const columnDef = columns.find((c) => c.id === colInstance.id);
    return columnDef?.canHide;
  });

  const tableProps = getTableProps();
  const tbodyProps = getTableBodyProps();

  return (
      <TableContainer>
        <TableTitle icon="fa-cubes" label="Containers">
          <TableTitleActions>
            <ColumnVisibilityMenu
                columns={columnsToHide}
                onChange={handleChangeColumnsVisibility}
                value={settings.hiddenColumns}
            />

            <TableSettingsMenu>
              <EdgeDevicesDatatableSettings />
            </TableSettingsMenu>
          </TableTitleActions>
        </TableTitle>

        <TableActions>
          <EdgeDevicesDatatableActions
              selectedItems={selectedFlatRows.map((row) => row.original)}
              isAddActionVisible={isAddActionVisible}
          />
        </TableActions>

        <SearchBar
            value={searchBarValue}
            onChange={handleSearchBarChange}
            autoFocus={false}
        />

        <Table
            className={tableProps.className}
            role={tableProps.role}
            style={tableProps.style}
        >
          <thead>
          {headerGroups.map((headerGroup) => {
            const { key, className, role, style } =
                headerGroup.getHeaderGroupProps();

            return (
                <TableHeaderRow<Environment>
                    key={key}
                    className={className}
                    role={role}
                    style={style}
                    headers={headerGroup.headers}
                    onSortChange={handleSortChange}
                />
            );
          })}
          </thead>
          <tbody
              className={tbodyProps.className}
              role={tbodyProps.role}
              style={tbodyProps.style}
          >
          {page.map((row) => {
            prepareRow(row);
            const { key, className, role, style } = row.getRowProps();
            return (
                <TableRow<Environment>
                    cells={row.cells}
                    key={key}
                    className={className}
                    role={role}
                    style={style}
                />
            );
          })}
          </tbody>
        </Table>

        <TableFooter>
          <SelectedRowsCount value={selectedFlatRows.length} />
          <PaginationControls
              showAll
              pageLimit={pageSize}
              page={pageIndex + 1}
              onPageChange={(p) => gotoPage(p - 1)}
              totalCount={dataset.length}
              onPageLimitChange={handlePageSizeChange}
          />
        </TableFooter>
      </TableContainer>
  );

  function handlePageSizeChange(pageSize: number) {
    setPageSize(pageSize);
    setTableSettings((settings) => ({ ...settings, pageSize }));
  }

  function handleChangeColumnsVisibility(hiddenColumns: string[]) {
    setHiddenColumns(hiddenColumns);
    setTableSettings((settings) => ({ ...settings, hiddenColumns }));
  }

  function handleSearchBarChange(value: string) {
    setSearchBarValue(value);
  }

  function handleSortChange(id: string, desc: boolean) {
    setTableSettings((settings) => ({
      ...settings,
      sortBy: { id, desc },
    }));
  }
}