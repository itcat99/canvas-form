export const getTexts = (num, size) => {
  const arr = [];
  const value = "8";
  const { width, height } = size;

  for (; num > 0; num--) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);

    arr.push({ value, x, y });
  }

  return arr;
};

export const getLines = (step, size) => {
  const arr = [];
  const { width, height } = size;

  for (let i = 1; i < width; i += step) {
    const from = [i, 0];
    const to = [i, height];
    arr.push({ from, to });
  }

  for (let i = 1; i < height; i += step) {
    const from = [0, i];
    const to = [width, i];

    arr.push({ from, to });
  }
  return arr;
};

export const mergeRect = (nums, size) => {
  const arr = [];
  const { width, height } = size;

  for (; nums > 0; nums--) {
    const x = Math.floor(Math.random() * width);
    const y = Math.floor(Math.random() * height);
    const _width = 200;
    const _height = 100;

    arr.push({ x, y, width: _width, height: _height });
  }

  return arr;
};
