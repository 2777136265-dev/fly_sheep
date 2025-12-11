// 页面加载完成后绑定事件
window.addEventListener('DOMContentLoaded', () => {
    bindAuthEvents();
});

// 绑定认证相关事件
function bindAuthEvents() {
    // 登录/注册按钮
    document.getElementById('login-btn').addEventListener('click', () => openModal('login'));
    document.getElementById('login-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        openModal('login');
    });
    
    document.getElementById('register-btn').addEventListener('click', () => openModal('register'));
    document.getElementById('register-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        openModal('register');
    });
    
    // 退出按钮
    document.getElementById('logout-btn').addEventListener('click', logout);
    document.getElementById('logout-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        logout();
    });
    
    // 签到按钮
    document.getElementById('sign-btn').addEventListener('click', signIn);
    document.getElementById('sign-btn').addEventListener('touchstart', (e) => {
        e.preventDefault();
        signIn();
    });
    
    // 弹窗关闭按钮
    document.getElementById('close-modal').addEventListener('click', closeModal);
    document.getElementById('close-modal').addEventListener('touchstart', (e) => {
        e.preventDefault();
        closeModal();
    });
    
    // 弹窗标签切换
    document.querySelectorAll('.tab-btn').forEach(btn => {
        btn.addEventListener('click', () => switchTab(btn.dataset.tab));
        btn.addEventListener('touchstart', (e) => {
            e.preventDefault();
            switchTab(btn.dataset.tab);
        });
    });
    
    // 表单提交按钮
    document.getElementById('do-login').addEventListener('click', login);
    document.getElementById('do-register').addEventListener('click', register);
    document.getElementById('do-reset-pwd').addEventListener('click', resetPassword);
    
    // 发送验证码按钮
    document.getElementById('send-register-code').addEventListener('click', sendRegisterCode);
    document.getElementById('send-find-code').addEventListener('click', sendFindPwdCode);
}

// 弹窗控制
function openModal(type) {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'flex';
    switchTab(type);
    // 阻止移动端滚动穿透
    modal.addEventListener('touchmove', (e) => e.preventDefault());
}

function closeModal() {
    const modal = document.getElementById('auth-modal');
    modal.style.display = 'none';
    // 清空表单
    clearModalForms();
    // 恢复滚动
    modal.removeEventListener('touchmove', (e) => e.preventDefault());
}

function switchTab(type) {
    // 切换标签样式
    document.querySelectorAll('.tab-btn').forEach(tab => tab.classList.remove('active'));
    document.querySelector(`.tab-btn[data-tab="${type}"]`).classList.add('active');
    
    // 切换表单
    document.querySelectorAll('.modal-form').forEach(form => form.classList.remove('active'));
    document.getElementById(`${type}-form`).classList.add('active');
}

function clearModalForms() {
    // 清空所有表单
    document.getElementById('login-email').value = '';
    document.getElementById('login-pwd').value = '';
    document.getElementById('register-name').value = '';
    document.getElementById('register-email').value = '';
    document.getElementById('register-pwd').value = '';
    document.getElementById('register-code').value = '';
    document.getElementById('find-email').value = '';
    document.getElementById('find-code').value = '';
    document.getElementById('new-pwd').value = '';
}

// 验证码发送
async function sendRegisterCode() {
    // 如果未启用邮箱验证码，直接跳过
    if (!emailVerificationEnabled) {
        alert('邮箱验证码功能已关闭');
        return;
    }
    
    const email = document.getElementById('register-email').value.trim();
    if (!email) {
        alert('请输入邮箱！');
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
    const { error } = await supabase
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
    // 如果未启用邮箱验证码，直接跳过
    if (!emailVerificationEnabled) {
        alert('邮箱验证码功能已关闭');
        return;
    }
    
    const email = document.getElementById('find-email').value.trim();
    if (!email) {
        alert('请输入邮箱！');
        return;
    }
    
    // 检查邮箱是否存在
    const { data: user } = await supabase
        .from('users')
        .select('*')
        .eq('email', email)
        .single();
    
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
    const { error } = await supabase
        .from('verification_codes')
        .insert([{ email, code, type: 'find_pwd', expire_at: new Date(Date.now() + 5 * 60 * 1000) }]);
    
    if (error) {
        alert('验证码保存失败：' + error.message);
        return;
    }
    
    // 倒计时
    const btn = document.getElementById('send-find-code');
    startCodeTimer(btn);
    alert('验证码已发送至你的邮箱！');
}

// 修复后的 sendMail 函数（重点检查 headers）
async function sendMail(to, subject, content) {
  try {
    const response = await fetch(mailApiUrl, {
      method: 'POST',
      headers: {
        'accept': '*/*',
        'token': 'oqrUZ6_DEc0gc4YBGvRlygSCiHY4', // 必须和手动测试一致
        'Content-Type': 'application/json',
        // 新增：避免 OPTIONS 预检失败（部分 API 要求）
        'Access-Control-Allow-Origin': '*'
      },
      body: JSON.stringify({ to, subject, content }),
      // 新增：允许跨域携带凭证（若 API 需验证）
      credentials: 'omit'
    });
    const result = await response.json();
    console.log('邮件接口返回：', result); // 新增日志，方便排查
    return result.code === '200' && result.data;
  } catch (error) {
    console.error('邮件发送失败：', error); // 打印具体错误
    return false;
  }
}

// 验证码倒计时
function startCodeTimer(btn) {
    let count = 60;
    btn.disabled = true;
    btn.textContent = `重新发送(${count}s)`;
    
    codeTimer = setInterval(() => {
        count--;
        btn.textContent = `重新发送(${count}s)`;
        if (count <= 0) {
            clearInterval(codeTimer);
            btn.disabled = false;
            btn.textContent = '发送验证码';
        }
    }, 1000);
}

// 注册/登录/找回密码
async function register() {
    const username = document.getElementById('register-name').value.trim();
    const email = document.getElementById('register-email').value.trim();
    const password = document.getElementById('register-pwd').value.trim();
    const code = document.getElementById('register-code').value.trim();
    
    // 验证输入
    if (!username || !email || !password) {
        alert('请填写所有必填字段！');
        return;
    }
    
    if (password.length < 6) {
        alert('密码至少6位！');
        return;
    }
    
    // 如果启用了邮箱验证码，则验证验证码
    if (emailVerificationEnabled) {
        if (!code) {
            alert('请输入验证码！');
            return;
        }
        
        // 验证验证码
        const { data: codeData, error: codeError } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('type', 'register')
            .eq('code', code)
            .gte('expire_at', new Date())
            .single();
        
        if (codeError || !codeData) {
            alert('验证码无效或已过期！');
            return;
        }
    }
    
    // Supabase注册账号
    const { data: { user }, error: authError } = await supabase.auth.signUp({
        email,
        password
    });
    
    if (authError) {
        alert('注册失败：' + authError.message);
        return;
    }
    
    // 保存用户信息
    const { error: userError } = await supabase
        .from('users')
        .insert([{ id: user.id, username, email, points: 0, status: 1 }]);
    
    if (userError) {
        alert('用户信息保存失败：' + userError.message);
        return;
    }
    
    // 如果启用了邮箱验证码，删除已使用的验证码
    if (emailVerificationEnabled && code) {
        await supabase
            .from('verification_codes')
            .delete()
            .eq('email', email)
            .eq('type', 'register');
    }
    
    alert('注册成功！请登录～');
    switchTab('login');
    clearModalForms();
}

async function login() {
    const email = document.getElementById('login-email').value.trim();
    const password = document.getElementById('login-pwd').value.trim();
    
    if (!email || !password) {
        alert('请填写邮箱和密码！');
        return;
    }
    
    try {
        const { data: { user }, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });
        
        if (error) {
            alert('登录失败：' + error.message);
            return;
        }
        
        currentUser = user;
        await loadUserInfo();
        await checkSignStatus();
        switchAuthUI(true);
        
        // 管理员判断
        if (email === ADMIN_EMAIL) {
            document.getElementById('admin-link').style.display = 'inline-block';
        }
        
        closeModal();
        clearModalForms();
    } catch (err) {
        alert('登录异常：' + err.message);
    }
}

async function resetPassword() {
    const email = document.getElementById('find-email').value.trim();
    const code = document.getElementById('find-code').value.trim();
    const newPwd = document.getElementById('new-pwd').value.trim();
    
    // 验证输入
    if (!email || !newPwd) {
        alert('请填写邮箱和新密码！');
        return;
    }
    
    if (newPwd.length < 6) {
        alert('密码至少6位！');
        return;
    }
    
    // 如果启用了邮箱验证码，则验证验证码
    if (emailVerificationEnabled) {
        if (!code) {
            alert('请输入验证码！');
            return;
        }
        
        // 验证验证码
        const { data: codeData, error: codeError } = await supabase
            .from('verification_codes')
            .select('*')
            .eq('email', email)
            .eq('type', 'find_pwd')
            .eq('code', code)
            .gte('expire_at', new Date())
            .single();
        
        if (codeError || !codeData) {
            alert('验证码无效或已过期！');
            return;
        }
    }
    
    // 重置密码
    const { error } = await supabase.auth.updateUser({
        password: newPwd
    });
    
    if (error) {
        alert('密码重置失败：' + error.message);
        return;
    }
    
    // 如果启用了邮箱验证码，删除已使用的验证码
    if (emailVerificationEnabled && code) {
        await supabase
            .from('verification_codes')
            .delete()
            .eq('email', email)
            .eq('type', 'find_pwd');
    }
    
    alert('密码重置成功！请重新登录～');
    switchTab('login');
    clearModalForms();
}

async function logout() {
    try {
        const { error } = await supabase.auth.signOut();
        if (error) {
            alert('退出失败：' + error.message);
            return;
        }
        
        currentUser = null;
        switchAuthUI(false);
        document.getElementById('admin-link').style.display = 'none';
        alert('退出成功！');
    } catch (err) {
        alert('退出异常：' + err.message);
    }
}
