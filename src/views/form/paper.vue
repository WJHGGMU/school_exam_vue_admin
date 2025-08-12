<template>
  <div class="app-container">
  <!-- 试卷卡片列表 -->
  <div class="test-paper-cards">
    <el-card
      v-for="(paper, index) in testPaperList"
      :key="index"
      class="test-paper-card"
    >
      <div slot="header" class="card-header">
        <span>{{ paper.name }}</span>
      </div>
      <div class="card-body">
        <p><strong>科目：</strong>{{ getSubjectName(paper.subject) }}</p>
        <p><strong>创建时间：</strong>{{ paper.created_at }}</p>
        <p><strong>更新时间：</strong>{{ paper.updated_at }}</p>
        <!-- 下载按钮区域 -->
        <div class="download-buttons">
          <el-button
            type="primary"
            icon="el-icon-download"
            @click="downloadFile(paper.topic_paper_file, `${paper.name}-试卷`)"
            size="mini"
          >
            试卷
          </el-button>
          <el-button
            type="success"
            icon="el-icon-download"
            @click="downloadFile(paper.answers_parse_file, `${paper.name}-答题卡`)"
            size="mini"
            class="btn-margin-left"
            >
            答题卡
          </el-button>
          <el-button
            type="warning"
            icon="el-icon-download"
            @click="downloadFile(paper.standard_answer_file, `${paper.name}-参考答案`)"
            size="mini"
            class="btn-margin-left"
            >
            参考答案
          </el-button>
        </div>
        <!-- 编辑、删除按钮区域 -->
        <div class="operate-buttons">
          <el-button
            type="warning"
            icon="el-icon-edit"
            @click="handleEdit(paper)"
            size="mini"
            class="btn-margin-top"
            >
            编辑
          </el-button>
          <el-button
            type="danger"
            icon="el-icon-delete"
            @click="handleDelete(paper.id)"
            size="mini"
            class="btn-margin-top btn-margin-left"
            >
            删除
          </el-button>
        </div>
      </div>
    </el-card>
  </div>

  <!-- 编辑试卷弹窗 -->
  <el-dialog
    title="编辑试卷"
    :visible.sync="editDialogVisible"
    :width="dialogWidth"
    :fullscreen="isFullscreen"
  >
    <el-form
      ref="editForm"
      :model="editForm"
      :label-width="labelWidth"
    >
      <el-form-item label="试卷名称">
        <el-input v-model="editForm.name" placeholder="请输入试卷名称"></el-input>
      </el-form-item>
      <el-form-item label="学科类型">
        <el-select v-model="editForm.subject" placeholder="请选择学科类型">
          <el-option
            v-for="(label, value) in SUBJECT_TYPES"
            :key="value"
            :label="label"
            :value="value"
          ></el-option>
        </el-select>
      </el-form-item>
      <el-form-item label="试卷">
        <el-upload
          class="upload-demo"
          :auto-upload="false"
          :on-preview="handlePreview"
          :on-remove="(file, fileList) => handleRemove('topic', file, fileList)"
          :file-list="topicPaperFileList"
          :before-upload="beforeUpload"
          @change="handleFileChange('topic', $event)"
        >
          <el-button slot="trigger" type="primary">选取文件</el-button>
          <div slot="tip" class="el-upload__tip">支持上传 doc、docx 等格式文件</div>
        </el-upload>
      </el-form-item>
      <el-form-item label="答题卡">
        <el-upload
          class="upload-demo"
          :auto-upload="false"
          :on-preview="handlePreview"
          :on-remove="(file, fileList) => handleRemove('answer', file, fileList)"
          :file-list="answerCardFileList"
          :before-upload="beforeUpload"
          @change="handleFileChange('answer', $event)"
        >
          <el-button slot="trigger" type="primary">选取文件</el-button>
          <div slot="tip" class="el-upload__tip">支持上传 doc、docx 等格式文件</div>
        </el-upload>
      </el-form-item>
      <el-form-item label="参考答案">
        <el-upload
          class="upload-demo"
          :auto-upload="false"
          :on-preview="handlePreview"
          :on-remove="(file, fileList) => handleRemove('standard', file, fileList)"
          :file-list="standardAnswerFileList"
          :before-upload="beforeUpload"
          @change="handleFileChange('standard', $event)"
        >
          <el-button slot="trigger" type="primary">选取文件</el-button>
          <div slot="tip" class="el-upload__tip">支持上传 doc、docx 等格式文件</div>
        </el-upload>
      </el-form-item>
    </el-form>
    <div slot="footer" class="dialog-footer">
      <el-button @click="editDialogVisible = false">取消</el-button>
      <el-button type="primary" @click="handleEditSubmit">确认修改</el-button>
    </div>
  </el-dialog>
</div>
</template>

<script>
import request from '@/utils/request'
import Cookies from 'js-cookie'

export default {
  name: 'TestPaperList',
  data() {
    return {
      testPaperList: [],
      editDialogVisible: false,
      editForm: {
        id: '',
        name: '',
        subject: '',
        exam: '',
        topic_paper_file: '',
        answers_parse_file: '',
        standard_answer_file: ''
      },
      // 初始化文件列表数组，确保响应式
      topicPaperFileList: [],
      answerCardFileList: [],
      standardAnswerFileList: [],
      SUBJECT_TYPES: {
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
      dialogWidth: '80vw',
      isFullscreen: false,
      labelWidth: '120px'
    }
  },
  async created() {
    // 监听路由参数变化，重新加载数据
    this.$watch(
      () => this.$route.params.id,
      () => {
        this.fetchTestPapers()
      }
    )

    await this.fetchTestPapers()
    this.handleResize()
  },
  mounted() {
    window.addEventListener('resize', this.handleResize)
    // 初始化时打印文件列表状态
    console.log('组件初始化 - 试卷文件列表:', this.topicPaperFileList)
  },
  beforeDestroy() {
    window.removeEventListener('resize', this.handleResize)
  },
  methods: {
    handleResize() {
      const windowWidth = window.innerWidth
      if (windowWidth < 768) {
        this.dialogWidth = '95vw'
        this.labelWidth = '80px'
        this.isFullscreen = false
      } else if (windowWidth < 1024) {
        this.dialogWidth = '85vw'
        this.labelWidth = '100px'
        this.isFullscreen = false
      } else {
        this.dialogWidth = '800px'
        this.labelWidth = '120px'
        this.isFullscreen = false
      }
    },
    async fetchTestPapers() {
      try {
        const examId = this.$route.params.id;
        if (!examId) {
          this.$message.warning('未找到考试ID参数');
          return;
        }

        const token = Cookies.get('access')
        const params = { exam: examId }
        const res = await request({
          url: '/sexam/testpapers/',
          method: 'get',
          headers: { Authorization: `Bearer ${token}` },
          params
        })
        if (res && Array.isArray(res)) {
          this.testPaperList = res
        } else {
          this.$message.warning('获取试卷列表数据格式异常')
        }
      } catch (error) {
        console.error('获取试卷列表失败：', error)
        this.$message.error('获取试卷列表失败，请稍后重试')
      }
    },
    getSubjectName(subjectKey) {
      return this.SUBJECT_TYPES[subjectKey] || '未知科目';
    },
    downloadFile(fileUrl, chineseFileName) {
      if (!fileUrl) {
        this.$message.warning('文件链接为空，无法下载')
        return
      }
      const urlParts = fileUrl.split('.')
      const ext = urlParts.length > 1 ? urlParts.pop() : ''
      const fullFileName = ext ? `${chineseFileName}.${ext}` : chineseFileName;
      const link = document.createElement('a')
      link.href = fileUrl;
      link.target = '_blank';
      link.download = fullFileName;
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
    },
    handleEdit(paper) {
      console.log('编辑试卷 - 原始数据:', paper)
      this.editForm = {
        id: paper.id,
        name: paper.name,
        subject: paper.subject,
        exam: this.$route.params.id,
        topic_paper_file: paper.topic_paper_file,
        answers_parse_file: paper.answers_parse_file,
        standard_answer_file: paper.standard_answer_file
      }

      // 重置并初始化文件列表
      this.topicPaperFileList = []
      this.answerCardFileList = []
      this.standardAnswerFileList = []

      if (paper.topic_paper_file) {
        this.topicPaperFileList = this.parseFileInfo(paper.topic_paper_file, '试卷')
      }
      if (paper.answers_parse_file) {
        this.answerCardFileList = this.parseFileInfo(paper.answers_parse_file, '答题卡')
      }
      if (paper.standard_answer_file) {
        this.standardAnswerFileList = this.parseFileInfo(paper.standard_answer_file, '参考答案')
      }

      console.log('编辑初始化 - 试卷文件列表:', this.topicPaperFileList)
      this.editDialogVisible = true
    },
    parseFileInfo(fileUrl, defaultName) {
      if (!fileUrl) return []

      try {
        const url = new URL(fileUrl)
        const fileNameParam = url.searchParams.get('filename') || url.searchParams.get('name')

        if (fileNameParam) {
          return [{
              name: decodeURIComponent(fileNameParam),
              url: fileUrl,
              status: 'success'
            }]
        } else {
          const pathParts = url.pathname.split('/')
          let fileName = pathParts.pop() || defaultName
          return [{
            name: decodeURIComponent(fileName),
            url: fileUrl,
            status: 'success'
          }]
        }
      } catch (error) {
        return [{
          name: decodeURIComponent(fileUrl.split('/').pop() || defaultName),
          url: fileUrl,
          status: 'success'
        }]
      }
    },
    handleDelete(paperId) {
      this.$confirm('此操作将永久删除该试卷, 是否继续?', '提示', {
        type: 'warning'
      })
        .then(async () => {
          try {
            const token = Cookies.get('access')
            await request({
              url: `/sexam/testpapers/${paperId}/`,
              method: 'delete',
              headers: { Authorization: `Bearer ${token}` }
            })
            this.testPaperList = this.testPaperList.filter(item => item.id !== paperId)
            this.$message.success('删除成功!')
          } catch (error) {
            console.error('删除试卷失败：', error)
            this.$message.error('删除失败，请稍后重试')
          }
        }).catch(() => {
          this.$message.info('已取消删除')
        })
    },
    handlePreview(file) {
      console.log('预览文件:', file)
      this.$message.info(`预览文件：${file.name}`)
    },
    // 处理文件移除
    handleRemove(type, file, fileList) {
      console.log(`移除${type}文件:`, file.name, '当前列表:', fileList)

      // 强制更新文件列表，触发响应式
      if (type === 'topic') {
        this.topicPaperFileList = [...fileList]
        console.log('移除后试卷列表长度:', this.topicPaperFileList.length)
      } else if (type === 'answer') {
        this.answerCardFileList = [...fileList]
        console.log('移除后答题卡列表长度:', this.answerCardFileList.length)
      } else if (type === 'standard') {
        this.standardAnswerFileList = [...fileList]
        console.log('移除后参考答案列表长度:', this.standardAnswerFileList.length)
      }
    },
    // 处理文件选择变化
    handleFileChange(type, { file, fileList }) {
      console.log(`===== ${type} 文件变化事件触发 =====`)
      console.log('当前文件:', file)
      console.log('当前文件列表:', fileList)
      console.log('当前列表长度:', fileList.length)

      // 关键：使用展开运算符创建新数组，确保响应式更新
      if (type === 'topic') {
        this.topicPaperFileList = [...fileList]
        console.log('更新后试卷列表:', this.topicPaperFileList)
        console.log('更新后试卷列表长度:', this.topicPaperFileList.length)
      } else if (type === 'answer') {
        this.answerCardFileList = [...fileList]
        console.log('更新后答题卡列表长度:', this.answerCardFileList.length)
      } else if (type === 'standard') {
        this.standardAnswerFileList = [...fileList]
        console.log('更新后参考答案列表长度:', this.standardAnswerFileList.length)
      }
    },
    // 上传前验证
    beforeUpload(file) {
      console.log('===== 上传前验证 =====')
      console.log('文件名称:', file.name)
      console.log('文件大小:', file.size)
      console.log('文件类型:', file.type)

      // 可以在这里添加文件格式和大小验证
      const fileExtensions = ['doc', 'docx', 'pdf'];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!fileExtensions.includes(ext)) {
        this.$message.error('只支持上传 doc、docx、pdf 格式的文件');
        return false;
      }

      // 限制文件大小为10MB
      const maxSize = 10 * 1024 * 1024;
      if (file.size > maxSize) {
        this.$message.error('文件大小不能超过10MB');
        return false;
      }

      return true;
    },
    async handleEditSubmit() {
      console.log('===== 开始提交编辑 =====')
      console.log('提交时试卷文件列表:', this.topicPaperFileList)
      console.log('提交时试卷列表长度:', this.topicPaperFileList.length)
      console.log('提交时答题卡列表长度:', this.answerCardFileList.length)
      console.log('提交时参考答案列表长度:', this.standardAnswerFileList.length)

      try {
        const token = Cookies.get('access')
        const formData = new FormData()
        formData.append('name', this.editForm.name)
        formData.append('subject', this.editForm.subject)
        formData.append('exam', this.$route.params.id)

        // 处理文件上传 - 只取列表中的第一个文件
        if (this.topicPaperFileList.length > 0 && this.topicPaperFileList[0].raw) {
          formData.append('topic_paper_file', this.topicPaperFileList[0].raw)
          console.log('添加试卷文件:', this.topicPaperFileList[0].name)
        }
        if (this.answerCardFileList.length > 0 && this.answerCardFileList[0].raw) {
          formData.append('answers_parse_file', this.answerCardFileList[0].raw)
          console.log('添加答题卡文件:', this.answerCardFileList[0].name)
        }
        if (this.standardAnswerFileList.length > 0 && this.standardAnswerFileList[0].raw) {
          formData.append('standard_answer_file', this.standardAnswerFileList[0].raw)
          console.log('添加参考答案文件:', this.standardAnswerFileList[0].name)
        }

        await request({
          url: `/sexam/testpapers/${this.editForm.id}/`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          data: formData
        })
        this.$message.success('编辑成功')
        this.editDialogVisible = false
        await this.fetchTestPapers()
      } catch (error) {
        console.error('编辑试卷失败：', error)
        this.$message.error('编辑失败，请稍后重试')
      }
    }
  },
  }
</script>

<style scoped>
.app-container {
  padding: 16px;
  box-sizing: border-box;
  max-width: 1200px;
  margin: 0 auto;
}

.test-paper-cards {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.test-paper-card {
  width: 100%;
  transition: all 0.3s ease;
  box-sizing: border-box;
}

.test-paper-card:hover {
  transform: translateY(-5px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
}

.card-header {
  font-size: 18px;
  font-weight: bold;
  padding: 16px;
  padding-bottom: 0;
  border-bottom: 1px solid #f0f0f0;
}

.card-body {
  padding: 16px;
  padding-top: 0;
  color: #666;
  line-height: 1.6;
}

.download-buttons, .operate-buttons {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
}

.btn-margin-left {
  margin-left: 8px !important;
}

.btn-margin-top {
  margin-top: 8px !important;
}

.el-form-item {
  margin-bottom: 5px;
}

.el-upload__tip {
  margin-top: 0;
  height: 20px;
  line-height: 1.3;
}

.upload-demo {
  display: flex;
  flex-direction: column;
  align-items: start;
  margin-bottom: 5px;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 8px;
  padding-top: 16px;
}

::v-deep .el-upload-list__item {
  margin-top: 0;
}

::v-deep .el-upload-list__item-name {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 30ch;
  line-height: 1.3;
}

::v-deep .el-upload-list .el-upload-list-text {
  height: auto;
}

@media screen and (max-width: 768px) {
  .app-container {
    padding: 8px;
  }

  .card-header {
    font-size: 16px;
    padding: 12px;
  }

  .card-body {
    padding: 12px;
    font-size: 14px;
  }

  .download-buttons, .operate-buttons {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .download-buttons .el-button,
  .operate-buttons .el-button {
    flex: 1;
    margin: 4px !important;
    padding: 6px 0;
    font-size: 12px;
  }

  .btn-margin-left {
    margin-left: 0 !important;
  }

  .btn-margin-top {
    margin-top: 0 !important;
  }

  ::v-deep .el-dialog {
    max-width: 95% !important;
    margin: 10px auto !important;
  }

  ::v-deep .el-dialog__header {
    padding: 12px 16px;
  }

  ::v-deep .el-dialog__title {
    font-size: 16px;
  }

  ::v-deep .el-dialog__body {
    padding: 16px;
    max-height: 70vh;
    overflow-y: auto;
  }

  ::v-deep .el-form-item {
    margin-bottom: 12px;
  }

  ::v-deep .el-form-item__label {
    font-size: 14px;
  }

  ::v-deep .el-input__inner,
  ::v-deep .el-select__inner {
    font-size: 14px;
    padding: 8px 12px;
  }

  ::v-deep .el-upload {
    width: 100%;
  }

  ::v-deep .el-upload__button {
    width: 100%;
    text-align: center;
  }

  ::v-deep .el-upload-list__item-name {
    max-width: 20ch;
  }
}

@media screen and (min-width: 769px) and (max-width: 1024px) {
  .app-container {
    padding: 12px;
  }

  .download-buttons, .operate-buttons {
    gap: 8px;
  }

  ::v-deep .el-dialog {
    max-width: 85% !important;
  }

  ::v-deep .el-upload-list__item-name {
    max-width: 25ch;
  }
}

@media screen and (min-width: 1025px) {
  .test-paper-cards {
    /* 桌面端可启用多列布局 */
    /* display: grid;
    grid-template-columns: repeat(auto-fill, minmax(350px, 1fr));
    gap: 20px; */
  }
}
</style>
