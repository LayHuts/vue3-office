
interface UseExcelEvents {
  onCellSelected?: (cell: any, rowIndex: number, columnIndex: number) => void;
  onCellsSelected?: (
    cell: any,
    startRowIndex: number,
    startColumnIndex: number,
    endRowIndex: number,
    endColumnIndex: number
  ) => void;
  onSwitchSheet?: (index: number) => void;
}

interface UseTransformCallback {
  beforeTransform?: (workBook: any) => any;
  afterTransform?: (workBook: any) => any;
}

export {
  UseExcelEvents,
  UseTransformCallback
}
