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

    <!-- 成绩表格容器 - 修改滚动结构，确保横向滚动条始终可见 -->
    <div class="table-container-outer">
      <!-- 外层容器负责横向滚动，始终显示滚动条 -->
      <div class="table-wrapper">
        <!-- 内层容器负责纵向滚动 -->
        <div class="table-container-inner">
          <el-table
            :data="filteredScoreList"
            border
            stripe
            class="score-table"
            v-loading="loading"
            element-loading-text="正在加载成绩数据..."
          >
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

            <template v-for="(subject, subjectCode) in displayedSubjects">
              <el-table-column
                :key="subjectCode"
                :label="subject"
                align="center"
                :min-width="300"
              >
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
                    <span
                      v-else
                      class="score-with-image"
                      @click="showImagePreview(scope.row.subjects[subjectCode].imageFiles, scope.row)"
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
      </div>
    </div>

    <div v-if="!loading && filteredScoreList.length === 0" class="empty-state">
      <el-empty description="暂无成绩数据"></el-empty>
    </div>

    <!-- 图片预览弹窗 -->
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
        <div class="image-wrapper" @click="toggleFullscreen">
          <img
            :src="addBaseUrlToImage(previewImageList[currentImageIndex])"
            alt="成绩图片预览"
            class="preview-image"
            :class="{ 'image-loading': imageLoading }"
            @load="imageLoaded"
            @error="imageLoading = false"
          >
          <div v-for="(item, index) in positionList" :key="index" :style="item.style">
            {{ item.text }}
          </div>
          <div v-if="!isFullscreen" class="click-to-fullscreen-hint">
            点击图片进入全屏模式
          </div>
          <div v-if="isFullscreen" class="exit-fullscreen-hint">
            点击图片退出全屏模式
          </div>
        </div>
        <div class="image-nav">
          <div class="nav-btn prev-btn" @click="prevImage" :disabled="currentImageIndex <= 0">
            <i class="el-icon-arrow-left"></i> 上一张
          </div>
          <div class="image-counter">
            {{ currentImageIndex + 1 }} / {{ previewImageList.length }}
          </div>
          <div class="nav-btn next-btn" @click="nextImage" :disabled="currentImageIndex >= previewImageList.length - 1">
            下一张 <i class="el-icon-arrow-right"></i>
          </div>
        </div>
      </div>
    </el-dialog>

    <!-- 批改报告弹窗 -->
    <el-dialog
      title="批改报告"
      :visible.sync="reportVisible"
      width="50%"
      class="report-dialog"
      @close="reportVisible = false"
    >
      <vue-markdown>{{ markdownContent }}</vue-markdown>
    </el-dialog>
  </div>
</template>

<script>
import request from '@/utils/request'
import { BASE_URL } from '@/utils/request'
import Cookies from 'js-cookie'
import { Empty, Table, TableColumn, Select, Option, Message, Dialog, Icon } from 'element-ui'
import VueMarkdown from 'vue-markdown'

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
        total: '总分',
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
      selectedSubject: 'total',
      selectedClass: null,
      displayedSubjects: {},
      scoreData: {},
      filteredScoreList: [],
      loading: true,
      previewVisible: false,
      previewImageList: [],
      currentImageIndex: 0,
      imageLoading: false,
      isFullscreen: false,
      fullscreenElement: null,
      positionList: [],
      clickScore: {},
      markdownContent: '',
      reportVisible: false,
      scrollTop: 0
    }
  },
  created() {
    this.fetchExamDetail().then(() => {
      this.fetchClassOptions()
      this.fetchScoreData()
    })
    document.addEventListener('keydown', this.handleKeyDown)

    // 同步固定列和内容列的滚动
    this.$nextTick(() => {
      const table = this.$el.querySelector('.score-table')
      const bodyWrapper = table?.querySelector('.el-table__body-wrapper')
      const fixedBody = table?.querySelector('.el-table__fixed-body-wrapper')

      if (!bodyWrapper || !fixedBody) return

      const syncScroll = () => {
        fixedBody.style.paddingTop = bodyWrapper.scrollTop + 'px'
      }

      bodyWrapper.addEventListener('scroll', syncScroll)

      this.$once('hook:beforeDestroy', () => {
        bodyWrapper.removeEventListener('scroll', syncScroll)
      })
    })
  },
  beforeDestroy() {
    document.removeEventListener('keydown', this.handleKeyDown)
    this.enablePageScroll()
  },
  mounted() {
    this.disablePageScroll();

    // 监听表格渲染完成，确保滚动同步
    const observer = new MutationObserver(() => {
      const table = this.$el.querySelector('.score-table')
      const bodyWrapper = table?.querySelector('.el-table__body-wrapper')
      const fixedBody = table?.querySelector('.el-table__fixed-body-wrapper')

      if (bodyWrapper && fixedBody) {
        const syncScroll = () => {
          fixedBody.style.paddingTop = bodyWrapper.scrollTop + 'px'
        }

        bodyWrapper.addEventListener('scroll', syncScroll)
        observer.disconnect()

        this.$once('hook:beforeDestroy', () => {
          bodyWrapper.removeEventListener('scroll', syncScroll)
        })
      }
    })

    observer.observe(this.$el, { childList: true, subtree: true })
  },
  methods: {
    addBaseUrlToImage(imagePath) {
      const baseUrlStr = typeof BASE_URL === 'string' ? BASE_URL : ''
      if (imagePath && (imagePath.startsWith('http://') || imagePath.startsWith('https://'))) {
        return imagePath
      }
      if (!baseUrlStr || !imagePath) {
        return imagePath || ''
      }
      const base = baseUrlStr.endsWith('/') ? baseUrlStr.slice(0, -1) : baseUrlStr
      const path = imagePath.startsWith('/') ? imagePath : `/${imagePath}`
      return `${base}${path}`
    },
    disablePageScroll() {
      this.scrollTop = window.pageYOffset || document.documentElement.scrollTop || document.body.scrollTop || 0
      document.body.style.position = 'fixed'
      document.body.style.top = `-${this.scrollTop}px`
      document.body.style.left = '0'
      document.body.style.right = '0'
      document.body.style.overflow = 'hidden'
    },
    enablePageScroll() {
      document.body.style.position = ''
      document.body.style.top = ''
      document.body.style.left = ''
      document.body.style.right = ''
      document.body.style.overflow = ''
      window.scrollTo(0, this.scrollTop)
    },
    showImagePreview(images, row) {
      console.log('准备预览图片:', images, row)
      this.clickScore = row

      if (!images || images.length === 0) {
        this.$message.warning('没有图片可预览')
        return
      }

      const validImages = images.filter(img => img && img.trim() !== '')
      if (validImages.length === 0) {
        this.$message.error('图片URL无效')
        return
      }

      this.disablePageScroll()
      this.previewImageList = validImages
      this.currentImageIndex = 0
      this.isFullscreen = false
      this.previewVisible = true

      this.$nextTick(() => {
        this.centerDialog()
        this.positionList = row.subjects.math.positioning1.map(item => {
          return {
            text: item.rating_msg,
            style: {
              position: 'absolute',
              top: item.y * 0.8 + 'px',
              left: item.x * 0.8 + 'px',
              color: 'red'
            }
          }
        })
        this.positionList.push({
          text: '总分：' + row.subjects.math.score,
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
    centerDialog() {
      const dialog = this.$el.querySelector('.fixed-center-dialog .el-dialog')
      if (dialog) {
        dialog.style.top = '50%'
        dialog.style.left = '50%'
        dialog.style.transform = 'translate(-50%, -50%)'
        dialog.style.margin = '0'
      }
    },
    closePreview() {
      this.previewVisible = false
      this.previewImageList = []
      this.currentImageIndex = 0
      this.enablePageScroll()
    },
    toggleFullscreen() {
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
        this.$message.warning('您的浏览器不支持全屏功能')
      }
    },
    exitFullscreen() {
      if (document.exitFullscreen) {
        document.exitFullscreen().then(() => {
          this.isFullscreen = false
          this.fullscreenElement = null
        }).catch(err => {
          console.error(`退出全屏失败: ${err.message}`)
        })
      }
    },
    handleKeyDown(e) {
      if (this.previewVisible) {
        if (e.key === 'ArrowLeft') {
          this.prevImage()
        } else if (e.key === 'ArrowRight') {
          this.nextImage()
        }
      }

      if (e.key === 'Escape') {
        if (this.isFullscreen) {
          this.exitFullscreen()
        }
        if (this.previewVisible) {
          this.closePreview()
        }
        if (this.reportVisible) {
          this.reportVisible = false
        }
      }
    },
    prevImage() {
      if (this.currentImageIndex > 0) {
        this.currentImageIndex--
        this.positionList = this.clickScore.subjects.math.positioning1.map(item => {
          return {
            text: item.rating_msg,
            style: {
              position: 'absolute',
              top: item.y * 0.8 + 'px',
              left: item.x * 0.8 + 'px',
              color: 'red'
            }
          }
        })
        this.positionList.push({
          text: '总分：' + this.clickScore.subjects.math.score,
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
    nextImage() {
      if (this.currentImageIndex < this.previewImageList.length - 1) {
        this.currentImageIndex++
        this.positionList = this.clickScore.subjects.math.positioning2.map(item => {
          return {
            text: item.rating_msg,
            style: {
              position: 'absolute',
              top: item.y * 0.8 + 'px',
              left: item.x * 0.8 + 'px',
              color: 'red'
            }
          }
        })
        this.positionList.push({
          text: '总分：' + this.clickScore.subjects.math.score,
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
        if (this.selectedClass) params.organization_id = this.selectedClass
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

      if (subject && subject !== 'total') {
        subjectsSet.add(subject)
      } else {
        Object.keys(this.scoreData).forEach(studentName => {
          const studentSubjects = this.scoreData[studentName]
          Object.keys(studentSubjects).forEach(subj => {
            if (!['organization_id', 'organization_name'].includes(subj)) {
              subjectsSet.add(subj)
            }
          })
        })
      }

      this.displayedSubjects = {}
      if (subjectsSet.has('total')) {
        this.displayedSubjects.total = this.SUBJECT_TYPES.total
        subjectsSet.delete('total')
      }
      Array.from(subjectsSet).forEach(subj => {
        this.displayedSubjects[subj] = this.SUBJECT_TYPES[subj] || subj
      })

      Object.keys(this.scoreData).forEach(studentName => {
        const studentInfo = this.scoreData[studentName]
        const studentData = {
          studentName,
          className: studentInfo.organization_name || '',
          subjects: {}
        }

        const isMatchClass = !classId || studentInfo.organization_id === classId

        if (!isMatchClass) {
          return
        }

        Object.keys(this.displayedSubjects).forEach(subj => {
          const subjectData = studentInfo[subj] || {}

          const imageFiles = []
          if (subjectData.answers_parse_image_file1) {
            imageFiles.push(subjectData.answers_parse_image_file1)
          }
          if (subjectData.answers_parse_image_file2) {
            imageFiles.push(subjectData.answers_parse_image_file2)
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
        grade_id: this.clickScore.subjects.math.id
      }
      await request({
        url: '/sexam/student_answers_details/',
        method: 'post',
        headers: { Authorization: `Bearer ${token}` },
        data: params
      }).then(res => {
        this.markdownContent = res.details || '暂无报告内容'
        this.reportVisible = true
        this.disablePageScroll()
      }).catch(err => {
        this.$message.error(err || '获取报告失败')
      })
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
    previewVisible(newVal) {
      if (newVal) {
        this.$nextTick(() => {
          this.centerDialog()
        })
      } else {
        this.enablePageScroll()
      }
    },
    reportVisible(newVal) {
      if (!newVal) {
        if (!this.previewVisible) {
          this.enablePageScroll()
        }
      }
    }
  }
}
</script>

<style lang="scss" scoped>
.app-container {
  padding: 16px;
  box-sizing: border-box;
  max-width: 1200px;
  margin: 0 auto;
  background-color: #fff;
  min-height: 100vh;
  position: relative;
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

/* 表格容器结构调整 - 关键修改 */
.table-container-outer {
  width: 100%;
  margin-bottom: 20px;
  /* 确保容器不会被内容撑开 */
  overflow: hidden;
}

.table-wrapper {
  /* 外层容器负责横向滚动，始终显示滚动条 */
  width: 100%;
  overflow-x: auto;
  overflow-x: scroll !important;
  /* 强制显示横向滚动条 */
  scrollbar-width: auto;

  /* WebKit 浏览器强制显示滚动条 */
  &::-webkit-scrollbar {
    height: 6px;
  }

  &::-webkit-scrollbar-track {
    background: #f1f1f1;
  }

  &::-webkit-scrollbar-thumb {
    background: #c1c1c1;
    border-radius: 3px;
  }

  &::-webkit-scrollbar-thumb:hover {
    background: #a8a8a8;
  }
}

.table-container-inner {
  /* 内层容器负责纵向滚动 */
  height: 70vh;
  overflow-y: auto;
  /* 确保内容宽度足够触发横向滚动 */
  min-width: max-content;
  /* 确保纵向滚动条始终显示 */
    overflow-y: scroll !important;
    /* 添加最小高度确保即使内容很少也能显示滚动条 */
    min-height: 300px;
}

.score-table {
  width: 100%;
  min-width: 800px;
}

/* 其他样式保持不变 */
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

.fixed-center-dialog {
  overflow: hidden !important;
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
  overflow: hidden !important;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.image-preview-container {
  width: 100%;
  height: 80vh;
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
  cursor: zoom-in;
  position: relative;
  overflow: hidden;
}

.image-wrapper:hover {
  cursor: zoom-out;
}

.preview-image {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: all 0.3s ease;
}

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
    max-height: calc(100vh - 30vh);
    overflow-y: auto;
  }
}
</style>
