import { Random } from "mockjs";

const getCols = count => {
  const cols = [];
  for (count; count > 0; count--) {
    cols.push({
      width: Random.natural(50, 200),
      id: Random.id(),
      title: Random.string(7, 9),
    });
  }
  return cols;
};

const getRows = (cols, count) => {
  const rows = [];
  for (count; count > 0; count--) {
    const data = {};

    cols.forEach(col => {
      const { id: colId } = col;
      data[colId] = Random.string(7, 9);
    });

    rows.push({
      id: Random.id(),
      height: Random.natural(20, 30),
      data,
    });
  }

  return rows;
};

window.mocks = {
  getCols,
  getRows,
};
