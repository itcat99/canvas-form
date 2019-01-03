export default {
  className: "canvas-form",
  target: "#root",
  width: 1200, // 表格宽度
  height: 600, // 表格高度
  fillColor: "#000",
  strokeColor: "#000",
  fontSize: 14,
  fontWeight: 400,
  fontFamily: "sans-serif",
  horizontalAlign: "center",
  verticalAlign: "center",
  autoSize: false, // 是否铺满屏幕
  columns: [],
  rows: [],
  merges: [],
  renderColCount: 12,
  renderRowCount: 25,
  columnWidth: 100,
  rowHeight: 30,
  scrollYSize: 15,
  scrollXSize: 15,
  scroll: false,
  bitWidth: 10,
  setRowStyle: null,
  setColStyle: null,
  setCellStyle: null,
};

/* columns

  {
    index,
    x,
    width,
    id,
    title,
    type
  }
*/

/* rows

  {
    index,
    y,
    height,
    id,
    data: { 对应col上的id }
  }

*/

/* merges
  {
    from: [col, row],
    to: [col, row]
  }
*/

/* setRowStyle
  (renderRows) => ([{
    index,
    styles
  }])
*/
