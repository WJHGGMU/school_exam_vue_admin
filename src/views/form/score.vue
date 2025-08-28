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

                <!-- 可点击的绿色带下划线成绩值 -->
                <span
                  v-else
                  class="score-with-image"
                  @click="showImagePreview(scope.row.subjects[subjectCode].imageFiles, scope.row, subjectCode)"
                  style="cursor: pointer"
                >
                  {{ scope.row.subjects[subjectCode].score || '-' }}
                </span>
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

    <!-- 图片预览弹窗-->
    <el-dialog
      ref="previewDialog"
      top="3vh"
      width="52%"
      :visible.sync="previewVisible"
      :fullscreen="isFullscreen"
      :show-close="true"
      @close="closePreview"
      :modal-append-to-body="false"
      :append-to-body="true"
      class="fixed-center-dialog"
    >
      <template slot="title">
        <div style="display: flex;justify-content: space-between">
          <span>图片预览 (共 {{ previewImageList.length }} 张)</span>
          <el-button type="primary" size="small" style="margin-right: 40px;" @click="handleReport">批改报告</el-button>
        </div>
      </template>
      <div class="image-preview-container">
        <!-- 图片容器 -->
        <div
          class="image-wrapper"
        >
          <el-image
            :src="previewImageList[currentImageIndex]"
            :alt="`预览图片 ${currentImageIndex + 1}`"
            fit="contain"
            :preview-src-list="[previewImageList[currentImageIndex]]"
            class="preview-image"
            @load="imageLoaded"
          />
          <div
            v-for="(item, index) in positionList"
            :key="index"
            :class="item.class"
            :style="item.style"
          >
            {{ item.text }}
          </div>
          <!-- 点击提示 -->
          <div v-if="!isFullscreen" class="click-to-fullscreen-hint">
            点击图片进入全屏查看
          </div>
          <!-- 退出全屏提示 -->
          <div v-if="isFullscreen" class="exit-fullscreen-hint">
            点击图片退出全屏 | 按ESC键退出
          </div>
        </div>

        <!-- 图片导航 -->
        <div class="image-nav">
          <span
            class="nav-btn prev-btn"
            @click="prevImage"
            :disabled="currentImageIndex === 0"
          >
            <i class="el-icon-arrow-left"></i> 上一张
          </span>
          <span class="image-counter">
            {{ currentImageIndex + 1 }} / {{ previewImageList.length }}
          </span>
          <span
            class="nav-btn next-btn"
            @click="nextImage"
            :disabled="currentImageIndex === previewImageList.length - 1"
          >
            下一张 <i class="el-icon-arrow-right"></i>
          </span>
        </div>
      </div>
    </el-dialog>
    <el-dialog
      title="批改报告"
      :visible.sync="reportVisible"
      width="50%"
      class="report-dialog"
      @close="closeReport"
    >
      <vue-markdown :source="markdownContent" />
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'
import { BASE_URL } from '@/utils/request'
import Cookies from 'js-cookie'
import { Empty, Table, TableColumn, Select, Option, Message, Dialog, Icon } from 'element-ui'
import VueMarkdown from 'vue-markdown'

// 辅助函数：为图片路径添加BASE_URL前缀
const addBaseUrlToImage = (imagePath) => {
  // 确保BASE_URL是字符串类型
  const baseUrlStr = typeof BASE_URL === 'string' ? BASE_URL : ''

  // 检查路径是否已经是完整URL
  if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
    return imagePath
  }

  // 如果没有有效的BASE_URL或imagePath，直接返回
  if (!baseUrlStr || !imagePath) {
    return imagePath || ''
  }

  // 确保BASE_URL末尾和imagePath开头没有重复的斜杠
  const base = baseUrlStr.endsWith('/') ? baseUrlStr.slice(0, -1) : baseUrlStr
  const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
  return `${base}${path}`
}

export default {
  components: {
    ElEmpty: Empty,
    ElTable: Table,
    ElTableColumn: TableColumn,
    ElSelect: Select,
    ElOption: Option,
    ElDialog: Dialog,
    ElIcon: Icon,
    VueMarkdown
  },
  data() {
    return {
      examId: this.$route.params.id,
      examOrganizationId: null,

      SUBJECT_TYPES: {
        total: '总分', // 确保总分是第一个选项
        chinese: '语文',
        math: '数学',
        english: '英语',
        physics: '物理',
        chemistry: '化学',
        biology: '生物',
        history: '历史',
        geography: '地理',
        politics: '政治',
        science: '科学'
      },
      classOptions: [],
      selectedSubject: 'total', // 默认选择总分
      selectedClass: null,

      // 显示的学科列表（用于动态生成表头）
      displayedSubjects: {},

      scoreData: {},
      filteredScoreList: [],
      loading: true,

      // 图片预览相关
      previewVisible: false,
      previewImageList: [],
      currentImageIndex: 0,
      imageLoading: false,
      isFullscreen: false, // 控制是否全屏显示
      fullscreenElement: null, // 记录全屏元素
      positionList: [],
      clickScore: {},
      markdownContent: '',
      reportVisible: false,
      clickSubjectCode: ''
    }
  },
  created() {
    this.fetchExamDetail().then(() => {
      this.fetchClassOptions()
      this.fetchScoreData()
    })

    // 监听ESC键，退出全屏
    document.addEventListener('keydown', this.handleKeyDown)
  },
  beforeDestroy() {
    // 移除事件监听
    document.removeEventListener('keydown', this.handleKeyDown)
    // 确保退出全屏
    this.exitFullscreen()
  },
  methods: {
    // 显示图片预览
    showImagePreview(images, row, subjectCode) {
      console.log('准备预览图片:', images, row, subjectCode)
      this.clickScore = row
      this.clickSubjectCode = subjectCode

      if (!images || images.length === 0) {
        this.$message.warning('没有图片可预览')
        return
      }

      // 验证图片URL是否有效
      const validImages = images.filter(img => img && img.trim() !== '')
      if (validImages.length === 0) {
        this.$message.error('图片URL无效')
        return
      }

      // 设置预览图片列表并显示预览弹窗
      this.previewImageList = validImages
      this.currentImageIndex = 0
      this.isFullscreen = false // 默认不全屏
      this.previewVisible = true

      // 确保弹窗居中显示
      this.$nextTick(() => {
        this.centerDialog()
        this.positionList = row.subjects[subjectCode].positioning1.map(item => {
          return {
            text: item.rating_msg,
            style: {
              position: 'absolute',
              top: item.y * 0.8 + 'px',
              left: item.x * 0.8 + 'px',
              color: 'red',
              width: item.width * 0.8 + 'px',
              height: item.height * 0.8 + 'px'
            }
          }
        })
        this.positionList.push({
          text: '总分：' + row.subjects[subjectCode].score,
          style: {
            position: 'absolute',
            top: 0 + 'px',
            left: 0 + 'px',
            color: 'red',
            fontSize: '16px',
            fontWeight: 'bold'
          }
        })
      })
    },

    // 使弹窗居中显示
    centerDialog() {
      const dialog = this.$el.querySelector('.fixed-center-dialog .el-dialog')
      if (dialog) {
        // 移除可能影响定位的样式
        dialog.style.top = '50%'
        dialog.style.left = '50%'
        dialog.style.transform = 'translate(-50%, -50%)'
        dialog.style.margin = '0'
      }
    },

    // 关闭图片预览
    closePreview() {
      this.previewVisible = false
      this.previewImageList = []
      this.positionList = []
    },

    // 切换全屏状态
    toggleFullscreen() {
      // 获取弹窗元素
      const dialog = this.$refs.previewDialog?.$el.querySelector('.el-dialog')

      if (!dialog) {
        console.error('无法获取弹窗元素')
        this.$message.warning('全屏功能暂时不可用')
        return
      }

      if (!this.isFullscreen) {
        this.enterFullscreen(dialog)
      } else {
        this.exitFullscreen()
      }
    },

    // 进入全屏 - 接收弹窗元素作为参数
    enterFullscreen(dialog) {
      if (dialog.requestFullscreen) {
        dialog.requestFullscreen().then(() => {
          this.isFullscreen = true
          this.fullscreenElement = dialog
        }).catch(err => {
          console.error(`进入全屏失败: ${err.message}`)
          this.$message.error('无法进入全屏模式')
        })
      } else {
        // 兼容旧浏览器
        this.$message.warning('您的浏览器不支持全屏功能')
      }
    },

    // 键盘事件处理
    handleKeyDown(e) {
      // ESC键退出全屏
      if (e.key === 'Escape' && this.isFullscreen) {
        this.exitFullscreen()
      }
      // 左右箭头切换图片
      if (this.previewVisible) {
        if (e.key === 'ArrowLeft') {
          this.prevImage()
        } else if (e.key === 'ArrowRight') {
          this.nextImage()
        }
      }
    },

    // 上一张图片
    prevImage() {
      if (this.currentImageIndex > 0) {
        this.currentImageIndex--
        this.positionList = this.clickScore.subjects[this.clickSubjectCode].positioning1.map(item => {
          return {
            text: item.rating_msg,
            style: {
              position: 'absolute',
              top: item.y * 0.8 + 'px',
              left: item.x * 0.8 + 'px',
              color: 'red',
              width: item.width * 0.8 + 'px',
              height: item.height * 0.8 + 'px'
            }
          }
        })
        this.positionList.push({
          text: '总分：' + this.clickScore.subjects[this.clickSubjectCode].score,
          style: {
            position: 'absolute',
            top: 0 + 'px',
            left: 0 + 'px',
            color: 'red',
            fontSize: '16px',
            fontWeight: 'bold'
          }
        })
      }
    },

    // 下一张图片
    nextImage() {
      if (this.currentImageIndex < this.previewImageList.length - 1) {
        this.currentImageIndex++
        this.positionList = this.clickScore.subjects[this.clickSubjectCode].positioning2.map(item => {
          return {
            text: item.rating_msg,
            style: {
              position: 'absolute',
              top: item.y * 0.8 + 'px',
              left: item.x * 0.8 + 'px',
              color: 'red',
              width: item.width * 0.8 + 'px',
              height: item.height * 0.8 + 'px'
            }
          }
        })
        this.positionList.push({
          text: '总分：' + this.clickScore.subjects[this.clickSubjectCode].score,
          style: {
            position: 'absolute',
            top: 0 + 'px',
            left: 0 + 'px',
            color: 'red',
            fontSize: '16px',
            fontWeight: 'bold'
          }
        })
      }
    },

    // 图片加载完成
    imageLoaded() {
      this.imageLoading = false
    },

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
        Message.error('获取考试信息失败')
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
        Message.error('加载班级数据失败')
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
      };

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
        Message.error('加载成绩数据失败')
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
          // 排除组织信息，只处理学科数据
          Object.keys(studentSubjects).forEach(subj => {
            if (!['organization_id', 'organization_name'].includes(subj)) {
              subjectsSet.add(subj)
            }
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
        const studentInfo = this.scoreData[studentName]
        const studentData = {
          studentName,
          className: studentInfo.organization_name || '',
          subjects: {}
        }

        // 检查是否符合班级筛选条件
        const isMatchClass = !classId || studentInfo.organization_id === classId

        if (!isMatchClass) {
          return // 不符合班级筛选条件，跳过该学生
        }

        // 处理每个学科的数据
        Object.keys(this.displayedSubjects).forEach(subj => {
          const subjectData = studentInfo[subj] || {}

          // 收集图片文件并添加BASE_URL前缀
          const imageFiles = []
          if (subjectData.answers_parse_image_file1) {
            imageFiles.push(addBaseUrlToImage(subjectData.answers_parse_image_file1))
          }
          if (subjectData.answers_parse_image_file2) {
            imageFiles.push(addBaseUrlToImage(subjectData.answers_parse_image_file2))
          }

          studentData.subjects[subj] = {
            id: subjectData.id,
            score: subjectData.score || '',
            classRank: subjectData.class_rank,
            schoolRank: subjectData.school_rank,
            imageFiles,
            hasImage: imageFiles.length > 0,
            positioning1: subjectData.positioning1,
            positioning2: subjectData.positioning2
          }
        })

        // 只有当学生有符合条件的学科数据时才添加
        if (Object.keys(studentData.subjects).length > 0) {
          result.push(studentData)
        }
      })

      this.filteredScoreList = result
    },
    async handleReport() {
      console.log(this.clickScore)
      const token = Cookies.get('access')
      const params = {
        grade_id: this.clickScore.subjects[this.clickSubjectCode].id
      }
      await request({
        url: '/sexam/student_answers_details/',
        method: 'post',
        headers: { Authorization: `Bearer ${token}` },
        data: params
      }).then(res => {
        this.markdownContent = res.details || '暂无报告内容'
        console.log(this.markdownContent, 'zz')
        this.reportVisible = true
      }).catch(err => {
        this.$message.error(err || '获取报告失败')
      })
    },
    closeReport() {
      this.reportVisible = false
      this.markdownContent = ''
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
    },
    // 监听弹窗显示状态变化，确保居中
    previewVisible(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.centerDialog()
        })
      }
    }
  }
}
</script>

<style lang="scss" scoped>
/* 基础样式保持不变 */
.app-container {
  padding: 16px;
  box-sizing: border-box;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #fff;
  min-height: 100vh;
  position: relative; /* 确保弹窗定位相对于此容器 */
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

/* 外层容器不翻转，仅控制溢出 */
.table-container {
  width: 100%;
  overflow: hidden; /* 隐藏溢出，避免外层滚动条 */
  margin-bottom: 20px;
}

/* 针对 Element UI 表格的滚动容器进行翻转 */
::v-deep .el-table__body-wrapper {
  overflow-x: auto;
  transform: rotateX(180deg);
  -ms-transform: rotateX(180deg);
  -webkit-transform: rotateX(180deg);
}

/* 表格内容（tbody）再翻转回来 */
::v-deep .el-table__body {
  transform: rotateX(180deg);
  -ms-transform: rotateX(180deg);
  -webkit-transform: rotateX(180deg);
  min-width: 800px; /* 确保内容宽度触发滚动 */
}

::v-deep .el-table__fixed-body-wrapper {
  transform: rotateX(180deg);
  -ms-transform: rotateX(180deg);
  -webkit-transform: rotateX(180deg);
}

.score-table {
  width: 100%;
  min-width: 800px;
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
  transition: color 0.2s;
}

.score-with-image:hover {
  color: #52c41a;
}

/* 图片预览弹窗样式 - 固定在中央且不可滚动 */
.fixed-center-dialog {
  overflow: hidden !important; /* 禁止弹窗滚动 */
}

::v-deep .fixed-center-dialog .el-dialog {
  position: fixed !important;
  top: 40% !important;
  left: 50% !important;
  transform: translate(-50%, -50%) !important;
  margin: 0 !important;
  max-width: 100% !important;
  max-height: 100% !important;
  display: flex;
  flex-direction: column;
}

::v-deep .fixed-center-dialog .el-dialog__body {
  padding: 0;
  overflow: hidden !important; /* 禁止内容滚动 */
  flex: 1;
  display: flex;
  flex-direction: column;
}

.image-preview-container {
  width: 100%;
  height: 80vh; /* 固定高度，不随内容变化 */
  min-height: 400px;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
}

.image-wrapper {
  width: 950px;
  height: 674px;
  display: flex;
  align-items: center;
  justify-content: center;
  background-color: #f5f5f5;
  cursor: zoom-in; /* 默认显示放大光标 */
  position: relative;
  overflow: hidden; /* 隐藏超出容器的内容 */
}

/* 全屏状态下改变光标样式 */
.image-wrapper:hover {
  cursor: zoom-out;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: all 0.3s ease;
}

/* 点击提示文字 */
.click-to-fullscreen-hint,
.exit-fullscreen-hint {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  background-color: rgba(0, 0, 0, 0.6);
  color: white;
  padding: 6px 12px;
  border-radius: 4px;
  font-size: 14px;
  opacity: 0.8;
  transition: opacity 0.3s;
}

.click-to-fullscreen-hint:hover,
.exit-fullscreen-hint:hover {
  opacity: 1;
}

.image-nav {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12px 20px;
  background-color: #fff;
  border-top: 1px solid #eee;
}

.nav-btn {
  padding: 6px 12px;
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.nav-btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.prev-btn {
  color: #409eff;
}

.prev-btn:hover:not(:disabled) {
  background-color: #ecf5ff;
}

.next-btn {
  color: #409eff;
}

.next-btn:hover:not(:disabled) {
  background-color: #ecf5ff;
}

.image-counter {
  color: #606266;
}

/* 全屏状态下的样式调整 */
::v-deep .el-dialog--fullscreen {
  padding: 0 !important;
}

::v-deep .el-dialog--fullscreen .el-dialog__header {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  background-color: rgba(0, 0, 0, 0.5);
  color: white;
  z-index: 10;
  padding: 10px 20px;
}

::v-deep .el-dialog--fullscreen .el-dialog__close {
  color: white;
}

::v-deep .el-dialog--fullscreen .el-dialog__body {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

::v-deep .el-dialog--fullscreen .image-preview-container {
  height: 100vh;
}

::v-deep .el-dialog--fullscreen .image-wrapper {
  background-color: #000;
  flex: 1;
}

::v-deep .el-dialog--fullscreen .image-nav {
  background-color: rgba(0, 0, 0, 0.7);
  border-top: none;
}

::v-deep .el-dialog--fullscreen .nav-btn,
::v-deep .el-dialog--fullscreen .image-counter {
  color: white;
}

/* 禁止页面在弹窗显示时滚动 */
::v-deep body.el-dialog-open {
  overflow: hidden;
}

@media screen and (max-width: 768px) {
  .app-container {
    padding: 10px;
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

  .image-preview-container {
    height: 50vh;
    min-height: 300px;
  }
}
::v-deep .report-dialog {
  .el-dialog__body {
    max-height: 100vh - 30vh;
    overflow-y: auto;
  }
}
</style>
