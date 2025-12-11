// 监听 URL 变化，支持 /admin 路径直接进入后台
window.addEventListener('popstate', () => {
  if (window.location.pathname === '/admin' && currentUser?.email === ADMIN_EMAIL) {
    showAdminPanel();
  }
});

// 初始化时检查路径
window.addEventListener('DOMContentLoaded', async () => {
  // 原有初始化代码...
  
  // 新增：若路径是 /admin 且是管理员，直接显示后台
  if (window.location.pathname === '/admin' && currentUser?.email === ADMIN_EMAIL) {
    showAdminPanel();
  }
});

// 全局变量
let currentUser = null;
let codeTimer = null; // 验证码倒计时器
let emailVerificationEnabled = true; // 邮箱验证码开关状态

// Supabase配置
const supabaseUrl = 'https://neflfdfpzyjookonmleo.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im5lZmxmZGZwenlqb29rb25tbGVvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjUzNzQxMTUsImV4cCI6MjA4MDk1MDExNX0.z944F1VmJO9ro-1iDtB9HD_1NVThzz7mzqSX0IQqj68';
const supabase = supabase.createClient(supabaseUrl, supabaseKey);

// 邮件API配置
const mailApiUrl = 'https://api.ruojy.top/api/wx_mail/send';
const mailToken = 'oqrUZ6_DEc0gc4YBGvRlygSCiHY4';

// 管理员账号
const ADMIN_EMAIL = 'admin@example.com';

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
    const { data: settings } = await supabase
        .from('system_settings')
        .select('*')
        .single();
    
    if (settings) {
        emailVerificationEnabled = settings.email_verification_enabled;
        if (document.getElementById('email-verification-switch')) {
            document.getElementById('email-verification-switch').checked = emailVerificationEnabled;
        }
    } else {
        // 初始化设置
        await supabase
            .from('system_settings')
            .insert([{ email_verification_enabled: true }]);
    }
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
    
    alert('设置已保存！');
    return true;
}

// 显示管理员面板
function showAdminPanel() {
    document.getElementById('main-container').style.display = 'none';
    document.getElementById('admin-panel').classList.add('active');
    loadUserList(); // 加载用户列表
}

// 隐藏管理员面板
function hideAdminPanel() {
    document.getElementById('admin-panel').classList.remove('active');
    document.getElementById('main-container').style.display = 'block';
}
