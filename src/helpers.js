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

export const isIE =
  typeof navigator !== "undefined" &&
  (/MSIE/.test(navigator.userAgent) ||
    /Trident\//.test(navigator.appVersion) ||
    /Edge/.test(navigator.userAgent));
