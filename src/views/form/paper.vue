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
            <!-- 首页图片 - 仅显示图片，不绑定画布 -->
            <div v-if="currentPaper.answers_parse_image_file1" class="image-item with-controls">
              <div class="image-header">
                <p>首页</p>
                <div class="image-controls">
                  <el-button
                    type="primary"
                    icon="el-icon-edit"
                    @click="openPositioningDialog('positioning1')"
                    size="mini"
                  >
                    编辑定位
                  </el-button>
                  <div class="position-status" :class="currentPaper.positioning1_enabled ? 'confirmed' : 'unconfirmed'">
                    {{ currentPaper.positioning1_enabled ? '定位已确认' : '定位未确认' }}
                  </div>
                </div>
              </div>

              <!-- 仅显示图片 -->
              <el-image
                :src="currentPaper.answers_parse_image_file1"
                fit="contain"
                :preview-src-list="[currentPaper.answers_parse_image_file1]"
                class="base-image"
                ref="detailImage1"
              >
                <div slot="error" class="image-placeholder">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </el-image>
            </div>
            <div v-else class="image-placeholder">
              <i class="el-icon-picture-outline"></i>
              <p>未上传图片1</p>
            </div>

            <!-- 尾页图片 - 仅显示图片，不绑定画布 -->
            <div v-if="currentPaper.answers_parse_image_file2" class="image-item with-controls">
              <div class="image-header">
                <p>尾页</p>
                <div class="image-controls">
                  <el-button
                    type="primary"
                    icon="el-icon-edit"
                    @click="openPositioningDialog('positioning2')"
                    size="mini"
                  >
                    编辑定位
                  </el-button>
                  <div class="position-status" :class="currentPaper.positioning2_enabled ? 'confirmed' : 'unconfirmed'">
                    {{ currentPaper.positioning2_enabled ? '定位已确认' : '定位未确认' }}
                  </div>
                </div>
              </div>

              <!-- 仅显示图片 -->
              <el-image
                :src="currentPaper.answers_parse_image_file2"
                fit="contain"
                :preview-src-list="[currentPaper.answers_parse_image_file2]"
                class="base-image"
                ref="detailImage2"
              >
                <div slot="error" class="image-placeholder">
                  <i class="el-icon-picture-outline"></i>
                </div>
              </el-image>
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
        <el-button @click="detailDialogVisible = false">关闭</el-button>
        <el-button type="warning" icon="el-icon-edit" @click="handleEditFromDetail">编辑</el-button>
      </div>
    </el-dialog>

   <!-- 定位编辑弹窗 -->
   <el-dialog
     :title="`编辑${editingPositioningType === 'positioning1' ? '首页' : '尾页'}定位`"
     :visible.sync="positioningDialogVisible"
     width="90%"
     custom-class="positioning-dialog"
     :body-style="{padding: 0}"
   >
     <!-- 外层滚动容器 -->
     <div class="original-size-container" ref="scrollBox">
       <!-- 图片包装器，用于精确计算尺寸 -->
       <div class="image-wrapper" ref="imageWrapper">
         <!-- 1. 原始尺寸图片（仅做底图展示） -->
         <el-image
           ref="oriImg"
           :src="currentPositioningImage"
           fit="none"
           class="original-image"
           @load="onImgLoaded"
         >
           <div slot="error" class="image-placeholder">
             <i class="el-icon-picture-outline"></i>
           </div>
         </el-image>

         <!-- 2. 与之同尺寸的可交互画布 -->
         <ImageCanvas
           :key="currentPositioningImage"
           :src="currentPositioningImage"
           v-model="currentPositioningData"
           :natural="true"
           class="canvas-overlay"
           ref="imageCanvas"
         />
       </div>
     </div>

     <div slot="footer" class="dialog-footer">
       <el-button @click="cancelPositioningEdit">取消</el-button>
       <el-button type="success" @click="confirmPositioningEdit">确定</el-button>
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
            :limit="1"
            accept=".docx"
            :on-exceed="handleFileExceed"
            :on-preview="handlePreview"
            :file-list="addTopicPaperFileList"
            :before-upload="beforeUpload"
            :auto-upload="false"
            :on-change="(file, fileList) => handleAddFileChange('topic', file, fileList)"
          >
            <div class="upload-button-group">
              <el-button slot="trigger" type="primary" size="mini">选取文件</el-button>
            </div>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="答题卡">
          <el-upload
            class="upload-demo"
            action="#"
            :limit="1"
            accept=".docx"
            :auto-upload="false"
            :on-exceed="handleFileExceed"
            :on-preview="handlePreview"
            :file-list="addAnswerCardFileList"
            :before-upload="beforeUpload"
            :on-change="(file, fileList) => handleAddFileChange('answer', file, fileList)"
          >
            <div class="upload-button-group">
              <el-button slot="trigger" type="primary" size="mini">选取文件</el-button>
            </div>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="参考答案">
          <el-upload
            class="upload-demo"
            action="#"
            :limit="1"
            accept=".docx"
            :auto-upload="false"
            :on-exceed="handleFileExceed"
            :on-preview="handlePreview"
            :file-list="addStandardAnswerFileList"
            :before-upload="beforeUpload"
            :on-change="(file, fileList) => handleAddFileChange('standard', file, fileList)"
          >
            <div class="upload-button-group">
              <el-button slot="trigger" type="primary" size="mini">选取文件</el-button>
            </div>
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
            :limit="1"
            accept=".docx"
            :auto-upload="false"
            :on-exceed="handleFileExceed"
            :on-preview="handlePreview"
            :file-list="topicPaperFileList"
            :before-upload="beforeUpload"
            :on-change="(file, fileList) => handleFileChange('topic', file, fileList)"
          >
            <div class="upload-button-group">
              <el-button slot="trigger" type="primary" size="mini">选取文件</el-button>
              <el-button type="success" @click.stop="uploadTopicFile" size="mini">上传文件</el-button>
            </div>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="答题卡">
          <el-upload
            class="upload-demo"
            action="#"
            :limit="1"
            accept=".docx"
            :on-exceed="handleFileExceed"
            :auto-upload="false"
            :on-preview="handlePreview"
            :file-list="answerCardFileList"
            :before-upload="beforeUpload"
            :on-change="(file, fileList) => handleFileChange('answer', file, fileList)"
          >
            <div class="upload-button-group">
              <el-button slot="trigger" type="primary" size="mini">选取文件</el-button>
              <el-button type="success" @click.stop="uploadAnswerFile" size="mini">上传文件</el-button>
            </div>
            <div slot="tip" class="el-upload__tip">可选，支持上传 doc、docx 等格式文件</div>
          </el-upload>
        </el-form-item>
        <el-form-item label="参考答案">
          <el-upload
            class="upload-demo"
            action="#"
            :limit="1"
            accept=".docx"
            :auto-upload="false"
            :on-exceed="handleFileExceed"
            :on-preview="handlePreview"
            :file-list="standardAnswerFileList"
            :before-upload="beforeUpload"
            :on-change="(file, fileList) => handleFileChange('standard', file, fileList)"
          >
            <div class="upload-button-group">
              <el-button slot="trigger" type="primary" size="mini">选取文件</el-button>
              <el-button type="success" @click.stop="uploadStandardFile" size="mini">上传文件</el-button>
            </div>
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

      // 定位编辑弹窗相关
      positioningDialogVisible: false,
      editingPositioningType: '', // 'positioning1' 或 'positioning2'
      currentPositioningImage: '',
      currentPositioningData: [],
      tempPositioningData: [], // 临时存储编辑中的定位数据
      isPositioningFullscreen: false,
      imageDimensions: {
        positioningImage: { width: 0, height: 0 }
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
      labelWidth: '120px',
      addUploadedFiles: {
            topic: null,
            answer: null,
            standard: null
          }
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
    handleFileExceed(files, fileList) {
          this.$message.warning(`只能选择一个文件!`);
        },
    onImgLoaded() {
      // 强制重新计算滚动区域和图片尺寸
      this.$nextTick(() => {
        const box = this.$refs.scrollBox;
        const img = this.$refs.oriImg.$el.querySelector('img');
        const canvas = this.$refs.imageCanvas;
        const wrapper = this.$refs.imageWrapper;

        if (box && img) {
          // 清除图片可能存在的变换
          img.style.transform = 'none';
          img.style.objectFit = 'none';

          // 记录图片原始尺寸
          const naturalWidth = img.naturalWidth;
          const naturalHeight = img.naturalHeight;

          // 强制设置图片尺寸为原始尺寸
          img.style.width = `${naturalWidth}px`;
          img.style.height = `${naturalHeight}px`;

          // 确保包装器尺寸与图片一致
          if (wrapper) {
            wrapper.style.width = `${naturalWidth}px`;
            wrapper.style.height = `${naturalHeight}px`;
          }

          // 同步画布尺寸与图片尺寸
          if (canvas && typeof canvas.setSize === 'function') {
            canvas.setSize(naturalWidth, naturalHeight);
          }

          // 触发容器重绘，确保滚动区域正确计算
          box.style.display = 'none';
          box.offsetHeight; // 触发重排
          box.style.display = 'block';

          // 强制滚动到左上角
          box.scrollTop = 0;
          box.scrollLeft = 0;

          // 确保没有其他样式影响
          box.style.padding = '0';
          box.style.margin = '0';
        }
      });
    },
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


    // 编辑文件变化处理 - 修复核心
    handleFileChange(type, file, fileList) {
      console.log(file)
      console.log(fileList)
      // 始终保留最后一个有效的文件（过滤已移除的文件）
      const validFiles = (fileList || []).filter(f => f.status !== 'removed');

      if (validFiles.length > 0) {
        // 优先取 raw 文件（el-upload 中用户选择的原始文件）
        this.uploadedFiles[type] = validFiles[validFiles.length - 1].raw;
        console.log(`文件已选择: ${validFiles[validFiles.length - 1].name}`);
      } else {
        this.uploadedFiles[type] = null;
        console.log('文件已移除');
      }

      // 更新文件列表显示
      const fileListMap = {
        topic: 'topicPaperFileList',
        answer: 'answerCardFileList',
        standard: 'standardAnswerFileList',
        image1: 'answerImage1FileList',
        image2: 'answerImage2FileList'
      }
      this[fileListMap[type]] = [...fileList];
    },


    handleAddFileChange(type, file, fileList) {
      console.log(567)
      console.log(file)
      const fileListMap = {
        'topic': 'addTopicPaperFileList',
        'answer': 'addAnswerCardFileList',
        'standard': 'addStandardAnswerFileList'
      }
      this[fileListMap[type]] = [...fileList]

      if (fileList.length > 0 && file.raw) {
        this.addUploadedFiles[type] = file.raw;
      } else {
        this.addUploadedFiles[type] = null;
      }
    },

    // 文档上传前验证
    beforeUpload(file) {
      console.log(123)
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

    // 上传试卷文件 - 添加调试日志
    async uploadTopicFile() {
      console.log('尝试上传试卷文件:', this.uploadedFiles.topic);

      // 直接从文件列表获取文件作为备选方案
      const validFile = this.topicPaperFileList.find(f => f.status !== 'removed');
      const fileToUpload = this.uploadedFiles.topic || (validFile ? validFile.raw : null);

      if (!fileToUpload) {
        this.$message.warning('请先选择要上传的试卷文件');
        return;
      }

      try {
        const token = Cookies.get('access');
        const formData = new FormData();
        formData.append('topic_paper_file', fileToUpload);

        const res = await request({
          url: `/sexam/testpapers/${this.editForm.id}/`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          data: formData
        });

        this.$message.success('试卷文件上传成功');
        this.editForm.topic_paper_file = res.topic_paper_file;
        this.topicPaperFileList = this.parseFileInfo(res.topic_paper_file, '试卷');
        this.uploadedFiles.topic = null;
        await this.fetchTestPapers();
      } catch (error) {
        console.error('上传试卷文件失败：', error);
        this.$message.error('上传试卷文件失败，请稍后重试');
      } finally {
        this.$message.closeAll();
      }
    },

    // 上传答题卡文件 - 添加调试日志
    async uploadAnswerFile() {
      console.log('尝试上传答题卡文件:', this.uploadedFiles.answer);

      // 直接从文件列表获取文件作为备选方案
      const validFile = this.answerCardFileList.find(f => f.status !== 'removed');
      const fileToUpload = this.uploadedFiles.answer || (validFile ? validFile.raw : null);

      if (!fileToUpload) {
        this.$message.warning('请先选择要上传的答题卡文件');
        return;
      }

      try {
        const token = Cookies.get('access');
        const formData = new FormData();
        formData.append('answers_parse_file', fileToUpload);

        const res = await request({
          url: `/sexam/testpapers/${this.editForm.id}/`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          data: formData
        });

        this.$message.success('答题卡文件上传成功');
        this.editForm.answers_parse_file = res.answers_parse_file;
        this.answerCardFileList = this.parseFileInfo(res.answers_parse_file, '答题卡');
        this.uploadedFiles.answer = null;
        await this.fetchTestPapers();
      } catch (error) {
        console.error('上传答题卡文件失败：', error);
        this.$message.error('上传答题卡文件失败，请稍后重试');
      } finally {
        this.$message.closeAll();
      }
    },

    // 上传参考答案文件 - 添加调试日志
    async uploadStandardFile() {
      console.log('尝试上传参考答案文件:', this.uploadedFiles.standard);

      // 直接从文件列表获取文件作为备选方案
      const validFile = this.standardAnswerFileList.find(f => f.status !== 'removed');
      const fileToUpload = this.uploadedFiles.standard || (validFile ? validFile.raw : null);

      if (!fileToUpload) {
        this.$message.warning('请先选择要上传的参考答案文件');
        return;
      }

      try {
        const token = Cookies.get('access');
        const formData = new FormData();
        formData.append('standard_answer_file', fileToUpload);

        const res = await request({
          url: `/sexam/testpapers/${this.editForm.id}/`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          data: formData
        });

        this.$message.success('参考答案文件上传成功');
        this.editForm.standard_answer_file = res.standard_answer_file;
        this.standardAnswerFileList = this.parseFileInfo(res.standard_answer_file, '参考答案');
        this.uploadedFiles.standard = null;
        await this.fetchTestPapers();
      } catch (error) {
        console.error('上传参考答案文件失败：', error);
        this.$message.error('上传参考答案文件失败，请稍后重试');
      } finally {
        this.$message.closeAll();
      }
    },

    async handleEditSubmit() {
      // 验证必填项
      if (!this.editForm.name) {
        this.$message.error('请输入试卷名称');
        return;
      }

      if (!this.editForm.subject) {
        this.$message.error('请选择学科类型');
        return;
      }

      try {
        const token = Cookies.get('access');
        const formData = new FormData();
        // 只修改试卷名称和学科类型
        formData.append('name', this.editForm.name);
        formData.append('subject', this.editForm.subject);
        formData.append('exam', this.$route.params.id);

        await request({
          url: `/sexam/testpapers/${this.editForm.id}/`,
          method: 'patch',
          headers: {
            Authorization: `Bearer ${token}`,
          },
          data: formData
        });

        this.$message.success('编辑成功');
        this.editDialogVisible = false;
        await this.fetchTestPapers();
      } catch (error) {
        console.error('编辑试卷失败：', error);
        this.$message.error('编辑失败，请稍后重试');
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

        // 添加文件到formData
        if (this.addUploadedFiles.topic) {
          formData.append('topic_paper_file', this.addUploadedFiles.topic);
        }
        if (this.addUploadedFiles.answer) {
          formData.append('answers_parse_file', this.addUploadedFiles.answer);
        }
        if (this.addUploadedFiles.standard) {
          formData.append('standard_answer_file', this.addUploadedFiles.standard);
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

    // 打开定位编辑弹窗
    openPositioningDialog(type) {
      this.editingPositioningType = type;
      // 根据类型设置对应的图片和定位数据
      this.currentPositioningImage = type === 'positioning1'
        ? this.currentPaper.answers_parse_image_file1
        : this.currentPaper.answers_parse_image_file2;

      // 保存当前定位数据的副本，用于编辑
      this.currentPositioningData = JSON.parse(JSON.stringify(this.currentPaper[type] || []));
      this.tempPositioningData = JSON.parse(JSON.stringify(this.currentPositioningData));

      // 打开弹窗
      this.positioningDialogVisible = true;

      // 确保弹窗打开后正确初始化滚动位置
      this.$nextTick(() => {
        const box = this.$refs.scrollBox;
        if (box) {
          box.scrollTop = 0;
          box.scrollLeft = 0;
        }
      });
    },

    // 接收来自ImageCanvas的位置更新
    handlePositionUpdated(newPositions) {
      this.currentPositioningData = newPositions;
    },

    // 取消定位编辑
    cancelPositioningEdit() {
      // 恢复原始数据
      this.currentPositioningData = this.tempPositioningData;
      this.positioningDialogVisible = false;
      this.editingPositioningType = '';
    },

    // 确认定位编辑
    confirmPositioningEdit() {
      // 保存定位数据到当前试卷对象
      this.currentPaper[this.editingPositioningType] = this.currentPositioningData;
      // 标记为已确认
      this.currentPaper[`${this.editingPositioningType}_enabled`] = true;
      // 保存到服务器
      this.savePositioningToServer();
      this.positioningDialogVisible = false;
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
  margin-bottom: 20px;
}

.base-image {
  width: 100%;
  height: auto;
  display: block;
  border: 1px solid #eee;
  border-radius: 4px;
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

/* 定位编辑弹窗样式 */
.positioning-dialog {
  max-width: 95vw !important;
}

.original-size-container {
  position: relative;
  display: block;
  overflow: auto;
  max-height: 70vh;
  padding: 0;
  margin: 0 auto;
  background-color: #f9f9f9;
  border-radius: 4px;
}

/* 图片包装器，确保正确计算尺寸和定位 */
.image-wrapper {
  position: relative;
  display: inline-block;
  padding: 0;
  margin: 0;
}

.original-image {
  display: block;
  /* 关键：确保图片显示原始尺寸，不被缩放 */
  max-width: none !important;
  max-height: none !important;
  width: auto !important;
  height: auto !important;
  object-fit: none !important;
  transform: none !important;
}

/* 定位编辑弹窗中的Canvas样式 */
::v-deep .positioning-dialog .canvas-overlay {
  position: absolute;
  top: 0;
  left: 0;
  pointer-events: auto;
  /* 确保画布不被缩放 */
  transform: none !important;
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

/* 上传按钮组样式 */
.upload-button-group {
  display: flex;
  gap: 8px; /* 按钮之间的间距 */
  align-items: center;
}

/* 确保按钮大小一致 */
.upload-button-group .el-button {
  min-width: 100px; /* 统一按钮宽度 */
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

.positioning-dialog {
  max-width: 95vw !important;
  max-height: 90vh !important;
}

.positioning-container {
  width: 100%;
  padding: 16px;
  box-sizing: border-box;
}

/* 修复滚动问题的核心样式 */
.original-size-container {
  overflow: auto;
  max-height: 70vh;
  background: #f9f9f9;
}

/* 增强滚动条样式 */
.original-size-container::-webkit-scrollbar {
  width: 12px;
  height: 12px;
}

.original-size-container::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 6px;
}

.original-size-container::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 6px;
  border: 3px solid #f1f1f1;
}

.original-size-container::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .original-size-container {
    max-height: calc(70vh - 80px);
    padding: 0;
  }

  .positioning-container {
    padding: 8px;
  }
}
</style>




