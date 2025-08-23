<template>
  <canvas
    class="canvas-overlay"
    ref="canvas"
    @mousedown="startDrag"
    @mousemove="handleMouseActions"
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
    @dblclick="handleDoubleClick"
    :style="cursorStyle"
  ></canvas>
</template>

<script>
export default {
  name: 'ImageCanvas',
  props: {
    src: { type: String, required: true },
    value: { type: Array, default: () => [] },
    isEditing: { type: Boolean, default: true },
    isConfirmed: { type: Boolean, default: false }
  },
  data () {
    return {
      canvas: null,
      ctx: null,
      imgWidth: 0,
      imgHeight: 0,
      draggingIndex: -1,
      resizeHandle: null,
      startX: 0,
      startY: 0,
      startPos: {},
      cursorStyle: { cursor: 'default' },
      handleSize: 10, // 手柄基础尺寸
      tolerance: 3,   // 容错范围
      selectedIndex: -1 // 记录当前选中的矩形索引
    }
  },
  watch: {
    src () { this.loadImage() },
    value () { this.draw() },
    isEditing () { this.draw() },
    isConfirmed () { this.draw() },
    // 当选中索引变化时触发事件
    selectedIndex (newVal, oldVal) {
      this.draw()
      if (newVal === -1) {
        this.$emit('box-deselected')
      } else if (newVal !== oldVal) {
        this.$emit('box-selected', newVal)
      }
    }
  },
  mounted () {
    this.canvas = this.$refs.canvas
    this.ctx = this.canvas.getContext('2d')
    this.loadImage()
  },
  methods: {
    handleMouseActions(e) {
      this.handleDrag(e)
      this.handleMouseMove(e)
    },

    /* 加载图片 */
    loadImage () {
      if (!this.src) return
      const img = new Image()
      img.crossOrigin = 'anonymous'
      img.onload = () => {
        this.imgWidth = img.naturalWidth
        this.imgHeight = img.naturalHeight
        this.canvas.width = this.imgWidth
        this.canvas.height = this.imgHeight
        this.draw()
      }
      img.onerror = () => console.error('图片加载失败:', this.src)
      img.src = this.src
    },

    /* 绘制逻辑 */
    draw () {
      if (!this.ctx) return
      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height)
      this.value.forEach((pos, i) => this.drawRect(pos, i))
    },
    drawRect (pos, index) {
      const { x, y, width, height } = pos
      const isDragging = index === this.draggingIndex
      const isSelected = index === this.selectedIndex // 判断是否选中
      const editing = this.isEditing
      const confirmed = this.isConfirmed

      // 选中状态的样式
      if (isSelected) {
        this.ctx.strokeStyle = '#409eff' // 选中状态使用蓝色边框
        this.ctx.lineWidth = 3
        this.ctx.setLineDash(editing ? [5, 5] : [])
      } else {
        this.ctx.strokeStyle = editing ? '#52c41a' : confirmed ? '#52c41a' : '#f5222d'
        this.ctx.lineWidth = 2
        this.ctx.setLineDash([])
      }

      this.ctx.strokeRect(x, y, width, height)

      // 选中状态的填充色
      this.ctx.fillStyle = isSelected
        ? 'rgba(64, 158, 255, 0.1)' // 选中状态的填充色
        : editing
          ? 'rgba(82, 196, 26, 0.1)'
          : confirmed
            ? 'rgba(82, 196, 26, 0.1)'
            : 'rgba(245, 34, 45, 0.1)'
      this.ctx.fillRect(x, y, width, height)

      // 只对选中的矩形绘制手柄
      if (isSelected) {
        this.drawHandles(x, y, width, height)
      }
      this.ctx.setLineDash([])
    },
    drawHandles (x, y, w, h) {
      const size = this.handleSize
      const draw = (hx, hy) => {
        this.ctx.fillStyle = '#fff'
        this.ctx.fillRect(hx, hy, size, size)
        this.ctx.strokeStyle = '#409eff'
        this.ctx.strokeRect(hx, hy, size, size)
      }
      draw(x - size / 2, y - size / 2)
      draw(x + w - size / 2, y - size / 2)
      draw(x - size / 2, y + h - size / 2)
      draw(x + w - size / 2, y + h - size / 2)
    },

    /* 光标检测逻辑 - 只对选中的矩形显示操作光标 */
    handleMouseMove(e) {
      if (!this.isEditing || this.draggingIndex !== -1) return

      // 如果没有选中任何矩形，直接显示默认光标
      if (this.selectedIndex === -1) {
        this.cursorStyle = { cursor: 'default' }
        return
      }

      const result = this.detectHandleInteraction(e)
      // 只处理当前选中矩形的光标交互
      if (result.hoveredHandle && result.rectIndex === this.selectedIndex) {
        this.cursorStyle = { cursor: result.hoveredHandle.cursor }
      } else if (result.inRect && result.rectIndex === this.selectedIndex) {
        this.cursorStyle = { cursor: 'move' }
      } else {
        this.cursorStyle = { cursor: 'default' }
      }
    },

    /* 双击处理选中状态切换 */
    handleDoubleClick(e) {
      if (!this.isEditing) return
      const result = this.detectHandleInteraction(e)

      // 双击矩形内部且不是手柄 - 切换选中状态
      if (!result.hoveredHandle && result.inRect) {
        if (this.selectedIndex === result.rectIndex) {
          // 再次双击已选中的矩形，取消选中
          this.selectedIndex = -1
        } else {
          // 选中新的矩形
          this.selectedIndex = result.rectIndex
        }
      } else if (!result.inRect) {
        // 双击空白区域，取消选中
        this.selectedIndex = -1
      }
    },

    /* 拖拽开始逻辑 - 只有选中的矩形才能被拖拽 */
    startDrag (e) {
      if (!this.isEditing || this.selectedIndex === -1) return

      const result = this.detectHandleInteraction(e)
      // 只允许拖拽当前选中的矩形
      if (result.rectIndex !== this.selectedIndex) return

      // 处理拖拽逻辑
      if (result.hoveredHandle) {
        this.draggingIndex = result.rectIndex
        this.resizeHandle = result.hoveredHandle.name
        this.startX = result.mx
        this.startY = result.my
        this.startPos = { ...this.value[result.rectIndex] }
      } else if (result.inRect) {
        this.draggingIndex = result.rectIndex
        this.resizeHandle = null
        this.startX = result.mx
        this.startY = result.my
        this.startPos = { ...this.value[result.rectIndex] }
      }
    },

    /* 核心：统一的手柄交互检测函数 */
    detectHandleInteraction(e) {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY

      for (let i = this.value.length - 1; i >= 0; i--) {
        const r = this.value[i]
        const handles = this.getHandles(r)

        // 检测是否在手柄范围内
        const hoveredHandle = handles.find(h =>
          mx >= h.x - this.tolerance &&
          mx <= h.x + this.handleSize + this.tolerance &&
          my >= h.y - this.tolerance &&
          my <= h.y + this.handleSize + this.tolerance
        )

        if (hoveredHandle) {
          return {
            hoveredHandle,
            rectIndex: i,
            mx,
            my,
            inRect: true
          }
        }

        // 检测是否在矩形内部
        if (mx >= r.x && mx <= r.x + r.width && my >= r.y && my <= r.y + r.height) {
          return {
            hoveredHandle: null,
            rectIndex: i,
            mx,
            my,
            inRect: true
          }
        }
      }

      return {
        hoveredHandle: null,
        rectIndex: -1,
        mx,
        my,
        inRect: false
      }
    },

    /* 生成手柄数据 */
    getHandles(rect) {
      const { x, y, width, height } = rect
      const size = this.handleSize
      return [
        { name: 'tl', x: x - size / 2, y: y - size / 2, cursor: 'nwse-resize' },
        { name: 'tr', x: x + width - size / 2, y: y - size / 2, cursor: 'nesw-resize' },
        { name: 'bl', x: x - size / 2, y: y + height - size / 2, cursor: 'nesw-resize' },
        { name: 'br', x: x + width - size / 2, y: y + height - size / 2, cursor: 'nwse-resize' }
      ]
    },

    /* 拖拽过程逻辑 */
    handleDrag (e) {
      if (this.draggingIndex === -1) return
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY
      const dx = mx - this.startX
      const dy = my - this.startY
      let r = { ...this.startPos }

      if (this.resizeHandle) {
        switch (this.resizeHandle) {
          case 'tl':
            r.x += dx; r.y += dy; r.width -= dx; r.height -= dy
            break
          case 'tr':
            r.y += dy; r.width += dx; r.height -= dy
            break
          case 'bl':
            r.x += dx; r.width -= dx; r.height += dy
            break
          case 'br':
            r.width += dx; r.height += dy
            break
        }
      } else {
        r.x += dx
        r.y += dy
      }
      // 边界限制
      r.width = Math.max(10, r.width)
      r.height = Math.max(10, r.height)
      r.x = Math.max(0, Math.min(r.x, this.canvas.width - r.width))
      r.y = Math.max(0, Math.min(r.y, this.canvas.height - r.height))

      const list = [...this.value]
      list[this.draggingIndex] = r
      this.$emit('input', list)
      this.$emit('position-updated', list)
      this.draw()
    },

    stopDrag () {
      this.draggingIndex = -1
      this.resizeHandle = null
      this.handleMouseMove({ clientX: 0, clientY: 0 })
    },

    // 提供外部调用的刷新画布方法
    updateCanvas() {
      this.draw()
    },

    // 供外部调用的选中方法
    setSelectedIndex(index) {
      if (index >= 0 && index < this.value.length) {
        this.selectedIndex = index
        return true
      }
      this.selectedIndex = -1
      return false
    }
  }
}
</script>

<style scoped>
.canvas-overlay {
  display: block;
  cursor: default;
}
</style>
