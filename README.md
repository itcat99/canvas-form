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

思路：

1. 根据 renderColCount 和 renderRowCount 来过滤画的范围
2. 根据 rows 和 columns 生成带坐标(x,y)的 data，将 rows 和 columns 存入 this.data
3. draw 外框的线条
4. draw col 和 row 的线条
5. draw 文字
