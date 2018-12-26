import DEFAULTS from "./defaults";
import { intNum, getHashId, nearly, getTextPosition, isIE } from "./helpers";
import { drawLines, drawText, clearRect, setCtxAttrs } from "./canvas";
import mitt from "mitt";

class CanvasForm {
  constructor(opts) {
    this.isIE = isIE;
    /* 0. 初始化配置文件 */
    this.opts = this.initOpts(opts);

    this.$target = null;
    this.$canvasEl = null;
    this.canvas = null;

    /* 有关canvas画1px线模糊 和 高分屏 的初始化x,y */
    this.xStart = 0.5 * this.pixelRatio;
    this.yStart = 0.5 * this.pixelRatio;
    this.xEnd = this.xStart * 2;
    this.yEnd = this.yStart * 2;

    /* 四个顶点的坐标 不包含边框 leftTop & rightTop & rightBottom & leftBottom */
    this.lt = [this.xStart, this.yStart];
    this.rt = [this.opts.canvasWidth - this.xEnd, this.yStart];
    this.rb = [this.opts.canvasWidth - this.xEnd, this.opts.canvasHeight - this.yEnd];
    this.lb = [this.xStart, this.opts.canvasHeight - this.yEnd];
    this.wrapperLines = [
      { from: this.lt, to: this.rt },
      { from: this.rt, to: this.rb },
      { from: this.rb, to: this.lb },
      { from: this.lb, to: this.lt },
    ];

    /* 行列相关 */
    this.rows = null;
    this.columns = null;
    this.renderRows = null;
    this.renderCols = null;
    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;

    /* 滚动相关 */
    this.scrollX = 0;
    this.scrollY = 0;
    this.scrollTopRowIndex = 0;
    this.scrollTopColIndex = 0;

    // this.emitter = mitt();

    /* 初始化rows && cols */
    this.handleCoord();
    this.init();
    this.listen();
  }

  initOpts(opts) {
    let options = Object.assign({}, DEFAULTS, opts);
    /* 设备像素比 */
    this.pixelRatio = window.devicePixelRatio;

    /* 需要根据设备像素比调整的属性: ["canvasWidth", "cavnasHeight", "lineWidth", "fontSize"] */
    options = Object.assign({}, options, {
      canvasWidth: options.width * this.pixelRatio, // canvas画布的高度
      canvasHeight: options.height * this.pixelRatio, // canvas画布的高度
      fontSize: options.fontSize * this.pixelRatio,
      lineWidth: this.pixelRatio,
    });

    return options;
  }

  handleCoord() {
    let { rows, columns } = this.opts;
    let rowHeightCount = this.yStart,
      colWidthCount = this.xStart;

    rows = rows.map((row, index) => {
      let { height } = row;
      height = intNum(height * this.pixelRatio);
      row = Object.assign({}, row, { y: rowHeightCount, height, index });
      rowHeightCount += height;

      return row;
    });

    columns = columns.map((col, index) => {
      let { width } = col;
      width = intNum(width * this.pixelRatio);
      col = Object.assign({}, col, { x: colWidthCount, width, index });
      colWidthCount += width;

      return col;
    });

    this.rows = rows;
    this.columns = columns;
  }

  init() {
    const { canvasWidth, canvasHeight } = this.opts;
    /* 1. 初始化canvas到dom */
    this.createCanvas(this.opts);

    /* 2. 过滤显示的cols和rows 和merges */
    const { renderCols, renderRows, renderMerges } = this.filterData(this.opts);
    /* 3. 处理columns */
    const colLines = this.getColLines(renderCols, canvasHeight);
    /* 4. 处理rows */
    const rowLines = this.getRowLines(renderRows, canvasWidth);

    this.renderCols = renderCols;
    this.renderRows = renderRows;
    this.renderMerges = renderMerges;

    this.colLines = colLines;
    this.rowLines = rowLines;

    /* 5. 画线 */
    drawLines({
      lines: [].concat(this.wrapperLines, colLines, rowLines),
      ctx: this.canvas,
    });

    /* 6. 渲染文字 */
    this.render({ columns: renderCols, rows: renderRows }, this.opts, this.canvas);

    /* 7. 处理merges */
    this.drawMergeCell(renderMerges, this.canvas);
  }

  createCanvas(opts) {
    const { target } = opts;
    const $target = document.querySelector(target);
    if (!$target)
      throw new Error("Can't find target element, Please input [target] attribute, again.");

    const $canvasEl = document.createElement("canvas", {
      alpha: false,
    });
    $target.appendChild($canvasEl);

    const {
      width,
      height,
      canvasWidth,
      canvasHeight,
      fontSize,
      fontFamily,
      fontWeight,
      fillColor,
      strokeColor,
    } = opts;
    this.$canvasEl = $canvasEl;
    this.canvas = $canvasEl.getContext("2d");

    /* 设置初始属性 */
    this.setCanvasElAttrs(
      {
        class: opts.className,
        style: `width:${width}px; height:${height}px;`,
        width: canvasWidth,
        height: canvasHeight,
      },
      this.$canvasEl
    );
    setCtxAttrs(
      {
        font: `${fontWeight} ${fontSize}px ${fontFamily}`,
        fillStyle: fillColor,
        strokeStyle: strokeColor,
        textBaseline: "middle",
        textAlign: "center",
      },
      this.canvas
    );
  }

  filterData(opts) {
    const { renderColCount, renderRowCount, merges } = opts;
    const columns = this.columns;
    const rows = this.rows;
    const renderCols = [],
      renderRows = [],
      renderMerges = [];

    for (let i = this.scrollTopColIndex; i < renderColCount + this.scrollTopColIndex; i++) {
      const column = columns[i];
      if (!column) break;
      column && renderCols.push(column);
    }
    for (let i = this.scrollTopRowIndex; i < renderRowCount + this.scrollTopRowIndex; i++) {
      const row = rows[i];
      if (!row) break;
      renderRows.push(rows[i]);
    }

    for (let i = 0; i < merges.length; i++) {
      const merge = merges[i];
      const { from, to } = merge;
      if (
        from[0] <= renderCols[renderCols.length - 1].index &&
        from[1] <= renderRows[renderRows.length - 1].index &&
        to[0] < this.columns.length &&
        to[1] < this.rows.length
      ) {
        renderMerges.push(merge);
      }
    }

    return { renderCols, renderRows, renderMerges };
  }

  getColLines(cols, height) {
    /* 1. 生成画线用的数据 */
    const lines = [];

    cols.forEach(column => {
      const { x, width } = column;

      const from = [x + width, 0];
      const to = [x + width, height - this.yEnd];

      lines.push({ from, to });
    });

    return lines;
  }

  getRowLines(rows, width) {
    const lines = [];

    rows.forEach(row => {
      const { y, height } = row;

      const from = [0 - this.scrollX, y + height - this.scrollY];
      const to = [width - this.xEnd - this.scrollX, y + height - this.scrollY];
      lines.push({ from, to });
    });

    return lines;
  }

  /**
   * 设置cnavas element的属性
   * @param {Object} opts
   * @param {Element} $canvasEl
   */
  setCanvasElAttrs(opts, $canvasEl) {
    for (let key in opts) {
      $canvasEl.setAttribute(key, opts[key]);
    }
  }

  drawRect(rects, ctx, styles) {
    if (!rects || !rects.length) return false;
    if (styles) {
      ctx.save();
      setCtxAttrs(styles, ctx);
    }

    rects.forEach(rect => {
      if (!rect) return false;
      let { x, y, width, height } = rect;
      x = x - this.scrollX;
      y = y - this.scrollY;
      ctx.fillRect(x, y, width, height);
    });

    if (styles) {
      ctx.restore();
    }
  }

  render(data, opts, ctx) {
    const { columns, rows } = data;
    const valueInfos = [];

    columns.forEach(column => {
      const { id, x, width } = column;
      rows.forEach(row => {
        const { data, y, height } = row;
        const value = data[id];
        valueInfos.push(
          getTextPosition(value, { x: x - this.scrollX, y: y - this.scrollY, width, height })
        );
      });
    });

    drawText(valueInfos, ctx);
  }

  listen() {
    this.$canvasEl.addEventListener("click", this.onSelectCell);
    // this.emitter.on("selectCellChange", e => {
    //   console.log("select cell changed", e);
    // });

    this.isIE
      ? this.$canvasEl.addEventListener("mousewheel", this.onWheel)
      : this.$canvasEl.addEventListener("wheel", this.onWheel);
  }

  onSelectCell = e => {
    const offsetX = intNum(e.offsetX * this.pixelRatio);
    const offsetY = intNum(e.offsetY * this.pixelRatio);
    const cacheSelectCell = this.selectedCell;

    this.updateSelect({ offsetX, offsetY });
    this.drawSelectedCell(this.selectedCell, this.canvas, cacheSelectCell);
  };

  onWheel = e => {
    e.preventDefault ? e.preventDefault : (e.returnValue = false);
    const { canvasHeight } = this.opts;
    const rows = this.rows;
    const lastRow = rows[rows.length - 1];
    if (lastRow.y + lastRow.height < canvasHeight) return false;

    window.requestAnimationFrame(() => {
      // console.log(e.wheelDelta);
      const { canvasWidth, canvasHeight } = this.opts;
      this.scrollY -= e.wheelDelta;
      this.scrollY = Math.min(Math.max(0, this.scrollY), lastRow.y + lastRow.height - canvasHeight);
      this.canvas.clearRect(0, 0, canvasWidth, canvasHeight);

      this.scrollTopRowIndex = this.getScrollTopRowIndex(
        this.scrollY,
        this.scrollTopRowIndex,
        rows
      );

      const { renderCols, renderRows, renderMerges } = this.filterData(this.opts);
      const colLines = this.getColLines(renderCols, canvasHeight);
      const rowLines = this.getRowLines(renderRows, canvasWidth);

      this.renderCols = renderCols;
      this.colLines = colLines;
      this.renderRows = renderRows;
      this.rowLines = rowLines;
      this.renderMerges = renderMerges;

      drawLines({
        lines: [].concat(this.wrapperLines, this.rowLines, this.colLines),
        ctx: this.canvas,
      });
      this.render({ columns: this.renderCols, rows: this.renderRows }, this.opts, this.canvas);
      this.drawSelectedCell(this.selectedCell, this.canvas);
      this.drawMergeCell(renderMerges, this.canvas);
    });
  };

  updateSelect(position) {
    const columns = this.renderCols;
    const rows = this.renderRows;
    const { offsetX, offsetY } = position;

    this.selectedCol = nearly(columns, offsetX + this.scrollX, "x");
    this.selectedRow = nearly(rows, offsetY + this.scrollY, "y");
    const { x, width, id: colId, index: colIndex } = this.selectedCol;
    const { y, height, id: rowId, index: rowIndex, data } = this.selectedRow;

    this.selectedCell = {
      x,
      y,
      width,
      height,
      value: data[colId],
      rowIndex,
      rowId,
      colIndex,
      colId,
    };

    // this.emitter.emit("selectCellChange", this.selectedCell);
  }

  drawSelectedCell(currentCell, ctx, prevCell) {
    if (prevCell) {
      let { value, x = x, y, width, height } = prevCell;
      if (currentCell.x === x && currentCell.y === y) return false;

      if (this.scrollY < y && this.scrollX < x) {
        const cellRelativeInfo = {
          x: x + this.xStart - this.scrollX,
          y: y + this.yStart - this.scrollY,
          width: width - this.xEnd,
          height: height - this.yEnd,
        };

        clearRect([cellRelativeInfo], this.canvas);
        drawText([getTextPosition(value, cellRelativeInfo)], ctx);
        drawLines({
          lines: [].concat(this.getRectLines(prevCell), this.wrapperLines),
          ctx,
        });
      }
    }

    this.drawRect([currentCell], ctx, {
      fillStyle: "rgba(0,0,200, .2)",
    });
    drawLines({
      lines: this.getRectLines(currentCell),
      ctx,
      styles: {
        strokeStyle: "#0000ff",
      },
    });
  }

  drawMergeCell(merges, ctx) {
    let lines = [],
      values = [],
      rects = [];
    merges.forEach((merge, index) => {
      const { from, to } = merge;
      const [startColIndex, startRowIndex] = from;
      const [endColIndex, endRowIndex] = to;
      const startCol = this.columns[startColIndex];
      const startRow = this.rows[startRowIndex];
      const endCol = this.columns[endColIndex];
      const endRow = this.rows[endRowIndex];

      const x = startCol.x;
      const y = startRow.y;
      const width = endCol.x + endCol.width - startCol.x;
      const height = endRow.y + endRow.height - startRow.y;

      rects.push({ x: x - this.scrollX, y: y - this.scrollY, width, height });
      const mergeCellLines = this.getRectLines({ x, y, width, height });
      lines = [].concat(lines, mergeCellLines);
      const value = getTextPosition(startRow.data[startCol.id], {
        x: x - this.scrollX,
        y: y - this.scrollY,
        width,
        height,
      });
      values.push(value);
    });

    clearRect(rects, ctx);
    drawLines({ lines, ctx });
    drawText(values, ctx);
  }

  // updateCells(columns, rows) {
  //   if (!columns || !Array.isArray(columns) || !rows || !Array.isArray(rows))
  //     throw new Error("columns&&rows should be [Array], check it.");
  //   if (!columns.length || !rows.length) throw new Error("columns&&rows should has items.");

  //   let result = {};
  //   columns.forEach(column => {
  //     const { x, width, id: colId, index: colIndex, title } = column;
  //     rows.forEach(row => {
  //       const { y, height, id: rowId, index: rowIndex, data } = row;
  //       const _id = getHashId(`${colId}${rowId}`);
  //       result = Object.assign({}, result, {
  //         [_id]: {
  //           x,
  //           y,
  //           width,
  //           height,
  //           value: data[colId],
  //           rowIndex,
  //           colIndex,
  //           rowId,
  //           colId,
  //         },
  //       });
  //     });
  //   });

  //   this.cells = result;
  // }

  getRectLines(rect) {
    if (!rect) return false;
    let { x, y, width, height } = rect;
    x = x - this.scrollX;
    y = y - this.scrollY;

    return [
      { from: [x, y], to: [x + width, y] },
      { from: [x + width, y], to: [x + width, y + height] },
      { from: [x + width, y + height], to: [x, y + height] },
      { from: [x, y + height], to: [x, y] },
    ];
  }

  getScrollTopRowIndex(scrollY, scrollTopRowIndex, rows) {
    if (scrollY <= 0) return 0;

    const currentRow = rows[scrollTopRowIndex];
    const { y, height } = currentRow;

    if (scrollY > height + y) {
      for (let i = scrollTopRowIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.y + row.height > scrollY) {
          return i;
        }
      }
    }

    if (scrollY < y) {
      for (let i = scrollTopRowIndex; i >= 0; i--) {
        const row = rows[i];
        if (scrollY > row.y) {
          return i;
        }
      }
    }

    return scrollTopRowIndex;
  }
}

export default CanvasForm;
