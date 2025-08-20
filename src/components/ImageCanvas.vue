<template>
  <canvas
    class="canvas-overlay"
    ref="canvas"
    @mousedown="startDrag"
    @mousemove="handleMouseActions"
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
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
      tolerance: 3    // 容错范围（适当增大，默认建议3-5）
    }
  },
  watch: {
    src () { this.loadImage() },
    value () { this.draw() },
    isEditing () { this.draw() },
    isConfirmed () { this.draw() }
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
      const selected = index === this.draggingIndex
      const editing = this.isEditing
      const confirmed = this.isConfirmed

      this.ctx.strokeStyle = editing ? '#409eff' : confirmed ? '#52c41a' : '#f5222d'
      this.ctx.lineWidth = 2
      this.ctx.setLineDash(editing ? [5, 5] : [])
      this.ctx.strokeRect(x, y, width, height)

      this.ctx.fillStyle = editing
        ? 'rgba(64, 158, 255, 0.1)'
        : confirmed
          ? 'rgba(82, 196, 26, 0.1)'
          : 'rgba(245, 34, 45, 0.1)'
      this.ctx.fillRect(x, y, width, height)

      if (editing) this.drawHandles(x, y, width, height)
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

    /* 光标检测逻辑 */
    handleMouseMove(e) {
      if (!this.isEditing || this.draggingIndex !== -1) return
      // 调用统一的检测函数
      const result = this.detectHandleInteraction(e)
      if (result.hoveredHandle) {
        this.cursorStyle = { cursor: result.hoveredHandle.cursor }
      } else if (result.inRect) {
        this.cursorStyle = { cursor: 'move' }
      } else {
        this.cursorStyle = { cursor: 'default' }
      }
    },

    /* 拖拽开始逻辑 */
    startDrag (e) {
      if (!this.isEditing) return
      // 调用统一的检测函数
      const result = this.detectHandleInteraction(e)
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

    /* 核心：统一的手柄交互检测函数（光标和拖拽共用） */
    detectHandleInteraction(e) {
      const rect = this.canvas.getBoundingClientRect()
      const scaleX = this.canvas.width / rect.width
      const scaleY = this.canvas.height / rect.height
      const mx = (e.clientX - rect.left) * scaleX
      const my = (e.clientY - rect.top) * scaleY

      for (let i = this.value.length - 1; i >= 0; i--) {
        const r = this.value[i]
        const handles = this.getHandles(r)

        // 检测是否在手柄范围内（核心判断逻辑）
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
