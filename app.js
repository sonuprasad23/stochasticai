const API_BASE = 'https://sonuprasad23-stochastic.hf.space/api';

let selectedPaper = null;
let papersList = [];
let chatHistories = {};

const elements = {
    uploadZone: document.getElementById('upload-zone'),
    fileInput: document.getElementById('file-input'),
    paperList: document.getElementById('paper-list'),
    chatContainer: document.getElementById('chat-container'),
    welcomeScreen: document.getElementById('welcome-screen'),
    messagesContainer: document.getElementById('messages-container'),
    chatInput: document.getElementById('chat-input'),
    sendBtn: document.getElementById('send-btn'),
    arxivBtn: document.getElementById('arxiv-btn'),
    clearBtn: document.getElementById('clear-btn'),
    arxivModal: document.getElementById('arxiv-modal'),
    modalClose: document.getElementById('modal-close'),
    arxivSearchInput: document.getElementById('arxiv-search-input'),
    arxivSearchBtn: document.getElementById('arxiv-search-btn'),
    arxivResults: document.getElementById('arxiv-results'),
    toastContainer: document.getElementById('toast-container'),
    statsPapers: document.getElementById('stats-papers'),
    statsChunks: document.getElementById('stats-chunks'),
    paperSearch: document.getElementById('paper-search'),
    selectedPaperDisplay: document.getElementById('selected-paper-display'),
    clearPaperFilter: document.getElementById('clear-paper-filter'),
    pdfModal: document.getElementById('pdf-modal'),
    pdfViewer: document.getElementById('pdf-viewer'),
    pdfModalClose: document.getElementById('pdf-modal-close')
};

function showToast(message, type = 'info') {
    const toast = document.createElement('div');
    toast.className = `toast ${type}`;
    toast.textContent = message;
    elements.toastContainer.appendChild(toast);
    setTimeout(() => toast.remove(), 4000);
}

async function fetchStats() {
    try {
        const res = await fetch(`${API_BASE}/stats`);
        const data = await res.json();
        elements.statsPapers.textContent = `${data.papers_indexed} Papers`;
        elements.statsChunks.textContent = `${data.chunks_indexed} Chunks`;
    } catch (e) {
        console.error('Failed to fetch stats:', e);
    }
}

async function fetchPapers() {
    try {
        const res = await fetch(`${API_BASE}/papers`);
        const data = await res.json();
        papersList = data.papers || [];
        renderPaperList(papersList);
    } catch (e) {
        console.error('Failed to fetch papers:', e);
    }
}

function filterPapers(query) {
    if (!query) {
        renderPaperList(papersList);
        return;
    }
    const filtered = papersList.filter(p =>
        p.paper_name.toLowerCase().includes(query.toLowerCase())
    );
    renderPaperList(filtered);
}

function renderPaperList(papers) {
    if (!papers || papers.length === 0) {
        elements.paperList.innerHTML = `
            <div class="empty-state">
                <div class="empty-icon">◇</div>
                <div class="empty-text">No papers found</div>
            </div>
        `;
        return;
    }

    elements.paperList.innerHTML = papers.map(p => `
        <div class="paper-item ${selectedPaper === p.paper_name ? 'selected' : ''}" data-name="${escapeAttr(p.paper_name)}">
            <div class="paper-info" onclick="selectPaper('${escapeJs(p.paper_name)}')">
                <span class="paper-name" title="${escapeAttr(p.paper_name)}">${truncate(p.paper_name, 25)}</span>
                <span class="paper-chunks">${p.chunk_count || 0} chunks</span>
            </div>
            <div class="paper-actions">
                <button class="paper-action-btn" onclick="viewPDF('${escapeJs(p.paper_name)}')" title="View PDF">📄</button>
                <button class="paper-action-btn delete" onclick="deletePaper('${escapeJs(p.paper_name)}')" title="Delete">×</button>
            </div>
        </div>
    `).join('');
}

function truncate(str, len) {
    return str.length > len ? str.substring(0, len) + '...' : str;
}

function escapeAttr(str) {
    return str.replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

function escapeJs(str) {
    return str.replace(/\\/g, '\\\\').replace(/'/g, "\\'").replace(/"/g, '\\"');
}

function saveChatHistory() {
    const key = selectedPaper || '__general__';
    const messages = [];
    elements.messagesContainer.querySelectorAll('.message').forEach(msg => {
        const role = msg.classList.contains('user') ? 'user' : 'assistant';
        const content = msg.querySelector('.message-content')?.innerHTML || '';
        const sourcesEl = msg.querySelector('.message-sources');
        const sources = sourcesEl ? sourcesEl.innerHTML : '';
        messages.push({ role, content, sources });
    });
    chatHistories[key] = messages;
    localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
}

function loadChatHistory() {
    const saved = localStorage.getItem('chatHistories');
    if (saved) {
        chatHistories = JSON.parse(saved);
    }
}

function displayChatHistory(paperName) {
    const key = paperName || '__general__';
    elements.messagesContainer.innerHTML = '';

    const history = chatHistories[key] || [];

    if (history.length === 0) {
        elements.welcomeScreen.style.display = 'flex';
        return;
    }

    elements.welcomeScreen.style.display = 'none';

    history.forEach((item, index) => {
        const msg = document.createElement('div');
        msg.className = `message ${item.role}`;
        msg.dataset.index = index;

        let deleteBtn = '';
        if (item.role === 'user') {
            deleteBtn = `<button class="msg-delete-btn" onclick="deleteMessage(${index})" title="Delete">×</button>`;
        }

        msg.innerHTML = `
            <div class="message-header">
                ${item.role === 'user' ? 'You' : 'Agent'}
                ${deleteBtn}
            </div>
            <div class="message-content">${item.content}</div>
            ${item.sources ? `<div class="message-sources">${item.sources}</div>` : ''}
        `;

        elements.messagesContainer.appendChild(msg);
    });

    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

function deleteMessage(index) {
    const key = selectedPaper || '__general__';
    const history = chatHistories[key] || [];

    if (index >= 0 && index < history.length) {
        if (history[index].role === 'user' && index + 1 < history.length && history[index + 1].role === 'assistant') {
            history.splice(index, 2);
        } else {
            history.splice(index, 1);
        }
        chatHistories[key] = history;
        localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
        displayChatHistory(selectedPaper);
    }
}

function selectPaper(name) {
    saveChatHistory();

    if (selectedPaper === name) {
        selectedPaper = null;
        elements.selectedPaperDisplay.style.display = 'none';
    } else {
        selectedPaper = name;
        elements.selectedPaperDisplay.style.display = 'flex';
        elements.selectedPaperDisplay.querySelector('.selected-paper-name').textContent = truncate(name, 20);
    }

    displayChatHistory(selectedPaper);
    renderPaperList(papersList);
    showToast(selectedPaper ? `Switched to: ${truncate(name, 30)}` : 'Showing general chat', 'info');
}

function clearPaperFilter() {
    saveChatHistory();
    selectedPaper = null;
    elements.selectedPaperDisplay.style.display = 'none';
    displayChatHistory(null);
    renderPaperList(papersList);
}

function viewPDF(paperName) {
    const pdfUrl = `${API_BASE}/papers/${encodeURIComponent(paperName)}/pdf`;
    elements.pdfViewer.src = pdfUrl;
    elements.pdfModal.classList.add('active');
}

function closePdfModal() {
    elements.pdfModal.classList.remove('active');
    elements.pdfViewer.src = '';
}

async function deletePaper(name) {
    try {
        const res = await fetch(`${API_BASE}/papers/${encodeURIComponent(name)}`, { method: 'DELETE' });
        if (res.ok) {
            showToast('Paper removed', 'success');
            if (selectedPaper === name) {
                selectedPaper = null;
                elements.selectedPaperDisplay.style.display = 'none';
            }
            delete chatHistories[name];
            localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
            fetchPapers();
            fetchStats();
        }
    } catch (e) {
        showToast('Failed to delete paper', 'error');
    }
}

function setUploadState(state, message = '') {
    const zone = elements.uploadZone;
    zone.classList.remove('dragover', 'processing', 'success', 'error');

    if (state === 'idle') {
        zone.innerHTML = `
            <div class="upload-icon">↑</div>
            <div class="upload-text">Drop PDF here</div>
            <div class="upload-hint">or click to browse</div>
        `;
    } else if (state === 'processing') {
        zone.classList.add('processing');
        zone.innerHTML = `
            <div class="loading-indicator">
                <div class="loading-dots">
                    <span></span><span></span><span></span>
                </div>
            </div>
            <div class="upload-text">Processing...</div>
            <div class="upload-hint">${message || 'Extracting document content'}</div>
        `;
    } else if (state === 'success') {
        zone.classList.add('success');
        zone.innerHTML = `
            <div class="upload-icon">✓</div>
            <div class="upload-text">Success!</div>
            <div class="upload-hint">${message}</div>
        `;
        setTimeout(() => setUploadState('idle'), 2000);
    } else if (state === 'error') {
        zone.classList.add('error');
        zone.innerHTML = `
            <div class="upload-icon">✗</div>
            <div class="upload-text">Error</div>
            <div class="upload-hint">${message}</div>
        `;
        setTimeout(() => setUploadState('idle'), 3000);
    }
}

async function uploadFile(file) {
    if (!file.name.toLowerCase().endsWith('.pdf')) {
        showToast('Only PDF files are supported', 'error');
        return;
    }

    const formData = new FormData();
    formData.append('file', file);

    setUploadState('processing', file.name);

    try {
        const res = await fetch(`${API_BASE}/upload`, {
            method: 'POST',
            body: formData
        });

        if (!res.ok) {
            const err = await res.json();
            throw new Error(err.detail || 'Upload failed');
        }

        const data = await res.json();
        setUploadState('success', data.paper_name);
        showToast(`Ready: ${data.paper_name}`, 'success');

        await addMessageWithTyping('assistant', `📄 **Document Added**: ${data.paper_name}\n\nI've processed ${data.chunks_created} sections from this paper. You can now ask me questions about it!`);
        saveChatHistory();

        fetchPapers();
        fetchStats();
    } catch (e) {
        setUploadState('error', e.message);
        showToast('Upload failed: ' + e.message, 'error');
    }
}

function addMessage(role, content, sources = []) {
    elements.welcomeScreen.style.display = 'none';

    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const sourcesHtml = formatSources(sources);

    let deleteBtn = '';
    if (role === 'user') {
        const currentIndex = elements.messagesContainer.querySelectorAll('.message').length;
        deleteBtn = `<button class="msg-delete-btn" onclick="deleteMessage(${currentIndex})" title="Delete">×</button>`;
    }

    msg.innerHTML = `
        <div class="message-header">
            ${role === 'user' ? 'You' : 'Agent'}
            ${deleteBtn}
        </div>
        <div class="message-content">${formatContent(content)}</div>
        ${sourcesHtml}
    `;

    elements.messagesContainer.appendChild(msg);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    return msg;
}

async function addMessageWithTyping(role, content, sources = []) {
    elements.welcomeScreen.style.display = 'none';

    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';

    msg.innerHTML = `<div class="message-header">${role === 'user' ? 'You' : 'Agent'}</div>`;
    msg.appendChild(contentDiv);

    elements.messagesContainer.appendChild(msg);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;

    if (role === 'assistant') {
        await typeTextFast(contentDiv, content);

        if (sources && sources.length > 0) {
            const sourcesDiv = document.createElement('div');
            sourcesDiv.className = 'message-sources';
            sourcesDiv.innerHTML = formatSourcesInner(sources);
            sourcesDiv.style.opacity = '0';
            msg.appendChild(sourcesDiv);

            await sleep(100);
            sourcesDiv.style.transition = 'opacity 0.3s ease';
            sourcesDiv.style.opacity = '1';
        }
    } else {
        contentDiv.innerHTML = formatContent(content);
    }

    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
    return msg;
}

async function typeTextFast(element, text) {
    const formattedHtml = formatContent(text);
    const lines = text.split('\n');

    let displayedLines = [];
    const linesPerSecond = 2;
    const delayPerLine = 1000 / linesPerSecond;

    for (let i = 0; i < lines.length; i++) {
        displayedLines.push(lines[i]);
        const partialText = displayedLines.join('\n');
        element.innerHTML = formatContent(partialText);

        elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;

        if (i < lines.length - 1) {
            await sleep(delayPerLine);
        }
    }

    element.innerHTML = formattedHtml;
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function formatSources(sources) {
    if (!sources || sources.length === 0) return '';
    return `<div class="message-sources">${formatSourcesInner(sources)}</div>`;
}

function formatSourcesInner(sources) {
    return sources.map(s =>
        `<span class="source-tag" onclick="filterBySource('${escapeJs(s.paper)}')" title="Click to filter by this paper">
            <span class="source-paper">${truncate(s.paper, 25)}</span>
            <span class="source-section">${s.section}</span>
        </span>`
    ).join('');
}

function filterBySource(paperName) {
    selectPaper(paperName);
}

function formatContent(text) {
    if (!text) return '';

    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    html = html.replace(/```(\w*)\n?([\s\S]*?)```/g, (match, lang, code) => {
        return `<pre><code class="lang-${lang}">${code.trim()}</code></pre>`;
    });

    html = html.replace(/`([^`]+)`/g, '<code>$1</code>');

    html = html.replace(/^### (.+)$/gm, '<h4>$1</h4>');
    html = html.replace(/^## (.+)$/gm, '<h3>$1</h3>');
    html = html.replace(/^# (.+)$/gm, '<h3>$1</h3>');

    html = html.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>');
    html = html.replace(/\*([^*]+)\*/g, '<em>$1</em>');

    html = html.replace(/^[\-\*] (.+)$/gm, '<li>$1</li>');
    html = html.replace(/(<li>.*<\/li>\n?)+/g, '<ul>$&</ul>');

    html = html.replace(/^\d+\. (.+)$/gm, '<li>$1</li>');

    html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank">$1</a>');

    html = html.replace(/^---$/gm, '<hr>');

    html = html.split(/\n\n+/).map(para => {
        para = para.trim();
        if (!para) return '';
        if (para.startsWith('<h') || para.startsWith('<ul') || para.startsWith('<ol') ||
            para.startsWith('<pre') || para.startsWith('<hr') || para.startsWith('<li')) {
            return para;
        }
        return `<p>${para.replace(/\n/g, '<br>')}</p>`;
    }).join('');

    return html;
}

function showLoading(message = 'Thinking...') {
    const loader = document.createElement('div');
    loader.id = 'loading-msg';
    loader.className = 'message assistant';
    loader.innerHTML = `
        <div class="message-header">Agent</div>
        <div class="loading-indicator">
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
            <span>${message}</span>
        </div>
    `;
    elements.messagesContainer.appendChild(loader);
    elements.chatContainer.scrollTop = elements.chatContainer.scrollHeight;
}

function hideLoading() {
    const loader = document.getElementById('loading-msg');
    if (loader) loader.remove();
}

async function sendQuery() {
    const question = elements.chatInput.value.trim();
    if (!question) return;

    elements.chatInput.value = '';
    elements.chatInput.style.height = 'auto';
    elements.sendBtn.disabled = true;

    addMessage('user', question);
    showLoading();

    try {
        const res = await fetch(`${API_BASE}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question,
                auto_fetch_arxiv: true,
                paper_filter: selectedPaper
            })
        });

        hideLoading();

        if (!res.ok) throw new Error('Query failed');

        const data = await res.json();
        await addMessageWithTyping('assistant', data.answer, data.sources);
        saveChatHistory();

        if (data.arxiv_fetched) {
            showToast(`Auto-fetched: ${data.arxiv_fetched}`, 'success');
            fetchPapers();
            fetchStats();
        }
    } catch (e) {
        hideLoading();
        addMessage('assistant', 'Sorry, an error occurred. Please try again.');
        showToast('Query failed', 'error');
    } finally {
        elements.sendBtn.disabled = false;
    }
}

async function searchArxiv() {
    const query = elements.arxivSearchInput.value.trim();
    if (!query) return;

    elements.arxivResults.innerHTML = `
        <div class="loading-indicator">
            <div class="loading-dots">
                <span></span><span></span><span></span>
            </div>
            <span>Searching Arxiv...</span>
        </div>
    `;

    try {
        const res = await fetch(`${API_BASE}/arxiv/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, max_results: 5 })
        });

        const data = await res.json();
        renderArxivResults(data.papers);
    } catch (e) {
        elements.arxivResults.innerHTML = '<p>Search failed. Please try again.</p>';
    }
}

function renderArxivResults(papers) {
    if (!papers || papers.length === 0) {
        elements.arxivResults.innerHTML = '<p>No papers found.</p>';
        return;
    }

    elements.arxivResults.innerHTML = papers.map(p => `
        <div class="arxiv-result">
            <div class="arxiv-title">${p.title}</div>
            <div class="arxiv-authors">${p.authors.slice(0, 3).join(', ')}${p.authors.length > 3 ? ' et al.' : ''}</div>
            <div class="arxiv-abstract">${truncate(p.abstract, 200)}</div>
            <div class="arxiv-actions">
                <button class="pill accent" onclick="addToChat('${p.arxiv_id}')">Add & Ask →</button>
                <button class="pill" onclick="downloadArxiv('${p.arxiv_id}')">Download Only</button>
            </div>
        </div>
    `).join('');
}

async function addToChat(arxivId) {
    closeModal();
    saveChatHistory();

    showLoading('Downloading and processing paper...');
    elements.welcomeScreen.style.display = 'none';

    try {
        const res = await fetch(`${API_BASE}/arxiv/add-to-chat/${arxivId}`, { method: 'POST' });

        hideLoading();

        if (!res.ok) throw new Error('Failed to process paper');

        const data = await res.json();

        selectedPaper = data.paper_name;
        elements.selectedPaperDisplay.style.display = 'flex';
        elements.selectedPaperDisplay.querySelector('.selected-paper-name').textContent = truncate(data.paper_name, 20);

        elements.messagesContainer.innerHTML = '';

        await addMessageWithTyping('assistant', `📄 **Paper Added**: ${data.paper_name}\n\n${data.summary}`, data.sources);
        saveChatHistory();

        showToast(`Added: ${data.paper_name}`, 'success');
        fetchPapers();
        fetchStats();
        renderPaperList(papersList);
    } catch (e) {
        hideLoading();
        addMessage('assistant', 'Sorry, I could not process this paper. Please try again.');
        showToast('Failed to add paper', 'error');
    }
}

async function downloadArxiv(arxivId) {
    showToast('Downloading paper...', 'info');

    try {
        const res = await fetch(`${API_BASE}/arxiv/download/${arxivId}`, { method: 'POST' });

        if (!res.ok) throw new Error('Download failed');

        const data = await res.json();
        showToast(`Added: ${data.paper_name}`, 'success');
        fetchPapers();
        fetchStats();
        closeModal();
    } catch (e) {
        showToast('Download failed', 'error');
    }
}

function openModal() {
    elements.arxivModal.classList.add('active');
    elements.arxivSearchInput.focus();
}

function closeModal() {
    elements.arxivModal.classList.remove('active');
    elements.arxivResults.innerHTML = '';
    elements.arxivSearchInput.value = '';
}

async function clearHistory() {
    saveChatHistory();
    try {
        await fetch(`${API_BASE}/clear-history`, { method: 'POST' });
        const key = selectedPaper || '__general__';
        chatHistories[key] = [];
        localStorage.setItem('chatHistories', JSON.stringify(chatHistories));
        elements.messagesContainer.innerHTML = '';
        elements.welcomeScreen.style.display = 'flex';
        showToast('Chat cleared', 'success');
    } catch (e) {
        showToast('Failed to clear history', 'error');
    }
}

elements.uploadZone.addEventListener('click', () => elements.fileInput.click());
elements.fileInput.addEventListener('change', (e) => {
    if (e.target.files[0]) uploadFile(e.target.files[0]);
    e.target.value = '';
});

elements.uploadZone.addEventListener('dragover', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.add('dragover');
});

elements.uploadZone.addEventListener('dragleave', () => {
    elements.uploadZone.classList.remove('dragover');
});

elements.uploadZone.addEventListener('drop', (e) => {
    e.preventDefault();
    elements.uploadZone.classList.remove('dragover');
    if (e.dataTransfer.files[0]) uploadFile(e.dataTransfer.files[0]);
});

elements.sendBtn.addEventListener('click', sendQuery);
elements.chatInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendQuery();
    }
});

elements.chatInput.addEventListener('input', function () {
    this.style.height = 'auto';
    this.style.height = Math.min(this.scrollHeight, 150) + 'px';
});

elements.arxivBtn.addEventListener('click', openModal);
elements.modalClose.addEventListener('click', closeModal);
elements.arxivModal.addEventListener('click', (e) => {
    if (e.target === elements.arxivModal) closeModal();
});

elements.arxivSearchBtn.addEventListener('click', searchArxiv);
elements.arxivSearchInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') searchArxiv();
});

elements.clearBtn.addEventListener('click', clearHistory);

if (elements.paperSearch) {
    elements.paperSearch.addEventListener('input', (e) => {
        filterPapers(e.target.value);
    });
}

if (elements.clearPaperFilter) {
    elements.clearPaperFilter.addEventListener('click', clearPaperFilter);
}

if (elements.pdfModalClose) {
    elements.pdfModalClose.addEventListener('click', closePdfModal);
}

if (elements.pdfModal) {
    elements.pdfModal.addEventListener('click', (e) => {
        if (e.target === elements.pdfModal) closePdfModal();
    });
}

const mobileMenuBtn = document.getElementById('mobile-menu-btn');
const sidebar = document.getElementById('sidebar');
const sidebarOverlay = document.getElementById('sidebar-overlay');

function openSidebar() {
    sidebar.classList.add('open');
    sidebarOverlay.classList.add('active');
}

function closeSidebar() {
    sidebar.classList.remove('open');
    sidebarOverlay.classList.remove('active');
}

if (mobileMenuBtn) {
    mobileMenuBtn.addEventListener('click', () => {
        if (sidebar.classList.contains('open')) {
            closeSidebar();
        } else {
            openSidebar();
        }
    });
}

if (sidebarOverlay) {
    sidebarOverlay.addEventListener('click', closeSidebar);
}

window.deletePaper = deletePaper;
window.downloadArxiv = downloadArxiv;
window.addToChat = addToChat;
window.selectPaper = selectPaper;
window.viewPDF = viewPDF;
window.filterBySource = filterBySource;
window.deleteMessage = deleteMessage;
window.closePdfModal = closePdfModal;

loadChatHistory();
fetchStats();
fetchPapers();
displayChatHistory(null);
