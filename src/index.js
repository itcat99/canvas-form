import DEFAULTS from "./defaults";
import { intNum, getHashId, nearly } from "./helpers";
import { getTexts, getLines, mergeRect } from "./mock";
import mitt from "mitt";

class CanvasForm {
  constructor(opts) {
    /* 0. 初始化配置文件 */
    this.opts = this.initOpts(opts);

    this.$target = null;
    this.$canvasEl = null;
    this.canvas = null;
    this.xStart = 0.5 * this.pixelRatio;
    this.yStart = 0.5 * this.pixelRatio;
    this.xEnd = this.xStart * 2;
    this.yEnd = this.yStart * 2;

    this.selectedCell = null;
    this.selectedRow = null;
    this.selectedCol = null;

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
    this.canvas.strokeRect(
      this.xStart,
      this.yStart,
      canvasWidth - this.xEnd,
      canvasHeight - this.yEnd
    );
    /* 2. 处理columns */
    const { lines: colLines, columns } = this.handleColumns(this.opts);
    /* 3. 处理rows */
    const { lines: rowLines, rows } = this.handleRows(this.opts);
    /* 4. 画线 */
    this.drawLine([].concat(colLines, rowLines), this.canvas);
    this.data = { columns, rows };
    // this.updateCells(columns, rows);
    // console.log("this cells: ", this.cells);
    /* 5. 渲染文字 */
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
    this.setCtxAttrs(
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

  handleColumns(opts) {
    const { columns, canvasHeight } = opts;
    /* 1. 生成画线用的数据 && 生成data用的数据 */
    const tempCols = [];
    const tempLines = [];
    let countWidth = 0;

    columns.forEach((column, index) => {
      const width = intNum(column.width * this.pixelRatio);
      tempCols.push(Object.assign({}, column, { index, x: countWidth + this.xStart, width }));
      countWidth += width;

      const from = [tempCols[index].x + width, 0];
      const to = [tempCols[index].x + width, canvasHeight - this.yEnd];

      tempLines.push({ from, to });
    });

    return {
      lines: tempLines,
      columns: tempCols,
    };
  }

  handleRows(opts) {
    const { rows, canvasWidth } = opts;
    const tempRows = [];
    const tempLines = [];
    let countHeight = 0;

    rows.forEach((row, index) => {
      const height = intNum(row.height * this.pixelRatio);
      tempRows.push(Object.assign({}, row, { height, index, y: countHeight + this.yStart }));
      countHeight += height;

      const from = [0, tempRows[index].y + height];
      const to = [canvasWidth - this.xEnd, tempRows[index].y + height];
      tempLines.push({ from, to });
    });

    return {
      lines: tempLines,
      rows: tempRows,
    };
  }

  computeData(opts) {}

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

  /**
   * 设置ctx的属性
   * @param {Object} opts
   * @param {CanvasRenderingContext2D} ctx
   */
  setCtxAttrs(opts, ctx) {
    for (let key in opts) {
      ctx[key] = opts[key];
    }
  }

  drawText(texts, ctx) {
    texts.forEach(text => {
      const { value, x, y, maxWidth } = text;

      ctx.fillText(value, x, y);
    });
  }

  drawLine(lines, ctx, styles) {
    if (!lines || !lines.length) return false;
    if (styles) {
      ctx.save();
      this.setCtxAttrs(styles, ctx);
    }
    ctx.beginPath();
    console.log("lines: ", lines);
    lines.forEach(line => {
      if (!line) return false;
      const { from, to } = line;
      // console.group("== draw line ==");
      // console.log("from ", from);
      // console.log("to ", to);
      // console.groupEnd();
      ctx.moveTo(...from);
      ctx.lineTo(...to);
      ctx.stroke();
    });
    ctx.stroke();
    ctx.closePath();

    if (styles) {
      ctx.restore();
    }
  }

  drawRect(rects, ctx, styles) {
    if (!rects || !rects.length) return false;
    if (styles) {
      ctx.save();
      this.setCtxAttrs(styles, ctx);
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

  clearRect(rects, ctx, styles) {
    if (!rects || !rects.length) return false;
    if (styles) {
      ctx.save();
      this.setCtxAttrs(styles, ctx);
    }
    rects.forEach(rect => {
      if (!rect) return false;
      const { x, y, width, height } = rect;
      ctx.clearRect(x - this.xStart, y - this.yStart, width + this.xEnd, height + this.yEnd);
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
        valueInfos.push({ value, x: intNum(x + width / 2), y: intNum(y + height / 2) });
      });
    });

    this.drawText(valueInfos, ctx);
  }

  listen() {
    const { columns, rows } = this.data;

    this.$canvasEl.addEventListener("click", this.onSelectCell);
    this.emitter.on("selectCellChange", e => {
      console.log("select cell changed", e);
    });
  }

  onSelectCell = e => {
    const offsetX = intNum(e.offsetX * this.pixelRatio);
    const offsetY = intNum(e.offsetY * this.pixelRatio);

    let rectline = this.getRectLines(this.selectedCell, this.canvas);
    this.drawLine(rectline, this.canvas);
    this.updateSelect({ offsetX, offsetY });
    rectline = this.getRectLines(this.selectedCell, this.canvas);
    this.drawLine(rectline, this.canvas, {
      strokeStyle: "#fff000",
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

  getRectLines(rect, ctx) {
    if (!rect) return false;
    const { x, y, width, height } = rect;
    return [
      { from: [x, y], to: [x + width, y] },
      { from: [x + width, y], to: [x + width, y + height] },
      { from: [x + width, y + height], to: [x, y + height] },
      { from: [x, y + height], to: [x, y] },
    ];
  }
}

window.CanvasForm = CanvasForm;
export default CanvasForm;
