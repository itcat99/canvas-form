/**
 * 画多条线
 * @param {Object[]} lines 线段的数组
 * @param {CanvasRenderingContext2D} ctx canvas context 2d
 * @param {Object} [styles] storkeStyle样式
 * @param {Number[]} lines[].from 起始坐标
 * @param {Number[]} lines[].to 结束坐标
 */
export const drawLines = (lines, ctx, styles) => {
  if (!lines || !lines.length) return false;
  if (styles) {
    ctx.save();
    setCtxAttrs(styles, ctx);
  }
  ctx.beginPath();

  lines.forEach(line => {
    if (!line) return false;
    const { from, to } = line;
    ctx.moveTo(...from);
    ctx.lineTo(...to);
    ctx.stroke();
  });
  ctx.stroke();
  ctx.closePath();

  if (styles) {
    ctx.restore();
  }
};

/**
 * 画多个文字
 * @param {Object[]} texts 文字的数组
 * @param {CanvasRenderingContext2D} ctx canvasContext2d
 * @param {String} texts[].value 要画的文字
 * @param {Number} texts[].x 文字的x坐标
 * @param {Number} texts[].y 文字的y坐标
 * @param {Number} [texts[].maxWidth] 文字的最大宽度
 */
export const drawText = (texts, ctx) => {
  texts.forEach(text => {
    if (!text) return false;
    const { value, x, y, maxWidth } = text;
    if (!value || !value.length) return false;
    ctx.fillText(value, x, y);
  });
};

/**
 * 清除多个区域
 * @param {Object[]} rects 需要清除区域的的数组
 * @param {CanvasRenderingContext2D} ctx canvas context 2d
 * @param {Number} rects[].x 起始点x坐标
 * @param {Number} rects[].y 起始点y坐标
 * @param {Number} [rects[].width] 区域宽度
 * @param {Number} [rects[].height] 区域高度
 */
export const clearRect = (rects, ctx) => {
  if (!rects || !rects.length) return false;
  rects.forEach(rect => {
    if (!rect) return false;
    const { x, y, width = ctx.width, height = ctx.height } = rect;
    ctx.clearRect(x, y, width, height);
  });
};

/**
 * 设置ctx的属性
 * @param {Object} opts ctx 的属性
 * @param {CanvasRenderingContext2D} ctx canvas context2d
 */
export const setCtxAttrs = (opts, ctx) => {
  for (let key in opts) {
    ctx[key] = opts[key];
  }
};
