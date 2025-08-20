<template>
  <div class="app-container">
    <!-- 筛选和添加按钮区域 -->
    <div class="header-container">
      <el-cascader
        v-model="selectedOrg"
        :options="filteredOrgData"
        :props="cascaderProps"
        clearable
        placeholder="请选择所属组织"
        class="org-filter"
        @change="applyFilter"
      />
      <el-select
        v-model="selectedExamType"
        placeholder="请选择考试类型"
        class="type-filter"
        clearable
        @change="applyFilter"
      >
        <el-option
          v-for="item in examTypeOptions"
          :key="item.value"
          :label="item.label"
          :value="item.value"
        ></el-option>
      </el-select>
      <el-button type="primary" icon="el-icon-plus" @click="handleAddExam" class="add-button">
        新建考试
      </el-button>
    </div>

    <!-- 新建考试弹窗 -->
    <el-dialog
      title="新建考试"
      :visible.sync="addExamDialogVisible"
      :width="dialogWidth"
      @close="$refs.addExamForm && $refs.addExamForm.resetFields()"
    >
      <el-form
        ref="addExamForm"
        :model="addExamForm"
        label-width="80px"
        size="small"
        class="form-container"
      >
        <el-form-item label="所属组织" required>
          <el-cascader
            v-model="editExamForm.organizationId"
            :options="filteredOrgData"
            :props="cascaderProps"
            clearable
            placeholder="请选择考试所属组织"
            class="form-control"
          />
        </el-form-item>
        <el-form-item label="考试类型" required>
          <el-select v-model="addExamForm.examType" placeholder="请选择考试类型" class="form-control">
            <el-option
              v-for="item in examTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="考试名称" required>
          <el-input v-model="addExamForm.name" placeholder="请输入名称" class="form-control" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="addExamForm.description"
            type="textarea"
            :rows="2"
            placeholder="选填"
            class="form-control"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="addExamDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleAddExamSubmit">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 编辑考试弹窗 -->
    <el-dialog
      title="编辑考试"
      :visible.sync="editExamDialogVisible"
      :width="dialogWidth"
      @close="$refs.editExamForm && $refs.editExamForm.resetFields()"
    >
      <el-form
        ref="editExamForm"
        :model="editExamForm"
        label-width="80px"
        size="small"
        class="form-container"
      >
        <el-form-item label="所属组织" required>
          <el-cascader
            v-model="editExamForm.organizationId"
            :options="data2"
            :props="cascaderProps"
            clearable
            placeholder="请选择考试所属组织"
            class="form-control"
          />
        </el-form-item>
        <el-form-item label="考试类型" required>
          <el-select v-model="editExamForm.examType" placeholder="请选择考试类型" class="form-control">
            <el-option
              v-for="item in examTypeOptions"
              :key="item.value"
              :label="item.label"
              :value="item.value">
            </el-option>
          </el-select>
        </el-form-item>
        <el-form-item label="考试名称" required>
          <el-input v-model="editExamForm.name" placeholder="请输入名称" class="form-control" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input
            v-model="editExamForm.description"
            type="textarea"
            :rows="2"
            placeholder="选填"
            class="form-control"
          />
        </el-form-item>
      </el-form>
      <span slot="footer" class="dialog-footer">
        <el-button @click="editExamDialogVisible = false">取 消</el-button>
        <el-button type="primary" @click="handleEditExamSubmit">确 定</el-button>
      </span>
    </el-dialog>

    <!-- 卡片列表 -->
    <div class="list">
      <el-card
        v-for="exam in filteredExamList"
        :key="exam.id"
        class="card-row"
        shadow="never"
      >
        <div class="card-content">
          <div class="card-header">
            <div class="exam-type" :class="getTypeClass(exam.exam_type)">
              {{ formatExamType(exam.exam_type) }}
            </div>
            <div class="exam-name">{{ exam.name }}</div>
          </div>
          <div class="card-body">
            <p class="description"><strong>描述：</strong>{{ exam.description || '无' }}</p>
            <div class="meta-info">
              <div class="meta-item">
                <i class="el-icon-time"></i>
                <span>创建时间：{{ exam.created_at }}</span>
              </div>
              <div class="meta-item">
                <i class="el-icon-refresh"></i>
                <span>更新时间：{{ exam.updated_at }}</span>
              </div>
              <div class="meta-item">
                <i class="el-icon-building"></i>
                <span>所属组织：{{ exam.organization_name }}</span>
              </div>
            </div>
          </div>
        </div>
        <div class="card-actions">
          <el-button size="mini" type="primary" @click="handlePaperManagement(exam)">试卷管理</el-button>
          <el-button size="mini" type="warning" @click="handleViewScores(exam)">查看成绩</el-button>
          <el-button size="mini" type="success" @click="handleEdit(exam)">编辑</el-button>
          <el-button size="mini" type="danger" @click="handleDelete(exam)">删除</el-button>
        </div>
      </el-card>
      <!-- 空数据 -->
      <div v-if="filteredExamList.length === 0" class="empty-state">
        <el-empty description="暂无考试数据"></el-empty>
      </div>
    </div>
  </div>
</template>

<script>
import request from '@/utils/request'
import Cookies from 'js-cookie'

export default {
  data() {
    return {
      data2: [],
      filteredOrgData: [], // 用于筛选的组织数据（非grade类型标记为禁用）
      examList: [],
      filteredExamList: [],
      addExamDialogVisible: false,
      editExamDialogVisible: false,
      examTypeOptions: [
        { value: 'weekly', label: '周考' },
        { value: 'monthly', label: '月考' },
        { value: 'midterm', label: '期中' },
        { value: 'final', label: '期末' },
        { value: 'academic', label: '会考' },
        { value: 'hand_graded_homework', label: '手阅作业' },
        { value: 'online_exercise', label: '在线练习' },
        { value: 'differentiated_homework', label: '分层作业' }
      ],
      addExamForm: {
        organizationId: null,
        examType: '',
        name: '',
        description: ''
      },
      editExamForm: {
        id: null,
        organizationId: null,
        examType: '',
        name: '',
        description: ''
      },
      cascaderProps: {
        value: 'id',
        label: 'label',
        checkStrictly: true,
        emitPath: false
        // 禁用逻辑已移至数据处理中
      },
      selectedOrg: null, // 选中的组织
      selectedExamType: null // 选中的考试类型
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
    this.fetchExamList()
  },
  watch: {
    // 监听窗口大小变化
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
      // 可根据需要添加响应式调整逻辑
    },
    async getleveldata() {
      try {
        const token = Cookies.get('access')
        const res = await request({
          url: '/school/school_orgs/options/',
          method: 'get',
          headers: { Authorization: `Bearer ${token}` }
        })
        this.data2 = this.clearLeafChildren(res)
        // 复制数据并处理非grade类型的禁用状态
        this.filteredOrgData = this.processOrgDataForFilter(this.data2)
      } catch (e) {
        console.error(e)
        this.$message.error('加载数据失败')
      }
    },
    // 处理组织数据，为非grade类型添加disabled: true
    processOrgDataForFilter(orgData) {
      // 深拷贝数据避免影响原始数据
      const data = JSON.parse(JSON.stringify(orgData))

      const processNode = (node) => {
        // 如果不是grade类型，标记为禁用
        if (node.org_type !== 'grade') {
          node.disabled = true
        }

        // 递归处理子节点
        if (node.children && node.children.length > 0) {
          node.children = node.children.map(child => processNode(child))
        }

        return node
      }

      return data.map(node => processNode(node))
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
    async fetchExamList() {
      try {
        const token = Cookies.get('access')
        const response = await request({
          url: '/sexam/exams/',
          method: 'get',
          headers: {
            'Authorization': `Bearer ${token}`
          }
        })
        this.examList = Array.isArray(response) ? response : []
        this.applyFilter() // 初始加载时应用筛选
      } catch (error) {
        console.error('获取考试列表失败：', error)
        this.$message.error('加载考试数据失败，请重试')
        this.examList = []
        this.filteredExamList = []
      }
    },
    applyFilter() {
      let result = [...this.examList]

      // 按组织筛选
      if (this.selectedOrg) {
        result = result.filter(exam => exam.organization === this.selectedOrg)
      }

      // 按考试类型筛选
      if (this.selectedExamType) {
        result = result.filter(exam => exam.exam_type === this.selectedExamType)
      }

      this.filteredExamList = result
    },
    formatExamType(type) {
      const typeMap = {
        'weekly': '周考',
        'monthly': '月考',
        'midterm': '期中',
        'final': '期末',
        'academic': '会考',
        'hand_graded_homework': '手阅作业',
        'online_exercise': '在线练习',
        'differentiated_homework': '分层作业'
      }
      return typeMap[type] || '未知类型'
    },
    getTypeClass(type) {
      const classMap = {
        'weekly': 'type-weekly',
        'monthly': 'type-monthly',
        'midterm': 'type-midterm',
        'final': 'type-final',
        'academic': 'type-academic',
        'hand_graded_homework': 'type-hand-graded',
        'online_exercise': 'type-online',
        'differentiated_homework': 'type-differentiated'
      }
      return classMap[type] || 'type-default'
    },
    handlePaperManagement(exam) {
      this.$router.push(`/exam/paper/${exam.id}`)
    },
    handleViewScores(exam) {
      this.$router.push(`/exam/score/${exam.id}`)
    },
    handleEdit(exam) {
      this.editExamForm = {
        id: exam.id,
        organizationId: exam.organization,
        examType: exam.exam_type,
        name: exam.name,
        description: exam.description || ''
      }
      this.editExamDialogVisible = true
    },
    async handleEditExamSubmit() {
      if (!this.editExamForm.name.trim()) {
        this.$message.warning('请输入考试名称')
        return
      }
      try {
        const token = Cookies.get('access')
        await request({
          url: `/sexam/exams/${this.editExamForm.id}/`,
          method: 'patch',
          headers: { Authorization: `Bearer ${token}` },
          data: {
            organization: this.editExamForm.organizationId,
            exam_type: this.editExamForm.examType,
            name: this.editExamForm.name,
            description: this.editExamForm.description
          }
        })
        this.$message.success('修改成功')
        this.editExamDialogVisible = false
        this.fetchExamList()
      } catch (e) {
        console.error(e)
        this.$message.error('修改失败')
      }
    },
    handleDelete(exam) {
      this.$confirm(`确定要删除考试"${exam.name}"吗？`, '确认删除', {
        type: 'warning'
      }).then(async () => {
        try {
          const token = Cookies.get('access')
          await request({
            url: `/sexam/exams/${exam.id}/`,
            method: 'delete',
            headers: { Authorization: `Bearer ${token}` }
          })
          this.examList = this.examList.filter(item => item.id !== exam.id)
          this.applyFilter() // 删除后重新应用筛选
          this.$message.success('删除成功')
        } catch (e) {
          console.error(e)
          this.$message.error('删除失败')
        }
      }).catch(() => {
        this.$message.info('已取消删除')
      })
    },
    handleAddExam() {
      this.addExamForm = { organizationId: null, examType: '', name: '', description: '' }
      this.addExamDialogVisible = true
    },
    async handleAddExamSubmit() {
      if (!this.addExamForm.name.trim()) {
        this.$message.warning('请输入考试名称')
        return
      }
      try {
        const token = Cookies.get('access')
        await request({
         url: '/sexam/exams/',
         method: 'post',
         headers: { Authorization: `Bearer ${token}` },
         data: {
           organization: this.addExamForm.organizationId,
           exam_type: this.addExamForm.examType,
           name: this.addExamForm.name,
           description: this.addExamForm.description
          }
        })
        this.$message.success('新建成功')
        this.addExamDialogVisible = false
        this.fetchExamList()
      } catch (e) {
        console.error(e)
        this.$message.error('新建失败')
      }
    }
  }
}
</script>

<style scoped>
/* 基础样式 */
.app-container {
  padding: 16px;
  box-sizing: border-box;
  max-width: 1200px;
  margin: 0 auto;
}

/* 头部容器样式 */
.header-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
  gap: 12px;
  flex-wrap: wrap;
}

.org-filter {
  flex: 1;
  min-width: 200px;
}

.type-filter {
  width: 200px;
  min-width: 150px;
}

.add-button {
  white-space: nowrap;
}

/* 其他样式保持不变 */
.form-container {
  width: 100%;
}

.form-control {
  width: 100%;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  width: 100%;
  box-sizing: border-box;
  padding-top: 16px;
}

::v-deep .list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

::v-deep .card-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px 20px;
  border: 1px solid #f0f2f5;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

/* 基础样式 */
.app-container {
  padding: 16px;
  box-sizing: border-box;
  max-width: 1200px;
  margin: 0 auto;
}

/* 头部容器样式 */
.header-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
  gap: 12px;
  flex-wrap: wrap;
}

.org-filter {
  flex: 1;
  min-width: 200px;
}

.type-filter {
  width: 200px;
  min-width: 150px;
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

/* 卡片列表样式 */
::v-deep .list {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

::v-deep .card-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
  padding: 16px 20px;
  border: 1px solid #f0f2f5;
  border-radius: 8px;
  overflow: hidden;
  width: 100%;
  box-sizing: border-box;
}

::v-deep .card-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
  width: 100%;
}

::v-deep .card-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 8px;
  flex-wrap: wrap;
}

::v-deep .exam-name {
  font-size: 18px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

::v-deep .exam-type {
  padding: 2px 8px;
  border-radius: 12px;
  font-size: 12px;
  color: #fff;
  white-space: nowrap;
}

/* 考试类型颜色 */
::v-deep .type-weekly {
  background-color: #a0dad7;
}

::v-deep .type-monthly {
  background-color: #67c23a;
}

::v-deep .type-midterm {
  background-color: #8a2be2;
}

::v-deep .type-final {
  background-color: #e6a23c;
}

::v-deep .type-academic {
  background-color: #7b68ee;
}

::v-deep .type-hand-graded {
  background-color: #00bfff;
}

::v-deep .type-online {
  background-color: #409eff;
}

::v-deep .type-differentiated {
  background-color: #f0e68c;
  color: #333;
}

::v-deep .type-default {
  background-color: #909399;
}

::v-deep .description {
  margin: 6px 0;
  color: #606266;
  line-height: 1.5;
  word-break: break-word;
}

::v-deep .meta-info {
  font-size: 13px;
  color: #909399;
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
  margin-top: 8px;
}

::v-deep .meta-item {
  display: flex;
  align-items: center;
  gap: 4px;
}

::v-deep .card-actions {
  display: flex;
  gap: 8px;
  margin-top: 16px;
  flex-wrap: wrap;
}

::v-deep .empty-state {
  text-align: center;
  padding: 50px 0;
}

/* 移动端适配 (屏幕宽度 < 768px) */
@media screen and (max-width: 768px) {
  .app-container {
    padding: 8px;
  }

  .header-container {
    flex-direction: column;
    align-items: stretch;
    gap: 8px;
  }

  .org-filter, .type-filter, .add-button {
    width: 100%;
    min-width: auto;
  }

  .add-button {
    padding: 10px;
    font-size: 14px;
  }

  /* 弹窗样式调整 */
  ::v-deep .el-dialog {
    max-width: 90% !important;
  }

  ::v-deep .el-dialog__header {
    padding: 12px 16px;
  }

  ::v-deep .el-dialog__title {
    font-size: 16px;
  }

  /* 表单元素调整 */
  ::v-deep .el-form-item {
    margin-bottom: 12px;
  }

  ::v-deep .el-form-item__label {
    font-size: 14px;
  }

  ::v-deep .el-input__inner,
  ::v-deep .el-select__inner,
  ::v-deep .el-cascader__input {
    font-size: 14px;
    padding: 8px 12px;
  }

  /* 级联选择器优化 */
  ::v-deep .el-cascader-menu {
    max-height: 250px;
    overflow-y: auto;
  }

  ::v-deep .el-cascader-node {
    padding: 10px 16px;
    height: auto;
  }

  /* 卡片样式调整 */
  ::v-deep .card-row {
    padding: 12px;
  }

  ::v-deep .exam-name {
    font-size: 16px;
  }

  ::v-deep .meta-info {
    flex-direction: column;
    gap: 6px;
    font-size: 12px;
  }

  ::v-deep .card-actions {
    width: 100%;
    justify-content: space-between;
  }

  ::v-deep .card-actions .el-button {
    flex: 1;
    margin: 0 4px;
    padding: 5px 0;
    font-size: 12px;
  }

  /* 空状态调整 */
  ::v-deep .empty-state {
    padding: 30px 0;
  }
}

/* 平板设备适配 (769px - 1024px) */
@media screen and (min-width: 769px) and (max-width: 1024px) {
  .app-container {
    padding: 12px;
  }

  ::v-deep .card-actions {
    flex-wrap: wrap;
  }
}
</style>
