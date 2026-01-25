import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './App.css';

// API configuration
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8000';

// Module mappings
const modules = {
  Motivation: "申请动机",
  Academic: "本科学习",
  Internship: "实习/工作",
  Why_School: "选校理由",
  Career_Goal: "职业规划"
};

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
  const [apiKey, setApiKey] = useState('');
  const [modelName, setModelName] = useState('gemini-3-pro-preview');

  // State for user inputs
  const [targetSchoolName, setTargetSchoolName] = useState('');
  const [counselorStrategy, setCounselorStrategy] = useState('');
  const [selectedModules, setSelectedModules] = useState({
    Motivation: true,
    Academic: true,
    Internship: true,
    Why_School: true,
    Career_Goal: true
  });
  const [spellingPreference, setSpellingPreference] = useState('British');

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

  // State for UI
  const [loading, setLoading] = useState(false);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [activeTab, setActiveTab] = useState('generate');
  const [toastMessage, setToastMessage] = useState('');

  // Initialize with default module selection
  useEffect(() => {
    const defaultSelected = {};
    displayOrder.forEach(module => {
      defaultSelected[module] = true;
    });
    setSelectedModules(defaultSelected);
  }, []);

  // Toggle module selection
  const toggleModule = (module) => {
    setSelectedModules(prev => ({
      ...prev,
      [module]: !prev[module]
    }));
  };

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

  const handleTranscriptFileChange = (e) => {
    const file = e.target.files[0];
    if (file && (file.type === 'application/pdf' || file.type.startsWith('image/'))) {
      setTranscriptFile(file);
    } else {
      alert('Please upload a PDF or image file');
    }
  };

  const handleCurriculumFilesChange = (e) => {
    const files = Array.from(e.target.files);
    const validFiles = files.filter(file => file.type.startsWith('image/'));
    if (validFiles.length !== files.length) {
      alert('Please upload image files only for curriculum');
    }
    setCurriculumFiles(validFiles);
  };

  // Show toast message
  const showToast = (message) => {
    setToastMessage(message);
    setTimeout(() => setToastMessage(''), 3000);
  };

  // Generate personal statement
  const handleGenerate = async () => {
    // Validation
    if (!apiKey) {
      alert('Please enter your Google API Key in the sidebar');
      return;
    }

    if (!targetSchoolName) {
      alert('Please enter target school and major');
      return;
    }

    if (!materialFile || !transcriptFile) {
      alert('Please upload both material/resume file and transcript file');
      return;
    }

    const selectedKeys = getSelectedModuleKeys();
    if (selectedKeys.length === 0) {
      alert('Please select at least one module');
      return;
    }

    setLoading(true);
    setLoadingProgress(0);

    const formData = new FormData();
    formData.append('api_key', apiKey);
    formData.append('model_name', modelName);
    formData.append('target_school_name', targetSchoolName);
    formData.append('counselor_strategy', counselorStrategy);
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

  // Generate headers
  const generateHeaders = async () => {
    if (!apiKey || !targetSchoolName) return;

    const formData = new FormData();
    formData.append('api_key', apiKey);
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
    if (!apiKey) {
      alert('Please enter your Google API Key');
      return;
    }

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
            api_key: apiKey,
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
    if (!apiKey || !fullChineseDraft) return;

    setLoading(true);

    try {
      const requestData = {
        api_key: apiKey,
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
    if (!apiKey || !fullTranslatedText) return;

    setLoading(true);

    try {
      const requestData = {
        api_key: apiKey,
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
          <h1>个人陈述写作</h1>
          <div className="tabs">
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
              审阅与翻译
            </button>
            <button
              className={`tab ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
              disabled={!fullChineseDraft}
            >
              导出
            </button>
          </div>
        </div>

        {/* Sidebar for settings */}
        <div className="section">
          <h2>系统设置</h2>
          <div className="form-group">
            <label htmlFor="apiKey">Google API Key</label>
            <input
              id="apiKey"
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder="Enter your Google API Key"
            />
          </div>
          <div className="form-group">
            <label htmlFor="modelName">Model</label>
            <select
              id="modelName"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
            >
              <option value="gemini-3-pro-preview">gemini-3-pro-preview</option>
              <option value="gemini-2.5-pro">gemini-2.5-pro</option>
            </select>
          </div>
        </div>

        {activeTab === 'generate' && (
          <>
            {/* Information Collection */}
            <div className="section">
              <h2>信息采集与素材上传</h2>

              <div className="columns">
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
                        <span>📄 文书素材/简历 (Word/PDF)</span>
                        {materialFile && (
                          <span className="file-name">{materialFile.name}</span>
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
                        <span>📊 成绩单 (截图/PDF)</span>
                        {transcriptFile && (
                          <span className="file-name">{transcriptFile.name}</span>
                        )}
                      </label>
                    </div>
                  </div>
                </div>

                {/* Counselor Guidance */}
                <div className="column">
                  <div className="section">
                    <h3>顾问指导意见</h3>
                    <p className="caption">设定文书的整体策略与调性</p>

                    <div className="form-group">
                      <textarea
                        value={counselorStrategy}
                        onChange={(e) => setCounselorStrategy(e.target.value)}
                        placeholder="例如：\n1. 强调量化背景\n2. 解释GPA劣势\n3. 突出某段实习的领导力..."
                        rows={8}
                      />
                    </div>
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
                      <label>课程设置 (Curriculum)</label>
                      <div className="tabs">
                        <button className="tab active">文本粘贴</button>
                        <button className="tab">图片上传</button>
                      </div>

                      <div className="tab-content">
                        <textarea
                          value={curriculumText}
                          onChange={(e) => setCurriculumText(e.target.value)}
                          placeholder="Core Modules: ..."
                          rows={6}
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
                          <span>📷 上传课程截图</span>
                          {curriculumFiles.length > 0 && (
                            <span className="file-name">
                              {curriculumFiles.length} file(s) selected
                            </span>
                          )}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Writing Settings */}
            <div className="section">
              <h2>写作设定</h2>

              <div className="columns">
                <div className="column">
                  <h3>选择模块 (点击切换选中状态):</h3>
                  <div className="module-toggle-container">
                    {displayOrder.map(moduleKey => (
                      <div
                        key={moduleKey}
                        className={`module-toggle ${selectedModules[moduleKey] ? 'active' : 'inactive'}`}
                        onClick={() => toggleModule(moduleKey)}
                      >
                        <button type="button">
                          {modules[moduleKey]}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="column">
                  <div className="form-group">
                    <label>拼写偏好 (Spelling)</label>
                    <div className="radio-group">
                      <label>
                        <input
                          type="radio"
                          value="British"
                          checked={spellingPreference === 'British'}
                          onChange={(e) => setSpellingPreference(e.target.value)}
                        />
                        🇬🇧 英式 (British)
                      </label>
                      <label>
                        <input
                          type="radio"
                          value="American"
                          checked={spellingPreference === 'American'}
                          onChange={(e) => setSpellingPreference(e.target.value)}
                        />
                        🇺🇸 美式 (American)
                      </label>
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
                  <h3>行业趋势调研与参考源 (Reference)</h3>
                  <BlueBox>
                    <div dangerouslySetInnerHTML={{ __html: motivationTrends }} />
                  </BlueBox>
                </div>
              )}

              <div className="columns">
                {/* Chinese Draft */}
                <div className="column">
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

                {/* English Translation */}
                <div className="column">
                  <div className="section">
                    <h3>🇺🇸 英文翻译与修改</h3>

                    <button
                      className="button"
                      onClick={handleTranslate}
                      disabled={loading || !fullChineseDraft}
                    >
                      {spellingPreference === 'British' ? '🇬🇧' : '🇺🇸'}
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
                <div className="column">
                  <div className="section">
                    <h3>🇨🇳 中文版</h3>
                    {fullChineseDraft ? (
                      <>
                        <p>页眉: {headers.cn || `${targetSchoolName} 个人陈述`}</p>
                        <button
                          className="download-button"
                          onClick={() => handleDownloadWord(true)}
                        >
                          📥 下载中文版 (.docx)
                        </button>
                      </>
                    ) : (
                      <p>暂无中文内容</p>
                    )}
                  </div>
                </div>

                {/* English Version */}
                <div className="column">
                  <div className="section">
                    <h3>🇺🇸 英文版</h3>
                    {fullTranslatedText ? (
                      <>
                        <p>页眉: {headers.en || `Personal Statement for ${targetSchoolName}`}</p>
                        <button
                          className="download-button"
                          onClick={() => handleDownloadWord(false)}
                        >
                          📥 下载英文版 (.docx)
                        </button>
                      </>
                    ) : (
                      <p>暂无英文翻译，请先在上方进行翻译。</p>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

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

export default App;