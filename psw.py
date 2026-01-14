import streamlit as st
import google.generativeai as genai
from PIL import Image
import docx
from docx.shared import Pt, RGBColor
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
import PyPDF2
import io
import os
import time
import random
import re  # 引入正则库用于文本清洗
from datetime import datetime

# ==========================================
# 🔴 核心配置：网络代理
# ==========================================
# os.environ["HTTP_PROXY"] = "http://127.0.0.1:7897"
# os.environ["HTTPS_PROXY"] = "http://127.0.0.1:7897"

# ==========================================
# 0. 自动版本号生成逻辑
# ==========================================
def get_app_version():
    try:
        timestamp = os.path.getmtime(__file__)
        dt = datetime.fromtimestamp(timestamp)
        build_ver = dt.strftime('%m%d.%H%M')
        return f"v13.33.{build_ver}", dt.strftime('%Y-%m-%d %H:%M:%S')
    except Exception:
        return "v13.33.Dev", "Unknown"

current_version, last_updated_time = get_app_version()

# ==========================================
# 1. 页面基础配置
# ==========================================
st.set_page_config(page_title="个人陈述写作", layout="wide")

# ==========================================
# UI 样式注入
# ==========================================
def apply_custom_css():
    st.markdown("""
    <style>
    /* 引入 Inter 字体 */
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
    
    /* 全局变量 - 定制配色 */
    :root {
        --primary-color: #3666FA; /* 宝蓝 RGB 54, 102, 250 */
        --bg-color: #FBF7EC;      /* 米色 RGB 251, 247, 236 */
        --text-color: #3666FA;    /* 字体颜色跟随主色 */
        --button-text: #FBF7EC;   /* 按钮内文字颜色 (米色) */
    }

    /* 基础重置 */
    html, body, [class*="css"] {
        font-family: 'Inter', -apple-system, BlinkMacSystemFont, sans-serif;
        color: var(--text-color);
        background-color: var(--bg-color);
    }
    
    /* 隐藏 Streamlit 默认 Header 和 Footer */
    header {visibility: hidden;}
    footer {visibility: hidden;}

    /* 主容器背景优化 */
    .stApp {
        background-color: var(--bg-color);
    }

    /* 侧边栏优化 */
    [data-testid="stSidebar"] {
        background-color: #0f172a; /* 深蓝背景 */
        border-right: 1px solid #1e293b;
    }
    
    [data-testid="stSidebar"] h1,
    [data-testid="stSidebar"] h2, 
    [data-testid="stSidebar"] h3, 
    [data-testid="stSidebar"] label,
    [data-testid="stSidebar"] p,
    [data-testid="stSidebar"] span,
    [data-testid="stSidebar"] .stMarkdown,
    [data-testid="stSidebar"] div {
        color: #ffffff !important;
    }
    
    [data-testid="stSidebar"] hr {
        border-color: #334155 !important;
    }

    /* 侧边栏样式 */
    [data-testid="stSidebar"] .stTextInput input {
        background-color: #1e293b !important; 
        color: #ffffff !important;
        border: 1px solid #334155 !important;
    }

    [data-testid="stSidebar"] .stSelectbox div[data-baseweb="select"] {
        background-color: #1e293b !important; 
        border: 1px solid #334155 !important; 
    }
    
    [data-testid="stSidebar"] .stSelectbox div[data-baseweb="select"] * {
        color: #1e293b !important;                    
        font-family: 'Inter', sans-serif !important;  
    }
    
    [data-testid="stSidebar"] .stSelectbox svg {
        fill: #ffffff !important;
    }

    /* 主区域样式 */
    h1 {
        color: var(--text-color) !important;
        font-weight: 800 !important;
        font-size: 2.5rem !important;
        letter-spacing: -0.02em;
        margin-bottom: 2rem !important;
        text-align: left !important;
    }
    
    h2, h3 {
        color: var(--text-color) !important;
        font-weight: 600 !important;
        margin-top: 1rem !important;
        margin-bottom: 1rem !important;
    }
    
    .main p, .main label, .main .stMarkdown, .main .stText, .main .stCaption {
        color: var(--text-color) !important;
    }

    .main .stTextInput input, .main .stTextArea textarea, .main .stSelectbox div[data-baseweb="select"] {
        border: 1px solid rgba(54, 102, 250, 0.3) !important;
        border-radius: 8px !important;
        padding: 0.6rem 0.8rem !important;
        background-color: #ffffff !important;
        font-size: 13px !important;
        color: #1e293b !important;
        transition: all 0.2s ease;
    }

    .stTextInput input:focus, .stTextArea textarea:focus {
        border-color: var(--primary-color) !important;
        box-shadow: 0 0 0 2px rgba(54, 102, 250, 0.1) !important;
    }

    /* 按钮样式修改：区分 Primary (选中) 和 Secondary (未选中) */
    div.stButton > button[kind="primary"] {
        background-color: var(--primary-color) !important;
        color: #ffffff !important;
        border: none !important;
        border-radius: 8px !important;
        padding: 0.6rem 1.5rem !important;
        font-weight: 500 !important;
        box-shadow: 0 1px 2px rgba(54, 102, 250, 0.2) !important;
        transition: all 0.2s ease !important;
        width: 100%; 
    }

    div.stButton > button[kind="secondary"] {
        background-color: #E2E8F0 !important; /* 浅灰色 */
        color: #64748B !important;            /* 深灰色 */
        border: none !important;
        border-radius: 8px !important;
        padding: 0.6rem 1.5rem !important;
        font-weight: 500 !important;
        width: 100%; 
    }

    div.stButton > button:hover {
        opacity: 0.9;
        transform: translateY(-1px);
    }
    
    .stDownloadButton button {
        background-color: var(--primary-color) !important;
        color: var(--button-text) !important;
        border: none !important;
    }

    .streamlit-expanderHeader {
        background-color: #ffffff !important;
        border: 1px solid rgba(54, 102, 250, 0.2) !important;
        border-radius: 8px !important;
        color: var(--text-color) !important;
        font-weight: 600 !important;
    }
    
    [data-testid="stFileUploader"] {
        border: 1px dashed rgba(54, 102, 250, 0.4);
        background-color: #ffffff;
        border-radius: 8px;
        padding: 1rem;
        padding-bottom: 20px;
    }
    [data-testid="stFileUploader"]:hover {
        border-color: var(--primary-color);
        background-color: rgba(54, 102, 250, 0.05);
    }

    .block-container {
        padding-top: 3rem !important;
        padding-bottom: 3rem !important;
        max-width: 1200px !important;
    }
    
    hr {
        border-color: rgba(54, 102, 250, 0.2) !important;
    }
    
    .stAlert {
        background-color: #1e293b !important;
        border: none !important;
        color: #ffffff !important;
    }

    .stRadio p {
        font-size: 13px !important;
    }

    div[data-testid="stHorizontalBlock"] {
        align-items: stretch;
        height: auto;
    }
    div[data-testid="column"] {
        display: flex;
        flex-direction: column;
        height: 100%;
    }
    div[data-testid="stVerticalBlockBorderWrapper"] {
        flex: 1 1 auto;
        height: 100%;
        display: flex;
        flex-direction: column;
        min-height: 450px;
        border-color: rgba(54, 102, 250, 0.2) !important;
        background-color: #ffffff !important;
    }
    div[data-testid="stVerticalBlockBorderWrapper"] > div {
        flex-grow: 1;
        display: flex;
        flex-direction: column;
    }
    .stMarkdown p {
        margin-bottom: 0px;
    }
    </style>
    """, unsafe_allow_html=True)

apply_custom_css()

# 初始化 Session State
if 'generated_sections' not in st.session_state:
    st.session_state['generated_sections'] = {}
if 'motivation_trends' not in st.session_state:
    st.session_state['motivation_trends'] = ""
if 'full_chinese_draft' not in st.session_state:
    st.session_state['full_chinese_draft'] = ""
if 'full_translated_text' not in st.session_state:
    st.session_state['full_translated_text'] = ""
if 'main_chat_history' not in st.session_state:
    st.session_state['main_chat_history'] = []

# 模块选择状态初始化
display_order = ["Motivation", "Academic", "Internship", "Why_School", "Career_Goal"]
if 'module_states' not in st.session_state:
    # 默认全选 (True)
    st.session_state['module_states'] = {key: True for key in display_order}

# 标题
st.title("个人陈述写作")
st.markdown("---")

# ==========================================
# 2. 核心文案库
# ==========================================

# --- A. 幽默加载文案库 ---
FUNNY_LOADING_MESSAGES = [
    "☕️ 正在煮咖啡，顺便思考一下人生...",
    "🧠 正在和 Google 总部的服务器进行脑电波对接...",
    "🚀 正在以此生最快的速度翻阅整个互联网...",
    "🐢 别急，AI 也是需要喘口气的...",
    "🔥 为了这个问题，显卡正在微微发烫...",
    "🧙‍♂️ 正在召唤数据魔法，请勿打扰...",
    "🧐 正在假装很深沉地思考...",
    "💾 正在从赛博空间的角落里打捞数据...",
    "✨ 灵感正在加载中，进度 99%...",
    "🤖 正在学习如何像人类一样说话...",
    "📚 正在快速阅读 1000 本相关书籍...",
    "🪐 正在向外星文明发送求助信号...",
    "🍕 正在吃一口虚拟披萨补充能量...",
    "🎻 正在为您演奏一首数据交响曲...",
    "🏃‍♂️ 正在数据的海洋里狂奔...",
    "🧩 正在拼凑逻辑的碎片...",
    "🔋 正在给神经元充电...",
    "📡 正在校准卫星信号...",
    "🧹 正在清理思维里的杂草...",
    "🎲 正在掷骰子决定用哪个词（开玩笑的）..."
]

def get_random_loading_msg():
    return random.choice(FUNNY_LOADING_MESSAGES)

# 辅助函数：渲染蓝色圆角提示框
# 🔴 修改：智能判断是否为 HTML。如果是 HTML（如 Reference 列表），不替换换行符，保留 HTML 结构
def render_blue_box(text):
    # 如果文本包含 HTML 闭合标签（如 </div> 或 </ul>），则认为是预格式化的 HTML
    if "</div>" in text or "</ul>" in text:
        html_text = text
    else:
        # 否则认为是普通文本，将换行符转换为 HTML 换行
        html_text = text.replace('\n', '<br>')
        
    st.markdown(f"""
    <div style="
        background-color: #3666FA; 
        color: #ffffff; 
        padding: 15px 20px; 
        border-radius: 12px; 
        margin-bottom: 20px; 
        font-size: 13px; 
        line-height: 1.6;
        box-shadow: 0 2px 5px rgba(54, 102, 250, 0.2);
    ">
        {html_text}
    </div>
    """, unsafe_allow_html=True)

# Word 导出辅助函数：添加页眉下框线
def set_bottom_border(paragraph):
    """
    为段落添加下框线 (用于页眉)
    """
    p = paragraph._p
    pPr = p.get_or_add_pPr()
    pBdr = OxmlElement('w:pBdr')
    bottom = OxmlElement('w:bottom')
    bottom.set(qn('w:val'), 'single')
    bottom.set(qn('w:sz'), '6') # 1/8 pt, 6 = 0.75pt
    bottom.set(qn('w:space'), '1')
    bottom.set(qn('w:color'), '000000') # 黑色
    pBdr.append(bottom)
    pPr.append(pBdr)

# Word 导出辅助函数：生成 Word 文档 (包含清洗逻辑)
def create_word_docx(content, header_text, font_name, is_chinese=False):
    doc = docx.Document()
    
    # --- 1. 设置页眉 ---
    section = doc.sections[0]
    header = section.header
    
    # 获取页眉的第一个段落（默认存在）
    header_para = header.paragraphs[0]
    header_para.text = header_text
    header_para.alignment = docx.enum.text.WD_ALIGN_PARAGRAPH.LEFT 
    
    # 设置页眉下框线
    set_bottom_border(header_para)
    
    # 设置页眉字体样式 (12pt, 斜体)
    for run in header_para.runs:
        run.font.name = font_name
        run.font.size = Pt(12)
        run.font.italic = True
        # 处理中文字体显示
        if is_chinese:
            run._element.rPr.rFonts.set(qn('w:eastAsia'), font_name)
            
    # --- 2. 设置正文 (清洗逻辑优化) ---
    # 1. 去除 Markdown 加粗符号
    content = content.replace("**", "")
    # 2. 去除 Markdown 单星号 (列表或斜体)
    content = content.replace("*", "")
    
    # 按行处理
    for line in content.split('\n'):
        line = line.strip()
        
        # 3. 跳过空行
        if not line:
            continue
            
        # 4. 🚨 核心修改：跳过段落标题行 (特征：以 --- 开头)
        # 确保只保留正文，移除类似 "--- Motivation ---" 或 "--- 申请动机 ---" 的行
        if line.startswith("---") and line.endswith("---"):
            continue
            
        p = doc.add_paragraph(line)
        # 设置正文样式 (11pt)
        for run in p.runs:
            run.font.name = font_name
            run.font.size = Pt(11)
            # 处理中文字体显示
            if is_chinese:
                run._element.rPr.rFonts.set(qn('w:eastAsia'), font_name)
    
    # 保存到内存
    bio = io.BytesIO()
    doc.save(bio)
    return bio.getvalue()

# ==========================================
# 3. 系统设置 (侧边栏)
# ==========================================
with st.sidebar:
    st.header("系统设置")
    
    api_key = st.text_input("请输入 Google API Key", type="password", help="请在 Google AI Studio 申请 Key")
    
    if not api_key:
        st.warning("⚠️ 请输入 Key")
    else:
        st.success("✅ Key 已就绪")
    
    model_name = st.selectbox("选择模型", ["gemini-3-pro-preview", "gemini-2.5-pro"], index=0)

# ==========================================
# 4. 核心函数
# ==========================================
def read_word_file(file):
    try:
        doc = docx.Document(file)
        full_text = []
        for para in doc.paragraphs:
            full_text.append(para.text)
        return '\n'.join(full_text)
    except Exception as e:
        return f"Error reading Word file: {e}"

def read_pdf_text(file):
    try:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading PDF file: {e}"

def get_gemini_response(prompt, media_content=None, text_context=None):
    if not api_key:
        return "Error: 请先在左侧侧边栏输入 API Key"
        
    genai.configure(api_key=api_key)
    model = genai.GenerativeModel(model_name)
    
    content = []
    content.append(prompt)
    
    if text_context:
        content.append(f"\n【参考文档/背景信息 (简历或素材表)】:\n{text_context}")
    
    if media_content:
        if isinstance(media_content, list):
            content.extend(media_content)
        else:
            content.append(media_content)
        
    try:
        response = model.generate_content(content)
        return response.text
    except Exception as e:
        return f"Error: {str(e)}"

# ==========================================
# 5. 界面：信息采集
# ==========================================
st.header("信息采集与素材上传")

col_student, col_counselor, col_target = st.columns(3)

# --- 第一栏：学生提供信息 ---
with col_student:
    with st.container(border=True):
        st.markdown("### 学生提供信息")
        st.caption("上传简历、素材表与成绩单")
        
        uploaded_material = st.file_uploader("文书素材/简历 (Word/PDF)", type=['docx', 'pdf'])
        uploaded_transcript = st.file_uploader("成绩单 (截图/PDF)", type=['png', 'jpg', 'jpeg', 'pdf'])

# --- 第二栏：顾问指导意见 ---
with col_counselor:
    with st.container(border=True):
        st.markdown("### 顾问指导意见")
        st.caption("设定文书的整体策略与调性")
        
        counselor_strategy = st.text_area(
            "写作策略/人设强调", 
            height=280, 
            placeholder="例如：\n1. 强调量化背景\n2. 解释GPA劣势\n3. 突出某段实习的领导力..."
        )

# --- 第三栏：目标专业信息 ---
with col_target:
    with st.container(border=True):
        st.markdown("### 目标专业信息")
        st.caption("输入目标学校与课程设置")
        
        target_school_name = st.text_input("目标学校 & 专业", placeholder="例如：UCL - MSc Business Analytics")
        
        st.markdown("**课程设置 (Curriculum)**") 
        
        tab_text, tab_img = st.tabs(["文本粘贴", "图片上传"])
        
        with tab_text:
            target_curriculum_text = st.text_area("粘贴课程列表", height=140, placeholder="Core Modules: ...", label_visibility="collapsed")
        
        with tab_img:
            uploaded_curriculum_images = st.file_uploader("上传课程截图", type=['png', 'jpg', 'jpeg'], accept_multiple_files=True, label_visibility="collapsed")

# 读取素材文本
student_background_text = ""
if uploaded_material:
    if uploaded_material.name.endswith('.docx'):
        student_background_text = read_word_file(uploaded_material)
    elif uploaded_material.name.endswith('.pdf'):
        student_background_text = read_pdf_text(uploaded_material)

# ==========================================
# 6. 界面：写作设定 (拼写偏好 & 模块选择)
# ==========================================
st.markdown("---")
st.header("写作设定")

# 模块标题映射
modules = {
    "Motivation": "申请动机",
    "Academic": "本科学习",
    "Internship": "实习/工作",
    "Why_School": "选校理由",
    "Career_Goal": "职业规划"
}

english_modules = {
    "Motivation": "Motivation",
    "Academic": "Academic Background",
    "Internship": "Professional Experience",
    "Why_School": "Why School",
    "Career_Goal": "Career Goal"
}

col_modules, col_style = st.columns([3, 1])

with col_modules:
    st.markdown("**选择模块 (点击切换选中状态):**")
    # 使用列布局 + 按钮实现自定义 Toggle 效果
    mod_cols = st.columns(len(display_order))
    
    for idx, key in enumerate(display_order):
        is_selected = st.session_state['module_states'][key]
        label = modules[key]
        
        # 根据状态决定按钮类型 (Primary=蓝/白, Secondary=灰/灰)
        btn_type = "primary" if is_selected else "secondary"
        
        # 在对应列渲染按钮
        if mod_cols[idx].button(label, key=f"btn_mod_{key}", type=btn_type, use_container_width=True):
            # 点击后切换状态并刷新
            st.session_state['module_states'][key] = not st.session_state['module_states'][key]
            st.rerun()

    # 计算最终选中的模块列表
    selected_modules = [key for key in display_order if st.session_state['module_states'][key]]

with col_style:
    spelling_preference = st.radio(
        "拼写偏好 (Spelling)",
        ["🇬🇧 英式 (British)", "🇺🇸 美式 (American)"],
        help="翻译时将严格遵循所选的拼写习惯 (如 colour vs color)"
    )

# ==========================================
# 7. 核心逻辑：生成 Prompt
# ==========================================
st.markdown("---")
st.header("一键点击创作")

CLEAN_OUTPUT_RULES = """
【绝对输出规则】
1. 只输出正文内容本身。
2. 严禁包含开场白、结尾语或结构说明。
3. 严禁使用 Markdown 格式（如加粗、列表符号、标题符号）。
4. 输出必须是纯文本。
5. 必须写成一个完整的、连贯的中文自然段。
"""

TRANSLATION_RULES_BASE = """
【Translation Task】
Translate the provided Chinese text into a professional, human-sounding Personal Statement paragraph.

【CRITICAL ANTI-AI STYLE GUIDE】
1. **KILL THE "AI SENTENCE PATTERN"**: 
   - **ABSOLUTELY FORBIDDEN**: The pattern "I did X, **thereby/thus/enabling** me to do Y." 
   - **SOLUTION**: Split into two sentences or use active verbs.

2. **SEMICOLONS (;) FOR FLOW**:
   - **MANDATORY**: When a sentence is grammatically complete but the thought is not finished (and leads directly into the next point), use a **semicolon (;)** to connect them.

3. **ADVERB CONTROL (ZERO TOLERANCE)**:
   - **STRICTLY PROHIBITED**: The combination of **Adverb + Verb** (e.g., "deeply analyze", "successfully completed") OR **Adverb + Adjective** (e.g., "perfectly align", "keenly interested").
   - **ACTION**: Delete the adverb entirely. Just use the verb or adjective.

4. **VOCABULARY PURGE**: 
   - Use precise, simple words.

5. **ENHANCE COHESION & NARRATIVE FLOW (CRITICAL)**: 
   - **MANDATORY**: You MUST actively add varied transitional phrases and logical connectors (e.g., "Furthermore," "In contrast," "Consequently," "Given this context") between sentences AND between paragraphs.
   - **GOAL**: Ensure the text flows smoothly as a unified narrative, not a disjointed list of sentences. The priority is reading fluency and the overall integrity of the article.

【BANNED WORDS LIST (Strictly Prohibited)】
[Verbs]: delve into, uncover, reveal, recognize, master, refine, cultivate, address, bridge, spearhead, pioneer, align with, stems from, underscore, highlight
[Adjectives/Adverbs]: instrumental, pivotal, seamless, systematically, rigorously, profoundly, deeply, acutely, keenly, comprehensively, perfectly, meticulously, proficiency, Additionally
[Nouns]: paradigm, trajectory, aspirations, vision, landscape, tapestry, realm, foundation, tenure, testament, commitment
[Connectors]: thereby, thus (when used with -ing), in turn
[Phrases]: "not only... but also", "Building on this", "rich tapestry", "testament to", "a wide array of", "my goal is to"， “focus will be”

【Formatting】
1. Output as ONE single paragraph.
2. Output the ENTIRE text in **Bold**.
3. No Markdown headers.
"""

if st.button("开始生成初稿", type="primary"):
    if not api_key:
        st.error("请先在左侧侧边栏输入有效的 Google API Key")
        st.stop()

    has_curriculum = target_curriculum_text or uploaded_curriculum_images
    
    if not uploaded_material or not uploaded_transcript or not has_curriculum:
        st.error("请确保：文书素材/简历、成绩单、目标课程信息 均已提供。")
        st.stop()
    
    if not selected_modules:
        st.warning("请至少选择一个写作模块。")
        st.stop()
    
    # 准备媒体
    transcript_content = []
    if uploaded_transcript.type == "application/pdf":
        transcript_content.append({
            "mime_type": "application/pdf",
            "data": uploaded_transcript.getvalue()
        })
    else:
        transcript_content.append(Image.open(uploaded_transcript))

    curriculum_imgs = []
    if uploaded_curriculum_images:
        for img_file in uploaded_curriculum_images:
            curriculum_imgs.append(Image.open(img_file))
    
    progress_bar = st.progress(0)
    total_steps = len(selected_modules)
    current_step = 0
    
    st.session_state['generated_sections'] = {} # 清空旧内容

    # --- Prompt 定义 ---
    # 🔴 修改：使用 HTML 列表 (ul/li) 格式指令，解决对齐问题；使用 div 和 inline CSS 精确控制行间距
    prompt_motivation = f"""
    【任务】撰写 Personal Statement 的 "申请动机" 部分。
    【步骤 1：深度调研】
    请先分析 {target_school_name} 所在领域的最新行业热点或学术趋势。
    **请严格列出 3 个关键趋势 (Options)**，并严格按照以下 **HTML 格式** 输出（除文献/报告标题保留原文外，其余分析内容请使用**中文**）：

    <div style="margin-bottom: 18px;">
        <div style="font-weight: bold; font-size: 14px; margin-bottom: 6px;">Option [X]: [Trend Title]</div>
        <ul style="margin: 0; padding-left: 18px; list-style-position: outside;">
            <li style="margin-bottom: 4px; line-height: 1.4;"><b>Source</b>: [Specific Paper Title/Report Name/News Source]</li>
            <li style="line-height: 1.4;"><b>Relevance</b>: [深度分析趋势与学生背景/项目的关联。解释为什么这个趋势对该学生重要，以及他们之前的经历（如具体项目、技能）如何与此契合。此部分必须详细展开。]</li>
        </ul>
    </div>

    【步骤 2：撰写正文】
    基于上述趋势和学生素材，撰写一段中文申请动机。动机正文中不用出现具体信息源，但要体现出学生对行业趋势的理解和契合。
    逻辑：学生过往经历 -> 观察到的行业痛点/趋势 -> 产生深造需求。
    【严格输出格式】
    请严格按照下方分隔符输出，不要包含其他内容：
    [TRENDS_START]
    (在此处列出 3 个调研趋势和来源，使用上述 HTML 格式)
    [TRENDS_END]
    [DRAFT_START]
    (在此处撰写正文段落，纯文本，无Markdown)
    [DRAFT_END]
    """

    prompt_career = f"""
    【任务】撰写 "职业规划" (Career Goals) 部分。
    【输入背景】
    - 目标专业: {target_school_name}
    - 顾问思路: {counselor_strategy}
    【内容要求】
    1. 规划硕士毕业后的路径（应届生视角）。
    2. **必须包含**：具体的公司名字、具体的职位名称。
    3. 将工作内容和未来继续学习方向融合在一段话中。
    {CLEAN_OUTPUT_RULES}
    """

    prompt_academic = f"""
    【任务】撰写 "本科学习经历" (Academic Background) 部分。
    【输入背景】
    - 目标专业: {target_school_name}
    - 核心依据 (成绩单): 见附带文件 (PDF或图片)
    - 辅助参考 (学生素材/简历): 见附带文本
    【核心原则：深度 > 数量】
    不要罗列课程名。只精选与目标专业最强相关的核心课程进行深度描写。
    【内容要求 - 必须包含细节】
    1. **核心概念植入**：在描述每门课时，必须提及该课程具体的**核心概念、模型、算法或理论名称**。
    2. **学术真实感**：结合学生素材，简述是如何理解或应用这些概念的。
    3. **逻辑升华**：说明这些具体的知识点如何为你攻读 {target_school_name} 打下了坚实的学术基础。
    4. **禁止**：禁止写成课程清单（List），必须是连贯的学术反思叙述。
    {CLEAN_OUTPUT_RULES}
    """

    prompt_whyschool = f"""
    【任务】撰写 "Why School" 部分。
    【输入背景】
    - 目标学校: {target_school_name}
    - 顾问思路: {counselor_strategy}
    {f'【目标课程文本列表】:{target_curriculum_text}' if target_curriculum_text else ''}
    - 课程图片信息: 见附带图片
    【内容要求】
    1. 综合分析提供的文本列表和图片中的课程信息。
    2. 从中挑选与学生背景或规划最相关的特定课程，不相关的课程不用写。
    3. 若所提供信息包含课程名字与课程说明则参考，若仅有课程名字但无课程说明则搜索该课程（硕士水平）的教学内容，并据此阐述这些课程为何吸引学生及有何帮助，阐述时需深入到该课程具体教授的方法学及概念。
    4. 课程阐述需有深度，有逻辑顺序或难度递进关系，体现出对课程内容的理解，而非简单罗列课程名称。
    5. 语气朴素专业，议论为主。
    {CLEAN_OUTPUT_RULES}
    """

    prompt_internship = f"""
    【任务】撰写 "实习/工作经历" (Professional Experience) 部分。
    【输入背景】
    - 学生素材: 见附带文本
    - 目标专业: {target_school_name}
    【内容要求】
    1. 筛选最相关经历，按时间顺序逻辑串联。
    2. 结构：背景 -> 职责 -> 技能 -> 动机。
    3. 拒绝流水账，要有逻辑梳理和反思，要有与所申请专业的契合点和相关的感悟。
    {CLEAN_OUTPUT_RULES}
    """

    prompts_map = {
        "Motivation": prompt_motivation,
        "Career_Goal": prompt_career,
        "Academic": prompt_academic,
        "Why_School": prompt_whyschool,
        "Internship": prompt_internship
    }

    for module in selected_modules:
        current_step += 1
        st.toast(f"正在撰写: {modules[module]} ...")
        
        current_media = None
        if module == "Academic":
            current_media = transcript_content
        elif module == "Why_School":
            current_media = curriculum_imgs
        
        res = get_gemini_response(prompts_map[module], media_content=current_media, text_context=student_background_text)
        
        final_text = res.strip()
        
        if module == "Motivation":
            try:
                if "[TRENDS_START]" in res and "[DRAFT_START]" in res:
                    trends_part = res.split("[TRENDS_START]")[1].split("[TRENDS_END]")[0].strip()
                    draft_part = res.split("[DRAFT_START]")[1].split("[DRAFT_END]")[0].strip()
                    st.session_state['motivation_trends'] = trends_part
                    final_text = draft_part
                else:
                    final_text = res
            except:
                final_text = res

        st.session_state['generated_sections'][module] = final_text
        progress_bar.progress(current_step / total_steps)

    # 将所有生成的部分合并成一个完整的中文草稿
    full_chinese_draft = ""
    for module in display_order:
        if module in st.session_state['generated_sections']:
            full_chinese_draft += f"--- {modules[module]} ---\n"
            full_chinese_draft += st.session_state['generated_sections'][module] + "\n\n"
    st.session_state['full_chinese_draft'] = full_chinese_draft.strip()
    
    # 清空可能存在的旧翻译
    st.session_state['full_translated_text'] = ""
    
    # 删除旧的key以强制刷新textarea
    if 'text_full_draft' in st.session_state:
        del st.session_state['text_full_draft']
    if 'text_full_translated' in st.session_state:
        del st.session_state['text_full_translated']
    
    # 清空旧的页眉缓存，确保下次导出时重新生成
    if 'header_cn' in st.session_state:
        del st.session_state['header_cn']
    if 'header_en' in st.session_state:
        del st.session_state['header_en']

    # 🔴 修改：使用自定义 HTML 替代 st.success，实现圆角矩形、宝蓝背景、白色字体
    st.markdown(f"""
    <div style="
        background-color: #3666FA; 
        color: #ffffff; 
        padding: 15px; 
        border-radius: 12px; 
        text-align: center; 
        font-weight: 600;
        margin-top: 20px;
        box-shadow: 0 2px 5px rgba(54, 102, 250, 0.2);
    ">
        ✅ 初稿生成完毕！
    </div>
    """, unsafe_allow_html=True)

# ==========================================
# 8. 界面：反馈、修改与翻译
# ==========================================
if st.session_state.get('full_chinese_draft'):
    st.markdown("---")
    st.header("审阅与翻译")
    
    # 使用自定义蓝色圆角框
    render_blue_box("满意左侧中文稿后，点击上方按钮生成翻译。")

    if st.session_state.get('motivation_trends'):
        with st.expander("点击查看：行业趋势调研与参考源 (Reference)", expanded=True):
            # 使用自定义蓝色圆角框显示 Trends
            render_blue_box(st.session_state['motivation_trends'])
    
    c1, c2 = st.columns([1, 1])
    
    # --- 左侧：中文编辑与精修 ---
    with c1:
        st.markdown("**中文草稿 (可编辑)**")
        
        if 'text_full_draft' not in st.session_state:
            st.session_state['text_full_draft'] = st.session_state['full_chinese_draft']
        
        current_chinese_content = st.text_area(
            "中文内容", 
            key="text_full_draft",
            height=600
        )
        st.session_state['full_chinese_draft'] = current_chinese_content
        
        # 使用自定义蓝色圆角框显示批注说明
        render_blue_box("批注修改: 在想改的句子后面用 【修改意见】 给出指令。")
        
        if st.button("执行中文批注修改"):
            if "【" not in current_chinese_content:
                st.warning("未检测到【】。请在上方文本框中插入 `【修改意见】` 后再点击。")
            else:
                with st.spinner("正在根据批注修改并高亮变化..."):
                    inline_prompt = f"""
                    【任务】作为专业留学文书编辑，根据文中的嵌入式批注（中文方括号【】内的文字）修改文章。
                    【输入文本】\n{current_chinese_content}
                    【执行步骤】
                    1. 扫描文中所有的中文方括号 `【】`。括号内的文字即为用户的修改指令。
                    2. 根据指令，修改括号紧邻的前文句子或段落。
                    3. **必须删除**原文中的括号及括号内的修改指令。
                    4. 保持未被批注的部分原封不动。
                    5. **高亮变化**：将**所有被修改后产生的新文字**用 Markdown 双星号 `**` 包裹（例如：**new text**），以便用户一眼看出改了哪里。
                    {CLEAN_OUTPUT_RULES}
                    """
                    revised_text = get_gemini_response(inline_prompt)
                    
                    st.session_state['full_chinese_draft'] = revised_text.strip()
                    if 'text_full_draft' in st.session_state:
                        del st.session_state['text_full_draft'] 
                    st.session_state['full_translated_text'] = ""
                    if 'text_full_translated' in st.session_state:
                        del st.session_state['text_full_translated']
                    st.rerun()

    # --- 右侧：翻译 与 灵感助手 ---
    with c2:
        tab_trans, tab_chat = st.tabs(["🇺🇸 英文翻译与修改", "灵感助手 (Chat)"])
        
        # Tab 1: 翻译与修改
        with tab_trans:
            flag_icon = "🇬🇧" if "British" in spelling_preference else "🇺🇸"
            style_text = "British" if "British" in spelling_preference else "American"
            
            if st.button(f"{flag_icon} 翻译全文 ({style_text})"):
                if not api_key:
                    st.error("需要 API Key")
                else:
                    with st.spinner("Translating..."):
                        spelling_instruction = "\n【SPELLING RULE】: STRICTLY use British English spelling (e.g., colour, analyse, programme, centre)."
                        if "American" in spelling_preference:
                            spelling_instruction = "\n【SPELLING RULE】: STRICTLY use American English spelling (e.g., color, analyze, program, center)."
                        
                        translated_sections = []
                        for module_key in display_order:
                            if module_key in st.session_state['generated_sections']:
                                chinese_text = st.session_state['generated_sections'][module_key]
                                if not chinese_text.strip():
                                    continue
                                
                                trans_prompt = f"{TRANSLATION_RULES_BASE}\n{spelling_instruction}\n【Input Text】:\n{chinese_text}"
                                trans_res = get_gemini_response(trans_prompt)

                                english_header = english_modules.get(module_key, module_key)
                                translated_sections.append(f"--- {english_header} ---\n{trans_res.strip()}")
                        
                        st.session_state['full_translated_text'] = "\n\n".join(translated_sections)
                        
                        if 'text_full_translated' in st.session_state:
                            del st.session_state['text_full_translated']
                        st.rerun()
            
            if st.session_state.get('full_translated_text'):
                st.markdown("**英文翻译结果 (可编辑)**")
                
                if 'text_full_translated' not in st.session_state:
                    st.session_state['text_full_translated'] = st.session_state['full_translated_text']

                current_english_content = st.text_area(
                    "英文内容",
                    key="text_full_translated",
                    height=500
                )
                st.session_state['full_translated_text'] = current_english_content

                # 英文版批注提示文案与样式与中文版保持一致
                render_blue_box("批注修改: 在想改的句子后面用 【修改意见】 给出指令。")

                if st.button("执行英文批注修改"):
                    with st.spinner("正在根据您的批注优化英文文本..."):
                        english_edit_prompt = f"""
                        【任务】你是一位顶尖的留学文书编辑。请根据用户在英文文本中嵌入的中文，对文章进行修改和润色。

                        【输入文本及批注】
                        {current_english_content}

                        【批注规则说明】
                        1.  **修改指令 `【中文内容】`**: 如果发现中文被中文方括号 `【】` 包围，这代表一条修改指令。请根据指令内容，修改它前面的英文句子。
                        2.  **翻译并插入**: 如果发现一段中文**没有被任何括号包围**，请将这段中文翻译成地道的英文，并无缝地插入到文本的那个位置。

                        【核心风格指令】
                        所有的修改和翻译都必须严格遵守以下【ANTI-AI STYLE GUIDE】。
                        {TRANSLATION_RULES_BASE}

                        【输出要求】
                        1.  完成所有修改和翻译。
                        2.  **必须删除**原文中所有的中文内容和 `【】` 括号。
                        3.  **必须保留**所有的分段标题（例如 `--- Motivation ---`）。
                        4.  将**所有被修改或新增的英文部分**用 Markdown 双星号 `**` 包裹，以便用户识别。
                        5.  最终输出完整的、保留了分段结构的英文文本。
                        """
                        revised_english_text = get_gemini_response(english_edit_prompt)
                        st.session_state['full_translated_text'] = revised_english_text.strip()
                        if 'text_full_translated' in st.session_state:
                            del st.session_state['text_full_translated']
                        st.rerun()
            else:
                # 使用自定义蓝色圆角框
                render_blue_box("满意左侧中文稿后，点击上方按钮生成翻译。")

        # Tab 2: 灵感助手 (Chat)
        with tab_chat:
            st.caption("遇到卡顿？在这里查资料、问同义词或寻找灵感。")
            
            chat_history_container = st.container(height=450)
            
            with st.form(key="main_chat_form", clear_on_submit=True):
                user_query = st.text_area("向助手提问：", height=100, key="chat_in_main")
                submit_chat = st.form_submit_button("发送")
            
            if submit_chat and user_query:
                if not api_key:
                    st.error("需要 API Key")
                else:
                    st.session_state['main_chat_history'].append({"role": "user", "content": user_query})
                    loading_msg = get_random_loading_msg()
                    with st.spinner(loading_msg):
                        chat_prompt = f"""
                        你是一个专业的留学文书助手。用户正在撰写个人陈述。
                        用户的上下文是这段中文草稿：
                        ---
                        {st.session_state['full_chinese_draft']}
                        ---
                        用户的问题是：{user_query}
                        请提供简短、专业且有帮助的回答。
                        """
                        ai_reply = get_gemini_response(chat_prompt)
                        st.session_state['main_chat_history'].append({"role": "assistant", "content": ai_reply})
                        st.rerun()

            with chat_history_container:
                for msg in st.session_state['main_chat_history']:
                    with st.chat_message(msg["role"]):
                        st.markdown(msg["content"])

# ==========================================
# 9. 导出 (Word 下载)
# ==========================================
if st.session_state.get('full_chinese_draft'):
    st.markdown("---")
    st.header("导出")
    
    # 智能页眉生成逻辑
    # 检查是否已经生成过页眉，如果没有，则调用 AI 解析 target_school_name
    if 'header_cn' not in st.session_state or 'header_en' not in st.session_state:
        if target_school_name:
            # 简单的 AI 调用来格式化页眉
            header_prompt = f"""
            Task: Parse and format the university and major information from the string: "{target_school_name}".
            
            Rules:
            1. Identify the School Name and Major Name.
            2. Create a Chinese Header: [School Name (Chinese, add '大学' if missing)] + [Major Name] + "个人陈述"
            3. Create an English Header: "Personal Statement for " + [Major Name (English)] + "_" + [School Name (English)]
            
            Example Input: 卡内基梅隆Master's in Health Care Analytics
            Example Output: 卡内基梅隆大学Master's in Health Care Analytics个人陈述|Personal Statement for Master's in Health Care Analytics_Carnegie Mellon University
            
            Output ONLY the two strings separated by a pipe symbol (|). Do not add any other text.
            """
            try:
                header_res = get_gemini_response(header_prompt)
                if "|" in header_res:
                    parts = header_res.split("|")
                    st.session_state['header_cn'] = parts[0].strip()
                    st.session_state['header_en'] = parts[1].strip()
                else:
                    # Fallback
                    st.session_state['header_cn'] = f"{target_school_name} 个人陈述"
                    st.session_state['header_en'] = f"Personal Statement for {target_school_name}"
            except:
                # Fallback on error
                st.session_state['header_cn'] = f"{target_school_name} 个人陈述"
                st.session_state['header_en'] = f"Personal Statement for {target_school_name}"
        else:
             st.session_state['header_cn'] = "个人陈述"
             st.session_state['header_en'] = "Personal Statement"

    col_dl_cn, col_dl_en = st.columns(2)
    
    # --- 1. 中文版下载 ---
    with col_dl_cn:
        st.subheader("🇨🇳 中文版")
        if st.session_state.get('full_chinese_draft'):
            # 生成中文 Word
            cn_header_text = st.session_state.get('header_cn', f"{target_school_name} 个人陈述")
            docx_cn_bytes = create_word_docx(
                content=st.session_state['full_chinese_draft'],
                header_text=cn_header_text,
                font_name='宋体',
                is_chinese=True
            )
            
            st.download_button(
                label="📥 下载中文版 (.docx)",
                data=docx_cn_bytes,
                file_name=f"PS_CN_{target_school_name}.docx",
                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                type="primary"
            )
        else:
            st.caption("暂无中文内容")

    # --- 2. 英文版下载 ---
    with col_dl_en:
        st.subheader("🇺🇸 英文版")
        if st.session_state.get('full_translated_text'):
            # 生成英文 Word
            en_header_text = st.session_state.get('header_en', f"Personal Statement for {target_school_name}")
            docx_en_bytes = create_word_docx(
                content=st.session_state['full_translated_text'],
                header_text=en_header_text,
                font_name='Times New Roman',
                is_chinese=False
            )
            
            st.download_button(
                label="📥 下载英文版 (.docx)",
                data=docx_en_bytes,
                file_name=f"PS_EN_{target_school_name}.docx",
                mime="application/vnd.openxmlformats-officedocument.wordprocessingml.document",
                type="primary"
            )
        else:
            st.caption("暂无英文翻译，请先在上方进行翻译。")
