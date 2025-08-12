<template>
  <div class="app-container">
    <!-- 搜索和添加按钮区域 -->
    <div class="header-container">
      <el-input
        v-model="filterText"
        placeholder="输入关键字进行筛选.."
        class="search-input"
      />
      <el-button
        type="primary"
        icon="el-icon-plus"
        @click="handleAdd"
        class="add-button"
      >
        新建组织
      </el-button>
    </div>

    <!-- 新建组织对话框 -->
    <el-dialog
      title="新建组织"
      :visible.sync="addDialogVisible"
      :width="dialogWidth"
      @close="$refs.addForm && $refs.addForm.resetFields()"
    >
      <el-form
        ref="addForm"
        :model="addForm"
        label-width="80px"
        size="small"
        class="form-container"
      >
        <el-form-item label="上级组织">
          <el-cascader
            v-model="addForm.parentId"
            :options="cascaderOptions"
            :props="cascaderProps"
            clearable
            placeholder="不选即为顶级节点"
            class="form-control"
          />
        </el-form-item>

        <el-form-item label="组织类型" required>
          <el-select
            v-model="addForm.orgType"
            placeholder="请选择组织类型"
            class="form-control"
          >
            <el-option
              v-for="item in orgTypes"
              :key="item[0]"
              :value="item[0]"
              :label="item[1]"
            ></el-option>
          </el-select>
        </el-form-item>

        <el-form-item label="组织名称" required>
          <el-input
            v-model="addForm.name"
            placeholder="请输入名称"
            class="form-control"
          />
        </el-form-item>

        <el-form-item label="描述">
          <el-input
            v-model="addForm.description"
            type="textarea"
            :rows="2"
            placeholder="选填"
            class="form-control"
          />
        </el-form-item>
      </el-form>

      <span slot="footer" class="dialog-footer">
        <el-button @click="addDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleAddSubmit">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 编辑组织对话框 -->
    <el-dialog
      title="编辑组织"
      :visible.sync="editDialogVisible"
      :width="dialogWidth"
      @close="$refs.editForm && $refs.editForm.resetFields()"
    >
      <el-form
        ref="editForm"
        :model="editForm"
        label-width="80px"
        size="small"
        class="form-container"
      >
        <el-form-item label="组织名称" required>
          <el-input
            v-model="editForm.name"
            placeholder="请输入名称"
            class="form-control"
          />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editForm.description"
            type="textarea"
            :rows="2"
            placeholder="选填"
            class="form-control"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="editDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleEditSubmit">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 组织树 -->
    <el-tree
      ref="tree2"
      :data="data2"
      :props="defaultProps"
      :filter-node-method="filterNode"
      class="filter-tree"
      default-expand-all
      :render-content="renderNode"
    />
  </div>
</template>

<script>
import request from '@/utils/request'
import Cookies from 'js-cookie'

export default {
  name: 'SchoolOrgTree',
  data() {
    return {
      filterText: '',
      data2: [],
      defaultProps: {
        children: 'children',
        label: 'label'
      },
      addDialogVisible: false,
      cascaderOptions: [],
      addForm: {
        parentId: null,
        name: '',
        description: '',
        orgType: '' // 新增组织类型字段
      },
      cascaderProps: {
        value: 'id',
        label: 'label',
        checkStrictly: true,
        emitPath: false
      },
      orgTypes: [ // 组织类型数组
        ["school", "学校"],
        ["college", "学院"],
        ["department", "系"],
        ["major", "专业"],
        ["grade", "年级"],
        ["class", "班级"]
      ],
      editDialogVisible: false, // 编辑弹窗显示状态
      editForm: { // 编辑表单数据
        id: null,
        name: '',
        description: ''
      }
    }
  },
  computed: {
    // 根据屏幕宽度动态计算对话框宽度
    dialogWidth() {
      return window.innerWidth < 768 ? '90%' : '420px'
    }
  },
  created() {
    this.getleveldata()
  },
  watch: {
    filterText(val) {
      this.$refs.tree2.filter(val)
    },
    // 监听窗口大小变化，重新计算布局
    '$route'(to, from) {
      this.handleResize()
    }
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    // 处理窗口大小变化
    handleResize() {
      // 可以在这里添加需要响应式调整的逻辑
    },
    handleAdd() {
      this.cascaderOptions = JSON.parse(JSON.stringify(this.data2))
      this.addForm = {
        parentId: null,
        name: '',
        description: '',
        orgType: ''
      }
      this.addDialogVisible = true
    },
    async handleAddSubmit() {
      if (!this.addForm.name.trim()) {
        this.$message.warning('请输入组织名称')
        return
      }
      try {
        const token = Cookies.get('access')
        await request({
          url: '/school/school_orgs/',
          method: 'post',
          headers: {
            Authorization: `Bearer ${token}`
          },
          data: {
            parent: this.addForm.parentId || null,
            name: this.addForm.name,
            description: this.addForm.description,
            org_type: this.addForm.orgType
          }
        })
        this.$message.success('新建成功')
        this.addDialogVisible = false
        this.getleveldata() // 重新拉列表
      } catch (e) {
        console.error(e)
        this.$message.error('新建失败')
      }
    },
    async getleveldata() {
      try {
        const token = Cookies.get('access')
        const res = await request({
          url: '/school/school_orgs/options/',
          method: 'get',
          headers: {
            Authorization: `Bearer ${token}`
          }
        })
        this.data2 = this.clearLeafChildren(res)
      } catch (e) {
        console.error(e)
        this.$message.error('加载数据失败')
      }
    },
    clearLeafChildren(arr) {
      return arr.map(item => {
        if (!item.children || item.children.length === 0) {
          delete item.children
        } else {
          item.children = this.clearLeafChildren(item.children)
        }
        return item
      })
    },
    filterNode(value, data) {
      if (!value) return true
      return data.label.indexOf(value) !== -1
    },
    renderNode(h, { node, data }) {
      return h(
        'div', {
          class: 'tree-node-wrapper'
        },
        [
          h(
            'span', {
              class: 'tree-node-content'
            },
            node.label
          ),
          h(
            'span', {
              class: 'tree-node-actions'
            },
            [
              h('i', {
                class: 'el-icon-edit',
                on: {
                  click: e => {
                    e.stopPropagation()
                    this.handleEdit(data)
                  }
                }
              }),
              h('i', {
                class: 'el-icon-delete',
                style: 'margin-left:8px;',
                on: {
                  click: e => {
                    e.stopPropagation()
                    this.handleDelete(data, node)
                  }
                }
              })
            ]
          )
        ]
      )
    },
    handleEdit(data) {
      // 填充编辑表单数据
      this.editForm = {
        id: data.id,
        name: data.label,
        description: data.description || '' // 回显原描述
      }
      this.editDialogVisible = true // 显示编辑弹窗
    },

    // 处理编辑提交
    async handleEditSubmit() {
      if (!this.editForm.name.trim()) {
        this.$message.warning('请输入组织名称')
        return
      }
      try {
        const token = Cookies.get('access')
        await request({
          url: `/school/school_orgs/${this.editForm.id}/`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${token}`
          },
          data: {
            name: this.editForm.name,
            description: this.editForm.description // 提交描述字段
          }
        })
        this.$message.success('修改成功')
        this.editDialogVisible = false
        this.getleveldata() // 重新加载数据
      } catch (e) {
        console.error(e)
        this.$message.error('修改失败')
      }
    },
    handleDelete(data, node) {
      this.$confirm('确认删除该节点？', '提示', {
          type: 'warning'
        })
        .then(() => {
          const token = Cookies.get('access')
          return request({
            url: `/school/school_orgs/${data.id}/`,
            method: 'delete',
            headers: {
              Authorization: `Bearer ${token}`
            }
          })
        })
        .then(() => {
          const parent = node.parent
          const children = parent.data.children || parent.data
          const index = children.findIndex(d => d.id === data.id)
          children.splice(index, 1)
          this.$message.success('已删除')
        })
        .catch(() => {})
    }
  }
}
</script>

<style scoped>
/* 基础样式 */
.app-container {
  padding: 16px;
  box-sizing: border-box;
}

/* 头部容器样式 */
.header-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
  gap: 12px;
}

.search-input {
  flex: 1;
}

.add-button {
  white-space: nowrap;
}

/* 表单样式 */
.form-container {
  width: 100%;
}

.form-control {
  width: 100%;
}

/* 对话框底部按钮样式 */
.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  padding-top: 16px;
}

/* 树形节点样式 */
::v-deep .tree-node-wrapper {
  position: relative;
  width: 100%;
  padding: 4px 0;
  box-sizing: border-box;
}

::v-deep .tree-node-content {
  display: inline-block;
  padding-right: 80px; /* 为操作按钮预留空间 */
  line-height: 24px;
}

::v-deep .tree-node-actions {
  position: absolute;
  right: 8px;
  top: 50%;
  transform: translateY(-50%);
  display: flex;
  align-items: center;
  pointer-events: all;
  z-index: 2;
}

/* 操作按钮样式 */
::v-deep .tree-node-actions .el-icon-edit,
::v-deep .tree-node-actions .el-icon-delete {
  cursor: pointer;
  font-size: 18px;
  width: 28px;
  height: 28px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s;
}

::v-deep .tree-node-actions .el-icon-edit {
  color: #409eff;
}

::v-deep .tree-node-actions .el-icon-delete {
  color: #f56c6c;
  margin-left: 8px;
}

/* 悬停效果，提升移动端点击体验 */
::v-deep .tree-node-actions .el-icon-edit:hover,
::v-deep .tree-node-actions .el-icon-delete:hover {
  background-color: rgba(0, 0, 0, 0.05);
}

/* 响应式样式 - 移动端适配 */
@media screen and (max-width: 768px) {
  .app-container {
    padding: 8px;
  }

  .header-container {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .search-input, .add-button {
    width: 100%;
  }

  .add-button {
    padding: 10px;
    font-size: 14px;
  }

  /* 树形节点调整 */
  ::v-deep .tree-node-content {
    padding-right: 70px;
    font-size: 14px;
  }

  ::v-deep .tree-node-actions .el-icon-edit,
  ::v-deep .tree-node-actions .el-icon-delete {
    font-size: 16px;
    width: 24px;
    height: 24px;
  }

  /* 表单元素调整 */
  ::v-deep .el-form-item__label {
    font-size: 14px;
  }

  ::v-deep .el-input__inner,
  ::v-deep .el-select__inner,
  ::v-deep .el-cascader__input {
    font-size: 14px;
    padding: 8px 12px;
  }

  /* 对话框按钮调整 */
  ::v-deep .dialog-footer .el-button {
    padding: 8px 16px;
    font-size: 14px;
  }
}

/* 平板设备适配 */
@media screen and (min-width: 769px) and (max-width: 1024px) {
  .app-container {
    padding: 12px;
  }
}
::v-deep .el-cascader {
  /* 让选择器在移动端宽度适应父容器 */
  width: 100% !important;
}
::v-deep .el-cascader-menu {
  /* 调整菜单在移动端的显示，可根据实际需求改 */
  max-height: 300px;
  overflow-y: auto;
}
::v-deep .el-cascader-node {
  /* 增大节点点击区域，方便移动端触摸 */
  padding: 10px 16px;
}
</style>
