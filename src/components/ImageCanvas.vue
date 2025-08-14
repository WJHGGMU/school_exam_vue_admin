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
    src: {
      type: String,
      required: true
    },
    value: {
      type: Array,
      default: () => []
    },
    imageRef: {
      type: String,
      required: true
    },
    isEditing: {
      type: Boolean,
      default: false
    },
    isConfirmed: {
      type: Boolean,
      default: false
    },
    maxRetries: {
      type: Number,
      default: 10
    },
    retryInterval: {
      type: Number,
      default: 500
    }
  },
  data() {
    return {
      canvas: null,
      ctx: null,
      draggingIndex: -1,
      resizeHandle: null,
      startX: 0,
      startY: 0,
      startPos: {},
      imageWidth: 0,
      imageHeight: 0,
      retryCount: 0,
      retryTimer: null
    }
  },
  watch: {
    value: {
      handler() {
        this.draw();
      },
      deep: true
    },
    src() {
      this.retryCount = 0;
      this.initCanvasWithRetry();
    },
    isEditing() {
      this.draw();
    },
    isConfirmed() {
      this.draw();
    }
  },
  mounted() {
    this.$nextTick(() => {
      this.initCanvasWithRetry();
    });
    window.addEventListener('resize', this.handleResize);
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize);
    if (this.retryTimer) {
      clearTimeout(this.retryTimer);
    }
  },
  methods: {
    // 改进：递归查找正确的父组件引用
    findImageComponent() {
      // 方法1: 从根组件开始查找
      let current = this.$root;
      while (current) {
        if (current.$refs && current.$refs[this.imageRef]) {
          return current.$refs[this.imageRef];
        }
        // 遍历所有子组件查找
        for (const child of current.$children) {
          const found = this.searchInComponent(child, this.imageRef);
          if (found) return found;
        }
        current = current.$parent;
      }
      return null;
    },

    // 辅助方法：在组件及其子组件中查找引用
    searchInComponent(component, refName) {
      if (component.$refs && component.$refs[refName]) {
        return component.$refs[refName];
      }
      for (const child of component.$children) {
        const found = this.searchInComponent(child, refName);
        if (found) return found;
      }
      return null;
    },

    initCanvasWithRetry() {
      if (this.retryCount >= this.maxRetries) {
        console.error(`超过最大重试次数(${this.maxRetries})，仍无法找到imageRef: ${this.imageRef}对应的组件`);
        return;
      }

      const success = this.initCanvas();
      if (!success) {
        this.retryCount++;
        console.log(`将在${this.retryInterval}ms后重试获取imageRef: ${this.imageRef}，重试次数: ${this.retryCount}`);
        this.retryTimer = setTimeout(() => {
          this.initCanvasWithRetry();
        }, this.retryInterval);
      }
    },

    initCanvas() {
      this.canvas = this.$refs.canvas;
      if (!this.canvas) return false;

      this.ctx = this.canvas.getContext('2d');

      // 使用新的查找方式
      const imageComponent = this.findImageComponent();

      if (!imageComponent) {
        console.warn(`无法找到imageRef: ${this.imageRef}对应的组件`);
        return false;
      }

      // 对于Element UI的el-image组件，需要特殊处理
      let imgElement;
      if (imageComponent.$el.tagName === 'IMG') {
        imgElement = imageComponent.$el;
      } else {
        // 查找el-image内部的img元素
        imgElement = imageComponent.$el.querySelector('img');
      }

      if (!imgElement) {
        console.warn(`imageRef: ${this.imageRef}对应的组件中未找到img元素`);
        return false;
      }

      // 确保图片已加载完成
      if (imgElement.complete) {
        this.setImageDimensions(imgElement);
        return true;
      } else {
        imgElement.onload = () => {
          this.setImageDimensions(imgElement);
        };
        imgElement.onerror = () => {
          console.error(`imageRef: ${this.imageRef}对应的图片加载失败`);
        };
        return true;
      }
    },

    setImageDimensions(imgElement) {
      this.imageWidth = imgElement.offsetWidth;
      this.imageHeight = imgElement.offsetHeight;

      this.canvas.width = this.imageWidth;
      this.canvas.height = this.imageHeight;

      this.draw();
    },

    handleResize() {
      this.retryCount = 0;
      this.initCanvasWithRetry();
    },

    // 其他方法保持不变...
    draw() {
      if (!this.canvas || !this.ctx) return;

      this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

      this.value.forEach((pos, index) => {
        this.drawPosition(pos, index);
      });
    },
    drawPosition(pos, index) {
      const { x, y, width, height } = pos;
      const isSelected = this.draggingIndex === index;
      const isEditing = this.isEditing;
      const isConfirmed = this.isConfirmed;

      this.ctx.strokeStyle = isEditing
        ? '#409eff'
        : isConfirmed
          ? '#52c41a'
          : '#f5222d';

      this.ctx.lineWidth = 2;
      this.ctx.setLineDash(isEditing ? [5, 5] : []);

      this.ctx.strokeRect(x, y, width, height);

      this.ctx.fillStyle = isEditing
        ? 'rgba(64, 158, 255, 0.1)'
        : isConfirmed
          ? 'rgba(82, 196, 26, 0.1)'
          : 'rgba(245, 34, 45, 0.1)';
      this.ctx.fillRect(x, y, width, height);

      if (isEditing) {
        this.drawResizeHandles(x, y, width, height);
      }

      this.ctx.setLineDash([]);
    },
    drawResizeHandles(x, y, width, height) {
      const handleSize = 10;
      const handleColor = '#409eff';
      const handleBgColor = 'white';

      this.drawHandle(x - handleSize/2, y - handleSize/2, handleSize, handleColor, handleBgColor);
      this.drawHandle(x + width - handleSize/2, y - handleSize/2, handleSize, handleColor, handleBgColor);
      this.drawHandle(x - handleSize/2, y + height - handleSize/2, handleSize, handleColor, handleBgColor);
      this.drawHandle(x + width - handleSize/2, y + height - handleSize/2, handleSize, handleColor, handleBgColor);
    },
    drawHandle(x, y, size, borderColor, bgColor) {
      this.ctx.fillStyle = bgColor;
      this.ctx.fillRect(x, y, size, size);
      this.ctx.strokeStyle = borderColor;
      this.ctx.strokeRect(x, y, size, size);
    },
    startDrag(e) {
      if (!this.isEditing) return;

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      for (let i = this.value.length - 1; i >= 0; i--) {
        const pos = this.value[i];
        const { x, y, width, height } = pos;

        const handleSize = 10;
        const handles = [
          { name: 'top-left', x: x - handleSize/2, y: y - handleSize/2 },
          { name: 'top-right', x: x + width - handleSize/2, y: y - handleSize/2 },
          { name: 'bottom-left', x: x - handleSize/2, y: y + height - handleSize/2 },
          { name: 'bottom-right', x: x + width - handleSize/2, y: y + height - handleSize/2 }
        ];

        let handleClicked = null;
        for (const handle of handles) {
          if (mouseX >= handle.x && mouseX <= handle.x + handleSize &&
              mouseY >= handle.y && mouseY <= handle.y + handleSize) {
            handleClicked = handle.name;
            break;
          }
        }

        if (handleClicked) {
          this.draggingIndex = i;
          this.resizeHandle = handleClicked;
          this.startX = mouseX;
          this.startY = mouseY;
          this.startPos = { ...pos };
          return;
        }

        if (mouseX >= x && mouseX <= x + width &&
            mouseY >= y && mouseY <= y + height) {
          this.draggingIndex = i;
          this.resizeHandle = null;
          this.startX = mouseX;
          this.startY = mouseY;
          this.startPos = { ...pos };
          return;
        }
      }
    },
    handleDrag(e) {
      if (this.draggingIndex === -1 || !this.isEditing) return;

      const rect = this.canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const dx = mouseX - this.startX;
      const dy = mouseY - this.startY;

      const newPositions = [...this.value];
      const pos = { ...newPositions[this.draggingIndex] };

      if (this.resizeHandle) {
        switch (this.resizeHandle) {
          case 'top-left':
            pos.x = this.startPos.x + dx;
            pos.y = this.startPos.y + dy;
            pos.width = this.startPos.width - dx;
            pos.height = this.startPos.height - dy;
            break;
          case 'top-right':
            pos.y = this.startPos.y + dy;
            pos.width = this.startPos.width + dx;
            pos.height = this.startPos.height - dy;
            break;
          case 'bottom-left':
            pos.x = this.startPos.x + dx;
            pos.width = this.startPos.width - dx;
            pos.height = this.startPos.height + dy;
            break;
          case 'bottom-right':
            pos.width = this.startPos.width + dx;
            pos.height = this.startPos.height + dy;
            break;
        }

        if (pos.width < 10) pos.width = 10;
        if (pos.height < 10) pos.height = 10;
        if (pos.x < 0) pos.x = 0;
        if (pos.y < 0) pos.y = 0;
      } else {
        pos.x = this.startPos.x + dx;
        pos.y = this.startPos.y + dy;

        if (pos.x < 0) pos.x = 0;
        if (pos.y < 0) pos.y = 0;
        if (pos.x + pos.width > this.canvas.width) pos.x = this.canvas.width - pos.width;
        if (pos.y + pos.height > this.canvas.height) pos.y = this.canvas.height - pos.height;
      }

      newPositions[this.draggingIndex] = pos;
      this.$emit('input', newPositions);
      this.$emit('position-updated', newPositions);
      this.draw();
    },
    stopDrag() {
      this.draggingIndex = -1;
      this.resizeHandle = null;
    }
  }
}
</script>

<style scoped>
.canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  cursor: default;
}
</style>
