<template>
  <canvas
    class="canvas-overlay"
    ref="canvas"
    @mousedown="startDrag"
    @mousemove="handleDrag"
    @mouseup="stopDrag"
    @mouseleave="stopDrag"
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
      startPos: {}
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
    /* 1. 加载图片 -> 设置 canvas 尺寸 */
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

    /* 2. 绘制所有矩形 */
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
      const size = 10
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

    /* 3. 拖拽 / 缩放逻辑（保持你原来的即可） */
    startDrag (e) {
      if (!this.isEditing) return
      const { left, top } = this.canvas.getBoundingClientRect()
      const mx = e.clientX - left
      const my = e.clientY - top
      const size = 10
      for (let i = this.value.length - 1; i >= 0; i--) {
        const r = this.value[i]
        // 先检查是否在矩形内
        if (mx >= r.x && mx <= r.x + r.width && my >= r.y && my <= r.y + r.height) {
          // 再检查是否在四个角点上
          const handles = [
            { name: 'tl', x: r.x - size / 2, y: r.y - size / 2 },
            { name: 'tr', x: r.x + r.width - size / 2, y: r.y - size / 2 },
            { name: 'bl', x: r.x - size / 2, y: r.y + r.height - size / 2 },
            { name: 'br', x: r.x + r.width - size / 2, y: r.y + r.height - size / 2 }
          ]
          let handle = handles.find(h => mx >= h.x && mx <= h.x + size && my >= h.y && my <= h.y + size)
          if (handle) {
            this.draggingIndex = i
            this.resizeHandle = handle.name
          } else {
            this.draggingIndex = i
            this.resizeHandle = null
          }
          this.startX = mx
          this.startY = my
          this.startPos = { ...r }
          return
        }
      }
    },
    handleDrag (e) {
      if (this.draggingIndex === -1) return
      const { left, top } = this.canvas.getBoundingClientRect()
      const mx = e.clientX - left
      const my = e.clientY - top
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
