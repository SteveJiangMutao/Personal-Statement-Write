import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Module mappings
// const modules = {
//   Motivation: "申请动机",
//   Academic: "本科学习",
//   Internship: "实习/工作",
//   Why_School: "选校理由",
//   Career_Goal: "职业规划"
// };

const englishModules = {
  Motivation: "Motivation",
  Academic: "Academic Background",
  Internship: "Professional Experience",
  Why_School: "Why School",
  Career_Goal: "Career Goal"
};

const displayOrder = ["Motivation", "Academic", "Internship", "Why_School", "Career_Goal"];

function App() {
  // State for API configuration
  const [modelName, setModelName] = useState('gemini-2.5-pro');

  // State for user inputs
  const [targetSchoolName, setTargetSchoolName] = useState('');
  const [selectedModules, setSelectedModules] = useState({
    Motivation: true,
    Academic: true,
    Internship: true,
    Why_School: true,
    Career_Goal: true
  });
  const [spellingPreference] = useState('British');

  // State for file uploads
  const [materialFile, setMaterialFile] = useState(null);
  const [transcriptFile, setTranscriptFile] = useState(null);
  const [curriculumText, setCurriculumText] = useState('');
  const [curriculumFiles, setCurriculumFiles] = useState([]);

  // State for generated content
  const [generatedSections, setGeneratedSections] = useState({});
  const [fullChineseDraft, setFullChineseDraft] = useState('');
  const [motivationTrends, setMotivationTrends] = useState('');
  const [fullTranslatedText, setFullTranslatedText] = useState('');
  const [headers, setHeaders] = useState({ cn: '', en: '' });

  // State for experience analysis
  const [manualExperiences, setManualExperiences] = useState('');
  const [analysisResults, setAnalysisResults] = useState({
    extractedExperiences: '',
    matchedIntersections: '',
    researchInsights: ''
  });
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  // State for mode selection (writing/refine)
  const [mode, setMode] = useState(null); // null = not selected, 'writing' = 写作模式, 'refine' = 润色模式

  // State for refine mode
  const [oldPS, setOldPS] = useState('');
  const [targetSchool, setTargetSchool] = useState('');
  const [targetMajor, setTargetMajor] = useState('');
  const [courseInfo, setCourseInfo] = useState('');
  const [strategy, setStrategy] = useState('');
  const [sectionsData, setSectionsData] = useState([]);
  const [confirmedParagraphs, setConfirmedParagraphs] = useState([]);
  const [confirmedContents, setConfirmedContents] = useState({});
  const [_finalPreviewText, setFinalPreviewText] = useState('');
  const [_finalPreviewTextCleaned, setFinalPreviewTextCleaned] = useState('');

  // State for refine mode file uploads
  const [oldPSFile, setOldPSFile] = useState(null);
  const [courseInfoFiles, setCourseInfoFiles] = useState([]);

  // State for UI
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('generate');
  const [toastMessage, setToastMessage] = useState('');
  // State for streaming output
  const [streamingText, setStreamingText] = useState('');
  const [_streamingModule, setStreamingModule] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);

  // Initialize with default module selection
  useEffect(() => {
    const defaultSelected = {};
    displayOrder.forEach(module => {
      defaultSelected[module] = true;
    });
    setSelectedModules(defaultSelected);
  }, []);

  // Toggle module selection - currently unused
  // const toggleModule = (module) => {
  //   setSelectedModules(prev => ({
  //     ...prev,
  //     [module]: !prev[module]
  //   }));
  // };

  // Get selected module keys
  const getSelectedModuleKeys = () => {
    return Object.keys(selectedModules).filter(key => selectedModules[key]);
  };

  // Handle file uploads
  const handleMaterialFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.docx'))) {
      setMaterialFile(file);
    } else {
      alert('Please upload a PDF or DOCX file');
    }
  };

  const removeMaterialFile = () => {
    setMaterialFile(null);
  };

  const handleTranscriptFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setTranscriptFile(file);
    } else {
      alert('Please upload a PDF or image file');
    }
  };

  const removeTranscriptFile = () => {
    setTranscriptFile(null);
  };

  const handleCurriculumFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      alert('Please upload image files only for curriculum');
    }
    setCurriculumFiles(validFiles);
  };

  // Refine mode file upload handlers
  const handleOldPSFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || file.name.endsWith('.docx') || file.type === 'text/plain')) {
      setOldPSFile(file);
      // Read text file content
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (event) => {
          setOldPS(event.target.result);
        };
        reader.readAsText(file);
      }
    } else {
      alert('Please upload a PDF, DOCX, or TXT file');
    }
  };

  const handleCourseInfoFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      alert('Please upload image files only for course info');
    }
    setCourseInfoFiles(validFiles);
  };

  const removeOldPSFile = () => {
    setOldPSFile(null);
  };

  const removeCourseInfoFile = (index) => {
    setCourseInfoFiles(prev => prev.filter((_, i) => i !== index));
  };

  // Show toast message
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Refine mode - AI analysis
  const handleRefineAnalyze = async () => {
    if (!oldPS || !targetSchool || !targetMajor) {
      alert('请填写旧文书、目标学校和目标专业');
      return;
    }
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('api_key', '');
      formData.append('model_name', modelName);
      formData.append('old_ps', oldPS);
      formData.append('target_school', targetSchool);
      formData.append('target_major', targetMajor);
      if (courseInfo) {
        formData.append('course_info', courseInfo);
      }
      if (strategy) {
        formData.append('strategy', strategy);
      }
      // TODO: 处理图片上传
      const response = await axios.post(`${API_BASE_URL}/api/refine/analyze`, formData);
      if (response.data.success) {
        setSectionsData(response.data.sections_data);
        showToast('✅ 分析完成！');
        setActiveTab('edit');
      } else {
        alert('分析失败: ' + (response.data.detail || '未知错误'));
      }
    } catch (error) {
      console.error('分析错误:', error);
      alert('分析失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Generate final preview for refine mode
  const handleGeneratePreview = async () => {
    if (sectionsData.length === 0) {
      alert('没有段落数据');
      return;
    }
    // Combine confirmed contents or use draft
    let finalText = '';
    for (let i = 0; i < sectionsData.length; i++) {
      const content = confirmedContents[i] || sectionsData[i].draft;
      finalText += content + '\n\n';
    }
    setFinalPreviewText(finalText);
    setFinalPreviewTextCleaned(finalText); // For now, same as original
    showToast('✅ 最终预览生成完成！');
    setActiveTab('export');
  };

  // Generate personal statement with streaming
  const generateWithStream = async () => {
    // Validation
    if (!targetSchoolName) {
      alert('Please enter target school and major');
      return;
    }

    if (!materialFile || !transcriptFile) {
      alert('Please upload both material/resume file and transcript file');
      return;
    }

    // 写作模式只生成动机模块
    const selectedKeys = mode === 'writing' ? ['Motivation'] : getSelectedModuleKeys();
    if (selectedKeys.length === 0) {
      alert('Please select at least one module');
      return;
    }

    setLoading(true);
    setIsStreaming(true);
    setStreamingText('');
    setStreamingModule('');
    setGeneratedSections({});
    setFullChineseDraft('');
    setMotivationTrends('');

    const formData = new FormData();
    formData.append('api_key', ''); // API key is now set via environment variable
    formData.append('model_name', modelName);
    formData.append('target_school_name', targetSchoolName);
    formData.append('counselor_strategy', '');
    formData.append('selected_modules', JSON.stringify(selectedKeys));
    formData.append('spelling_preference', spellingPreference);
    formData.append('material_file', materialFile);
    formData.append('transcript_file', transcriptFile);

    if (curriculumText) {
      formData.append('curriculum_text', curriculumText);
    }

    curriculumFiles.forEach((file, index) => {
      formData.append('curriculum_files', file);
    });

    try {
      const response = await fetch(`${API_BASE_URL}/api/generate-stream`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = '';
      let eventType = 'message';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop(); // Keep last incomplete line

        for (let i = 0; i < lines.length; i++) {
          const line = lines[i].trim();
          if (line.startsWith('event: ')) {
            eventType = line.slice(7);
          } else if (line.startsWith('data: ')) {
            const data = line.slice(6);
            if (data === '') continue;

            try {
              const parsed = JSON.parse(data);

              if (eventType === 'module_start') {
                setStreamingModule(parsed.module);
                setStreamingText('');
              } else if (eventType === 'trends') {
                setMotivationTrends(parsed.trends);
              } else if (eventType === 'complete') {
                // Final data
                setGeneratedSections(parsed.generated_sections);
                setFullChineseDraft(parsed.full_chinese_draft);
                setMotivationTrends(prev => parsed.motivation_trends || prev);
                // Generate headers
                await generateHeaders();
              } else if (eventType === 'error') {
                throw new Error(parsed.error);
              } else {
                // Default data event (chunks)
                if (parsed.chunk) {
                  setStreamingText(prev => prev + parsed.chunk);
                  // Also update fullChineseDraft incrementally
                  setFullChineseDraft(prev => prev + parsed.chunk);
                }
              }
            } catch (e) {
              console.error('Failed to parse SSE data:', e);
            }
          }
        }
      }

      // After streaming completes, set the final state
      // The complete event should have sent the final data
      // For simplicity, we'll rely on the final state set by complete event
      // If not, we can fall back to original handleGenerate
      setLoading(false);
      setIsStreaming(false);
      showToast('✅ Draft generated successfully!');
      setActiveTab('review');
    } catch (error) {
      console.error('Streaming generation error:', error);
      alert('Streaming generation failed: ' + error.message);
      setLoading(false);
      setIsStreaming(false);
      // Fallback to non-streaming generation
      await handleGenerateLegacy();
    }
  };

  // Legacy non-streaming generation
  const handleGenerateLegacy = async () => {
    // Validation
    if (!targetSchoolName) {
      alert('Please enter target school and major');
      return;
    }

    if (!materialFile || !transcriptFile) {
      alert('Please upload both material/resume file and transcript file');
      return;
    }

    const selectedKeys = mode === 'writing' ? ['Motivation'] : getSelectedModuleKeys();
    if (selectedKeys.length === 0) {
      alert('Please select at least one module');
      return;
    }

    setLoading(true);
    setLoadingProgress(0);

    const formData = new FormData();
    formData.append('api_key', ''); // API key is now set via environment variable
    formData.append('model_name', modelName);
    formData.append('target_school_name', targetSchoolName);
    formData.append('counselor_strategy', '');
    formData.append('selected_modules', JSON.stringify(selectedKeys));
    formData.append('spelling_preference', spellingPreference);
    formData.append('material_file', materialFile);
    formData.append('transcript_file', transcriptFile);

    if (curriculumText) {
      formData.append('curriculum_text', curriculumText);
    }

    curriculumFiles.forEach((file, index) => {
      formData.append('curriculum_files', file);
    });

    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setLoadingProgress(percentCompleted);
        }
      });

      if (response.data.success) {
        setGeneratedSections(response.data.generated_sections);
        setFullChineseDraft(response.data.full_chinese_draft);
        setMotivationTrends(response.data.motivation_trends);
        setFullTranslatedText(''); // Clear previous translation

        // Generate headers
        await generateHeaders();

        showToast('✅ Draft generated successfully!');
        setActiveTab('review');
      } else {
        alert('Generation failed: ' + (response.data.detail || 'Unknown error'));
      }
    } catch (error) {
      console.error('Generation error:', error);
      alert('Generation failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
      setLoadingProgress(0);
    }
  };

  // Generate personal statement
  const handleGenerate = async () => {
    if (mode === 'writing') {
      await generateWithStream();
    } else {
      await handleGenerateLegacy();
    }
  };

  // Analyze experiences and match with curriculum
  const handleAnalyzeExperiences = async () => {
    // Validation
    if (!targetSchoolName) {
      alert('请输入目标学校与专业');
      return;
    }

    if (!materialFile && !manualExperiences.trim()) {
      alert('请上传文书素材/简历文件或手动输入课外经历');
      return;
    }

    setIsAnalyzing(true);

    const formData = new FormData();
    formData.append('api_key', ''); // API key is now set via environment variable
    formData.append('model_name', modelName);
    formData.append('target_school_name', targetSchoolName);

    if (curriculumText) {
      formData.append('curriculum_text', curriculumText);
    }

    curriculumFiles.forEach((file, index) => {
      formData.append('curriculum_files', file);
    });

    if (materialFile) {
      formData.append('material_file', materialFile);
    }

    if (manualExperiences.trim()) {
      formData.append('manual_experiences', manualExperiences);
    }

    try {
      const response = await axios.post(`${API_BASE_URL}/api/analyze-experiences`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });

      if (response.data.success) {
        setAnalysisResults({
          extractedExperiences: response.data.extracted_experiences,
          matchedIntersections: response.data.matched_intersections,
          researchInsights: response.data.research_insights
        });
        showToast('✅ 经历分析与调研完成！');
      } else {
        alert('分析失败: ' + (response.data.error || '未知错误'));
      }
    } catch (error) {
      console.error('Analysis error:', error);
      alert('分析失败: ' + (error.response?.data?.detail || error.message));
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Generate headers
  const generateHeaders = async () => {
    if (!targetSchoolName) return;

    const formData = new FormData();
    formData.append('api_key', ''); // API key is now set via environment variable
    formData.append('model_name', modelName);
    formData.append('target_school_name', targetSchoolName);

    try {
      const response = await axios.post(`${API_BASE_URL}/api/generate-header`, formData);
      if (response.data.success) {
        setHeaders({
          cn: response.data.header_cn,
          en: response.data.header_en
        });
      }
    } catch (error) {
      console.error('Header generation error:', error);
      // Use fallback headers
      setHeaders({
        cn: `${targetSchoolName} 个人陈述`,
        en: `Personal Statement for ${targetSchoolName}`
      });
    }
  };

  // Translate content
  const handleTranslate = async () => {
    if (!fullChineseDraft) {
      alert('No Chinese draft to translate');
      return;
    }

    setLoading(true);

    try {
      // Translate each section individually
      const translatedSections = [];

      for (const moduleKey of displayOrder) {
        if (generatedSections[moduleKey]) {
          const chineseText = generatedSections[moduleKey];
          if (!chineseText.trim()) continue;

          const requestData = {
            api_key: '', // API key is now set via environment variable
            model_name: modelName,
            chinese_text: chineseText,
            spelling_preference: spellingPreference,
            module_type: moduleKey
          };

          const response = await axios.post(`${API_BASE_URL}/api/translate`, requestData);

          if (response.data.success) {
            const englishHeader = englishModules[moduleKey] || moduleKey;
            translatedSections.push(`--- ${englishHeader} ---\n${response.data.translated_text}`);
          }
        }
      }

      setFullTranslatedText(translatedSections.join('\n\n'));
      showToast('✅ Translation completed!');
    } catch (error) {
      console.error('Translation error:', error);
      alert('Translation failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Edit content (Chinese)
  const handleEditChinese = async () => {
    if (!fullChineseDraft) return;

    setLoading(true);

    try {
      const requestData = {
        api_key: '', // API key is now set via environment variable
        model_name: modelName,
        text: fullChineseDraft,
        is_chinese: true
      };

      const response = await axios.post(`${API_BASE_URL}/api/edit`, requestData);

      if (response.data.success) {
        setFullChineseDraft(response.data.edited_text);
        showToast('✅ Chinese draft edited successfully!');
      }
    } catch (error) {
      console.error('Edit error:', error);
      alert('Edit failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Edit content (English)
  const handleEditEnglish = async () => {
    if (!fullTranslatedText) return;

    setLoading(true);

    try {
      const requestData = {
        api_key: '', // API key is now set via environment variable
        model_name: modelName,
        text: fullTranslatedText,
        is_chinese: false
      };

      const response = await axios.post(`${API_BASE_URL}/api/edit`, requestData);

      if (response.data.success) {
        setFullTranslatedText(response.data.edited_text);
        showToast('✅ English translation edited successfully!');
      }
    } catch (error) {
      console.error('Edit error:', error);
      alert('Edit failed: ' + (error.response?.data?.detail || error.message));
    } finally {
      setLoading(false);
    }
  };

  // Download Word document
  const handleDownloadWord = async (isChinese = true) => {
    const content = isChinese ? fullChineseDraft : fullTranslatedText;
    const headerText = isChinese ? headers.cn : headers.en;

    if (!content) {
      alert(`No ${isChinese ? 'Chinese' : 'English'} content to download`);
      return;
    }

    try {
      const requestData = {
        content: content,
        header_text: headerText,
        is_chinese: isChinese,
        font_name: isChinese ? '宋体' : 'Times New Roman'
      };

      const response = await axios.post(`${API_BASE_URL}/api/generate-word`, requestData, {
        responseType: 'blob'
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', isChinese ? 'personal_statement_cn.docx' : 'personal_statement_en.docx');
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast(`✅ ${isChinese ? 'Chinese' : 'English'} document downloaded!`);
    } catch (error) {
      console.error('Download error:', error);
      alert('Download failed: ' + (error.response?.data?.detail || error.message));
    }
  };

  // Render blue box component
  const BlueBox = ({ children }) => (
    <div className="blue-box">
      <p>{children}</p>
    </div>
  );

  // Render mode selection screen
  const renderModeSelection = () => (
    <div className="App">
      <div className="container">
        <div className="header">
          <h1>个人陈述助手</h1>
          <p className="subtitle">选择您需要的功能</p>
        </div>

        <div className="mode-selection">
          <div className="mode-card" onClick={() => setMode('writing')}>
            <div className="mode-icon">✍️</div>
            <h3>写作模式</h3>
            <p>生成新的个人陈述</p>
            <ul className="mode-features">
              <li>信息采集与素材上传</li>
              <li>经历分析与课程匹配</li>
              <li>动机生成与行业调研</li>
            </ul>
            <button className="button mode-button">开始写作</button>
          </div>

          <div className="mode-card" onClick={() => setMode('refine')}>
            <div className="mode-icon">✨</div>
            <h3>润色模式</h3>
            <p>修改现有个人陈述</p>
            <ul className="mode-features">
              <li>旧文书分析与适配</li>
              <li>段落批注修改</li>
              <li>中英混合翻译</li>
              <li>AI词汇去除</li>
              <li>Word文档导出</li>
            </ul>
            <button className="button mode-button">开始润色</button>
          </div>
        </div>
      </div>
    </div>
  );

  // Render main application based on mode
  const renderMainApp = () => {
    const appTitle = mode === 'writing' ? '个人陈述写作' : '个人陈述润色';

    return (
      <div className="App">
        {/* Toast notification */}
        {toastMessage && (
          <div className="toast">
            {toastMessage}
          </div>
        )}

        <div className="container">
          {/* Header */}
          <div className="header">
            <h1>{appTitle}</h1>
            <div className="tabs">
              {mode === 'writing' ? (
                // Writing mode tabs
                <>
                  <button
                    className={`tab ${activeTab === 'generate' ? 'active' : ''}`}
                    onClick={() => setActiveTab('generate')}
                  >
                    信息采集
                  </button>
                  <button
                    className={`tab ${activeTab === 'review' ? 'active' : ''}`}
                    onClick={() => setActiveTab('review')}
                    disabled={!fullChineseDraft}
                  >
                    审阅
                  </button>
                  <button
                    className={`tab ${activeTab === 'export' ? 'active' : ''}`}
                    onClick={() => setActiveTab('export')}
                    disabled={!fullChineseDraft}
                  >
                    导出
                  </button>
                </>
              ) : (
                // Refine mode tabs - will be implemented later
                <>
                  <button
                    className={`tab ${activeTab === 'input' ? 'active' : ''}`}
                    onClick={() => setActiveTab('input')}
                  >
                    文书输入
                  </button>
                  <button
                    className={`tab ${activeTab === 'analysis' ? 'active' : ''}`}
                    onClick={() => setActiveTab('analysis')}
                    disabled={!fullChineseDraft}
                  >
                    AI分析
                  </button>
                  <button
                    className={`tab ${activeTab === 'edit' ? 'active' : ''}`}
                    onClick={() => setActiveTab('edit')}
                    disabled={!fullChineseDraft}
                  >
                    段落编辑
                  </button>
                  <button
                    className={`tab ${activeTab === 'export' ? 'active' : ''}`}
                    onClick={() => setActiveTab('export')}
                    disabled={!fullChineseDraft}
                  >
                    导出
                  </button>
                </>
              )}
            </div>
          </div>

        {/* Sidebar for settings */}
        <div className="section">
          <h2>系统设置</h2>
          <div className="form-group">
            <label htmlFor="modelName">Model</label>
            <select
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            >
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
              <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
            </select>
          </div>
        </div>

        {mode === 'writing' && (
          <>
            {activeTab === 'generate' && (
          <>
            {/* Information Collection */}
            <div className="section">
              <h2>信息采集与素材上传</h2>

              <div className="columns vertical-columns">
                {/* Student Information */}
                <div className="column">
                  <div className="section">
                    <h3>学生提供信息</h3>
                    <p className="caption">上传简历、素材表与成绩单</p>

                    <div className="file-upload">
                      <input
                        type="file"
                        id="materialFile"
                        accept=".docx,.pdf"
                        onChange={handleMaterialFileChange}
                      />
                      <label htmlFor="materialFile">
                        <span>文书素材/简历</span>
                        {materialFile && (
                          <span className="file-name">
                            {materialFile.name}
                            <button type="button" onClick={removeMaterialFile} style={{ marginLeft: '10px', color: 'red' }}>删除</button>
                          </span>
                        )}
                      </label>
                    </div>

                    <div className="file-upload">
                      <input
                        type="file"
                        id="transcriptFile"
                        accept=".pdf,.png,.jpg,.jpeg"
                        onChange={handleTranscriptFileChange}
                      />
                      <label htmlFor="transcriptFile">
                        <span>成绩单</span>
                        {transcriptFile && (
                          <span className="file-name">
                            {transcriptFile.name}
                            <button type="button" onClick={removeTranscriptFile} style={{ marginLeft: '10px', color: 'red' }}>删除</button>
                          </span>
                        )}
                      </label>
                    </div>

                    {/* Manual experiences input */}
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <label>或手动输入课外经历：</label>
                      <textarea
                        value={manualExperiences}
                        onChange={(e) => setManualExperiences(e.target.value)}
                        placeholder="例如：实习：XX公司，数据分析实习生，2023.06-2023.09，负责数据清洗..."
                        rows={6}
                      />
                    </div>


                    {/* Analysis results display */}
                    {analysisResults.researchInsights && (
                      <div className="section" style={{ marginTop: '1rem', borderColor: 'var(--primary-color)' }}>
                        <h4>经历分析与调研结果</h4>

                        {analysisResults.extractedExperiences && (
                          <div className="form-group">
                            <label>提取的课外经历：</label>
                            <textarea
                              value={analysisResults.extractedExperiences}
                              readOnly
                              rows={4}
                              style={{ backgroundColor: '#f8f9fa', fontFamily: 'monospace' }}
                            />
                          </div>
                        )}

                        {analysisResults.matchedIntersections && (
                          <div className="form-group">
                            <label>经历与课程匹配点：</label>
                            <textarea
                              value={analysisResults.matchedIntersections}
                              readOnly
                              rows={4}
                              style={{ backgroundColor: '#f8f9fa', fontFamily: 'monospace' }}
                            />
                          </div>
                        )}

                        {analysisResults.researchInsights && (
                          <div className="form-group">
                            <label>行业与学术前沿洞察：</label>
                            <textarea
                              value={analysisResults.researchInsights}
                              readOnly
                              rows={8}
                              style={{ backgroundColor: '#f8f9fa', fontFamily: 'monospace' }}
                            />
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                </div>


                {/* Target Program Information */}
                <div className="column">
                  <div className="section">
                    <h3>目标专业信息</h3>
                    <p className="caption">输入目标学校与课程设置</p>

                    <div className="form-group">
                      <input
                        type="text"
                        value={targetSchoolName}
                        onChange={(e) => setTargetSchoolName(e.target.value)}
                        placeholder="例如：UCL - MSc Business Analytics"
                      />
                    </div>

                    <div className="form-group">
                      <label>课程设置</label>
                      <p className="caption" style={{ marginBottom: '0.5rem' }}>文本粘贴或上传截图</p>

                      <div style={{ marginBottom: '1rem' }}>
                        <textarea
                          value={curriculumText}
                          onChange={(e) => setCurriculumText(e.target.value)}
                          placeholder="Core Modules: ..."
                          rows={6}
                          style={{ marginBottom: '0' }}
                        />
                      </div>

                      <div className="file-upload">
                        <input
                          type="file"
                          id="curriculumFiles"
                          accept=".png,.jpg,.jpeg"
                          multiple
                          onChange={handleCurriculumFilesChange}
                        />
                        <label htmlFor="curriculumFiles">
                          <span>上传课程截图</span>
                          {curriculumFiles.length > 0 && (
                            <span className="file-name">
                              {curriculumFiles.length} file(s) selected
                            </span>
                          )}
                        </label>
                      </div>

                    {/* Analyze experiences button */}
                    <div className="form-group" style={{ marginTop: '1rem' }}>
                      <button
                        className="button"
                        onClick={handleAnalyzeExperiences}
                        disabled={isAnalyzing || !targetSchoolName || (!materialFile && !manualExperiences.trim())}
                      >
                        {isAnalyzing ? (
                          <>
                            <span className="spinner"></span>
                            分析中...
                          </>
                        ) : '分析经历与课程匹配'}
                      </button>
                    </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>


            {/* Generate Button */}
            <div className="section">
              <button
                className="button"
                onClick={handleGenerate}
                disabled={loading}
              >
                {loading ? (
                  <>
                    <span className="spinner"></span>
                    正在生成...
                  </>
                ) : (
                  '开始生成初稿'
                )}
              </button>

              {loading && (
                <div className="progress-bar">
                  <div
                    className="progress-fill"
                    style={{ width: `${loadingProgress}%` }}
                  ></div>
                </div>
              )}
              {isStreaming && (
                <div className="section" style={{ marginTop: '1rem', borderColor: 'var(--primary-color)' }}>
                  <h4>正在生成内容...</h4>
                  <div className="form-group">
                    <div
                      style={{ backgroundColor: '#f8f9fa', fontFamily: 'monospace', padding: '1rem', borderRadius: '8px', minHeight: '200px', whiteSpace: 'pre-wrap' }}
                      dangerouslySetInnerHTML={{ __html: streamingText + '<span class="streaming-cursor"></span>' }}
                    />
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {activeTab === 'review' && fullChineseDraft && (
          <>
            {/* Review and Translation */}
            <div className="section">
              <h2>审阅与翻译</h2>

              <BlueBox>
                满意左侧中文稿后，点击上方按钮生成翻译。
              </BlueBox>

              {motivationTrends && (
                <div className="section">
                  <h3>行业趋势调研与参考源</h3>
                  <BlueBox>
                    <div dangerouslySetInnerHTML={{ __html: motivationTrends }} />
                  </BlueBox>
                </div>
              )}

              <div className="columns">
                {/* Chinese Draft */}
                <div className="column" style={mode === 'writing' ? { flex: '1 1 100%' } : {}}>
                  <div className="section">
                    <h3>中文草稿 (可编辑)</h3>
                    <div className="form-group">
                      <textarea
                        value={fullChineseDraft}
                        onChange={(e) => setFullChineseDraft(e.target.value)}
                        rows={20}
                      />
                    </div>

                    <BlueBox>
                      批注修改: 在想改的句子后面用 【修改意见】 给出指令。
                    </BlueBox>

                    <button
                      className="button button-secondary"
                      onClick={handleEditChinese}
                      disabled={loading || !fullChineseDraft}
                    >
                      执行中文批注修改
                    </button>
                  </div>
                </div>

                {/* English Translation - only show in refine mode */}
                {mode !== 'writing' && (
                  <div className="column">
                    <div className="section">
                      <h3>英文翻译与修改</h3>

                      <button
                        className="button"
                        onClick={handleTranslate}
                        disabled={loading || !fullChineseDraft}
                      >
                        {spellingPreference === 'British' ? '[英]' : '[美]'}
                        翻译全文 ({spellingPreference === 'British' ? 'British' : 'American'})
                      </button>

                      {fullTranslatedText && (
                        <>
                          <div className="form-group" style={{ marginTop: '1rem' }}>
                            <textarea
                              value={fullTranslatedText}
                              onChange={(e) => setFullTranslatedText(e.target.value)}
                              rows={18}
                            />
                          </div>

                          <BlueBox>
                            批注修改: 在想改的句子后面用 【修改意见】 给出指令。
                          </BlueBox>

                          <button
                            className="button button-secondary"
                            onClick={handleEditEnglish}
                            disabled={loading || !fullTranslatedText}
                          >
                            执行英文批注修改
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}

        {activeTab === 'export' && fullChineseDraft && (
          <>
            {/* Export Section */}
            <div className="section">
              <h2>导出</h2>

              <div className="columns">
                {/* Chinese Version */}
                <div className="column" style={mode === 'writing' ? { flex: '1 1 100%' } : {}}>
                  <div className="section">
                    <h3>中文版</h3>
                    {fullChineseDraft ? (
                      <>
                        <p>页眉: {headers.cn || `${targetSchoolName} 个人陈述`}</p>
                        <button
                          className="download-button"
                          onClick={() => handleDownloadWord(true)}
                        >
                          [下载] 下载中文版
                        </button>
                      </>
                    ) : (
                      <p>暂无中文内容</p>
                    )}
                  </div>
                </div>

                {/* English Version - only show in refine mode */}
                {mode !== 'writing' && (
                  <div className="column">
                    <div className="section">
                      <h3>英文版</h3>
                      {fullTranslatedText ? (
                        <>
                          <p>页眉: {headers.en || `Personal Statement for ${targetSchoolName}`}</p>
                          <button
                            className="download-button"
                            onClick={() => handleDownloadWord(false)}
                          >
                            [下载] 下载英文版
                          </button>
                        </>
                      ) : (
                        <p>暂无英文翻译，请先在上方进行翻译。</p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
          </>
        )}
      </div>

        {mode === 'refine' && (
          <>
            {activeTab === 'input' && (
              <>
                {/* 旧文书输入 */}
                <div className="section">
                  <h2>1. 旧文书输入</h2>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="oldPSFile"
                      accept=".pdf,.docx,.txt"
                      onChange={handleOldPSFileChange}
                    />
                    <label htmlFor="oldPSFile">
                      <span>上传旧文书文件 (PDF, DOCX, TXT)</span>
                      {oldPSFile && (
                        <span className="file-name">
                          {oldPSFile.name}
                          <button type="button" onClick={removeOldPSFile} style={{ marginLeft: '10px', color: 'red' }}>删除</button>
                        </span>
                      )}
                    </label>
                  </div>
                  <div className="form-group">
                    <textarea
                      value={oldPS}
                      onChange={(e) => setOldPS(e.target.value)}
                      placeholder="或直接将旧文书文本内容复制粘贴在此处"
                      rows={10}
                    />
                  </div>
                </div>

                {/* 新项目信息 */}
                <div className="section">
                  <h2>2. 新项目信息</h2>
                  <div className="columns">
                    <div className="column">
                      <div className="form-group">
                        <label>目标学校</label>
                        <input
                          type="text"
                          value={targetSchool}
                          onChange={(e) => setTargetSchool(e.target.value)}
                          placeholder="例如：Columbia University"
                        />
                      </div>
                    </div>
                    <div className="column">
                      <div className="form-group">
                        <label>目标专业</label>
                        <input
                          type="text"
                          value={targetMajor}
                          onChange={(e) => setTargetMajor(e.target.value)}
                          placeholder="例如：MS in Biostatistics"
                        />
                      </div>
                    </div>
                  </div>
                </div>

                {/* 课程信息 */}
                <div className="section">
                  <h2>3. 课程信息</h2>
                  <div className="form-group">
                    <textarea
                      value={courseInfo}
                      onChange={(e) => setCourseInfo(e.target.value)}
                      placeholder="粘贴课程设置文本"
                      rows={8}
                    />
                  </div>
                  <div className="file-upload">
                    <input
                      type="file"
                      id="courseInfoFiles"
                      accept=".png,.jpg,.jpeg,.webp"
                      multiple
                      onChange={handleCourseInfoFilesChange}
                    />
                    <label htmlFor="courseInfoFiles">
                      <span>上传课程截图 (可选)</span>
                      {courseInfoFiles.length > 0 && (
                        <span className="file-name">
                          {courseInfoFiles.length} 个文件已选择
                          {courseInfoFiles.map((file, index) => (
                            <div key={index}>
                              {file.name}
                              <button type="button" onClick={() => removeCourseInfoFile(index)} style={{ marginLeft: '10px', color: 'red' }}>删除</button>
                            </div>
                          ))}
                        </span>
                      )}
                    </label>
                  </div>
                </div>

                {/* 写作策略 */}
                <div className="section">
                  <h2>4. 写作策略 (可选)</h2>
                  <div className="form-group">
                    <textarea
                      value={strategy}
                      onChange={(e) => setStrategy(e.target.value)}
                      placeholder="例如：这段经历请帮我保留，但要强调我的领导力..."
                      rows={6}
                    />
                  </div>
                </div>

                {/* 开始分析按钮 */}
                <div className="section">
                  <button
                    className="button"
                    onClick={handleRefineAnalyze}
                    disabled={!oldPS || !targetSchool || !targetMajor}
                  >
                    开始AI分析
                  </button>
                </div>
              </>
            )}
            {activeTab === 'analysis' && (
              <div className="section">
                <h2>AI分析结果</h2>
                {sectionsData.length === 0 ? (
                  <div>
                    <p>尚未进行分析。请点击下方按钮开始分析。</p>
                    <button
                      className="button"
                      onClick={handleRefineAnalyze}
                      disabled={loading || !oldPS || !targetSchool || !targetMajor}
                    >
                      {loading ? '分析中...' : '开始AI分析'}
                    </button>
                  </div>
                ) : (
                  <div>
                    <p>分析完成！共 {sectionsData.length} 个段落。</p>
                    <button
                      className="button"
                      onClick={() => setActiveTab('edit')}
                    >
                      进入段落编辑
                    </button>
                    <div style={{ marginTop: '20px' }}>
                      {sectionsData.map((section, index) => (
                        <div key={index} className="section" style={{ marginBottom: '15px', borderLeft: '4px solid var(--primary-color)', paddingLeft: '15px' }}>
                          <h4>段落 {index + 1}</h4>
                          <p><strong>逻辑分析:</strong> {section.logic}</p>
                          <p><strong>草稿:</strong> {section.draft}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {activeTab === 'edit' && (
              <div className="section">
                <h2>段落编辑</h2>
                {sectionsData.length === 0 ? (
                  <p>暂无段落数据，请先进行AI分析。</p>
                ) : (
                  <>
                    <p>请审阅每个段落，确认或编辑内容。</p>
                    {sectionsData.map((section, index) => {
                      const isConfirmed = confirmedParagraphs.includes(index);
                      const content = confirmedContents[index] || section.draft;
                      return (
                        <div key={index} className="section" style={{ marginBottom: '20px', border: '1px solid var(--border-color)', borderRadius: '8px', padding: '15px' }}>
                          <h4>段落 {index + 1}</h4>
                          <p><strong>逻辑分析:</strong> {section.logic}</p>
                          <div className="form-group">
                            <label>草稿内容:</label>
                            <textarea
                              value={content}
                              onChange={(e) => {
                                const newContents = { ...confirmedContents };
                                newContents[index] = e.target.value;
                                setConfirmedContents(newContents);
                              }}
                              rows={6}
                              disabled={isConfirmed}
                            />
                          </div>
                          <div className="form-group">
                            <button
                              className="button"
                              onClick={() => {
                                if (isConfirmed) {
                                  setConfirmedParagraphs(confirmedParagraphs.filter(i => i !== index));
                                } else {
                                  setConfirmedParagraphs([...confirmedParagraphs, index]);
                                }
                              }}
                            >
                              {isConfirmed ? '已确认' : '确认段落'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                    <div className="section">
                      <h3>下一步</h3>
                      <p>已确认段落: {confirmedParagraphs.length} / {sectionsData.length}</p>
                      <button
                        className="button"
                        disabled={confirmedParagraphs.length !== sectionsData.length}
                        onClick={handleGeneratePreview}
                      >
                        生成最终预览
                      </button>
                    </div>
                  </>
                )}
              </div>
            )}
            {activeTab === 'export' && (
              <div>润色模式 - 导出</div>
            )}
          </>
        )}

      {/* Loading overlay */}
      {loading && (
        <div className="loading-overlay">
          <div className="loading">
            <span className="spinner"></span>
            <span>Processing...</span>
          </div>
        </div>
      )}
    </div>
  );
}

  // Main return - render mode selection or main app
  if (mode === null) {
    return renderModeSelection();
  } else {
    return renderMainApp();
  }
}

export default App;