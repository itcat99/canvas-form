export const getRows = function() {
  return this.opts.rows;
};
export const getCols = function() {
  return this.opts.columns;
};

export const getRow = function(index) {
  return this.opts.rows[index];
};

export const getCol = function(index) {
  return this.opts.columns[index];
};

export const getSelectedCell = function() {
  return this.selectedCell;
};
