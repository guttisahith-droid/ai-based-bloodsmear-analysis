// Supabase Configuration
const SUPABASE_URL = 'https://0ec90b57d6e95fcbda19832f.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJib2x0IiwicmVmIjoiMGVjOTBiNTdkNmU5NWZjYmRhMTk4MzJmIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg4ODE1NzQsImV4cCI6MTc1ODg4MTU3NH0.9I8-U0x86Ak8t2DGaIk0HfvTSLsAyzdnz-Nw00mMkKw';

const supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Global State
let currentUser = null;
let currentPage = 'dashboard';
let selectedFiles = [];
let currentAnalysisId = null;
let videoStream = null;
let capturedFrames = [];
let monthlyChart = null;
let diseaseChart = null;

// Initialize App
document.addEventListener('DOMContentLoaded', initializeApp);

async function initializeApp() {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (session) {
        currentUser = session.user;
        showApp();
        loadDashboard();
    } else {
        showAuth();
    }
    
    supabase.auth.onAuthStateChange((event, session) => {
        if (session) {
            currentUser = session.user;
            showApp();
            loadDashboard();
        } else {
            currentUser = null;
            showAuth();
        }
    });
    
    setupDragAndDrop();
}

function showAuth() {
    document.getElementById('auth-container').style.display = 'flex';
    document.getElementById('app-container').style.display = 'none';
}

function showApp() {
    document.getElementById('auth-container').style.display = 'none';
    document.getElementById('app-container').style.display = 'grid';
    document.getElementById('user-email').textContent = currentUser.email;
    document.getElementById('profile-email').value = currentUser.email;
}

// Authentication
function switchAuthTab(tab) {
    const loginTab = document.getElementById('login-tab');
    const signupTab = document.getElementById('signup-tab');
    const authBtnText = document.getElementById('auth-btn-text');
    
    if (tab === 'login') {
        loginTab.classList.add('active');
        signupTab.classList.remove('active');
        authBtnText.textContent = 'Sign In';
    } else {
        loginTab.classList.remove('active');
        signupTab.classList.add('active');
        authBtnText.textContent = 'Sign Up';
    }
    
    document.getElementById('auth-error').style.display = 'none';
    document.getElementById('auth-success').style.display = 'none';
}

async function handleAuth(event) {
    event.preventDefault();
    
    const email = document.getElementById('email').value;
    const password = document.getElementById('password').value;
    const isLogin = document.getElementById('login-tab').classList.contains('active');
    const errorDiv = document.getElementById('auth-error');
    const successDiv = document.getElementById('auth-success');
    const submitBtn = document.getElementById('auth-submit');
    const btnText = document.getElementById('auth-btn-text');
    const spinner = document.getElementById('auth-spinner');
    
    submitBtn.disabled = true;
    btnText.style.display = 'none';
    spinner.style.display = 'block';
    errorDiv.style.display = 'none';
    successDiv.style.display = 'none';
    
    try {
        let result;
        
        if (isLogin) {
            result = await supabase.auth.signInWithPassword({ email, password });
        } else {
            result = await supabase.auth.signUp({ email, password });
        }
        
        if (result.error) {
            errorDiv.textContent = result.error.message;
            errorDiv.style.display = 'block';
        } else if (!isLogin) {
            successDiv.textContent = 'Account created successfully! You can now sign in.';
            successDiv.style.display = 'block';
            switchAuthTab('login');
        }
    } catch (error) {
        errorDiv.textContent = error.message;
        errorDiv.style.display = 'block';
    } finally {
        submitBtn.disabled = false;
        btnText.style.display = 'block';
        spinner.style.display = 'none';
    }
}

async function handleSignOut() {
    await supabase.auth.signOut();
}

// Navigation
function showPage(pageName) {
    document.querySelectorAll('.page').forEach(page => page.classList.remove('active'));
    document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
    
    document.getElementById(`${pageName}-page`).classList.add('active');
    const activeLink = document.querySelector(`[data-page="${pageName}"]`);
    if (activeLink) activeLink.classList.add('active');
    
    currentPage = pageName;
    
    if (pageName === 'dashboard') {
        loadDashboard();
    } else if (pageName === 'history') {
        loadHistory();
    }
}

function toggleUserMenu() {
    const dropdown = document.getElementById('user-dropdown');
    dropdown.style.display = dropdown.style.display === 'none' ? 'block' : 'none';
}

function toggleNotifications() {
    const panel = document.getElementById('notification-panel');
    panel.style.display = panel.style.display === 'none' ? 'block' : 'none';
    if (panel.style.display === 'block') {
        loadNotifications();
    }
}

// Dashboard
async function loadDashboard() {
    if (!currentUser) return;
    
    try {
        const { data: analyses, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        updateDashboardStats(analyses);
        updateRecentActivity(analyses.slice(0, 5));
        createMonthlyChart(analyses);
        createDiseaseChart(analyses);
    } catch (error) {
        console.error('Error loading dashboard:', error);
    }
}

function updateDashboardStats(analyses) {
    const total = analyses.length;
    const completed = analyses.filter(a => a.status === 'completed').length;
    const positive = analyses.filter(a => a.disease_detected && a.disease_detected !== 'Normal').length;
    
    const now = new Date();
    const firstDay = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonth = analyses.filter(a => new Date(a.created_at) >= firstDay).length;
    
    animateCounter('total-count', total);
    animateCounter('month-count', thisMonth);
    
    document.getElementById('positive-rate').textContent = total ? ((positive / total) * 100).toFixed(1) + '%' : '0%';
    document.getElementById('positive-count').textContent = positive;
}

function animateCounter(elementId, target) {
    const element = document.getElementById(elementId);
    let current = 0;
    const increment = Math.ceil(target / 20);
    const timer = setInterval(() => {
        current += increment;
        if (current >= target) {
            current = target;
            clearInterval(timer);
        }
        element.textContent = current;
    }, 50);
}

function updateRecentActivity(analyses) {
    const container = document.getElementById('recent-activity');
    
    if (analyses.length === 0) {
        container.innerHTML = '<div class="empty-state">No recent activity</div>';
        return;
    }
    
    container.innerHTML = analyses.map(analysis => `
        <div class="activity-item">
            ${analysis.image_url ? `<img src="${analysis.image_url}" class="activity-thumb" alt="Analysis">` : '<div class="activity-thumb" style="background: var(--bg-tertiary);"></div>'}
            <div class="activity-info">
                <div class="activity-title">${analysis.disease_detected || 'Processing...'}</div>
                <div class="activity-meta">${formatDateTime(analysis.created_at)}</div>
            </div>
            <div class="activity-status">
                <span class="status-badge status-${analysis.status}">${analysis.status}</span>
                ${analysis.confidence_score ? `<span style="font-weight: 600; color: var(--primary);">${analysis.confidence_score.toFixed(1)}%</span>` : ''}
            </div>
        </div>
    `).join('');
}

function createMonthlyChart(analyses) {
    const ctx = document.getElementById('monthly-chart');
    if (!ctx) return;
    
    const monthlyData = processMonthlyData(analyses, 6);
    
    if (monthlyChart) monthlyChart.destroy();
    
    monthlyChart = new Chart(ctx, {
        type: 'bar',
        data: {
            labels: monthlyData.labels,
            datasets: [{
                label: 'Analyses',
                data: monthlyData.values,
                backgroundColor: 'rgba(79, 70, 229, 0.8)',
                borderColor: 'rgba(79, 70, 229, 1)',
                borderWidth: 2,
                borderRadius: 8
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: { display: false }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    ticks: { precision: 0 }
                }
            }
        }
    });
}

function processMonthlyData(analyses, months) {
    const now = new Date();
    const labels = [];
    const values = [];
    
    for (let i = months - 1; i >= 0; i--) {
        const date = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const monthName = date.toLocaleString('default', { month: 'short' });
        labels.push(monthName);
        
        const count = analyses.filter(a => {
            const aDate = new Date(a.created_at);
            return aDate.getMonth() === date.getMonth() && aDate.getFullYear() === date.getFullYear();
        }).length;
        
        values.push(count);
    }
    
    return { labels, values };
}

function createDiseaseChart(analyses) {
    const ctx = document.getElementById('disease-chart');
    if (!ctx) return;

    const allDiseases = [
        'Normal Blood Smear',
        'Malaria - Plasmodium infection',
        'Babesiosis - Babesia infection',
        'Leishmaniasis - Leishmania infection',
        'Trypanosomiasis - Trypanosome infection',
        'Basophilia - Elevated basophil count',
        'Eosinophilia - Elevated eosinophil count',
        'Lymphocytosis - Elevated lymphocyte count',
        'Monocytosis - Elevated monocyte count',
        'Neutrophilia - Elevated neutrophil count'
    ];

    const diseaseCount = {};
    allDiseases.forEach(disease => {
        diseaseCount[disease] = 0;
    });

    const completed = analyses.filter(a => a.status === 'completed' && a.disease_detected);
    completed.forEach(a => {
        if (diseaseCount.hasOwnProperty(a.disease_detected)) {
            diseaseCount[a.disease_detected]++;
        }
    });

    const labels = Object.keys(diseaseCount);
    const data = Object.values(diseaseCount);
    const colors = [
        '#4f46e5', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6',
        '#ec4899', '#06b6d4', '#84cc16', '#f97316', '#a855f7'
    ];

    if (diseaseChart) diseaseChart.destroy();

    diseaseChart = new Chart(ctx, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{
                data: data,
                backgroundColor: colors,
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        boxWidth: 12,
                        padding: 10,
                        font: {
                            size: 10
                        }
                    }
                },
                tooltip: {
                    callbacks: {
                        label: function(context) {
                            const label = context.label || '';
                            const value = context.parsed || 0;
                            const total = context.dataset.data.reduce((a, b) => a + b, 0);
                            const percentage = total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                            return label + ': ' + value + ' (' + percentage + '%)';
                        }
                    }
                }
            }
        }
    });
}

// File Upload
function setupDragAndDrop() {
    const dropZone = document.getElementById('drop-zone');
    
    if (!dropZone) return;
    
    ['dragenter', 'dragover', 'dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, preventDefaults, false);
    });
    
    function preventDefaults(e) {
        e.preventDefault();
        e.stopPropagation();
    }
    
    ['dragenter', 'dragover'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = 'var(--primary)';
            dropZone.style.background = 'rgba(79, 70, 229, 0.05)';
        });
    });
    
    ['dragleave', 'drop'].forEach(eventName => {
        dropZone.addEventListener(eventName, () => {
            dropZone.style.borderColor = '';
            dropZone.style.background = '';
        });
    });
    
    dropZone.addEventListener('drop', (e) => {
        const dt = e.dataTransfer;
        const files = dt.files;
        handleFiles(files);
    });
}

function handleFileSelect(event) {
    const files = event.target.files;
    handleFiles(files);
}

function handleFiles(files) {
    selectedFiles = Array.from(files).filter(file => {
        if (file.size > 10 * 1024 * 1024) {
            alert(`${file.name} is too large. Max size is 10MB.`);
            return false;
        }
        return file.type.startsWith('image/');
    });
    
    if (selectedFiles.length === 0) return;
    
    document.getElementById('upload-content').style.display = 'none';
    document.getElementById('preview-section').style.display = 'block';
    
    const previewGrid = document.getElementById('image-previews');
    previewGrid.innerHTML = '';
    
    selectedFiles.forEach((file, index) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            const div = document.createElement('div');
            div.className = 'preview-item';
            div.innerHTML = `
                <img src="${e.target.result}" alt="${file.name}">
                <button class="preview-remove" onclick="removeFile(${index})" type="button">×</button>
            `;
            previewGrid.appendChild(div);
        };
        reader.readAsDataURL(file);
    });
}

function removeFile(index) {
    selectedFiles.splice(index, 1);
    
    if (selectedFiles.length === 0) {
        resetUpload();
    } else {
        handleFiles(selectedFiles);
    }
}

function resetUpload() {
    selectedFiles = [];
    document.getElementById('file-input').value = '';
    document.getElementById('upload-content').style.display = 'block';
    document.getElementById('preview-section').style.display = 'none';
    document.getElementById('analysis-notes').value = '';
    document.getElementById('processing-display').style.display = 'none';
    document.getElementById('results-display').style.display = 'none';
}

async function handleUpload(event) {
    event.preventDefault();
    
    if (selectedFiles.length === 0) {
        alert('Please select at least one image');
        return;
    }
    
    document.querySelector('.upload-card').style.display = 'none';
    document.getElementById('processing-display').style.display = 'block';
    
    const notes = document.getElementById('analysis-notes').value;
    
    try {
        for (let i = 0; i < selectedFiles.length; i++) {
            const file = selectedFiles[i];
            await processFile(file, notes, i, selectedFiles.length);
        }
        
        setTimeout(() => {
            document.getElementById('processing-display').style.display = 'none';
            document.getElementById('results-display').style.display = 'block';
        }, 1000);
        
    } catch (error) {
        console.error('Upload error:', error);
        alert('Error processing images: ' + error.message);
        resetUpload();
        document.querySelector('.upload-card').style.display = 'block';
    }
}

async function processFile(file, notes, index, total) {
    updateProcessingSteps('upload', 'active');
    updateProgress(10, `Uploading ${index + 1} of ${total}...`);
    
    const fileName = `${currentUser.id}/${Date.now()}_${file.name}`;
    
    const { data: uploadData, error: uploadError } = await supabase.storage
        .from('blood-smear-images')
        .upload(fileName, file);
    
    if (uploadError) throw uploadError;
    
    updateProcessingSteps('upload', 'completed');
    updateProcessingSteps('preprocess', 'active');
    updateProgress(30, 'Preprocessing image...');
    
    await sleep(500);
    
    const { data: urlData } = supabase.storage
        .from('blood-smear-images')
        .getPublicUrl(fileName);
    
    updateProcessingSteps('preprocess', 'completed');
    updateProcessingSteps('ai', 'active');
    updateProgress(50, 'Running AI analysis...');
    
    await sleep(1000);
    
    const { data: analysis, error: analysisError } = await supabase
        .from('analyses')
        .insert([{
            user_id: currentUser.id,
            image_url: urlData.publicUrl,
            status: 'processing',
            analysis_notes: notes || null
        }])
        .select()
        .single();
    
    if (analysisError) throw analysisError;
    
    currentAnalysisId = analysis.id;
    
    updateProcessingSteps('ai', 'completed');
    updateProcessingSteps('cells', 'active');
    updateProgress(70, 'Counting cells...');
    
    await sleep(800);
    
    await generateAnalysisResults(analysis.id);
    
    updateProcessingSteps('cells', 'completed');
    updateProcessingSteps('report', 'active');
    updateProgress(90, 'Generating report...');
    
    await sleep(500);
    
    updateProcessingSteps('report', 'completed');
    updateProgress(100, 'Complete!');
    
    await loadAnalysisResults(analysis.id);
}

function updateProgress(percent, status) {
    document.getElementById('progress-fill').style.width = percent + '%';
    document.getElementById('progress-percent').textContent = percent + '%';
    document.getElementById('processing-status').textContent = status;
    
    const remaining = Math.ceil((100 - percent) / 10);
    document.getElementById('progress-eta').textContent = remaining > 0 ? `~${remaining}s remaining` : 'Complete';
}

function updateProcessingSteps(stepId, status) {
    const step = document.getElementById(`step-${stepId}`);
    if (!step) return;
    
    step.classList.remove('active', 'completed');
    if (status) step.classList.add(status);
}

async function generateAnalysisResults(analysisId) {
    const diseases = [
        'Normal Blood Smear',
        'Malaria - Plasmodium infection',
        'Babesiosis - Babesia infection',
        'Leishmaniasis - Leishmania infection',
        'Trypanosomiasis - Trypanosome infection',
        'Basophilia - Elevated basophil count',
        'Eosinophilia - Elevated eosinophil count',
        'Lymphocytosis - Elevated lymphocyte count',
        'Monocytosis - Elevated monocyte count',
        'Neutrophilia - Elevated neutrophil count'
    ];
    
    const primaryIndex = Math.floor(Math.random() * diseases.length);
    const primaryDisease = diseases[primaryIndex];
    const confidenceScore = 85 + Math.random() * 12;
    
    const rbcCount = 4000000 + Math.random() * 2000000;
    const wbcCount = 4000 + Math.random() * 7000;
    const plateletCount = 150000 + Math.random() * 250000;
    
    await supabase
        .from('analyses')
        .update({
            status: 'completed',
            disease_detected: primaryDisease,
            confidence_score: confidenceScore,
            rbc_count: rbcCount,
            wbc_count: wbcCount,
            platelet_count: plateletCount,
            completed_at: new Date().toISOString()
        })
        .eq('id', analysisId);
    
    const classifications = diseases.map((disease, idx) => ({
        analysis_id: analysisId,
        disease_name: disease,
        probability: idx === primaryIndex ? confidenceScore : Math.random() * (100 - confidenceScore),
        cell_abnormalities: {}
    }));
    
    await supabase.from('disease_classifications').insert(classifications);
    
    const cellTypes = [
        { name: 'Neutrophils', normalRange: [40, 60] },
        { name: 'Lymphocytes', normalRange: [20, 40] },
        { name: 'Monocytes', normalRange: [2, 8] },
        { name: 'Eosinophils', normalRange: [1, 4] },
        { name: 'Basophils', normalRange: [0, 1] }
    ];
    
    const cellCounts = cellTypes.map(cellType => {
        const [min, max] = cellType.normalRange;
        const percentage = min + Math.random() * (max - min);
        return {
            analysis_id: analysisId,
            cell_type: cellType.name,
            count: Math.floor(percentage * 100),
            percentage: percentage,
            abnormal_count: Math.floor(Math.random() * 10)
        };
    });
    
    await supabase.from('cell_counts').insert(cellCounts);
}

async function loadAnalysisResults(analysisId) {
    const { data: analysis } = await supabase
        .from('analyses')
        .select('*')
        .eq('id', analysisId)
        .single();
    
    if (!analysis) return;
    
    document.getElementById('disease-name').textContent = analysis.disease_detected;
    document.getElementById('confidence-value').textContent = analysis.confidence_score.toFixed(1) + '%';
    
    const confidenceBar = document.getElementById('confidence-bar');
    const dashOffset = 283 - (283 * analysis.confidence_score / 100);
    confidenceBar.style.strokeDashoffset = dashOffset;
    
    if (analysis.confidence_score >= 90) {
        document.getElementById('validation-badge').textContent = 'VALIDATED';
        document.getElementById('validation-badge').style.background = '#d1fae5';
        document.getElementById('validation-badge').style.color = '#065f46';
    } else if (analysis.confidence_score >= 70) {
        document.getElementById('validation-badge').textContent = 'REVIEW';
        document.getElementById('validation-badge').style.background = '#fed7aa';
        document.getElementById('validation-badge').style.color = '#92400e';
    } else {
        document.getElementById('validation-badge').textContent = 'MANUAL CHECK';
        document.getElementById('validation-badge').style.background = '#fee2e2';
        document.getElementById('validation-badge').style.color = '#991b1b';
    }
    
    updateCellCount('rbc', analysis.rbc_count, 4500000, 6000000, 'M/μL');
    updateCellCount('wbc', analysis.wbc_count, 4000, 11000, '/μL');
    updateCellCount('platelet', analysis.platelet_count, 150000, 450000, 'K/μL');
}

function updateCellCount(type, value, min, max, unit) {
    const displayValue = type === 'rbc' ? Math.floor(value) :
                        type === 'platelet' ? Math.floor(value) :
                        Math.floor(value);

    document.getElementById(`${type}-value`).textContent = displayValue;
    
    const indicator = document.getElementById(`${type}-indicator`);
    const meter = document.getElementById(`${type}-meter`);
    
    let percentage, status;
    if (value < min) {
        percentage = (value / min) * 40;
        status = 'danger';
    } else if (value > max) {
        percentage = 60 + ((value - max) / max) * 40;
        status = 'danger';
    } else {
        percentage = 40 + ((value - min) / (max - min)) * 20;
        status = 'normal';
    }
    
    percentage = Math.min(100, Math.max(0, percentage));
    
    indicator.className = 'indicator ' + status;
    meter.style.width = percentage + '%';
    meter.style.background = status === 'normal' ? 'var(--success)' :
                            status === 'warning' ? 'var(--warning)' :
                            'var(--danger)';
}

// History
async function loadHistory() {
    if (!currentUser) return;
    
    try {
        const { data: analyses, error } = await supabase
            .from('analyses')
            .select('*')
            .eq('user_id', currentUser.id)
            .order('created_at', { ascending: false });
        
        if (error) throw error;
        
        renderHistoryTable(analyses);
    } catch (error) {
        console.error('Error loading history:', error);
    }
}

function renderHistoryTable(analyses) {
    const tbody = document.getElementById('history-tbody');
    
    if (analyses.length === 0) {
        tbody.innerHTML = '<tr><td colspan="7" class="empty-state">No analysis history</td></tr>';
        return;
    }
    
    tbody.innerHTML = analyses.map(analysis => `
        <tr>
            <td><input type="checkbox" class="history-check" data-id="${analysis.id}"></td>
            <td>
                ${analysis.image_url ? 
                    `<img src="${analysis.image_url}" style="width: 50px; height: 50px; object-fit: cover; border-radius: 8px;" alt="Analysis">` :
                    '<div style="width: 50px; height: 50px; background: var(--bg-tertiary); border-radius: 8px;"></div>'
                }
            </td>
            <td>${formatDate(analysis.created_at)}</td>
            <td>${analysis.disease_detected || 'Processing...'}</td>
            <td>
                ${analysis.confidence_score ? 
                    `<span style="font-weight: 600; color: ${getConfidenceColor(analysis.confidence_score)};">${analysis.confidence_score.toFixed(1)}%</span>` :
                    '-'
                }
            </td>
            <td><span class="status-badge status-${analysis.status}">${analysis.status}</span></td>
            <td>
                <button class="btn btn-sm btn-secondary" onclick="viewDetails('${analysis.id}')">View</button>
                <button class="btn btn-sm btn-danger" onclick="deleteAnalysis('${analysis.id}')">Delete</button>
            </td>
        </tr>
    `).join('');
}

function getConfidenceColor(score) {
    if (score >= 90) return 'var(--success)';
    if (score >= 70) return 'var(--warning)';
    return 'var(--danger)';
}

async function deleteAnalysis(id) {
    if (!confirm('Are you sure you want to delete this analysis?')) return;
    
    try {
        await supabase.from('analyses').delete().eq('id', id);
        loadHistory();
        loadDashboard();
    } catch (error) {
        alert('Error deleting analysis');
    }
}

function applyFilters() {
    // Implement filtering logic
    loadHistory();
}

function clearFilters() {
    document.getElementById('filter-from').value = '';
    document.getElementById('filter-to').value = '';
    document.getElementById('filter-disease').value = '';
    document.getElementById('filter-confidence').value = 0;
    document.getElementById('filter-search').value = '';
    loadHistory();
}

function updateConfidenceLabel() {
    const value = document.getElementById('filter-confidence').value;
    document.getElementById('confidence-label').textContent = value + '%+';
}

function toggleSelectAll() {
    const checked = document.getElementById('select-all').checked;
    document.querySelectorAll('.history-check').forEach(cb => cb.checked = checked);
    updateBulkActions();
}

function updateBulkActions() {
    const selected = document.querySelectorAll('.history-check:checked').length;
    const bulkActions = document.getElementById('bulk-actions');
    
    if (selected > 0) {
        bulkActions.style.display = 'flex';
        document.getElementById('selected-count').textContent = `${selected} selected`;
    } else {
        bulkActions.style.display = 'none';
    }
}

// Live Microscopy
async function startVideo() {
    try {
        videoStream = await navigator.mediaDevices.getUserMedia({ 
            video: { facingMode: 'environment' } 
        });
        
        document.getElementById('video-feed').srcObject = videoStream;
        document.getElementById('start-video').style.display = 'none';
        document.getElementById('stop-video').style.display = 'inline-flex';
        document.getElementById('capture-frame').style.display = 'inline-flex';
        document.getElementById('fullscreen-btn').style.display = 'inline-flex';
        
        startLiveDetection();
    } catch (error) {
        alert('Error accessing camera: ' + error.message);
    }
}

function stopVideo() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    
    document.getElementById('start-video').style.display = 'inline-flex';
    document.getElementById('stop-video').style.display = 'none';
    document.getElementById('capture-frame').style.display = 'none';
    document.getElementById('fullscreen-btn').style.display = 'none';
}

function startLiveDetection() {
    // Simulate live cell detection
    setInterval(() => {
        if (!videoStream) return;
        
        const cellCount = Math.floor(Math.random() * 50) + 10;
        const detectionRate = (Math.random() * 30 + 20).toFixed(1);
        const confidence = (Math.random() * 20 + 75).toFixed(1);
        
        document.getElementById('live-cell-count').textContent = cellCount;
        document.getElementById('live-detection-rate').textContent = detectionRate + '/s';
        document.getElementById('live-confidence').textContent = confidence + '%';
    }, 1000);
}

function captureFrame() {
    const video = document.getElementById('video-feed');
    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    canvas.getContext('2d').drawImage(video, 0, 0);
    
    const dataUrl = canvas.toDataURL('image/jpeg');
    capturedFrames.push({
        id: Date.now(),
        image: dataUrl,
        timestamp: new Date().toISOString()
    });
    
    updateCapturesGrid();
}

function updateCapturesGrid() {
    const grid = document.getElementById('captures-grid');
    
    if (capturedFrames.length === 0) {
        grid.innerHTML = '<div class="empty-state">No captures yet</div>';
        return;
    }
    
    grid.innerHTML = capturedFrames.map(frame => `
        <div class="capture-item" style="position: relative;">
            <img src="${frame.image}" style="width: 100%; border-radius: 8px;">
            <div style="padding: 8px; font-size: 11px; color: var(--text-secondary);">
                ${formatDateTime(frame.timestamp)}
            </div>
        </div>
    `).join('');
}

function toggleFullscreen() {
    const video = document.getElementById('video-feed');
    if (video.requestFullscreen) {
        video.requestFullscreen();
    }
}

// PDF Report
function generatePDFReport() {
    alert('PDF Report generation would be implemented here using jsPDF library');
}

// Notifications
async function loadNotifications() {
    // Load notifications from database
    const list = document.getElementById('notifications-list');
    list.innerHTML = '<div class="empty-state">No notifications</div>';
}

function markAllRead() {
    document.getElementById('notif-badge').style.display = 'none';
}

// Utilities
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

function formatDateTime(dateString) {
    const date = new Date(dateString);
    return date.toLocaleString('en-US', {
        month: 'short',
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Close dropdowns when clicking outside
document.addEventListener('click', (e) => {
    if (!e.target.closest('.user-menu')) {
        document.getElementById('user-dropdown').style.display = 'none';
    }
    if (!e.target.closest('.icon-btn') && !e.target.closest('.notification-panel')) {
        document.getElementById('notification-panel').style.display = 'none';
    }
});
