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

    this.xStart = 0.5 * this.pixelRatio;
    this.yStart = 0.5 * this.pixelRatio;
    this.xEnd = this.xStart * 2;
    this.yEnd = this.yStart * 2;

    /* 四个顶点的坐标 不包含边框 leftTop & rightTop & rightBottom & leftBottom */
    this.lt = [this.xStart, this.yStart];
    this.rt = [this.opts.canvasWidth - this.xEnd, this.yStart];
    this.rb = [this.opts.canvasWidth - this.xEnd, this.opts.canvasHeight - this.yEnd];
    this.lb = [this.xStart, this.opts.canvasHeight - this.yEnd];

    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;

    this.scrollX = 0;
    this.scrollY = 0;
    this.scrollCurrentRow = 0;
    this.scrollCurrentCol = 0;

    this.emitter = mitt();

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

    this.opts.rows = rows;
    this.opts.columns = columns;
  }

  init() {
    const { canvasWidth, canvasHeight } = this.opts;
    /* 1. 初始化canvas到dom */
    this.createCanvas(this.opts);
    /* 2. 画外框 */
    drawLines({
      lines: [
        { from: this.lt, to: this.rt },
        { from: this.rt, to: this.rb },
        { from: this.rb, to: this.lb },
        { from: this.lb, to: this.lt },
      ],
      ctx: this.canvas,
    });

    /* 3. 过滤显示的cols和rows */
    const { renderCols, renderRows } = this.filterData(this.opts);
    /* 4. 处理columns */
    const colLines = this.getColLines(renderCols, canvasHeight);
    /* 5. 处理rows */
    const rowLines = this.getRowLines(renderRows, canvasWidth);

    this.columns = renderCols;
    this.colLines = colLines;
    this.rows = renderRows;
    this.rowLines = rowLines;

    /* 6. 画线 */
    drawLines({
      lines: [].concat(colLines, rowLines),
      ctx: this.canvas,
    });
    this.data = { columns: renderCols, rows: renderRows };
    /* 7. 渲染文字 */
    this.render(this.data, this.opts, this.canvas);
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
    const { renderColCount, renderRowCount, columns, rows } = opts;
    const renderCols = [],
      renderRows = [];

    for (let i = this.scrollCurrentCol; i < renderColCount + this.scrollCurrentCol; i++) {
      const column = columns[i];
      if (!column) break;
      column && renderCols.push(column);
    }
    for (let i = this.scrollCurrentRow; i < renderRowCount + this.scrollCurrentRow; i++) {
      const row = rows[i];
      if (!row) break;
      renderRows.push(rows[i]);
    }

    return { renderCols, renderRows };
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
      const { x, y, width, height } = rect;
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
    const { columns, rows } = this.data;

    this.$canvasEl.addEventListener("click", this.onSelectCell);
    this.emitter.on("selectCellChange", e => {
      console.log("select cell changed", e);
    });

    this.isIE
      ? this.$canvasEl.addEventListener("mousewheel", this.onWheel)
      : this.$canvasEl.addEventListener("wheel", this.onWheel);
  }

  onSelectCell = e => {
    const offsetX = intNum(e.offsetX * this.pixelRatio);
    const offsetY = intNum(e.offsetY * this.pixelRatio);

    let rectline = this.getRectLines(this.selectedCell);
    if (this.selectedCell) {
      const { value, x, y, width, height } = this.selectedCell;
      clearRect(
        [
          {
            x: x + this.xStart,
            y: y + this.yStart,
            width: width - this.xEnd,
            height: height - this.yEnd,
          },
        ],
        this.canvas
      );
      drawText([getTextPosition(value, this.selectedCell)], this.canvas);
      drawLines({
        lines: [
          { from: this.lt, to: this.rt },
          { from: this.rt, to: this.rb },
          { from: this.rb, to: this.lb },
          { from: this.lb, to: this.lt },
        ],
        ctx: this.canvas,
      });
    }
    drawLines({
      lines: rectline,
      ctx: this.canvas,
    });
    this.updateSelect({ offsetX, offsetY });
    this.drawRect([this.selectedCell], this.canvas, {
      fillStyle: "rgba(0,0,200, .2)",
    });
    rectline = this.getRectLines(this.selectedCell);
    drawLines({
      lines: rectline,
      ctx: this.canvas,
      styles: {
        strokeStyle: "#0000ff",
      },
    });
  };

  onWheel = e => {
    e.preventDefault ? e.preventDefault : (e.returnValue = false);
    const { rows, canvasHeight } = this.opts;
    const lastRow = rows[rows.length - 1];
    if (lastRow.y + lastRow.height < canvasHeight) return false;

    window.requestAnimationFrame(() => {
      // console.log(e.wheelDelta);
      const { canvasWidth, canvasHeight } = this.opts;
      this.scrollY -= e.wheelDelta;
      this.scrollY = Math.min(Math.max(0, this.scrollY), lastRow.y + lastRow.height - canvasHeight);
      this.canvas.clearRect(0, 0, canvasWidth, canvasHeight);

      this.scrollCurrentRow = this.getCurrentRowIndex(this.scrollY, this.scrollCurrentRow, rows);
      // if (this.scrollCurrentRow > this.opts.renderRowCount / 2) {
      /* 3. 过滤显示的cols和rows */
      const { renderCols, renderRows } = this.filterData(this.opts);
      /* 4. 处理columns */
      const colLines = this.getColLines(renderCols, canvasHeight);
      /* 5. 处理rows */
      const rowLines = this.getRowLines(renderRows, canvasWidth);

      this.columns = renderCols;
      this.colLines = colLines;
      this.rows = renderRows;
      this.rowLines = rowLines;
      this.data = { columns: this.columns, rows: this.rows };
      // }
      /* 2. 画外框 */
      drawLines({
        lines: [
          { from: this.lt, to: this.rt },
          { from: this.rt, to: this.rb },
          { from: this.rb, to: this.lb },
          { from: this.lb, to: this.lt },
        ],
        ctx: this.canvas,
      });

      /* 6. 画线 */
      drawLines({
        lines: [].concat(this.rowLines, this.colLines),
        ctx: this.canvas,
      });
      /* 7. 渲染文字 */
      this.render(this.data, this.opts, this.canvas);
    });
  };

  updateSelect(position) {
    const { columns, rows } = this.data;
    const { offsetX, offsetY } = position;
    this.selectedCol = nearly(columns, offsetX, "x");
    this.selectedRow = nearly(rows, offsetY, "y");
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

    this.emitter.emit("selectCellChange", this.selectedCell);
  }

  updateCells(columns, rows) {
    if (!columns || !Array.isArray(columns) || !rows || !Array.isArray(rows))
      throw new Error("columns&&rows should be [Array], check it.");
    if (!columns.length || !rows.length) throw new Error("columns&&rows should has items.");

    let result = {};
    columns.forEach(column => {
      const { x, width, id: colId, index: colIndex, title } = column;
      rows.forEach(row => {
        const { y, height, id: rowId, index: rowIndex, data } = row;
        const _id = getHashId(`${colId}${rowId}`);
        result = Object.assign({}, result, {
          [_id]: {
            x,
            y,
            width,
            height,
            value: data[colId],
            rowIndex,
            colIndex,
            rowId,
            colId,
          },
        });
      });
    });

    this.cells = result;
  }

  getRectLines(rect) {
    if (!rect) return false;
    const { x, y, width, height } = rect;
    return [
      { from: [x, y], to: [x + width, y] },
      { from: [x + width, y], to: [x + width, y + height] },
      { from: [x + width, y + height], to: [x, y + height] },
      { from: [x, y + height], to: [x, y] },
    ];
  }

  getCurrentRowIndex(scrollY, currentRowIndex, rows) {
    if (scrollY <= 0) return 0;

    const currentRow = rows[currentRowIndex];
    const { y, height } = currentRow;

    if (scrollY > height + y) {
      for (let i = currentRowIndex; i < rows.length; i++) {
        const row = rows[i];
        if (row.y + row.height > scrollY) {
          return i;
        }
      }
    }

    if (scrollY < y) {
      for (let i = currentRowIndex; i >= 0; i--) {
        const row = rows[i];
        if (scrollY > row.y) {
          return i;
        }
      }
    }

    return currentRowIndex;
  }
}

window.CanvasForm = CanvasForm;
export default CanvasForm;
