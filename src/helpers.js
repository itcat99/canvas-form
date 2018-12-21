import Hashids from "hashids";

export const intNum = num => Math.round(num);
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
