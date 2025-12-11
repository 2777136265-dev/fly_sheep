// 监听 URL 变化，支持 /admin 路径直接进入后台
window.addEventListener('popstate', () => {
  // 修改：检查管理员登录状态（通过URL参数验证）
  const urlParams = new URLSearchParams(window.location.search);
  if (window.location.pathname === '/admin' && (currentUser?.email === ADMIN_EMAIL || urlParams.get('admin') === '1')) {
    showAdminPanel();
  }
});

// 全局变量
let currentUser = null;
let codeTimer = null; // 验证码倒计时器
let emailVerificationEnabled = false; // 修改：默认关闭邮箱验证码

// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 邮件API配置
const mailApiUrl = 'https://api.ruojy.top/api/wx_mail/send';
const mailToken = 'oqrUZ6_DEc0gc4YBGvRlygSCiHY4';

// 全局暴露核心变量（解决跨JS文件访问问题）
window.mailApiUrl = mailApiUrl;
window.mailToken = mailToken;
window.emailVerificationEnabled = emailVerificationEnabled;
window.supabase = supabase; // 暴露supabase实例供其他文件使用

// 管理员账号配置
const ADMIN_EMAIL = 'admin@example.com';
const DEFAULT_ADMIN_USERNAME = 'admin';
const DEFAULT_ADMIN_PASSWORD = 'admin123'; // 默认管理员密码

// 页面初始化
window.addEventListener('DOMContentLoaded', async () => {
    // 加载系统设置
    await loadSystemSettings();
    
    // 绑定事件
    bindGlobalEvents();
    
    // 检查登录状态
    const { data: { session } } = await supabase.auth.getSession();
    if (session) {
        currentUser = session.user;
        await loadUserInfo();
        await checkSignStatus();
        switchAuthUI(true);
        
        // 检查是否是管理员
        if (currentUser.email === ADMIN_EMAIL) {
            document.getElementById('admin-link').style.display = 'inline-block';
        }
    }

    // 检查路径是否为管理员路径
    const urlParams = new URLSearchParams(window.location.search);
    if (window.location.pathname === '/admin' && (currentUser?.email === ADMIN_EMAIL || urlParams.get('admin') === '1')) {
        showAdminPanel();
    }
});

// 绑定全局事件
function bindGlobalEvents() {
    // 管理员链接
    document.getElementById('admin-link').addEventListener('click', showAdminPanel);
    document.getElementById('admin-link').addEventListener('touchstart', (e) => {
        e.preventDefault();
        showAdminPanel();
    });
}

// 加载用户信息
async function loadUserInfo() {
    const { data: userData } = await supabase
        .from('users')
        .select('*')
        .eq('id', currentUser.id)
        .single();
    
    if (userData) {
        document.getElementById('username').textContent = userData.username;
        document.getElementById('points').textContent = userData.points;
    }
}

// 检查签到状态
async function checkSignStatus() {
    const today = new Date().toISOString().split('T')[0];
    const { data: signRecord } = await supabase
        .from('sign_records')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('sign_date', today)
        .single();
    
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
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 记录签到
        const { error: signError } = await supabase
            .from('sign_records')
            .insert([{ user_id: currentUser.id, sign_date: today }]);
        
        if (signError) {
            alert('签到失败：' + signError.message);
            return;
        }
        
        // 增加积分（+10分）
        const { data: userData } = await supabase
            .from('users')
            .select('points')
            .eq('id', currentUser.id)
            .single();
        
        const newPoints = userData.points + 10;
        await supabase
            .from('users')
            .update({ points: newPoints })
            .eq('id', currentUser.id);
        
        // 更新UI
        document.getElementById('points').textContent = newPoints;
        document.getElementById('sign-btn').disabled = true;
        document.getElementById('sign-btn').textContent = '已签到';
        
        alert('签到成功！获得10积分～');
    } catch (err) {
        alert('签到异常：' + err.message);
    }
}

// 切换认证UI
function switchAuthUI(isLoggedIn) {
    if (isLoggedIn) {
        document.getElementById('auth-area').style.display = 'none';
        document.getElementById('user-area').style.display = 'flex';
    } else {
        document.getElementById('auth-area').style.display = 'block';
        document.getElementById('user-area').style.display = 'none';
    }
}

// 加载系统设置
async function loadSystemSettings() {
    const { data: settings, error } = await supabase
        .from('system_settings')
        .select('*')
        .single();
    
    if (settings) {
        emailVerificationEnabled = settings.email_verification_enabled;
        if (document.getElementById('email-verification-switch')) {
            document.getElementById('email-verification-switch').checked = emailVerificationEnabled;
        }
    } else {
        // 修改：初始化时默认关闭邮箱验证
        await supabase
            .from('system_settings')
            .insert([{ email_verification_enabled: false }]);
        emailVerificationEnabled = false;
    }
    // 同步全局变量
    window.emailVerificationEnabled = emailVerificationEnabled;
}

// 保存系统设置
async function saveSystemSettings() {
    emailVerificationEnabled = document.getElementById('email-verification-switch').checked;
    
    const { error } = await supabase
        .from('system_settings')
        .upsert([{ id: 1, email_verification_enabled: emailVerificationEnabled }]);
    
    if (error) {
        alert('保存设置失败：' + error.message);
        return false;
    }
    
    // 同步全局变量
    window.emailVerificationEnabled = emailVerificationEnabled;
    alert('设置已保存！');
    return true;
}

// 显示管理员面板
function showAdminPanel() {
    // 验证管理员权限
    const urlParams = new URLSearchParams(window.location.search);
    if (currentUser?.email !== ADMIN_EMAIL && urlParams.get('admin') !== '1') {
        alert('请先通过管理员登录页登录');
        return;
    }
    
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('admin-panel').classList.add('active');
    loadUserList(); // 加载用户列表
}

// 隐藏管理员面板
function hideAdminPanel() {
    document.getElementById('admin-panel').classList.remove('active');
    document.getElementById('main-container').style.display = 'block';
}

// 管理员登录验证函数（供登录页调用）
window.adminLogin = async (username, password) => {
    if (username !== DEFAULT_ADMIN_USERNAME) {
        return { success: false, message: '管理员账号错误' };
    }
    if (password !== DEFAULT_ADMIN_PASSWORD) {
        return { success: false, message: '管理员密码错误' };
    }
    
    // 可以在这里添加管理员账号到Supabase的逻辑（如果需要）
    return { success: true };
};
