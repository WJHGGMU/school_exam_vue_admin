<template>
  <div class="app-container">
    <!-- 筛选区域 -->
    <div class="filter-container">
      <el-select
        v-model="selectedSubject"
        placeholder="请选择学科"
        class="subject-filter"
        @change="applyFilter"
        :clearable="false"
      >
        <el-option
          v-for="(label, value) in SUBJECT_TYPES"
          :key="value"
          :label="label"
          :value="value"
        ></el-option>
      </el-select>
      <el-select
        v-model="selectedClass"
        :options="classOptions"
        clearable
        placeholder="请选择班级"
        class="class-filter"
        @change="applyFilter"
      >
        <el-option
          v-for="classNode in classOptions"
          :key="classNode.id"
          :label="classNode.label"
          :value="classNode.id"
        ></el-option>
      </el-select>
    </div>

    <!-- 成绩表格 - 支持横向滚动 -->
    <div class="table-container">
      <el-table
        :data="filteredScoreList"
        border
        stripe
        class="score-table"
        v-loading="loading"
        element-loading-text="正在加载成绩数据..."
      >
        <!-- 基础列 - 序号、班级、姓名 -->
        <el-table-column
          type="index"
          label="序号"
          width="60"
          align="center"
          fixed
        ></el-table-column>
        <el-table-column
          prop="className"
          label="班级"
          align="center"
          min-width="120"
          fixed
        ></el-table-column>
        <el-table-column
          prop="studentName"
          label="姓名"
          align="center"
          min-width="100"
          fixed
        ></el-table-column>

        <!-- 动态生成的学科列 - 两层表头 -->
        <template v-for="(subject, subjectCode) in displayedSubjects">
          <el-table-column
            :key="subjectCode"
            :label="subject"
            align="center"
            :min-width="300"
          >
            <!-- 第二层表头：成绩、班排名、校排名 -->
            <el-table-column
              align="center"
              min-width="100"
            >
              <template slot="header">成绩</template>
              <template slot-scope="scope">
                <span
                  v-if="!scope.row.subjects[subjectCode].hasImage"
                  :class="{ 'no-score': !scope.row.subjects[subjectCode].score }"
                >
                  {{ scope.row.subjects[subjectCode].score || '-' }}
                </span>
                <a
                  v-else
                  class="score-with-image"
                  @click="handleViewImage(scope.row.subjects[subjectCode].imageFiles)"
                >
                  {{ scope.row.subjects[subjectCode].score || '-' }}
                </a>
              </template>
            </el-table-column>
            <el-table-column
              align="center"
              min-width="100"
            >
              <template slot="header">班排名</template>
              <template slot-scope="scope">
                {{ scope.row.subjects[subjectCode].classRank || '-' }}
              </template>
            </el-table-column>
            <el-table-column
              align="center"
              min-width="100"
            >
              <template slot="header">校排名</template>
              <template slot-scope="scope">
                {{ scope.row.subjects[subjectCode].schoolRank || '-' }}
              </template>
            </el-table-column>
          </el-table-column>
        </template>
      </el-table>
    </div>

    <!-- 空数据状态 -->
    <div v-if="!loading && filteredScoreList.length === 0" class="empty-state">
      <el-empty description="暂无成绩数据"></el-empty>
    </div>

    <!-- 图片查看弹窗 -->
    <el-dialog
      title="查看答题图片"
      :visible.sync="imageDialogVisible"
      width="90%"
      height="90%"
      :fullscreen="true"
      :show-close="false"
      custom-class="image-dialog"
    >
      <div class="image-viewer">
        <el-image
          v-for="(img, index) in currentImages"
          :key="index"
          :src="img"
          fit="contain"
          class="exam-image"
          @click="imageDialogVisible = false"
        >
          <div slot="error" class="image-error">
            <i class="el-icon-picture-outline"></i>
          </div>
        </el-image>
      </div>
      <span slot="footer" class="dialog-footer">
        <el-button @click="imageDialogVisible = false">关闭</el-button>
      </span>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'
import Cookies from 'js-cookie'

export default {
  data() {
    return {
      examId: this.$route.params.id,
      examOrganizationId: null,

      SUBJECT_TYPES: {
        total: "总分",  // 确保总分是第一个选项
        chinese: "语文",
        math: "数学",
        english: "英语",
        physics: "物理",
        chemistry: "化学",
        biology: "生物",
        history: "历史",
        geography: "地理",
        politics: "政治",
        science: "科学"
      },
      classOptions: [],
      selectedSubject: 'total',  // 默认选择总分
      selectedClass: null,

      // 显示的学科列表（用于动态生成表头）
      displayedSubjects: {},

      scoreData: {},
      filteredScoreList: [],
      loading: true,
      imageDialogVisible: false,
      currentImages: []
    }
  },
  created() {
    this.fetchExamDetail().then(() => {
      this.fetchClassOptions()
      this.fetchScoreData()
    })
  },
  methods: {
    async fetchExamDetail() {
      try {
        const token = Cookies.get('access')
        const res = await request({
          url: `/sexam/exams/${this.examId}/`,
          method: 'get',
          headers: { Authorization: `Bearer ${token}` }
        })
        this.examOrganizationId = res.organization
      } catch (e) {
        console.error('获取考试详情失败：', e)
        this.$message.error('获取考试信息失败')
      }
    },

    async fetchClassOptions() {
      if (this.examOrganizationId === null) return

      try {
        const token = Cookies.get('access')
        const res = await request({
          url: '/school/school_orgs/options/',
          method: 'get',
          headers: { Authorization: `Bearer ${token}` }
        })
        this.classOptions = this.extractOnlyClassNodes(res, this.examOrganizationId)
      } catch (e) {
        console.error('获取班级数据失败：', e)
        this.$message.error('加载班级数据失败')
      }
    },

    extractOnlyClassNodes(data, targetOrgId) {
      const classNodes = []
      const processedData = JSON.parse(JSON.stringify(data))

      const findTargetSubtree = (nodes, targetId) => {
        for (const node of nodes) {
          if (node.id === targetId) {
            return node
          }

          if (node.children && node.children.length > 0) {
            const found = findTargetSubtree(node.children, targetId)
            if (found) {
              return found
            }
          }
        }
        return null
      }

      const targetSubtree = findTargetSubtree(processedData, targetOrgId)
      if (!targetSubtree) return []

      const collectClassNodes = (node) => {
        if (node.org_type === 'class') {
          classNodes.push({
            id: node.id,
            label: node.label
          })
          return
        }

        if (node.children && node.children.length > 0) {
          node.children.forEach(child => collectClassNodes(child))
        }
      }

      collectClassNodes(targetSubtree)
      return classNodes
    },

    async fetchScoreData() {
      this.loading = true
      try {
        const token = Cookies.get('access')
        const params = {
          exam_id: this.examId
        }
        // 总分情况下不传递学科参数，获取所有学科数据
        if (this.selectedClass) params.organization_id = this.selectedClass
        // 只有当选择具体学科时才传递学科参数
        if (this.selectedSubject && this.selectedSubject !== 'total') {
          params.subject_code = this.selectedSubject
        }

        const res = await request({
          url: '/sexam/exam-all-grades/',
          method: 'get',
          headers: { Authorization: `Bearer ${token}` },
          params
        })

        this.scoreData = res.students_grades_dict || {}
        this.applyFilter()
      } catch (e) {
        console.error('获取成绩数据失败：', e)
        this.$message.error('加载成绩数据失败')
        this.scoreData = {}
        this.filteredScoreList = []
      } finally {
        this.loading = false
      }
    },

    applyFilter() {
      if (Object.keys(this.scoreData).length === 0) {
        this.filteredScoreList = []
        this.displayedSubjects = {}
        return
      }

      const subject = this.selectedSubject
      const classId = this.selectedClass
      const result = []
      const subjectsSet = new Set()

      // 收集所有需要显示的学科
      if (subject && subject !== 'total') {
        // 选择了具体学科，只显示该学科
        subjectsSet.add(subject)
      } else {
        // 总分情况下，显示所有学科
        Object.keys(this.scoreData).forEach(studentName => {
          const studentSubjects = this.scoreData[studentName]
          Object.keys(studentSubjects).forEach(subj => {
            subjectsSet.add(subj)
          })
        })
      }

      // 转换为有序的学科对象，确保总分在最前面
      this.displayedSubjects = {}
      // 先添加总分（如果存在）
      if (subjectsSet.has('total')) {
        this.displayedSubjects.total = this.SUBJECT_TYPES.total
        subjectsSet.delete('total')
      }
      // 再添加其他学科
      Array.from(subjectsSet).forEach(subj => {
        this.displayedSubjects[subj] = this.SUBJECT_TYPES[subj] || subj
      })

      // 处理学生数据
      Object.keys(this.scoreData).forEach(studentName => {
        const studentSubjects = this.scoreData[studentName]
        const studentData = {
          studentName,
          className: '',
          subjects: {}
        }

        // 处理每个学科的数据
        Object.keys(this.displayedSubjects).forEach(subj => {
          const subjectData = studentSubjects[subj] || {}

          // 只设置一次班级名称（取第一个有值的学科）
          if (!studentData.className && subjectData.organization_name) {
            studentData.className = subjectData.organization_name
          }

          // 检查是否符合班级筛选条件
          const isMatchClass = !classId || subjectData.organization_id === classId

          if (isMatchClass) {
            const imageFiles = []
            if (subjectData.answers_parse_image_file1) {
              imageFiles.push(subjectData.answers_parse_image_file1)
            }
            if (subjectData.answers_parse_image_file2) {
              imageFiles.push(subjectData.answers_parse_image_file2)
            }

            studentData.subjects[subj] = {
              score: subjectData.score || '',
              classRank: subjectData.class_rank,
              schoolRank: subjectData.school_rank,
              imageFiles,
              hasImage: imageFiles.length > 0
            }
          }
        })

        // 只有当学生有符合条件的学科数据时才添加
        if (Object.keys(studentData.subjects).length > 0) {
          result.push(studentData)
        }
      })

      this.filteredScoreList = result
    },

    handleViewImage(images) {
      this.currentImages = images
      this.imageDialogVisible = true
    }
  },
  watch: {
    '$route.params.id'(newVal) {
      if (newVal && newVal !== this.examId) {
        this.examId = newVal
        this.examOrganizationId = null
        this.fetchExamDetail().then(() => {
          this.fetchClassOptions()
          this.fetchScoreData()
        })
      }
    }
  }
}
</script>

<style scoped>
/* 样式保持不变 */
.app-container {
  padding: 16px;
  box-sizing: border-box;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #fff;
  min-height: 100vh;
}

.page-title {
  font-size: 20px;
  font-weight: 600;
  color: #303133;
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #f0f2f5;
}

.filter-container {
  display: flex;
  align-items: center;
  margin-bottom: 16px;
  width: 100%;
  gap: 12px;
  flex-wrap: wrap;
}

.subject-filter {
  width: 200px;
  min-width: 150px;
}

.class-filter {
  flex: 1;
  min-width: 200px;
}

/* 表格容器 - 实现横向滚动 */
.table-container {
  width: 100%;
  overflow-x: auto;
  margin-bottom: 20px;
}

.score-table {
  width: 100%;
  min-width: 800px; /* 确保在小屏幕上也能滚动 */
}

::v-deep .el-table th {
  background-color: #f5f7fa;
  font-weight: 600;
}

.empty-state {
  text-align: center;
  padding: 50px 0;
}

.no-score {
  color: #909399;
}

.score-with-image {
  color: #67c23a;
  text-decoration: underline;
  cursor: pointer;
}

::v-deep .image-dialog {
  display: flex;
  flex-direction: column;
  padding: 0;
}

::v-deep .image-dialog .el-dialog__body {
  padding: 0;
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}

.image-viewer {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #000;
  padding: 20px;
  box-sizing: border-box;
}

.exam-image {
  max-width: 100%;
  max-height: 85vh;
  cursor: zoom-out;
}

.image-error {
  width: 100px;
  height: 100px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  color: #909399;
}

::v-deep .dialog-footer {
  display: flex;
  justify-content: center;
  padding: 15px;
  background-color: #fff;
}

@media screen and (max-width: 768px) {
  .app-container {
    padding: 10px;
  }

  .page-title {
    font-size: 18px;
    margin-bottom: 15px;
  }

  .filter-container {
    flex-direction: column;
    align-items: stretch;
    gap: 10px;
  }

  .subject-filter, .class-filter {
    width: 100%;
    min-width: auto;
  }

  ::v-deep .el-table {
    font-size: 13px;
  }

  ::v-deep .el-table th,
  ::v-deep .el-table td {
    padding: 8px 5px;
  }

  .empty-state {
    padding: 30px 0;
  }

  .exam-image {
    max-height: 70vh;
  }
}

@media screen and (min-width: 769px) and (max-width: 1024px) {
  .app-container {
    padding: 12px;
  }
}
</style>
