import { drawRects, clearRect } from "./canvas";
import { inScope } from "./helpers";

class Scroller {
  constructor(opts) {
    this.opts = opts;
    const {
      emitter,
      ctx,
      type,
      width,
      height,
      barWidth,
      barHeight,
      maxScrollSize,
      offset = 0,
    } = opts;

    this.emitter = emitter;
    this.ctx = ctx;
    this.type = type;
    this.offset = offset;
    this.width = width;
    this.height = height;
    this.barWidth = barWidth;
    this.barHeight = barHeight;
    this.maxScrollSize = maxScrollSize;

    this.mouseIn = false;

    this.init();
    this.listen();
  }
  init() {
    this.scrollTo(this.offset);
  }
  scrollTo(offset) {
    this.offset = offset;
    const { x, y } = this.opts;
    const scrollerInfo = [x, y, this.width, this.height];
    const barInfo = this.getBarInfo();
    const styles = [{ fillStyle: "#ffffff" }, { fillStyle: "rgba(0,0,0,.2)" }];

    drawRects([scrollerInfo, barInfo], this.ctx, styles);
  }

  getBarInfo() {
    const { x, y } = this.opts;
    let barX = x;
    let barY = this.offset + y;

    if (this.type === "x") {
      barX = this.offset + x;
      barY = y;
    }

    return [barX, barY, this.barWidth, this.barHeight];
  }

  updateBarStyle(styles) {
    const barInfo = this.getBarInfo();
    console.log("update bar style: ", styles);
    drawRects([barInfo], this.ctx, { fillStyle: "#fff" });
    drawRects([barInfo], this.ctx, styles);
  }

  listen() {
    this.emitter.on("SCROLLER_HOVER", this.onMouseIn);
    this.emitter.on("SCROLLER_HOVER_OFF", this.onMouseOut);
    this.emitter.on("scrolling", this.onScrolling);
  }
  onMouseIn = data => {
    const { type, offset } = data;
    const [x, y] = offset;
    if (type === this.type) {
      const barInfo = this.getBarInfo();
      const [barX, barY, barWidth, barHeight] = barInfo;
      if (inScope([x, y], { from: [barX, barY], to: [barX + barWidth, barY + barHeight] })) {
        document.body.style.cursor = "pointer";
        this.updateBarStyle({ fillStyle: "rgba(0,0,0,.5)" });
      }

      this.mouseIn = true;
    }
  };
  onMouseOut = () => {
    if (this.mouseIn) {
      document.body.style.cursor = "default";
      this.mouseIn = false;
      this.updateBarStyle({ fillStyle: "rgba(0,0,0,.2)" });
    }
  };
  onScrolling = () => {};
  updateBar() {}
}

export default Scroller;
