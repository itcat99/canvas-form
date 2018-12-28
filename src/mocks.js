import { Random } from "mockjs";

const getCols = count => {
  const cols = [{ id: "index", width: 50, title: "index" }];
  for (count; count > 0; count--) {
    cols.push({
      width: Random.natural(50, 200),
      id: Random.id(),
      title: Random.string(7, 9),
      type: count < 15 ? "basic" : "money",
      bits: count < 15 ? null : 11,
    });
  }
  return cols;
};

const getRows = (cols, count) => {
  const rows = [];
  for (let i = 0; i < count; i++) {
    const data = {};

    cols.forEach((col, index) => {
      const { id: colId } = col;
      if (colId === "index") {
        data[colId] = i;
      } else if (index < 7 && index !== 0) {
        data[colId] = Random.natural(0, 99999999999);
      } else {
        data[colId] = Random.string(7, 9);
      }
    });

    rows.push({
      id: Random.id(),
      height: Random.natural(25, 25),
      data,
    });
  }

  return rows;
};

window.mocks = {
  getCols,
  getRows,
};
