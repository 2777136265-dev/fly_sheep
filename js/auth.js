// 等待DOM加载完成后执行
document.addEventListener('DOMContentLoaded', function() {
  // 核心元素获取
  const modal = document.getElementById('auth-modal');
  const closeBtn = document.getElementById('close-modal');
  const openLoginBtn = document.getElementById('open-login-btn');
  const openRegisterBtn = document.getElementById('open-register-btn');
  const tabBtns = document.querySelectorAll('.tab-btn');
  const modalForms = document.querySelectorAll('.modal-form');

  // 1. 关闭弹窗
  closeBtn.addEventListener('click', function() {
    modal.style.display = 'none';
  });

  // 2. 点击遮罩层关闭弹窗
  modal.addEventListener('click', function(e) {
    if (e.target === modal) {
      modal.style.display = 'none';
    }
  });

  // 3. 标签页切换逻辑
  tabBtns.forEach(btn => {
    btn.addEventListener('click', function() {
      // 移除所有标签的active类
      tabBtns.forEach(b => b.classList.remove('active'));
      // 给当前标签加active
      this.classList.add('active');
      // 获取目标表单ID
      const targetTab = this.getAttribute('data-tab');
      // 隐藏所有表单，显示目标表单
      modalForms.forEach(form => {
        form.classList.remove('active');
        form.style.display = 'none';
      });
      const targetForm = document.getElementById(`${targetTab}-form`);
      targetForm.classList.add('active');
      targetForm.style.display = 'block';
    });
  });

  // 4. 打开登录弹窗（默认显示登录表单）
  openLoginBtn.addEventListener('click', function() {
    // 显示弹窗
    modal.style.display = 'flex';
    // 重置标签和表单为登录状态
    tabBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('login-tab').classList.add('active');
    modalForms.forEach(form => {
      form.classList.remove('active');
      form.style.display = 'none';
    });
    document.getElementById('login-form').classList.add('active');
    document.getElementById('login-form').style.display = 'block';
  });

  // 5. 打开注册弹窗（默认显示注册表单）
  openRegisterBtn.addEventListener('click', function() {
    // 显示弹窗
    modal.style.display = 'flex';
    // 重置标签和表单为注册状态
    tabBtns.forEach(b => b.classList.remove('active'));
    document.getElementById('register-tab').classList.add('active');
    modalForms.forEach(form => {
      form.classList.remove('active');
      form.style.display = 'none';
    });
    document.getElementById('register-form').classList.add('active');
    document.getElementById('register-form').style.display = 'block';
  });

  // 6. 登录/注册/找回密码按钮点击逻辑
  document.getElementById('do-login').addEventListener('click', function() {
    const account = document.getElementById('login-account')?.value || document.getElementById('login-email').value;
    const pwd = document.getElementById('login-pwd').value;
    if (!account || !pwd) {
      alert('请输入账号和密码！');
      return;
    }
    // 调用统一登录函数
    login(account, pwd);
  });

  document.getElementById('do-register').addEventListener('click', function() {
    const username = document.getElementById('reg-username')?.value || document.getElementById('register-name').value;
    const email = document.getElementById('reg-email')?.value || document.getElementById('register-email').value;
    const pwd = document.getElementById('reg-pwd')?.value || document.getElementById('register-pwd').value;
    if (!username || !email || !pwd) {
      alert('请填写完整注册信息！');
      return;
    }
    // 调用统一注册函数
    register();
  });

  document.getElementById('do-forgot')?.addEventListener('click', function() {
    const email = document.getElementById('forgot-email').value;
    if (!email) {
      alert('请输入绑定邮箱！');
      return;
    }
    sendFindPwdCode();
  });
});

// 全局变量定义（解决跨文件访问问题）
const mailApiUrl = '/api/wx_mail/send'; // Netlify代理的邮件接口地址
const mailToken = 'oqrUZ6_DEc0gc4YBGvRlygSCiHY4'; // 邮件接口token
let emailVerificationEnabled = true; // 邮箱验证码开关状态

// 页面加载完成后绑定事件
window.addEventListener('DOMContentLoaded', () => {
    // 加载系统设置（获取邮箱验证码开关状态）
    loadSystemSettings();
    bindAuthEvents();
});

// 绑定认证相关事件
function bindAuthEvents() {
    // 登录/注册按钮（兼容不同ID定义）
    const loginBtn = document.getElementById('login-btn');
    if (loginBtn) {
        loginBtn.addEventListener('click', () => openModal('login'));
        loginBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            openModal('login');
        });
    }
    
    const registerBtn = document.getElementById('register-btn');
    if (registerBtn) {
        registerBtn.addEventListener('click', () => openModal('register'));
        registerBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            openModal('register');
        });
    }
    
    // 退出按钮
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', logout);
        logoutBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            logout();
        });
    }
    
    // 签到按钮
    const signBtn = document.getElementById('sign-btn');
    if (signBtn) {
        signBtn.addEventListener('click', signIn);
        signBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            signIn();
        });
    }
    
    // 弹窗关闭按钮（兼容不同ID定义）
    const closeModalBtn = document.getElementById('close-modal') || document.querySelector('.close-btn');
    if (closeModalBtn) {
        closeModalBtn.addEventListener('click', closeModal);
        closeModalBtn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            closeModal();
        });
    }
    
    // 弹窗标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            switchTab(btn.dataset.tab);
        });
    });
    
    // 表单提交按钮（兼容不同ID定义）
    const doLoginBtn = document.getElementById('do-login');
    if (doLoginBtn) {
        doLoginBtn.addEventListener('click', login);
    }
    
    const doRegisterBtn = document.getElementById('do-register');
    if (doRegisterBtn) {
        doRegisterBtn.addEventListener('click', register);
    }
    
    const doResetPwdBtn = document.getElementById('do-reset-pwd');
    if (doResetPwdBtn) {
        doResetPwdBtn.addEventListener('click', resetPassword);
    }
    
    // 发送验证码按钮
    const sendRegisterCodeBtn = document.getElementById('send-register-code');
    if (sendRegisterCodeBtn) {
        sendRegisterCodeBtn.addEventListener('click', sendRegisterCode);
    }
    
    const sendFindCodeBtn = document.getElementById('send-find-code');
    if (sendFindCodeBtn) {
        sendFindCodeBtn.addEventListener('click', sendFindPwdCode);
    }
}

// 加载系统设置（获取邮箱验证码开关状态）
async function loadSystemSettings() {
    try {
        const { data: settings } = await window.supabase
            .from('system_settings')
            .select('*')
            .single();
        
        if (settings) {
            emailVerificationEnabled = settings.email_verification_enabled;
            // 更新全局变量
            window.emailVerificationEnabled = emailVerificationEnabled;
        }
    } catch (err) {
        console.log('加载系统设置失败，使用默认值:', err);
        emailVerificationEnabled = true;
    }
}

// 弹窗控制
function openModal(type) {
    const modal = document.getElementById('auth-modal') || document.querySelector('.modal');
    if (modal) {
        modal.style.display = 'flex';
        switchTab(type);
        // 阻止移动端滚动穿透
        modal.addEventListener('touchmove', (e) => e.preventDefault());
    }
}

function closeModal() {
    const modal = document.getElementById('auth-modal') || document.querySelector('.modal');
    if (modal) {
        modal.style.display = 'none';
        // 清空表单
        clearModalForms();
        // 恢复滚动
        modal.removeEventListener('touchmove', (e) => e.preventDefault());
    }
}

function switchTab(type) {
    // 切换标签样式
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    const activeTab = document.querySelector(`.tab-btn[data-tab="${type}"]`);
    if (activeTab) {
        activeTab.classList.add('active');
    }
    
    // 切换表单
    document.querySelectorAll('.modal-form').forEach(form => form.classList.remove('active'));
    const targetForm = document.getElementById(`${type}-form`);
    if (targetForm) {
        targetForm.classList.add('active');
    }
}

function clearModalForms() {
    // 清空所有表单（兼容不同ID定义）
    document.getElementById('login-email')?.setValue('');
    document.getElementById('login-account')?.setValue('');
    document.getElementById('login-pwd')?.setValue('');
    document.getElementById('register-name')?.setValue('');
    document.getElementById('reg-username')?.setValue('');
    document.getElementById('register-email')?.setValue('');
    document.getElementById('reg-email')?.setValue('');
    document.getElementById('register-pwd')?.setValue('');
    document.getElementById('reg-pwd')?.setValue('');
    document.getElementById('register-code')?.setValue('');
    document.getElementById('find-email')?.setValue('');
    document.getElementById('forgot-email')?.setValue('');
    document.getElementById('find-code')?.setValue('');
    document.getElementById('new-pwd')?.setValue('');
}

// 验证码发送
async function sendRegisterCode() {
    // 验证验证码开关状态
    if (!emailVerificationEnabled) {
        alert('邮箱验证码功能已关闭');
        return;
    }
    
    const email = document.getElementById('register-email')?.value.trim() || document.getElementById('reg-email')?.value.trim();
    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        alert('请输入邮箱！');
        return;
    }
    if (!emailRegex.test(email)) {
        alert('邮箱格式不正确！');
        return;
    }
    
    // 检查邮箱是否已注册
    const { data: existingUser } = await window.supabase
        .from('users')
        .select('id')
        .eq('email', email)
        .single()
        .catch(() => ({ data: null }));
    
    if (existingUser) {
        alert('该邮箱已注册，请直接登录！');
        switchTab('login');
        return;
    }
    
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 发送邮件
    const sendResult = await sendMail(email, '用户注册验证码', `你的注册验证码是：${code}，5分钟内有效。`);
    if (!sendResult) {
        alert('验证码发送失败，请重试！');
        return;
    }
    
    // 保存验证码到Supabase
    const { error } = await window.supabase
        .from('verification_codes')
        .insert([{ email, code, type: 'register', expire_at: new Date(Date.now() + 5 * 60 * 1000) }]);
    
    if (error) {
        alert('验证码保存失败：' + error.message);
        return;
    }
    
    // 倒计时
    const btn = document.getElementById('send-register-code');
    startCodeTimer(btn);
    alert('验证码已发送至你的邮箱！');
}

async function sendFindPwdCode() {
    // 验证验证码开关状态
    if (!emailVerificationEnabled) {
        alert('邮箱验证码功能已关闭');
        return;
    }
    
    const email = document.getElementById('find-email')?.value.trim() || document.getElementById('forgot-email')?.value.trim();
    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email) {
        alert('请输入邮箱！');
        return;
    }
    if (!emailRegex.test(email)) {
        alert('邮箱格式不正确！');
        return;
    }
    
    // 检查邮箱是否存在
    const { data: user } = await window.supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single()
        .catch(() => ({ data: null }));
    
    if (!user) {
        alert('该邮箱未注册！');
        return;
    }
    
    // 生成6位验证码
    const code = Math.floor(100000 + Math.random() * 900000).toString();
    
    // 发送邮件
    const sendResult = await sendMail(email, '密码找回验证码', `你的密码找回验证码是：${code}，5分钟内有效。`);
    if (!sendResult) {
        alert('验证码发送失败，请重试！');
        return;
    }
    
    // 保存验证码到Supabase
    const { error } = await window.supabase
        .from('verification_codes')
        .insert([{ email, code, type: 'find_pwd', expire_at: new Date(Date.now() + 5 * 60 * 1000) }]);
    
    if (error) {
        alert('验证码保存失败：' + error.message);
        return;
    }
    
    // 倒计时
    const btn = document.getElementById('send-find-code') || document.getElementById('do-forgot');
    startCodeTimer(btn);
    alert('验证码已发送至你的邮箱！');
}

// 邮件发送核心函数
async function sendMail(to, subject, content) {
    try {
        const requestBody = {
            "to": to.trim(),
            "subject": subject,
            "content": content
        };
        console.log('【邮件请求参数】', requestBody);
        
        const response = await fetch(mailApiUrl, {
            method: 'POST',
            headers: {
                'accept': '*/*',
                'token': mailToken,
                'Content-Type': 'application/json',
                'Cache-Control': 'no-cache'
            },
            body: JSON.stringify(requestBody),
            credentials: 'omit'
        });
        
        console.log('【邮件接口响应状态】', response.status);
        const result = await response.json().catch(() => ({}));
        console.log('【邮件接口返回数据】', result);
        
        // 兼容不同的返回格式
        if (result.code === '200' || result.status === 200 || result.success) {
            return true;
        } else {
            alert('邮件发送失败：' + (result.msg || result.message || 'API返回非成功状态'));
            return false;
        }
    } catch (error) {
        console.error('【邮件发送异常】', error);
        alert('邮件发送失败：' + error.message);
        return false;
    }
}

// 验证码倒计时
function startCodeTimer(btn) {
    if (!btn) return;
    
    let count = 60;
    btn.disabled = true;
    btn.textContent = `重新发送(${count}s)`;
    
    // 清除旧的倒计时器
    if (window.codeTimer) clearInterval(window.codeTimer);
    
    window.codeTimer = setInterval(() => {
        count--;
        btn.textContent = `重新发送(${count}s)`;
        if (count <= 0) {
            clearInterval(window.codeTimer);
            btn.disabled = false;
            btn.textContent = '发送验证码';
        }
    }, 1000);
}

// 注册/登录/找回密码
async function register() {
    const username = document.getElementById('register-name')?.value.trim() || document.getElementById('reg-username')?.value.trim();
    const email = document.getElementById('register-email')?.value.trim() || document.getElementById('reg-email')?.value.trim();
    const password = document.getElementById('register-pwd')?.value.trim() || document.getElementById('reg-pwd')?.value.trim();
    const code = document.getElementById('register-code')?.value.trim();
    
    // 验证输入
    if (!username || !email || !password) {
        alert('请填写所有必填字段！');
        return;
    }
    if (password.length < 6) {
        alert('密码至少6位！');
        return;
    }
    
    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('邮箱格式不正确！');
        return;
    }
    
    // 检查用户名是否已存在
    const { data: usernameExists } = await window.supabase
        .from('users')
        .select('id')
        .eq('username', username)
        .single()
        .catch(() => ({ data: null }));
    
    if (usernameExists) {
        alert('用户名已存在，请更换！');
        return;
    }
    
    // 如果启用了邮箱验证码，则验证验证码
    if (emailVerificationEnabled) {
        if (!code) {
            alert('请输入验证码！');
            return;
        }
        
        // 验证验证码
        const { data: codeData, error: codeError } = await window.supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('type', 'register')
            .eq('code', code)
            .gte('expire_at', new Date())
            .single()
            .catch(() => ({ data: null, error: true }));
        
        if (codeError || !codeData) {
            alert('验证码无效或已过期！');
            return;
        }
    }
    
    try {
        // Supabase注册账号
        const { data: { user }, error: authError } = await window.supabase.auth.signUp({
            email,
            password
        });
        
        if (authError) {
            alert('注册失败：' + authError.message);
            return;
        }
        
        // 保存用户信息
        const { error: userError } = await window.supabase
            .from('users')
            .insert([{ id: user.id, username, email, points: 0, status: 1 }]);
        
        if (userError) {
            // 注册成功但用户信息保存失败，需要清理认证信息
            await window.supabase.auth.admin.deleteUser(user.id);
            alert('用户信息保存失败：' + userError.message);
            return;
        }
        
        // 如果启用了邮箱验证码，删除已使用的验证码
        if (emailVerificationEnabled && code) {
            await window.supabase
                .from('verification_codes')
                .delete()
                .eq('email', email)
                .eq('type', 'register');
        }
        
        alert('注册成功！请登录～');
        switchTab('login');
        clearModalForms();
    } catch (err) {
        alert('注册异常：' + err.message);
    }
}

async function login(account, password) {
    // 支持邮箱登录
    let email = account || document.getElementById('login-email')?.value.trim() || document.getElementById('login-account')?.value.trim();
    let pwd = password || document.getElementById('login-pwd')?.value.trim();
    
    if (!email || !pwd) {
        alert('请填写邮箱和密码！');
        return;
    }
    
    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('邮箱格式不正确！');
        return;
    }
    
    try {
        const { data: { user, session }, error } = await window.supabase.auth.signInWithPassword({
            email,
            password: pwd
        });
        
        if (error) {
            alert('登录失败：' + error.message);
            return;
        }
        
        // 检查用户状态
        const { data: userData } = await window.supabase
            .from('users')
            .select('status')
            .eq('id', user.id)
            .single();
            
        if (userData && userData.status === 0) {
            // 用户被禁用，自动登出
            await window.supabase.auth.signOut();
            alert('账号已被禁用，请联系管理员！');
            return;
        }
        
        window.currentUser = user;
        // 调用main.js中的函数更新UI
        if (window.loadUserInfo) await window.loadUserInfo();
        if (window.checkSignStatus) await window.checkSignStatus();
        if (window.switchAuthUI) window.switchAuthUI(true);
        
        // 管理员判断
        const ADMIN_EMAIL = window.ADMIN_EMAIL || 'admin@example.com';
        if (email === ADMIN_EMAIL) {
            const adminLink = document.getElementById('admin-link');
            if (adminLink) adminLink.style.display = 'inline-block';
        }
        
        closeModal();
        clearModalForms();
    } catch (err) {
        alert('登录异常：' + err.message);
    }
}

async function resetPassword() {
    const email = document.getElementById('find-email')?.value.trim() || document.getElementById('forgot-email')?.value.trim();
    const code = document.getElementById('find-code')?.value.trim();
    const newPwd = document.getElementById('new-pwd')?.value.trim();
    
    // 验证输入
    if (!email || !newPwd) {
        alert('请填写邮箱和新密码！');
        return;
    }
    if (newPwd.length < 6) {
        alert('密码至少6位！');
        return;
    }
    
    // 邮箱格式校验
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
        alert('邮箱格式不正确！');
        return;
    }
    
    // 如果启用了邮箱验证码，则验证验证码
    if (emailVerificationEnabled) {
        if (!code) {
            alert('请输入验证码！');
            return;
        }
        
        // 验证验证码
        const { data: codeData, error: codeError } = await window.supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('type', 'find_pwd')
            .eq('code', code)
            .gte('expire_at', new Date())
            .single()
            .catch(() => ({ data: null, error: true }));
        
        if (codeError || !codeData) {
            alert('验证码无效或已过期！');
            return;
        }
    }
    
    try {
        // 先登录获取会话（重置密码需要当前会话）
        const { data: { session }, error: signInError } = await window.supabase.auth.signInWithOtp({
            email,
            token_hash: code,
            type: 'email_change'
        });
        
        if (signInError) {
            alert('验证失败：' + signInError.message);
            return;
        }
        
        // 重置密码
        const { error } = await window.supabase.auth.updateUser({
            password: newPwd
        });
        
        if (error) {
            alert('密码重置失败：' + error.message);
            return;
        }
        
        // 如果启用了邮箱验证码，删除已使用的验证码
        if (emailVerificationEnabled && code) {
            await window.supabase
                .from('verification_codes')
                .delete()
                .eq('email', email)
                .eq('type', 'find_pwd');
        }
        
        alert('密码重置成功！请重新登录～');
        switchTab('login');
        clearModalForms();
    } catch (err) {
        alert('密码重置异常：' + err.message);
    }
}

async function logout() {
    try {
        const { error } = await window.supabase.auth.signOut();
        if (error) {
            alert('退出失败：' + error.message);
            return;
        }
        
        window.currentUser = null;
        if (window.switchAuthUI) window.switchAuthUI(false);
        const adminLink = document.getElementById('admin-link');
        if (adminLink) adminLink.style.display = 'none';
        alert('退出成功！');
    } catch (err) {
        alert('退出异常：' + err.message);
    }
}

// 签到功能（统一实现，避免重复定义）
async function signIn() {
    if (!window.currentUser) {
        alert('请先登录！');
        openModal('login');
        return;
    }
    
    try {
        const today = new Date().toISOString().split('T')[0];
        
        // 检查今天是否已签到
        const { data: signRecord } = await window.supabase
            .from('sign_records')
            .select('*')
            .eq('user_id', window.currentUser.id)
            .eq('sign_date', today)
            .single()
            .catch(() => ({ data: null }));
        
        if (signRecord) {
            alert('今天已经签过到啦！');
            return;
        }
        
        // 记录签到
        const { error: signError } = await window.supabase
            .from('sign_records')
            .insert([{ user_id: window.currentUser.id, sign_date: today }]);
        
        if (signError) {
            alert('签到失败：' + signError.message);
            return;
        }
        
        // 增加积分（+10分）
        const { data: userData } = await window.supabase
            .from('users')
            .select('points')
            .eq('id', window.currentUser.id)
            .single();
        
        const newPoints = (userData.points || 0) + 10;
        await window.supabase
            .from('users')
            .update({ points: newPoints })
            .eq('id', window.currentUser.id);
        
        // 更新UI
        const pointsEl = document.getElementById('points');
        if (pointsEl) pointsEl.textContent = newPoints;
        
        const signBtn = document.getElementById('sign-btn');
        if (signBtn) {
            signBtn.disabled = true;
            signBtn.textContent = '已签到';
        }
        
        alert('签到成功！获得10积分～');
    } catch (err) {
        alert('签到异常：' + err.message);
    }
}

// 暴露函数到全局
window.sendMail = sendMail;
window.startCodeTimer = startCodeTimer;
window.emailVerificationEnabled = emailVerificationEnabled;
window.login = login;
window.register = register;
window.logout = logout;
window.signIn = signIn;
window.resetPassword = resetPassword;
