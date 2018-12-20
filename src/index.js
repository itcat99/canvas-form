import DEFAULTS from "./defaults";

import { getTexts, getLines, mergeRect } from "./mock";

class CanvasForm {
  constructor(opts) {
    /* 0. 初始化配置文件 */
    this.opts = this.initOpts(opts);
    this.$target = null;
    this.$canvasEl = null;
    this.canvas = null;

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
    /* 1. 初始化canvas到dom */
    this.createCanvas(this.opts);
    this.render();
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
      },
      this.canvas
    );
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

  drawLine(lines, ctx) {
    ctx.beginPath();
    lines.forEach(line => {
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
  }

  drawRect(rects, ctx, styles) {
    if (styles) {
      ctx.fillStyle = styles;
    }
    rects.forEach(rect => {
      const { x, y, width, height } = rect;

      ctx.fillRect(x, y, width, height);
    });
  }

  render() {
    const texts = getTexts(1000, {
      width: this.opts.canvasWidth,
      height: this.opts.canvasHeight,
    });
    this.drawText(texts, this.canvas);

    const lines = getLines(100, {
      width: this.opts.canvasWidth,
      height: this.opts.canvasHeight,
    });

    this.drawLine(lines, this.canvas);

    const rects = mergeRect(100, {
      width: this.opts.canvasWidth,
      height: this.opts.canvasHeight,
    });

    this.drawRect(rects, this.canvas);
  }

  listen() {
    this.$canvasEl.addEventListener("wheel", e => {
      e.preventDefault();
      window.requestAnimationFrame(() => {
        // this.canvas.clearRect(0, 0, this.opts.canvasWidth, this.opts.canvasHeight);
        for (let i = 0; i < 1000; i++) {
          this.canvas.clearRect(
            Math.floor(Math.random() * this.opts.canvasWidth),
            Math.floor(Math.random() * this.opts.canvasWidth),
            200,
            200
          );
        }

        // const texts = getTexts(3000, {
        //   width: this.opts.canvasWidth,
        //   height: this.opts.canvasHeight,
        // });
        // this.drawText(texts, this.canvas);

        const lines = getLines(20, {
          width: this.opts.canvasWidth,
          height: this.opts.canvasHeight,
        });

        this.drawLine(lines, this.canvas);

        const rects = mergeRect(100, {
          width: this.opts.canvasWidth,
          height: this.opts.canvasHeight,
        });

        this.drawRect(rects, this.canvas);
      });
    });
  }
}

window.CanvasForm = CanvasForm;
export default CanvasForm;
