<template>
  <div class="app-container">
    <!-- 筛选和添加按钮区域 -->
    <div class="header-container">
      <el-select
        v-model="selectedSubject"
        placeholder="请选择学科类型"
        class="subject-filter"
        clearable
        @change="handleFilter"
      >
        <el-option
          v-for="(label, value) in SUBJECT_TYPES"
          :key="value"
          :label="label"
          :value="value"
        ></el-option>
      </el-select>
      <el-button type="primary" icon="el-icon-plus" @click="handleAddPaper" class="add-button">
        新建试卷
      </el-button>
    </div>

    <!-- 试卷卡片列表 -->
    <div class="test-paper-cards">
      <el-card
        v-for="(paper, index) in filteredPaperList"
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

          <!-- 简化的操作按钮 -->
          <div class="simple-operate-buttons">
            <el-button
              type="primary"
              icon="el-icon-view"
              @click="handleViewDetails(paper)"
              size="mini"
            >
              查看详情
            </el-button>
            <el-button
              type="danger"
              icon="el-icon-delete"
              @click="handleDelete(paper.id)"
              size="mini"
              class="btn-margin-left"
            >
              删除
            </el-button>
          </div>
        </div>
      </el-card>
    </div>

    <!-- 试卷详情弹窗 - 固定定位并内部滚动 -->
    <el-dialog
      title="试卷详情"
      :visible.sync="detailDialogVisible"
      :width="dialogWidth"
      :fullscreen="isFullscreen"
      custom-class="fixed-dialog"
    >
      <div class="detail-content">
        <div class="detail-info">
          <p><strong>试卷名称：</strong>{{ currentPaper.name }}</p>
          <p><strong>科目：</strong>{{ getSubjectName(currentPaper.subject) }}</p>
          <p><strong>创建时间：</strong>{{ currentPaper.created_at }}</p>
          <p><strong>更新时间：</strong>{{ currentPaper.updated_at }}</p>
        </div>

        <div class="image-section">
          <h3>答题卡图片</h3>
          <div class="image-container">
            <!-- 首页图片 -->
            <div v-if="currentPaper.answers_parse_image_file1" class="image-item with-controls">
              <div class="image-header">
                <p>首页</p>
                <div class="image-controls">
                  <el-button
                    type="primary"
                    :icon="isEditingPositioning && editingPositioningType === 'positioning1' ? 'el-icon-check' : 'el-icon-edit'"
                    @click="handleEditPositioning('positioning1')"
                    size="mini"
                  >
                    {{ isEditingPositioning && editingPositioningType === 'positioning1' ? '确认定位' : '编辑定位' }}
                  </el-button>
                  <div class="position-status" :class="currentPaper.positioning1_enabled ? 'confirmed' : 'unconfirmed'">
                    {{ currentPaper.positioning1_enabled ? '定位已确认' : '定位未确认' }}
                  </div>
                </div>
              </div>

              <!-- 图片与Canvas重叠容器 -->
              <div class="image-canvas-container">
                <el-image
                  :src="currentPaper.answers_parse_image_file1"
                  fit="contain"
                  :preview-src-list="[currentPaper.answers_parse_image_file1]"
                  class="base-image"
                  ref="image1"
                  @load="onImageLoad('image1')"
                >
                  <div slot="error" class="image-placeholder">
                    <i class="el-icon-picture-outline"></i>
                  </div>
                </el-image>

                <!-- 始终显示定位框，根据状态变化样式 -->
                <ImageCanvas
                  :src="currentPaper.answers_parse_image_file1"
                  v-model="currentPaper.positioning1"
                  :image-ref="'image1'"
                  :is-editing="isEditingPositioning && editingPositioningType === 'positioning1'"
                  :is-confirmed="currentPaper.positioning1_enabled"
                  @position-updated="handlePositionUpdated"
                />
              </div>
            </div>
            <div v-else class="image-placeholder">
              <i class="el-icon-picture-outline"></i>
              <p>未上传图片1</p>
            </div>

            <!-- 尾页图片 -->
            <div v-if="currentPaper.answers_parse_image_file2" class="image-item with-controls">
              <div class="image-header">
                <p>尾页</p>
                <div class="image-controls">
                  <el-button
                    type="primary"
                    :icon="isEditingPositioning && editingPositioningType === 'positioning2' ? 'el-icon-check' : 'el-icon-edit'"
                    @click="handleEditPositioning('positioning2')"
                    size="mini"
                  >
                    {{ isEditingPositioning && editingPositioningType === 'positioning2' ? '确认定位' : '编辑定位' }}
                  </el-button>
                  <div class="position-status" :class="currentPaper.positioning2_enabled ? 'confirmed' : 'unconfirmed'">
                    {{ currentPaper.positioning2_enabled ? '定位已确认' : '定位未确认' }}
                  </div>
                </div>
              </div>

              <!-- 图片与Canvas重叠容器 -->
              <div class="image-canvas-container">
                <el-image
                  :src="currentPaper.answers_parse_image_file2"
                  fit="contain"
                  :preview-src-list="[currentPaper.answers_parse_image_file2]"
                  class="base-image"
                  ref="image2"
                  @load="onImageLoad('image2')"
                >
                  <div slot="error" class="image-placeholder">
                    <i class="el-icon-picture-outline"></i>
                  </div>
                </el-image>

                <!-- 始终显示定位框，根据状态变化样式 -->
                <ImageCanvas
                  :src="currentPaper.answers_parse_image_file2"
                  v-model="currentPaper.positioning2"
                  :image-ref="'image2'"
                  :is-editing="isEditingPositioning && editingPositioningType === 'positioning2'"
                  :is-confirmed="currentPaper.positioning2_enabled"
                  @position-updated="handlePositionUpdated"
                />
              </div>
            </div>
            <div v-else class="image-placeholder">
              <i class="el-icon-picture-outline"></i>
              <p>未上传图片2</p>
            </div>
          </div>
        </div>

        <div class="download-section">
          <h3>文件下载</h3>
          <div class="download-buttons">
            <el-button
              type="primary"
              icon="el-icon-download"
              @click="downloadFile(currentPaper.topic_paper_file, `${currentPaper.name}-试卷`)"
              size="mini"
              :disabled="!currentPaper.topic_paper_file"
            >
              试卷
            </el-button>
            <el-button
              type="success"
              icon="el-icon-download"
              @click="downloadFile(currentPaper.answers_parse_file, `${currentPaper.name}-答题卡`)"
              size="mini"
              class="btn-margin-left"
              :disabled="!currentPaper.answers_parse_file"
              >
              答题卡
            </el-button>
            <el-button
              type="warning"
              icon="el-icon-download"
              @click="downloadFile(currentPaper.standard_answer_file, `${currentPaper.name}-参考答案`)"
              size="mini"
              class="btn-margin-left"
              :disabled="!currentPaper.standard_answer_file"
              >
              参考答案
            </el-button>
          </div>
        </div>
      </div>
      <div slot="footer" class="dialog-footer">
        <!-- 定位编辑模式下显示不同的按钮 -->
        <template v-if="isEditingPositioning">
          <el-button @click="cancelEditPositioning">取消编辑</el-button>
          <el-button type="success" @click="savePositioning">保存定位</el-button>
        </template>
        <template v-else>
          <el-button @click="detailDialogVisible = false">关闭</el-button>
          <el-button type="warning" icon="el-icon-edit" @click="handleEditFromDetail">编辑</el-button>
        </template>
      </div>
    </el-dialog>

    <!-- 新建试卷弹窗 -->
    <el-dialog
      title="新建试卷"
      :visible.sync="addDialogVisible"
      :width="dialogWidth"
      :fullscreen="isFullscreen"
      @close="handleAddDialogClose"
      custom-class="fixed-dialog"
    >
      <el-form
        ref="addForm"
        :model="addForm"
        :label-width="labelWidth"
      >
        <el-form-item label="试卷名称" required>
          <el-input v-model="addForm.name" placeholder="请输入试卷名称"></el-input>
        </el-form-item>
        <el-form-item label="学科类型" required>
          <el-select v-model="addForm.subject" placeholder="请选择学科类型">
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
            action="#"
            :auto-upload="false"
            :on-preview="handlePreview"
            :file-list="addTopicPaperFileList"
            :before-upload="beforeUpload"
            @change="handleAddFileChange('topic', $event)"
          >
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="答题卡">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-preview="handlePreview"
            :file-list="addAnswerCardFileList"
            :before-upload="beforeUpload"
            @change="handleAddFileChange('answer', $event)"
          >
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="参考答案">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-preview="handlePreview"
            :file-list="addStandardAnswerFileList"
            :before-upload="beforeUpload"
            @change="handleAddFileChange('standard', $event)"
          >
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
      </el-form>
      <div slot="footer" class="dialog-footer">
        <el-button @click="addDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleAddSubmit">确认创建</el-button>
      </div>
    </el-dialog>

    <!-- 编辑试卷弹窗 -->
    <el-dialog
      title="编辑试卷"
      :visible.sync="editDialogVisible"
      :width="dialogWidth"
      :fullscreen="isFullscreen"
      custom-class="fixed-dialog"
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
            action="#"
            :auto-upload="false"
            :on-preview="handlePreview"
            :file-list="topicPaperFileList"
            :before-upload="beforeUpload"
            @change="handleFileChange('topic', $event)"
          >
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="答题卡">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-preview="handlePreview"
            :file-list="answerCardFileList"
            :before-upload="beforeUpload"
            @change="handleFileChange('answer', $event)"
          >
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="参考答案">
          <el-upload
            class="upload-demo"
            action="#"
            :auto-upload="false"
            :on-preview="handlePreview"
            :file-list="standardAnswerFileList"
            :before-upload="beforeUpload"
            @change="handleFileChange('standard', $event)"
          >
            <el-button slot="trigger" type="primary">选取文件</el-button>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
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
import ImageCanvas from '@/components/ImageCanvas.vue'

export default {
  name: 'TestPaperList',
  components: { ImageCanvas },
  data() {
    return {
      testPaperList: [],
      selectedSubject: null, // 选中的学科类型
      filteredPaperList: [],

      // 详情弹窗相关
      detailDialogVisible: false,
      currentPaper: {},

      // 定位编辑相关
      isEditingPositioning: false,
      editingPositioningType: '', // 'positioning1' 或 'positioning2'
      imageDimensions: {
        image1: { width: 0, height: 0 },
        image2: { width: 0, height: 0 }
      },

      // 编辑相关
      editDialogVisible: false,
      editForm: {
        id: '',
        name: '',
        subject: '',
        exam: '',
        topic_paper_file: '',
        answers_parse_file: '',
        standard_answer_file: '',
        answers_parse_image_file1: '',
        answers_parse_image_file2: '',
        positioning1: [],
        positioning1_enabled: false,
        positioning2: [],
        positioning2_enabled: false
      },
      // 存储上传的文件对象
      uploadedFiles: {
        topic: null,    // 试卷文件
        answer: null,   // 答题卡文件
        standard: null, // 参考答案文件
        image1: null,   // 答题卡图片1
        image2: null    // 答题卡图片2
      },
      topicPaperFileList: [],
      answerCardFileList: [],
      standardAnswerFileList: [],
      answerImage1FileList: [],
      answerImage2FileList: [],

      // 新建相关
      addDialogVisible: false,
      addForm: {
        name: '',
        subject: '',
        exam: ''
      },
      addTopicPaperFileList: [],
      addAnswerCardFileList: [],
      addStandardAnswerFileList: [],
      addAnswerImage1FileList: [],
      addAnswerImage2FileList: [],

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
          this.filteredPaperList = [...res]
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
    // 查看详情
    handleViewDetails(paper) {
      // 确保定位数据存在，如不存在则初始化
      if (!paper.positioning1) paper.positioning1 = [];
      if (!paper.positioning1_enabled) paper.positioning1_enabled = false;
      if (!paper.positioning2) paper.positioning2 = [];
      if (!paper.positioning2_enabled) paper.positioning2_enabled = false;

      this.currentPaper = { ...paper };
      this.detailDialogVisible = true;
    },
    // 从详情弹窗进入编辑
    handleEditFromDetail() {
      this.detailDialogVisible = false;
      this.handleEdit(this.currentPaper);
    },
    handleEdit(paper) {
      // 重置上传文件对象
      this.uploadedFiles = {
        topic: null,
        answer: null,
        standard: null,
        image1: null,
        image2: null
      }

      this.editForm = {
        id: paper.id,
        name: paper.name,
        subject: paper.subject,
        exam: this.$route.params.id,
        topic_paper_file: paper.topic_paper_file,
        answers_parse_file: paper.answers_parse_file,
        standard_answer_file: paper.standard_answer_file,
        answers_parse_image_file1: paper.answers_parse_image_file1,
        answers_parse_image_file2: paper.answers_parse_image_file2,
        positioning1: paper.positioning1 || [],
        positioning1_enabled: paper.positioning1_enabled || false,
        positioning2: paper.positioning2 || [],
        positioning2_enabled: paper.positioning2_enabled || false
      }

      // 重置并初始化文件列表
      this.topicPaperFileList = []
      this.answerCardFileList = []
      this.standardAnswerFileList = []
      this.answerImage1FileList = []
      this.answerImage2FileList = []

      if (paper.topic_paper_file) {
        this.topicPaperFileList = this.parseFileInfo(paper.topic_paper_file, '试卷')
      }
      if (paper.answers_parse_file) {
        this.answerCardFileList = this.parseFileInfo(paper.answers_parse_file, '答题卡')
      }
      if (paper.standard_answer_file) {
        this.standardAnswerFileList = this.parseFileInfo(paper.standard_answer_file, '参考答案')
      }
      if (paper.answers_parse_image_file1) {
        this.answerImage1FileList = this.parseFileInfo(paper.answers_parse_image_file1, '答题卡图片1')
      }
      if (paper.answers_parse_image_file2) {
        this.answerImage2FileList = this.parseFileInfo(paper.answers_parse_image_file2, '答题卡图片2')
      }

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
            this.filteredPaperList = this.filteredPaperList.filter(item => item.id !== paperId)
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

    // 编辑文件变化处理
    handleFileChange(type, { file, fileList }) {
      // 确保fileList始终是数组
      const files = fileList || [];

      // 当用户删除文件时
      if (file && file.status === 'removed') {
        this.uploadedFiles[type] = null;
      }
      // 当有新文件添加时（只保留最后一个选择的文件）
      else if (files.length > 0) {
        const latestFile = files[files.length - 1];
        this.uploadedFiles[type] = latestFile.raw || null;
      }
      // 当文件列表为空时
      else {
        this.uploadedFiles[type] = null;
      }

      // 更新文件列表显示
      const fileListMap = {
        topic: 'topicPaperFileList',
        answer: 'answerCardFileList',
        standard: 'standardAnswerFileList',
        image1: 'answerImage1FileList',
        image2: 'answerImage2FileList'
      }
      this[fileListMap[type]] = [...files];
    },

    // 新增文件变化处理
    handleAddFileChange(type, { file, fileList }) {
      const fileListMap = {
        topic: 'addTopicPaperFileList',
        answer: 'addAnswerCardFileList',
        standard: 'addStandardAnswerFileList',
        image1: 'addAnswerImage1FileList',
        image2: 'addAnswerImage2FileList'
      }
      this[fileListMap[type]] = [...fileList]
    },

    // 文档上传前验证
    beforeUpload(file) {
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

    // 图片上传前验证
    beforeImageUpload(file) {
      const fileExtensions = ['jpg', 'jpeg', 'png', 'gif'];
      const ext = file.name.split('.').pop().toLowerCase();
      if (!fileExtensions.includes(ext)) {
        this.$message.error('只支持上传 jpg、jpeg、png、gif 格式的图片');
        return false;
      }

      // 限制图片大小为5MB
      const maxSize = 5 * 1024 * 1024;
      if (file.size > maxSize) {
        this.$message.error('图片大小不能超过5MB');
        return false;
      }

      return true;
    },

    async handleEditSubmit() {
          try {
            const token = Cookies.get('access')
            const formData = new FormData()
            formData.append('name', this.editForm.name)
            formData.append('subject', this.editForm.subject)
            formData.append('exam', this.$route.params.id)

            // 添加定位数据
            formData.append('positioning1', JSON.stringify(this.editForm.positioning1))
            formData.append('positioning1_enabled', this.editForm.positioning1_enabled)
            formData.append('positioning2', JSON.stringify(this.editForm.positioning2))
            formData.append('positioning2_enabled', this.editForm.positioning2_enabled)

            // 处理文件上传 - 确保正确添加文件
            const fieldMap = {
              topic: 'topic_paper_file',
              answer: 'answers_parse_file',
              standard: 'standard_answer_file',
              image1: 'answers_parse_image_file1',
              image2: 'answers_parse_image_file2'
            }

            // 文件列表映射表
            const fileListMap = {
              topic: this.topicPaperFileList,
              answer: this.answerCardFileList,
              standard: this.standardAnswerFileList,
              image1: this.answerImage1FileList,
              image2: this.answerImage2FileList
            }

            // 确保处理所有文件类型，包括新上传和已删除的
            Object.keys(fieldMap).forEach(type => {
              const fieldName = fieldMap[type]
              const fileList = fileListMap[type] || [];
              const hasNewFile = this.uploadedFiles[type] !== null && this.uploadedFiles[type] !== undefined;

              // 情况1：有新上传的文件
              if (hasNewFile) {
                formData.append(fieldName, this.uploadedFiles[type])
              }
              // 情况2：文件列表为空且原本有文件，表示用户要删除该文件
              else if (fileList.length === 0 && this.editForm[fieldName]) {
                formData.append(fieldName, '')
              }
              // 情况3：保留原文件（不做处理，后端会保持原有文件）
            })

            await request({
              url: `/sexam/testpapers/${this.editForm.id}/`,
              method: 'patch',
              headers: {
                Authorization: `Bearer ${token}`,
                // 移除Content-Type，让浏览器自动处理
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
        },

    // 筛选功能 - 按学科类型筛选
    handleFilter() {
      if (!this.selectedSubject) {
        this.filteredPaperList = [...this.testPaperList]
        return
      }

      // 按选中的学科类型筛选
      this.filteredPaperList = this.testPaperList.filter(paper =>
        paper.subject === this.selectedSubject
      )
    },
    // 打开新建试卷弹窗
    handleAddPaper() {
      // 重置表单和文件列表
      this.addForm = {
        name: '',
        subject: '',
        exam: this.$route.params.id
      }
      this.addTopicPaperFileList = []
      this.addAnswerCardFileList = []
      this.addStandardAnswerFileList = []
      this.addAnswerImage1FileList = []
      this.addAnswerImage2FileList = []
      this.addDialogVisible = true
    },
    // 关闭新建弹窗时重置表单
    handleAddDialogClose() {
      if (this.$refs.addForm) {
        this.$refs.addForm.resetFields()
      }
      this.addTopicPaperFileList = []
      this.addAnswerCardFileList = []
      this.addStandardAnswerFileList = []
      this.addAnswerImage1FileList = []
      this.addAnswerImage2FileList = []
    },
    // 提交新建试卷
    async handleAddSubmit() {
      // 验证必填项（仅试卷名称和学科类型）
      if (!this.addForm.name) {
        this.$message.error('请输入试卷名称')
        return
      }

      if (!this.addForm.subject) {
        this.$message.error('请选择学科类型')
        return
      }

      try {
        const token = Cookies.get('access')
        const formData = new FormData()
        formData.append('name', this.addForm.name)
        formData.append('subject', this.addForm.subject)
        formData.append('exam', this.$route.params.id)

        // 初始化定位数据
        formData.append('positioning1', JSON.stringify([]))
        formData.append('positioning1_enabled', false)
        formData.append('positioning2', JSON.stringify([]))
        formData.append('positioning2_enabled', false)

        // 处理新建文件上传
        if (this.addTopicPaperFileList.length > 0 && this.addTopicPaperFileList[0].raw) {
          formData.append('topic_paper_file', this.addTopicPaperFileList[0].raw)
        }
        if (this.addAnswerCardFileList.length > 0 && this.addAnswerCardFileList[0].raw) {
          formData.append('answers_parse_file', this.addAnswerCardFileList[0].raw)
        }
        if (this.addStandardAnswerFileList.length > 0 && this.addStandardAnswerFileList[0].raw) {
          formData.append('standard_answer_file', this.addStandardAnswerFileList[0].raw)
        }
        if (this.addAnswerImage1FileList.length > 0 && this.addAnswerImage1FileList[0].raw) {
          formData.append('answers_parse_image_file1', this.addAnswerImage1FileList[0].raw)
        }
        if (this.addAnswerImage2FileList.length > 0 && this.addAnswerImage2FileList[0].raw) {
          formData.append('answers_parse_image_file2', this.addAnswerImage2FileList[0].raw)
        }


        await request({
          url: '/sexam/testpapers/',
          method: 'post',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
          data: formData
        })

        this.$message.success('试卷创建成功')
        this.addDialogVisible = false
        await this.fetchTestPapers()
      } catch (error) {
        console.error('创建试卷失败：', error)
        this.$message.error('创建失败，请稍后重试')
      }
    },

    // 定位编辑相关方法
    handleEditPositioning(type) {
      // 如果已经在编辑该类型，则保存并退出编辑
      if (this.isEditingPositioning && this.editingPositioningType === type) {
        this.savePositioning();
        return;
      }

      // 否则进入编辑模式
      this.editingPositioningType = type;
      this.isEditingPositioning = true;
    },

    cancelEditPositioning() {
      this.isEditingPositioning = false;
      this.editingPositioningType = '';
    },

    // 图片加载完成后获取尺寸
    onImageLoad(refName) {
      const imgElement = this.$refs[refName].$el.querySelector('img');
      if (imgElement) {
        this.imageDimensions[refName] = {
          width: imgElement.offsetWidth,
          height: imgElement.offsetHeight
        };
      }
    },

    // 接收来自ImageCanvas的位置更新
    handlePositionUpdated(newPositions) {
      if (this.editingPositioningType) {
        this.currentPaper[this.editingPositioningType] = newPositions;
      }
    },

    savePositioning() {
      // 保存定位数据到服务器
      this.savePositioningToServer();
      this.isEditingPositioning = false;
      this.editingPositioningType = '';
    },

    async savePositioningToServer() {
      try {
        const token = Cookies.get('access');
        const formData = new FormData();

        // 仅提交定位相关数据
        formData.append('positioning1', JSON.stringify(this.currentPaper.positioning1 || []));
        formData.append('positioning1_enabled', this.currentPaper.positioning1_enabled || false);
        formData.append('positioning2', JSON.stringify(this.currentPaper.positioning2 || []));
        formData.append('positioning2_enabled', this.currentPaper.positioning2_enabled || false);

        // 其他必要字段
        formData.append('name', this.currentPaper.name);
        formData.append('subject', this.currentPaper.subject);
        formData.append('exam', this.$route.params.id);

        await request({
          url: `/sexam/testpapers/${this.currentPaper.id}/`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          data: formData
        });

        this.$message.success('定位数据保存成功');
        await this.fetchTestPapers();
      } catch (error) {
        console.error('保存定位数据失败：', error);
        this.$message.error('保存定位数据失败，请稍后重试');
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

/* 筛选和添加按钮区域样式 */
.header-container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
  gap: 16px;
}

.subject-filter {
  flex: 1;
}

.add-button {
  white-space: nowrap;
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

/* 简化的操作按钮样式 */
.simple-operate-buttons {
  display: flex;
  margin-top: 12px;
}

/* 详情弹窗样式 */
.detail-content {
  margin-top: 10px;
}

.detail-info {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.image-section {
  margin-bottom: 20px;
  padding-bottom: 10px;
  border-bottom: 1px solid #eee;
}

.image-container {
  display: block;
  gap: 16px;
  margin-top: 10px;
}

.image-item {
  flex: 1;
}

/* 图片与Canvas重叠容器 */
.image-canvas-container {
  position: relative;
  display: inline-block;
  width: 100%;
  min-height: 300px;
}

.base-image {
  width: 100%;
  height: auto;
  display: block;
}

/* Canvas覆盖在图片上方 */
::v-deep .canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: auto;
}

.image-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 8px;
}

.image-controls {
  display: flex;
  align-items: center;
  gap: 8px;
}

.position-status {
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 12px;
  font-weight: 500;
}

.position-status.confirmed {
  background-color: #f0f9eb;
  color: #52c41a;
  border: 1px solid #b7eb8f;
}

.position-status.unconfirmed {
  background-color: #fff1f0;
  color: #f5222d;
  border: 1px solid #ffa39e;
}

/* 定位方框样式 - 根据状态显示不同颜色 */
.positioning-box {
  position: absolute;
  border: 2px solid;
  background-color: rgba(0, 0, 0, 0.1);
  cursor: move;
  box-sizing: border-box;
  transition: all 0.2s ease;
}

/* 未确认状态 - 红色框 */
.positioning-box.unconfirmed {
  border-color: #f5222d;
  background-color: rgba(245, 34, 45, 0.1);
}

/* 已确认状态 - 绿色框 */
.positioning-box.confirmed {
  border-color: #52c41a;
  background-color: rgba(82, 196, 26, 0.1);
}

/* 编辑状态 - 虚线蓝色框 */
.positioning-box.editing {
  border-style: dashed;
  border-color: #409eff;
  background-color: rgba(64, 158, 255, 0.1);
}

/* 调整大小手柄 */
.resize-handle {
  position: absolute;
  width: 10px;
  height: 10px;
  background-color: white;
  border: 1px solid;
  box-sizing: border-box;
}

/* 编辑状态下的手柄颜色 */
.positioning-box.editing .resize-handle {
  border-color: #409eff;
}

/* 未确认状态下的手柄颜色 */
.positioning-box.unconfirmed .resize-handle {
  border-color: #f5222d;
}

/* 已确认状态下的手柄颜色 */
.positioning-box.confirmed .resize-handle {
  border-color: #52c41a;
}

.resize-handle.top-left {
  top: -5px;
  left: -5px;
  cursor: nwse-resize;
}

.resize-handle.top-right {
  top: -5px;
  right: -5px;
  cursor: nesw-resize;
}

.resize-handle.bottom-left {
  bottom: -5px;
  left: -5px;
  cursor: nesw-resize;
}

.resize-handle.bottom-right {
  bottom: -5px;
  right: -5px;
  cursor: nwse-resize;
}

/* 添加定位点按钮 */
.add-position-btn {
  margin-top: 10px;
}

.image-placeholder {
  width: 100%;
  min-height: 150px;
  border: 1px dashed #ccc;
  border-radius: 4px;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  color: #999;
  font-size: 14px;
}

.image-placeholder i {
  font-size: 24px;
  margin-bottom: 8px;
}

.download-section {
  margin-bottom: 10px;
}

.download-section h3 {
  margin-bottom: 10px;
  font-size: 16px;
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

/* 固定弹窗样式 */
::v-deep .fixed-dialog {
  position: fixed !important;
  top: 50px !important;
  bottom: 50px !important;
  left: 50% !important;
  transform: translateX(-50%) !important;
  margin: 0 !important;
  display: flex !important;
  flex-direction: column !important;
  max-height: calc(100vh - 100px) !important;
  height: auto !important;
}

/* 弹窗头部固定 */
::v-deep .fixed-dialog .el-dialog__header {
  flex-shrink: 0 !important;
  padding: 16px 20px !important;
  border-bottom: 1px solid #eee !important;
}

/* 弹窗内容区域 - 带滚动条 */
::v-deep .fixed-dialog .el-dialog__body {
  flex-grow: 1 !important;
  overflow-y: auto !important;
  padding: 20px !important;
  margin: 0 !important;
}

/* 弹窗底部固定 */
::v-deep .fixed-dialog .el-dialog__footer {
  flex-shrink: 0 !important;
  padding: 16px 20px !important;
  border-top: 1px solid #eee !important;
}

/* 美化滚动条 */
::v-deep .fixed-dialog .el-dialog__body::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::v-deep .fixed-dialog .el-dialog__body::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::v-deep .fixed-dialog .el-dialog__body::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::v-deep .fixed-dialog .el-dialog__body::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
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

  .header-container {
    flex-direction: column;
    align-items: stretch;
  }

  .subject-filter, .add-button {
    width: 100%;
    min-width: auto;
  }

  .card-header {
    font-size: 16px;
    padding: 12px;
  }

  .card-body {
    padding: 12px;
    font-size: 14px;
  }

  .download-buttons, .operate-buttons, .simple-operate-buttons {
    flex-direction: row;
    justify-content: space-between;
    width: 100%;
  }

  .download-buttons .el-button,
  .operate-buttons .el-button,
  .simple-operate-buttons .el-button {
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

  .image-item {
    width: 100%;
  }

  .image-header {
    flex-direction: column;
    align-items: flex-start;
    gap: 8px;
  }

  .image-controls {
    width: 100%;
    justify-content: space-between;
  }

  ::v-deep .fixed-dialog {
    top: 20px !important;
    bottom: 20px !important;
    max-height: calc(100vh - 40px) !important;
  }

  ::v-deep .el-dialog__header {
    padding: 12px 16px !important;
  }

  ::v-deep .el-dialog__title {
    font-size: 16px;
  }

  ::v-deep .el-dialog__body {
    padding: 16px !important;
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
