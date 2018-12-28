# canvas-form

canvas methods

- drawLine
- drawText
- drawSquare
- clear

canvas form

- 选中
- 合并
- 键盘控制
- 金额格子\*
- 固定行/列
- 展开/隐藏行/列
- 选择行
- 滚动条
- 自定义样式
- 文字折行/截断

css 属性:

- margin
- marginTop
- marginRight
- marginBottom
- marginLeft
- border
- borderTop
- borderRight
- borderBottom
- borderLeft
- padding
- paddingTop
- paddingRight
- paddingBottom
- paddingLeft
- horizontalAligin
- verticalAlign

由于改变 canvas 的属性需要消耗性能，所以，尽量挑选属性相似的一起渲染
每次变化的时候，需要渲染：

- 计算不同颜色的色块坐标和大小 -> colorRects: { x, y, width, height }
- 计算不同属性的字 -> differentFonts: { color, weight, size }

## 思路：

### 初始化:

1. 根据初始的数据源，生成带坐标的 rows 和 columns 保存在 this.rows 和 this.columns 内 **\*不知道是否可以优化此处，如果数据量太大，势必影响首屏加载性能，需要后续验证**
2. 计算出行列首位的 index 保存在 this.scrollTopRowIndex 和 this.scrollTopColIndex 初始值均为 0
3. 根据 renderColCount 和 renderRowCount 来过滤画的范围 返回 this.renderCols, this.renderRows 和 this.renderMerges 分别代表绘制的行、列的线和合并的格子
4. 绘制外框、行、列的线条
5. 绘制合并格子
6. 绘制选中格子（初始没有选中格子）

### 选中格子:

1. 计算出鼠标在 canvas 内点击的相对位置坐标
2. 先判断此位置坐标是否在 mergeCell 内，如果是，则更新 this.selectedCell 为 mergeCell 的属性（先判断是因为在绝大多数情况下，mergeCell 数量较少）
3. 如果不在，则用 nearly 函数判断在哪个格子 更新 this.selectedCell
4. 重绘上一个 selectedCell 的样式和文字
5. 绘制新的 selectedCell 的样式和文字

### refresh 时：

1. 算出新的 scrollTopRowIndex 算出新的 scrollTopColIndex
2. 过滤出新的 renderRows 和 renderCols
3. 绘制有背景色的 rect
4. 绘制线条
5. 绘制有颜色的线条
6. 绘制文字
7. 绘制 mergeCell
8. 绘制 selectedCell
9. 绘制 scroller

### 有问题：

- moneyCell 和合并格子冲突的情况 暂不处理
- resize 的情况 暂不处理

### 怎样用最少的循环来初始化数据？

- 所有数据的大循环
- 设定 row&&col 数量的小循环

#### 大循环

初始化内容：

```js
columns = {
  id,
  width,
  title,
  type, // ['basic', 'money']
  bits, // 仅对type === money 有效
};

rows = {
  id,
  height,
  data, // 相对每个columns的id 的内容
};
```

需要得到：

```js
columns = {
  x,
  id,
  width,
  title,
  type, // ['basic', 'money']
  bits, // 仅对type === money 有效
  bitsX, // 每个小格子的x坐标
};

rows = {
  y,
  id,
  height,
  data,
};
```
