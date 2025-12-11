// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = window.supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 全局变量
let currentUser = null;
let emailVerificationEnabled = false;
const ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_AVATAR = 'https://q1.qlogo.cn/g?b=qq&nk=2777136265&s=640'; // 默认QQ头像
let SIGN_POINTS = 10; // 签到积分
let UPLOAD_POINTS = 5; // 上传资源积分

// 页面加载完成初始化
window.addEventListener('DOMContentLoaded', async () => {
    // 初始化监听
    initEventListeners();
    // 检查登录状态（自动恢复登录）
    await checkAuthState();
    // 加载系统设置
    await loadSystemSettings();
    // 加载资源列表
    await loadResourceList();
    // 检查管理员参数
    checkAdminParam();
    // 初始化个人中心统计数据
    await loadProfileStats();
});

// 初始化所有事件监听
function initEventListeners() {
    // 登录/注册按钮
    document.getElementById('login-btn').addEventListener('click', () => openModal('login'));
    document.getElementById('register-btn').addEventListener('click', () => openModal('register'));

    // 搜索功能
    document.getElementById('search-btn').addEventListener('click', loadResourceList);
    document.getElementById('search-input').addEventListener('keypress', (e) => {
        if (e.key === 'Enter') loadResourceList();
    });

    // 资源筛选标签
    document.querySelectorAll('.filter-tag').forEach(tag => {
        tag.addEventListener('click', function() {
            document.querySelectorAll('.filter-tag').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            loadResourceList();
        });
    });

    // 签到按钮
    document.getElementById('sign-btn').addEventListener('click', signIn);

    // 退出按钮
    document.getElementById('logout-btn').addEventListener('click', logout);

    // 管理员链接
    document.getElementById('admin-link').addEventListener('click', showAdminPanel);

    // 返回前台按钮
    document.getElementById('back-home').addEventListener('click', hideAdminPanel);

    // 管理员标签切换
    document.querySelectorAll('.admin-tab').forEach(tab => {
        tab.addEventListener('click', function() {
            document.querySelectorAll('.admin-tab').forEach(t => t.classList.remove('active'));
            this.classList.add('active');
            const tabId = this.dataset.tab + '-tab';
            document.querySelectorAll('.admin-tab-content').forEach(c => c.classList.remove('active'));
            document.getElementById(tabId).classList.add('active');
        });
    });

    // 保存系统设置
    document.getElementById('save-settings').addEventListener('click', saveSystemSettings);

    // 上传资源按钮
    document.getElementById('upload-resource-btn').addEventListener('click', () => {
        document.getElementById('upload-modal').classList.add('active');
    });

    // 弹窗关闭按钮（所有弹窗通用）
    document.querySelectorAll('.close-modal').forEach(btn => {
        btn.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(m => m.classList.remove('active'));
        });
    });

    // 点击弹窗外部关闭
    window.addEventListener('click', (e) => {
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
        }
    });
}

// 检查登录状态（自动恢复登录）
async function checkAuthState() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserInfo(); // 加载用户基本信息
        switchAuthUI(true); // 切换到登录后UI
        // 检查是否是管理员
        if (currentUser.email === ADMIN_EMAIL) {
            document.getElementById('admin-link').style.display = 'block';
        }
        // 显示上传按钮
        document.getElementById('upload-resource-btn').style.display = 'flex';
    } else {
        switchAuthUI(false); // 切换到未登录UI
        // 加载默认头像
        loadDefaultAvatar();
    }
}

// 加载用户完整信息（含头像、用户名、积分）
async function loadUserInfo() {
    const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single()
        .catch(() => ({ data: null }));
    
    if (userData) {
        // 更新用户名
        document.getElementById('username').textContent = userData.username;
        document.getElementById('profile-username').textContent = userData.username;
        // 更新积分
        document.getElementById('points').textContent = userData.points || 0;
        document.getElementById('profile-points').textContent = userData.points || 0;
        // 加载用户头像
        await loadUserAvatar(userData);
        // 更新签到按钮状态
        await checkSignStatus();
    } else {
        // 新用户初始化数据
        const defaultUsername = currentUser.email.split('@')[0];
        await supabase.from('users').insert([{
            id: currentUser.id,
            username: defaultUsername,
            email: currentUser.email,
            points: 0,
            status: 1
        }]);
        // 初始化后重新加载
        await loadUserInfo();
    }
}

// 加载用户头像（优先QQ头像，无则用默认）
async function loadUserAvatar(userData) {
    const bigAvatarEl = document.getElementById('user-avatar');
    const smallAvatarEl = document.getElementById('user-avatar-small');
    let avatarUrl = DEFAULT_AVATAR;

    // 1. 优先使用数据库中保存的头像
    if (userData?.qq_avatar) {
        avatarUrl = userData.qq_avatar;
    } 
    // 2. 从QQ邮箱提取QQ号生成头像
    else if (currentUser.email.includes('@qq.com')) {
        const qqMatch = currentUser.email.match(/^(\d+)@qq\.com$/);
        if (qqMatch) {
            avatarUrl = `https://q1.qlogo.cn/g?b=qq&nk=${qqMatch[1]}&s=640`;
            // 保存到数据库，下次直接使用
            await supabase
                .from('users')
                .update({ qq_avatar: avatarUrl })
                .eq('id', currentUser.id);
        }
    }

    // 更新头像DOM
    bigAvatarEl.src = avatarUrl;
    smallAvatarEl.src = avatarUrl;
    bigAvatarEl.alt = currentUser.email;
    smallAvatarEl.alt = currentUser.email;
}

// 加载默认头像（未登录状态）
function loadDefaultAvatar() {
    const bigAvatarEl = document.getElementById('user-avatar');
    const smallAvatarEl = document.getElementById('user-avatar-small');
    bigAvatarEl.src = DEFAULT_AVATAR;
    smallAvatarEl.src = DEFAULT_AVATAR;
    // 重置个人中心信息
    document.getElementById('profile-username').textContent = '未登录用户';
    document.getElementById('profile-points').textContent = '0';
    document.getElementById('sign-count').textContent = '0';
    document.getElementById('upload-count').textContent = '0';
}

// 检查签到状态
async function checkSignStatus() {
    const today = new Date().toISOString().split('T')[0];
    const { data: signRecord } = await supabase
        .from('sign_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('sign_date', today)
        .single()
        .catch(() => ({ data: null }));
    
    const signBtn = document.getElementById('sign-btn');
    if (signRecord) {
        signBtn.disabled = true;
        signBtn.textContent = '已签到';
    } else {
        signBtn.disabled = false;
        signBtn.textContent = '今日签到';
    }
}

// 签到功能
async function signIn() {
    if (!currentUser) {
        alert('请先登录！');
        openModal('login');
        return;
    }

    const today = new Date().toISOString().split('T')[0];
    // 检查是否已签到
    const { data: signRecord } = await supabase
        .from('sign_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('sign_date', today)
        .single()
        .catch(() => ({ data: null }));
    
    if (signRecord) {
        alert('今天已经签过到啦！');
        return;
    }

    try {
        // 记录签到记录
        await supabase.from('sign_records').insert([{
            user_id: currentUser.id,
            sign_date: today
        }]);

        // 增加积分
        const { data: userData } = await supabase
            .from('users')
            .select('points')
            .eq('id', currentUser.id)
            .single();
        
        const newPoints = (userData.points || 0) + SIGN_POINTS;
        await supabase
            .from('users')
            .update({ points: newPoints })
            .eq('id', currentUser.id);
        
        // 更新UI
        document.getElementById('points').textContent = newPoints;
        document.getElementById('profile-points').textContent = newPoints;
        document.getElementById('sign-btn').disabled = true;
        document.getElementById('sign-btn').textContent = '已签到';
        
        // 更新签到统计
        await loadProfileStats();
        
        alert(`签到成功！获得${SIGN_POINTS}积分～`);
    } catch (err) {
        alert('签到失败：' + err.message);
    }
}

// 切换登录/未登录UI状态
function switchAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-area').style.display = 'none';
        document.getElementById('user-area').style.display = 'flex';
    } else {
        document.getElementById('auth-area').style.display = 'flex';
        document.getElementById('user-area').style.display = 'none';
        document.getElementById('admin-link').style.display = 'none';
        document.getElementById('upload-resource-btn').style.display = 'none';
    }
}

// 退出登录
async function logout() {
    try {
        await supabase.auth.signOut();
        currentUser = null;
        switchAuthUI(false);
        loadDefaultAvatar();
        await loadProfileStats(); // 重置统计数据
        alert('退出成功！');
    } catch (err) {
        alert('退出失败：' + err.message);
    }
}

// 加载系统设置（含邮箱验证开关、积分配置）
async function loadSystemSettings() {
    const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .single()
        .catch(() => ({ data: null }));
    
    if (settings) {
        // 邮箱验证开关
        emailVerificationEnabled = settings.email_verification_enabled;
        document.getElementById('email-verification-switch').checked = emailVerificationEnabled;
        // 积分配置
        SIGN_POINTS = settings.sign_points || 10;
        UPLOAD_POINTS = settings.upload_points || 5;
        document.getElementById('sign-points').value = SIGN_POINTS;
        document.getElementById('upload-points').value = UPLOAD_POINTS;
    } else {
        // 初始化系统设置（默认关闭邮箱验证）
        await supabase.from('system_settings').insert([{
            email_verification_enabled: false,
            sign_points: 10,
            upload_points: 5
        }]);
        emailVerificationEnabled = false;
    }
    // 暴露到全局供其他文件使用
    window.emailVerificationEnabled = emailVerificationEnabled;
    window.SIGN_POINTS = SIGN_POINTS;
    window.UPLOAD_POINTS = UPLOAD_POINTS;
}

// 保存系统设置
async function saveSystemSettings() {
    const emailVerification = document.getElementById('email-verification-switch').checked;
    const signPoints = parseInt(document.getElementById('sign-points').value);
    const uploadPoints = parseInt(document.getElementById('upload-points').value);

    // 验证输入
    if (isNaN(signPoints) || signPoints < 1) {
        alert('签到积分必须是大于0的整数！');
        return;
    }
    if (isNaN(uploadPoints) || uploadPoints < 1) {
        alert('上传积分必须是大于0的整数！');
        return;
    }

    const { error } = await supabase
        .from('system_settings')
        .upsert([{
            id: 1,
            email_verification_enabled: emailVerification,
            sign_points: signPoints,
            upload_points: uploadPoints
        }]);
    
    if (error) {
        alert('保存失败：' + error.message);
        return;
    }

    // 更新全局变量
    emailVerificationEnabled = emailVerification;
    SIGN_POINTS = signPoints;
    UPLOAD_POINTS = uploadPoints;
    window.emailVerificationEnabled = emailVerification;
    window.SIGN_POINTS = signPoints;
    window.UPLOAD_POINTS = uploadPoints;

    alert('设置保存成功！');
}

// 显示管理员面板
function showAdminPanel() {
    if (!currentUser) {
        alert('请先登录！');
        openModal('login');
        return;
    }

    // 验证管理员权限（账号或URL参数）
    const urlParams = new URLSearchParams(window.location.search);
    if (currentUser.email !== ADMIN_EMAIL && urlParams.get('admin') !== '1') {
        alert('没有管理员权限！');
        return;
    }

    document.getElementById('admin-panel').classList.add('active');
    // 加载管理员数据
    loadUserList();
    loadAdminResourceList();
}

// 隐藏管理员面板
function hideAdminPanel() {
    document.getElementById('admin-panel').classList.remove('active');
}

// 检查管理员URL参数（admin-login.html跳转用）
function checkAdminParam() {
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1') {
        document.getElementById('admin-link').style.display = 'block';
    }
}

// 打开登录/注册弹窗
function openModal(type) {
    document.getElementById('auth-modal').classList.add('active');
    // 切换到对应标签页
    document.querySelectorAll('.modal-tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.modal-form').forEach(f => f.classList.remove('active'));
    document.querySelector(`.modal-tab[data-tab="${type}"]`).classList.add('active');
    document.getElementById(`${type}-form`).classList.add('active');
}

// 加载个人中心统计数据（签到天数、上传资源数）
async function loadProfileStats() {
    if (!currentUser) {
        // 未登录时显示0
        document.getElementById('sign-count').textContent = '0';
        document.getElementById('upload-count').textContent = '0';
        return;
    }

    // 1. 统计签到天数
    const { count: signCount } = await supabase
        .from('sign_records')
        .select('id', { count: 'exact' })
        .eq('user_id', currentUser.id);
    
    // 2. 统计上传资源数
    const { count: uploadCount } = await supabase
        .from('resources')
        .select('id', { count: 'exact' })
        .eq('user_id', currentUser.id);
    
    // 更新UI
    document.getElementById('sign-count').textContent = signCount || '0';
    document.getElementById('upload-count').textContent = uploadCount || '0';
}

// 暴露全局函数（供其他JS文件调用）
window.checkAuthState = checkAuthState;
window.switchAuthUI = switchAuthUI;
window.openModal = openModal;
window.showAdminPanel = showAdminPanel;
window.hideAdminPanel = hideAdminPanel;
window.loadUserInfo = loadUserInfo;
window.loadProfileStats = loadProfileStats;
window.loadResourceList = loadResourceList; // 资源列表加载（resource.js实现）
window.loadUserList = loadUserList; // 用户列表加载（admin.js实现）
window.loadAdminResourceList = loadAdminResourceList; // 管理员资源列表（admin.js实现）
