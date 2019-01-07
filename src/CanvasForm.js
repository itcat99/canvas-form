import DEFAULTS from "./defaults";
import { intNum, nearly, getTextPosition, isIE, splitText, inScope } from "./helpers";
import { KEY_CODES, MONEY_CELL_PADDING } from "./constents";
import { drawLines, drawText, clearRect, setCtxAttrs } from "./canvas";
import Scroller from "./Scroller";
import mitt from "mitt";

class CanvasForm {
  constructor(opts) {
    this.isIE = isIE;
    /* 0. 初始化配置文件 */
    this.opts = this.initOpts(opts);
    this.initGlobalVars();
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
    options = Object.assign(
      {},
      options,
      this.realSize({
        canvasWidth: options.width, // canvas画布的高度
        canvasHeight: options.height, // canvas画布的高度
        fontSize: options.fontSize,
        bitWidth: options.bitWidth,
        lineWidth: 1,
      })
    );

    if (options.scroll) {
      options = Object.assign(
        {},
        options,
        this.realSize({
          scrollXSize: options.scrollXSize,
          scrollYSize: options.scrollYSize,
        })
      );
    }

    return options;
  }

  initGlobalVars() {
    this.$target = null;
    this.$canvasEl = null;
    this.ctx = null;

    /* 有关canvas画1px线模糊 和 高分屏 的初始化x,y */
    this.xOffset = this.realSize(0.5);
    this.yOffset = this.realSize(0.5);

    /* 初始化宽高 */
    const {
      canvasWidth,
      canvasHeight,
      scroll,
      scrollYSize,
      scrollXSize,
      renderRowCount,
      renderColCount,
    } = this.opts;
    this.width = canvasWidth;
    this.height = canvasHeight;
    this.viewWidth = scroll ? this.width - scrollYSize : this.width;
    this.viewHeight = scroll ? this.height - scrollXSize : this.height;

    /* 四个顶点的坐标 不包含边框 leftTop & rightTop & rightBottom & leftBottom */
    this.lt = [this.xOffset, this.yOffset];
    this.rt = [this.width - this.xOffset, this.yOffset];
    this.rb = [this.width - this.xOffset, this.height - this.yOffset];
    this.lb = [this.xOffset, this.height - this.yOffset];
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
    this.renderRowCount = renderRowCount;
    this.renderColCount = renderColCount;

    /* 滚动相关 */
    this.scrollX = 0;
    this.scrollY = 0;
    this.scrollTopRowIndex = 0;
    this.scrollTopColIndex = 0;

    this.emitter = mitt();
  }

  /**
   * 处理坐标
   *
   * 1. 处理rows的坐标
   * 2. 处理cols的坐标
   * 3. 处理moneyCell内每个小格子的x点坐标
   * 4. 处理最大显示的row && col的数量
   */
  handleCoord() {
    let { rows, columns, bitWidth } = this.opts;
    let rowHeightCount = this.yOffset,
      colWidthCount = this.xOffset;

    let setRenderRowCount = false,
      setRenderColCount = false;

    rows = rows.map((row, index) => {
      if (rowHeightCount >= this.viewHeight && !setRenderRowCount) {
        setRenderRowCount = true;
        this.renderRowCount = index + 1;
      }
      let { height } = row;
      height = intNum(this.realSize(height));
      row = Object.assign({}, row, { y: rowHeightCount, height, index });
      rowHeightCount += height;

      return row;
    });

    columns = columns.map((col, index) => {
      if (colWidthCount >= this.viewWidth && !setRenderColCount) {
        setRenderColCount = true;
        this.renderColCount = index + 1;
      }
      let { width, type, bits } = col;
      width = intNum(this.realSize(width));
      const x = colWidthCount;

      if (type === "money") {
        /* 处理moneyCell bits的x坐标 */
        const bitsX = [];
        width = intNum(bitWidth * bits + this.realSize(MONEY_CELL_PADDING) * 2);
        for (let i = 0; i < bits; i++) {
          bitsX.push(x + i * this.realSize(bitWidth));
        }

        col.bitsX = bitsX;
      }
      col = Object.assign({}, col, { x, width, index });

      colWidthCount += width;
      return col;
    });

    this.rows = rows;
    this.columns = columns;
    // console.log("initial columns: ", this.columns);
    // console.log("initial columns: ", this.rows);
  }

  init() {
    /* 1. 初始化canvas到dom */
    this.createCanvas(this.opts);
    /* 2. 刷新页面 */
    this.render(this.scrollY, this.scrollX);
    /* 3. 初始化scroll相关 */
    if (this.opts.scroll) {
      const lastRow = this.rows[this.rows.length - 1];
      const lastColumn = this.columns[this.columns.length - 1];

      this.maxHeight = lastRow.y + lastRow.height;
      this.maxWidth = lastColumn.x + lastColumn.width;

      this.initScroller();
    }
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

    const { width, height, fontSize, fontFamily, fontWeight, fillColor, strokeColor } = opts;
    this.$canvasEl = $canvasEl;
    this.ctx = $canvasEl.getContext("2d");

    /* 设置初始属性 */
    this.setCanvasElAttrs(
      {
        class: opts.className,
        style: `width:${width}px; height:${height}px;`,
        width: this.width,
        height: this.height,
        tabindex: "-1",
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
      this.ctx
    );
  }

  render() {
    /* 0. 更新scrollTopIndex */
    this.updateScrollTopIndex();
    /* 1. 更新过滤的行列和合并格子  */
    this.updateFilters();
    /* 2. 更新行列线的坐标 */
    this.updateLines();
    /* 3. 更新自定义样式 */
    this.updateCustomStyle();

    // console.log("this.colStyles: ", this.colStyles);
    /* clear */
    this.ctx.clearRect(0, 0, this.viewWidth, this.viewHeight);

    /* 4. 画有背景的格子 */
    this.drawBg();
    /* 5. 画线 */
    this.drawLines(this.colLines, this.rowLines);
    /* 6. 画文字 */
    this.drawTexts(this.renderCols, this.renderRows, this.ctx);
    /* 7. 处理合并 */
    this.drawMergeCell(this.renderMerges, this.ctx);
    /* 8. 处理选中 */
    this.drawSelectedCell(this.selectedCell, this.ctx);
    /* 9. 处理滚动 */
    this.updateScroller();
    /* 10. 更新外框 */
    this.drawWrapper();
  }

  updateScrollTopIndex() {
    this.scrollTopRowIndex = this.getScrollTopRowIndex(
      this.scrollY,
      this.scrollTopRowIndex,
      this.rows
    );
    this.scrollTopColIndex = this.getScrollTopColIndex(
      this.scrollX,
      this.scrollTopColIndex,
      this.columns
    );
  }

  updateFilters() {
    const { renderCols, renderRows, renderMerges } = this.filterData(this.opts);
    this.renderCols = renderCols;
    this.renderRows = renderRows;
    this.renderMerges = renderMerges;
  }

  updateLines() {
    /* 处理columnLines */
    const colLines = this.getColLines(this.renderCols, this.viewHeight);
    /* 处理columnLines */
    const rowLines = this.getRowLines(this.renderRows, this.viewWidth);

    this.colLines = colLines;
    this.rowLines = rowLines;
  }

  updateCustomStyle() {
    const { setColStyle, setRowStyle, setCellStyle } = this.opts;
    let colStyles = [];
    if (setColStyle) {
      const result = setColStyle(this.renderCols);
      this.colStyles = this.handleColStyle(result);
    }

    if (setRowStyle) {
      const result = setRowStyle(this.renderRows);
      this.rowStyles = this.handleRowStyle(result);
    }
  }

  handleColStyle(data) {
    const arr = [];
    data.forEach(item => {
      const { index, styles } = item;
      const col = this.renderCols[index];
      const { x, width } = col;
      arr.push({
        rect: [x - this.scrollX, this.yOffset, width, this.viewHeight],
        styles,
      });
    });

    return arr;
  }

  handleRowStyle(data) {
    const arr = [];
    data.forEach(item => {
      const { index, styles } = item;
      const row = this.renderRows[index];
      const { y, height } = row;
      arr.push({
        rect: [this.xOffset, y - this.scrollY, this.viewWidth, height],
        styles,
      });
    });

    return arr;
  }

  drawBg() {
    this.colStyles &&
      this.colStyles.forEach(col => {
        this.ctx.save();
        const { rect, styles } = col;
        setCtxAttrs(styles, this.ctx);
        this.ctx.fillRect(...rect);
        this.ctx.restore();
      });

    this.rowStyles &&
      this.rowStyles.forEach(col => {
        this.ctx.save();
        const { rect, styles } = col;
        setCtxAttrs(styles, this.ctx);
        this.ctx.fillRect(...rect);
        this.ctx.restore();
      });
  }

  drawLines(...lineArr) {
    drawLines({
      lines: [].concat(...lineArr),
      ctx: this.ctx,
    });
  }

  drawTexts(cols, rows, ctx) {
    const valueInfos = this.getValueInfos(cols, rows, ctx);
    drawText(valueInfos, ctx);
  }

  drawWrapper() {
    drawLines({
      lines: this.wrapperLines,
      ctx: this.ctx,
    });
  }

  initScroller() {
    const { scrollXSize, scrollYSize } = this.opts;
    const [rtX, rtY] = this.rt;
    const [lbX, lbY] = this.lb;

    this.scrollerY = new Scroller({
      emitter: this.emitter,
      ctx: this.ctx,
      type: "y",
      width: scrollYSize,
      height: this.viewHeight + scrollXSize - this.realSize(2),
      barWidth: 30,
      barHeight: 100,
      x: rtX - scrollYSize - this.xOffset,
      y: rtY + this.yOffset,
      maxScrollSize: this.viewHeight - this.xOffset,
    });

    this.scrollerX = new Scroller({
      emitter: this.emitter,
      ctx: this.ctx,
      type: "x",
      width: this.viewWidth + scrollYSize - this.realSize(2),
      height: scrollXSize,
      barWidth: 100,
      barHeight: 30,
      x: lbX + this.xOffset,
      y: lbY - scrollXSize - this.yOffset,
      maxScrollSize: this.viewWidth - this.xOffset,
    });
  }

  updateScroller() {
    if (!this.opts.scroll) return false;
    if (this.scrollerX && this.scrollerY) {
      this.scrollerX.scrollTo(
        (this.scrollX / (this.maxWidth - this.viewWidth)) * (this.viewWidth - 100)
      );

      this.scrollerY.scrollTo(
        (this.scrollY / (this.maxHeight - this.viewHeight)) * (this.viewHeight - 100)
      );
    }
  }

  /**
   * 过滤渲染的row和col
   * @param {Object} opts
   */
  filterData(opts) {
    const { merges } = opts;
    const columns = this.columns;
    const rows = this.rows;
    const renderCols = [],
      renderRows = [],
      renderMerges = [];

    for (let i = this.scrollTopColIndex; i < this.renderColCount + this.scrollTopColIndex; i++) {
      const column = columns[i];
      if (!column) break;
      column && renderCols.push(column);
    }
    for (let i = this.scrollTopRowIndex; i < this.renderRowCount + this.scrollTopRowIndex; i++) {
      const row = rows[i];
      if (!row) break;
      renderRows.push(rows[i]);
    }

    if (merges) {
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
    }

    return { renderCols, renderRows, renderMerges };
  }

  getColLines(cols, height) {
    /* 1. 生成画线用的数据 */
    let lines = [];

    cols.forEach(column => {
      const { x, width, type } = column;

      const from = [x + width - this.scrollX, this.yOffset];

      if (type === "money") {
        const { bitLines, bitColorLines } = this.getMoneyColLines(column, height);
        lines = [].concat(lines, bitLines);
      }

      const to = [x + width - this.scrollX, height - this.yOffset];
      lines.push({ from, to });
    });

    return lines;
  }

  getMoneyColLines(col, height) {
    const { bits, x } = col;
    const { bitWidth } = this.opts;

    const bitLines = [];
    const bitColorLines = [];
    let cacheX = x + this.realSize(MONEY_CELL_PADDING);

    for (let i = bits; i >= 0; i--) {
      bitLines.push({
        from: [cacheX - this.scrollX, this.yOffset],
        to: [cacheX - this.scrollX, height - this.yOffset],
      });
      cacheX += bitWidth;
    }

    return { bitLines, bitColorLines };
  }

  getRowLines(rows, width) {
    const lines = [];

    rows.forEach(row => {
      const { y, height } = row;

      const from = [0, y + height - this.scrollY];
      const to = [width - this.xOffset, y + height - this.scrollY];
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

  getValueInfos(cols, rows, ctx) {
    const result = [];
    const { bitWidth } = this.opts;

    cols.forEach(column => {
      const { id, x, width, type } = column;
      rows.forEach(row => {
        const { data, y, height } = row;
        let value = data[id] + "";
        const xPosition = x - this.scrollX;
        const yPosition = y - this.scrollY;

        if (type === "money") {
          let bitInfo = { y: intNum(yPosition + height / 2) };
          const valueArr = value.split("");
          let count = 0;
          for (let i = valueArr.length - 1; i > 0; i--) {
            const bitValue = valueArr[i];
            const bitXPostion =
              xPosition + width - this.realSize(MONEY_CELL_PADDING) - count * bitWidth;
            bitInfo = Object.assign({}, bitInfo, {
              x: bitXPostion - bitWidth / 2,
              value: bitValue,
            });
            result.push(bitInfo);

            count++;
          }
        } else {
          const valueWidth = ctx.measureText(value).width;
          if (valueWidth > width) {
            value = splitText(value, valueWidth, width);
          }

          result.push(getTextPosition(value, { x: xPosition, y: yPosition, width, height }));
        }
      });
    });

    return result;
  }

  listen() {
    this.$canvasEl.addEventListener("click", this.onClick);

    this.isIE
      ? this.$canvasEl.addEventListener("mousewheel", this.onWheel)
      : this.$canvasEl.addEventListener("wheel", this.onWheel);

    this.$canvasEl.addEventListener("keydown", this.onKeydown);
    this.$canvasEl.addEventListener("mousemove", this.onMouseMove);
    this.$canvasEl.addEventListener("mouseleave", this.onMouseLeave);
    this.$canvasEl.addEventListener("mousedown", this.onMouseDown);
    this.$canvasEl.addEventListener("mouseup", this.onMouseUp);
  }

  onClick = e => {
    const offsetX = intNum(e.offsetX);
    const offsetY = intNum(e.offsetY);
    if (this.hoverScrollerY || this.hoverScrollerX) {
      console.log("click scroller");
      return false;
    }
    const cacheSelectCell = this.selectedCell;

    this.updateSelect(this.realSize({ offsetX, offsetY }));
    // this.drawSelectedCell(this.selectedCell, this.ctx, cacheSelectCell);
    // this.updateScroller();
    this.render(this.scrollY, this.scrollX);
  };

  onWheel = e => {
    e.preventDefault ? e.preventDefault : (e.returnValue = false);
    const { canvasHeight, scroll, scrollXSize } = this.opts;
    const rows = this.rows;
    const lastRow = rows[rows.length - 1];
    if (lastRow.y + lastRow.height < canvasHeight) return false;

    window.requestAnimationFrame(() => {
      // console.log(e.wheelDelta);
      const { canvasHeight } = this.opts;
      let maxHeight = lastRow.y + lastRow.height - canvasHeight;
      if (scroll) maxHeight += scrollXSize;

      this.scrollY -= e.wheelDelta;
      this.scrollY = Math.min(Math.max(0, this.scrollY), maxHeight);

      this.render(this.scrollY, this.scrollX);
    });
  };

  onKeydown = e => {
    e.preventDefault();
    const code = e.keyCode;

    if (KEY_CODES[code] && this.selectedCell) {
      this.updateSelectWithKeyboard(KEY_CODES[code]);
    }
  };

  onMouseMove = e => {
    const { scroll } = this.opts;
    window.requestAnimationFrame(() => {
      if (scroll) {
        const { offsetX, offsetY } = e;
        const offset = this.realSize([offsetX, offsetY]);

        if (this.dragScrolling) {
          // let scrollY = 0;
          if (this.hoverScrollerY) {
            const currentOffset =
              this.cacheScrollerYOffset + offset[1] - this.cacheMouseDownOffset[1];
            this.scrollY =
              (currentOffset / (this.viewHeight - 100)) * (this.maxHeight - this.viewHeight);

            this.scrollY = Math.max(0, Math.min(this.scrollY, this.maxHeight - this.viewHeight));
          }

          if (this.hoverScrollerX) {
            const currentOffset =
              this.cacheScrollerXOffset + offset[0] - this.cacheMouseDownOffset[0];
            this.scrollX =
              (currentOffset / (this.viewWidth - 100)) * (this.maxWidth - this.viewWidth);

            this.scrollX = Math.max(0, Math.min(this.scrollX, this.maxWidth - this.viewWidth));
          }

          this.render(this.scrollY, this.scrollX);
          return false;
        }

        const scrollYOffset = {
          from: [this.viewWidth, this.yOffset],
          to: [this.width - this.xOffset, this.viewHeight - this.yOffset],
        };
        const scrollXOffset = {
          from: [this.xOffset, this.viewHeight],
          to: [this.viewWidth - this.xOffset, this.height - this.yOffset],
        };
        const inScrollerY = inScope(offset, scrollYOffset),
          inScrollerX = inScope(offset, scrollXOffset);
        if (inScrollerY) {
          this.emitter.emit("SCROLLER_HOVER", { type: "y", offset });
          this.hoverScrollerY = true;
        } else if (inScrollerX) {
          this.emitter.emit("SCROLLER_HOVER", { type: "x", offset });
          this.hoverScrollerX = true;
        } else {
          if (this.hoverScrollerY || this.hoverScrollerX) {
            this.emitter.emit("SCROLLER_HOVER_OFF");
            this.hoverScrollerY = false;
            this.hoverScrollerX = false;
          }
        }
      }
    });
  };

  onMouseLeave = e => {
    if (this.hoverScrollerY || this.hoverScrollerX) {
      this.emitter.emit("SCROLLER_HOVER_OFF");
      this.hoverScroller = false;
      this.dragScrolling = false;
    }
  };

  onMouseDown = e => {
    if (this.hoverScrollerY || this.hoverScrollerX) {
      this.dragScrolling = true;
      this.cacheMouseDownOffset = this.realSize([e.offsetX, e.offsetY]);
      this.cacheScrollerYOffset = this.scrollerY.offset;
      this.cacheScrollerXOffset = this.scrollerX.offset;
    }
  };

  onMouseUp = e => {
    this.dragScrolling = false;
  };

  updateSelect(position) {
    const columns = this.renderCols;
    const rows = this.renderRows;
    const { offsetX, offsetY } = position;

    /* 先判断是否在mergeCell内 */
    for (let index in this.renderMerges) {
      const { from, to } = this.renderMerges[index];
      const startCol = this.columns[from[0]];
      const startRow = this.rows[from[1]];
      const endCol = this.columns[to[0]];
      const endRow = this.rows[to[1]];

      const xStart = startCol.x;
      const yStart = startRow.y;
      const xEnd = endCol.x + endCol.width;
      const yEnd = endRow.y + endRow.height;

      if (
        inScope([offsetX + this.scrollX, offsetY + this.scrollY], {
          from: [xStart, yStart],
          to: [xEnd, yEnd],
        })
      ) {
        // const
        this.selectedCell = {
          x: xStart,
          y: yStart,
          width: xEnd - xStart,
          height: yEnd - yStart,
          value: startRow.data[startCol.id],
          isMerge: true,
          startRowIndex: startRow.index,
          startColIndex: startCol.index,
          startRowId: startRow.id,
          startColId: startCol.id,
          endRowIndex: endRow.index,
          endColIndex: endCol.index,
          endRowId: endRow.id,
          endColId: endCol.id,
        };
        return false;
      }
    }

    this.selectedCol = nearly(columns, offsetX + this.scrollX, "x");
    this.selectedRow = nearly(rows, offsetY + this.scrollY, "y");
    const { x, width, id: colId, index: colIndex, type, bitsX } = this.selectedCol;
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
      type,
      bitsX,
    };

    // this.emitter.emit("selectCellChange", this.selectedCell);
  }

  updateSelectWithKeyboard(code) {
    const cacheSelectCell = this.selectedCell;
    const cacheScrollX = this.scrollX;
    const cacheScrollY = this.scrollY;

    const {
      isMerge,
      startRowIndex,
      endRowIndex,
      rowIndex,
      startColIndex,
      endColIndex,
      colIndex,
    } = cacheSelectCell;
    const { canvasHeight, canvasWidth, scroll, scrollXSize, scrollYSize } = this.opts;
    let nextCellPosition = null,
      nextColIndex = 0,
      nextRowIndex = 0;

    switch (code) {
      case "ARROW_LEFT":
        nextRowIndex = isMerge ? startRowIndex : rowIndex;
        nextColIndex = isMerge ? startColIndex - 1 : colIndex - 1;
        break;
      case "ARROW_RIGHT":
        nextRowIndex = isMerge ? startRowIndex : rowIndex;
        nextColIndex = isMerge ? endColIndex + 1 : colIndex + 1;
        break;
      case "ARROW_UP":
        nextRowIndex = isMerge ? startRowIndex - 1 : rowIndex - 1;
        nextColIndex = isMerge ? startColIndex : colIndex;
        break;
      case "ARROW_DOWN":
        nextRowIndex = isMerge ? endRowIndex + 1 : rowIndex + 1;
        nextColIndex = isMerge ? startColIndex : colIndex;
        break;
      default:
        break;
    }

    nextColIndex = Math.max(0, Math.min(this.columns.length - 1, nextColIndex));
    nextRowIndex = Math.max(0, Math.min(this.rows.length - 1, nextRowIndex));
    const nextRow = this.rows[nextRowIndex];
    const nextCol = this.columns[nextColIndex];

    nextCellPosition = {
      offsetX: Math.max(1, nextCol.x - cacheScrollX + 1),
      offsetY: Math.max(1, nextRow.y - cacheScrollY + 1),
    };

    this.updateSelect(nextCellPosition);

    const { x, y, width, height } = this.selectedCell;
    /* 判断Y轴翻页 */
    if (y + height - cacheScrollY >= canvasHeight) {
      this.scrollY = y;
      const lastRow = this.rows[this.rows.length - 1];
      let maxHeight = lastRow.y + lastRow.height - canvasHeight;
      if (scroll) maxHeight += scrollXSize;
      this.scrollY = Math.min(this.scrollY, maxHeight);
    }

    if (y <= cacheScrollY) {
      this.scrollY -= canvasHeight - (height - (cacheScrollY - y));
      this.scrollY = Math.max(0, this.scrollY);
    }

    /* 判断X轴翻页 */
    if (x + width - cacheScrollX >= canvasWidth) {
      this.scrollX = x;
      const lastColumn = this.columns[this.columns.length - 1];
      let maxWidth = lastColumn.x + lastColumn.width - canvasWidth;
      if (scroll) maxWidth += scrollYSize;
      this.scrollX = Math.min(this.scrollX, maxWidth);
    }
    if (x <= cacheScrollX) {
      this.scrollX -= canvasWidth - (width - (cacheScrollX - x));
      this.scrollX = Math.max(0, this.scrollX);
    }

    this.render(this.scrollY, this.scrollX);
  }

  drawSelectedCell(currentCell, ctx, prevCell) {
    if (prevCell) {
      let { value, x = x, y, width, height, type } = prevCell;
      if (currentCell.x === x && currentCell.y === y) return false;

      if (this.scrollY <= y && this.scrollX <= x) {
        const cellRelativeInfo = {
          x: x + this.xOffset - this.scrollX,
          y: y + this.yOffset - this.scrollY,
          width: width - this.xOffset,
          height: height - this.yOffset,
        };

        clearRect([cellRelativeInfo], this.ctx);
        const valueWidth = ctx.measureText(value).width;
        if (valueWidth > width) {
          value = splitText(value, valueWidth, width);
        }
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
      valueInfos = [],
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

      let value = startRow.data[startCol.id];
      const valueWidth = ctx.measureText(value).width;
      if (valueWidth > width) {
        value = splitText(value, valueWidth, width);
      }
      const valueInfo = getTextPosition(value, {
        x: x - this.scrollX,
        y: y - this.scrollY,
        width,
        height,
      });
      valueInfos.push(valueInfo);
    });

    clearRect(rects, ctx);
    drawLines({ lines, ctx });
    drawText(valueInfos, ctx);
  }

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

  getScrollTopColIndex(scrollX, scrollTopColIndex, cols) {
    if (scrollX <= 0) return 0;

    const currentCol = cols[scrollTopColIndex];
    const { x, width } = currentCol;

    if (scrollX > width + x) {
      for (let i = scrollTopColIndex; i < cols.length; i++) {
        const col = cols[i];
        if (col.x + col.width > scrollX) {
          return i;
        }
      }
    }

    if (scrollX < x) {
      for (let i = scrollTopColIndex; i >= 0; i--) {
        const col = cols[i];
        if (scrollX > col.x) {
          return i;
        }
      }
    }

    return scrollTopColIndex;
  }

  realSize = val => {
    if (typeof val === "number") return val * this.pixelRatio;
    if (Array.isArray(val)) return val.map(item => item * this.pixelRatio);
    if (Object.prototype.toString.call(val).indexOf("Object")) {
      for (let key in val) {
        val[key] *= this.pixelRatio;
      }

      return val;
    }
  };
}

export default CanvasForm;
