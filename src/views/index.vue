<template>
  <div class="demo-container">
    <canvas id="canvas" :width="width" :height="height" />
    <div class="controls">
      <button @click="clearAll">清空所有框</button>
      <button @click="getBoxes">打印框选坐标</button>
    </div>
  </div>
</template>

<script>
// ✅ 正确导入方式
import { fabric } from 'fabric'
// const fabric = require('fabric')

export default {
  data() {
    return {
      canvas: null,
      isDrawing: false,
      startX: 0,
      startY: 0,
      currentRect: null,
      width: 1655, // 画布宽度
      height: 2357, // 画布高度
      boxes: [
        // { x: 1494, y: 204, width: 1162, height: 1503 },
        // { x: 158, y: 619, width: 1153, height: 593 },
        // { x: 155, y: 1291, width: 1154, height: 480 }
        { x: 169, y: 1790, width: 1423, height: 352 },
        { x: 221, y: 754, width: 1393, height: 239 }
      ] // 存储所有有效框的数据
    }
  },
  mounted() {
    this.initCanvas()
    this.drawAllBoxes()
    // 绑定键盘删除事件
    document.addEventListener('keydown', this.handleKeyDown)
  },
  beforeDestroy() {
    // 移除事件监听
    document.removeEventListener('keydown', this.handleKeyDown)
  },
  methods: {
    initCanvas() {
      // ✅ 初始化画布
      this.canvas = new fabric.Canvas('canvas', {
        selection: false, // 禁用默认选择
        backgroundColor: null // 背景色
      })

      // 绑定鼠标事件
      this.canvas.on('mouse:down', this.startDrawing)
      this.canvas.on('mouse:move', this.drawing)
      this.canvas.on('mouse:up', this.stopDrawing)
    },

    drawAllBoxes() {
      this.boxes.forEach(box => {
        const rect = new fabric.Rect({
          left: box.x,
          top: box.y,
          width: box.width,
          height: box.height,
          fill: 'transparent',
          stroke: '#00ff00',
          strokeWidth: 2,
          strokeUniform: true,
          selectable: true
        })
        this.canvas.add(rect)
      })
    },

    startDrawing(e) {
      console.log(e.target)
      if (e.target) {
        this.canvas.setActiveObject(e.target)
        this.canvas.requestRenderAll() // ✅ 立即显示控制点
        return
      }

      this.isDrawing = true
      const pointer = this.canvas.getPointer(e.e)
      this.startX = pointer.x
      this.startY = pointer.y

      // 创建半透明矩形
      this.currentRect = new fabric.Rect({
        left: this.startX,
        top: this.startY,
        width: 0,
        height: 0,
        fill: 'rgba(0, 0, 0, 0)', // 填充色
        stroke: '#007bff', // 边框色
        strokeWidth: 2, // 边框宽度（像素）
        selectable: true, // 允许后续调整
        strokeDashArray: null, // ✅ 实线（无虚线）
        hasControls: true,
        strokeUniform: true // 固定边框宽度
      })

      this.canvas.add(this.currentRect)
    },

    drawing(e) {
      if (!this.isDrawing || !this.currentRect) return
      const pointer = this.canvas.getPointer(e.e)

      // 动态调整矩形大小
      this.currentRect.set({
        width: pointer.x - this.startX,
        height: pointer.y - this.startY
      })

      this.canvas.requestRenderAll() // 优化性能的渲染方式
    },

    stopDrawing() {
      this.isDrawing = false
      if (!this.currentRect) return
      // 检查宽高是否为 0
      if (this.currentRect.width === 0 || this.currentRect.height === 0) {
        this.canvas.remove(this.currentRect) // ✅ 移除无效矩形
        this.currentRect = null
        return
      }

      // 修正负宽高问题
      const absWidth = Math.abs(this.currentRect.width)
      const absHeight = Math.abs(this.currentRect.height)
      this.currentRect.set({
        width: absWidth,
        height: absHeight,
        left: this.currentRect.width > 0 ? this.startX : this.startX + this.currentRect.width,
        top: this.currentRect.height > 0 ? this.startY : this.startY + this.currentRect.height
      })

      // ✅ 只有有效矩形才添加到 boxes 数组
      this.boxes.push({
        left: this.currentRect.left,
        top: this.currentRect.top,
        width: this.currentRect.width,
        height: this.currentRect.height
      })

      this.currentRect.setCoords() // 更新坐标
      this.canvas.requestRenderAll() // 优化性能的渲染方式
      // this.canvas.renderAll() // 立即渲染
      this.currentRect = null
    },

    handleKeyDown(e) {
      // 按Delete键删除选中对象
      if (e.key === 'Delete' && this.canvas?.getActiveObject()) {
        const activeObj = this.canvas.getActiveObject()
        this.canvas.remove(activeObj)
        this.removeBoxFromArray(activeObj) // ✅ 同步删除数组数据
      }
    },

    // 从 boxes 数组中删除对应的框数据
    removeBoxFromArray(obj) {
      this.boxes = this.boxes.filter(box =>
        box.left !== obj.left || box.top !== obj.top
      )
    },

    clearAll() {
      this.canvas?.clear()
    },

    getBoxes() {
      const boxes = this.canvas?.getObjects('rect') || []
      console.log('当前所有框选区域：', boxes.map(box => ({
        x: box.left,
        y: box.top,
        width: box.width,
        height: box.height
      })))
    }
  }
}
</script>

<style scoped>
.demo-container {
  background-image: url('../../assets/test.jpg');
  background-size: contain;
  background-repeat: no-repeat;
}
#canvas {
  /* border: 1px solid #ddd; */
  /* margin-bottom: 10px; */
}
.controls {
  margin-top: 10px;
}
button {
  margin-right: 10px;
  padding: 5px 10px;
}
</style>
