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

  init() {
    const { canvasWidth, canvasHeight } = this.opts;
    /* 1. 初始化canvas到dom */
    this.createCanvas(this.opts);
    /* 2. 画外框 */
    drawLines(
      [
        { from: this.lt, to: this.rt },
        { from: this.rt, to: this.rb },
        { from: this.rb, to: this.lb },
        { from: this.lb, to: this.lt },
      ],
      this.canvas
    );

    /* 3. 过滤显示的cols和rows */
    const { renderCols, renderRows } = this.filterData(this.opts);
    /* 4. 处理columns */
    const { lines: colLines, columns, totalWidth } = this.handleColumns(renderCols, canvasHeight);
    /* 5. 处理rows */
    const { lines: rowLines, rows, totalHeight } = this.handleRows(renderRows, canvasWidth);

    this.columns = columns;
    this.colLines = colLines;
    this.rows = rows;
    this.rowLines = rowLines;
    this.totalWidth = totalWidth;
    this.totalHeight = totalHeight;

    /* 6. 画线 */
    drawLines([].concat(colLines, rowLines), this.canvas);
    this.data = { columns, rows };
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

  handleColumns(cols, height) {
    /* 1. 生成画线用的数据 && 生成data用的数据 */
    const tempCols = [];
    const tempLines = [];
    let countWidth = 0;

    cols.forEach((column, index) => {
      const width = intNum(column.width * this.pixelRatio);
      tempCols.push(Object.assign({}, column, { index, x: countWidth + this.xStart, width }));
      countWidth += width;

      const from = [tempCols[index].x + width, 0];
      const to = [tempCols[index].x + width, height - this.yEnd];

      tempLines.push({ from, to });
    });

    return {
      lines: tempLines,
      columns: tempCols,
      totalWidth: countWidth,
    };
  }

  handleRows(rows, width) {
    const tempRows = [];
    const tempLines = [];
    let countHeight = 0;

    rows.forEach((row, index) => {
      const height = intNum(row.height * this.pixelRatio);
      tempRows.push(Object.assign({}, row, { height, index, y: countHeight + this.yStart }));
      countHeight += height;

      const from = [0 - this.scrollX, tempRows[index].y + height - this.scrollY];
      const to = [width - this.xEnd - this.scrollX, tempRows[index].y + height - this.scrollY];
      tempLines.push({ from, to });
    });

    return {
      lines: tempLines,
      rows: tempRows,
      totalHeight: countHeight,
    };
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
      drawLines(
        [
          { from: this.lt, to: this.rt },
          { from: this.rt, to: this.rb },
          { from: this.rb, to: this.lb },
          { from: this.lb, to: this.lt },
        ],
        this.canvas
      );
    }
    drawLines(rectline, this.canvas);
    this.updateSelect({ offsetX, offsetY });
    this.drawRect([this.selectedCell], this.canvas, {
      fillStyle: "rgba(0,0,200, .2)",
    });
    rectline = this.getRectLines(this.selectedCell);
    drawLines(rectline, this.canvas, {
      strokeStyle: "#0000ff",
    });
  };

  onWheel = e => {
    console.log(e);
    e.preventDefault ? e.preventDefault : (e.returnValue = false);
    window.requestAnimationFrame(() => {
      // console.log(e.wheelDelta);
      const { canvasWidth, canvasHeight } = this.opts;
      this.scrollY -= e.wheelDeltaY;
      this.scrollY = Math.max(0, this.scrollY);
      // this.scrollCurrentRow += e.wheelDelta < 0 ? 1 : -1;
      // this.scrollCurrentRow = Math.max(0, this.scrollCurrentRow);
      this.canvas.clearRect(0, 0, canvasWidth, canvasHeight);

      this.scrollCurrentRow = this.getScrollCurrentRow(
        this.opts.rows,
        this.scrollY,
        this.scrollCurrentRow
      );

      console.log("scrollCurrentRow: ", this.scrollCurrentRow);
      /* 2. 画外框 */
      drawLines(
        [
          { from: this.lt, to: this.rt },
          { from: this.rt, to: this.rb },
          { from: this.rb, to: this.lb },
          { from: this.lb, to: this.lt },
        ],
        this.canvas
      );

      /* 3. 过滤显示的cols和rows */
      const { renderCols, renderRows } = this.filterData(this.opts);
      /* 4. 处理columns */
      const { lines: colLines, columns, totalWidth } = this.handleColumns(renderCols, canvasHeight);
      /* 5. 处理rows */
      const { lines: rowLines, rows, totalHeight } = this.handleRows(renderRows, canvasWidth);

      this.columns = columns;
      this.colLines = colLines;
      this.rows = rows;
      this.rowLines = rowLines;
      this.totalWidth = totalWidth;
      this.totalHeight = totalHeight;

      /* 6. 画线 */
      drawLines([].concat(colLines, rowLines), this.canvas);
      this.data = { columns, rows };
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

  getScrollCurrentRow = (rows, scrollY, currentRow) => {
    let { y: currentRowY, height: currentRowHeight } = rows[currentRow];
    let index = currentRow;
    let currentHeight = currentRowY + currentRowHeight;

    console.log("scrollY: ", rows[currentRow]);
    if (currentHeight < scrollY) {
      while (currentHeight > scrollY) {
        index++;
        currentHeight += rows[index].height;
      }
    } else {
      while (currentHeight < scrollY) {
        index--;
        currentHeight -= rows[index].height;
      }
    }

    return index;
  };
}

window.CanvasForm = CanvasForm;
export default CanvasForm;
