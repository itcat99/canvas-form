import Hashids from "hashids";

/**
 * 获取四舍五入的整数
 * @param {Number} num
 */
export const intNum = num => Math.round(num);

/**
 * 获取一个hash_id
 * @param {Number} id
 */
export const getHashId = id => {
  const hashid = new Hashids(new Date().valueOf(), 5);

  return hashid.encode(id || Math.random() * 100);
};

/**
 * 获取arr中 和target的值顺序最近的那个元素
 * 例如：arr = [{i: 100}, {i:200}, {i:300}]
 * target = 180
 * key = i
 * 则最近的为 {i:200}
 *
 * @param {Array} arr 需要提取的数组
 * @param {Number} target 目标值
 * @param {String} key 当有key时，对比的是arr中每一项内key的值。没有key时，则对比的是arr的每一项
 */
export function nearly(arr, target, key) {
  const tempArr = arr.filter(item => {
    const value = key ? item[key] : item;
    if (target - value >= 0) {
      return target - value;
    }
  });

  tempArr.sort((a, b) => {
    let valA = key ? target - a[key] : target - a;
    let valB = key ? target - b[key] : target - b;

    return valA - valB;
  });

  return tempArr[0];
}

/**
 * 获取文字在当前格字的位置（相对于整个canvas）
 *
 * @param {String} value 文字
 * @param {Object} cellInfo 格子的信息
 * @param {Object} [align] 对其方式
 * @param {Number} cellInfo.x 格子的x坐标
 * @param {Number} cellInfo.y 格子的y坐标
 * @param {Number} cellInfo.width 格子的宽度
 * @param {Number} cellInfo.height 格子的高度
 * @param {String} align.horizontal 横向对齐方式
 * @param {String} align.vertical 纵向对齐方式
 */
export const getTextPosition = (value, cellInfo, align) => {
  const { x, y, width, height } = cellInfo;
  return { value, x: intNum(x + width / 2), y: intNum(y + height / 2) };
};

/**
 * 获取画一个空心方块的所有线段坐标
 * @param {String[]} start 起点坐标 [xStart, yStart]
 * @param {String[]} end 终点坐标 [xEnd, yEnd]
 * @returns {Object[]} 返回线段的坐标数组
 */
export const getRectLinePosition = (start, end) => {
  const [startX, startY] = start;
  const [endX, endY] = end;

  return [
    { from: [startX, startY], to: [endX, startY] },
    { from: [endX, startY], to: [endX, endY] },
    { from: [endX, endY], to: [startX, endY] },
    { from: [startX, endY], to: [startX, startY] },
  ];
};

export const isIE =
  typeof navigator !== "undefined" &&
  (/MSIE/.test(navigator.userAgent) ||
    /Trident\//.test(navigator.appVersion) ||
    /Edge/.test(navigator.userAgent));

export const KEY_CODES = {
  13: "ENTER",
  40: "ARROW_DOWN",
  37: "ARROW_LEFT",
  39: "ARROW_RIGHT",
  38: "ARROW_UP",
};

/**
 * 根据宽度，截取文字（粗略）
 * @param {String} str 需要截取的文字
 * @param {Number} strWidth 文字本身宽度
 * @param {Number} targetWidth 目标宽度
 */
export const splitText = (str, strWidth, targetWidth) => {
  let result = "";
  const textWidth = Math.floor(strWidth / str.length);
  const textArr = str.split("");

  for (let i = 0; i < textArr.length; i++) {
    const text = textArr[i];
    if ((i + 1) * textWidth >= targetWidth - 5) {
      break;
    }

    result += text;
  }

  return result;
};

/**
 * 判断是否在某个范围内
 * @param {Number[]} offset 需要判断的坐标 [x, y]
 * @param {Object[]} scope 需要对比的范围 {from, to}
 * @param {Number[]} scope.from 开始点的坐标
 * @param {Number[]} scope.to 结束点的坐标
 * @param {Boolean} hasBorder 是否包含边界
 * @returns {Boolean}
 */
export const inScope = (offset, scope, hasBorder) => {
  const [x, y] = offset;
  const { from, to } = scope;
  const [fromX, fromY] = from;
  const [toX, toY] = to;

  const result = hasBorder
    ? x >= fromX && x <= toX && y >= fromY && y <= toY
    : x > fromX && x < toX && y > fromY && y < toY;

  return result;
};
