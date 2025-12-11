// 页面加载完成后绑定事件
window.addEventListener('DOMContentLoaded', () => {
    bindAdminEvents();
});

// 绑定管理员相关事件
function bindAdminEvents() {
    // 返回主页按钮
    document.getElementById('back-home').addEventListener('click', hideAdminPanel);
    document.getElementById('back-home').addEventListener('touchstart', (e) => {
        e.preventDefault();
        hideAdminPanel();
    });
    
    // 邮箱验证码开关
    document.getElementById('email-verification-switch').addEventListener('change', saveSystemSettings);
}

// 加载用户列表
async function loadUserList() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        alert('加载用户列表失败：' + error.message);
        return;
    }
    
    const userListEl = document.getElementById('user-list');
    userListEl.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username}</td>
            <td>${user.email}</td>
            <td>${user.points}</td>
            <td>${user.status === 1 ? '正常' : '禁用'}</td>
            <td>
                <button class="disable-btn" onclick="toggleUserStatus('${user.id}', ${user.status})">
                    ${user.status === 1 ? '禁用' : '启用'}
                </button>
                <button class="delete-btn" onclick="deleteUser('${user.id}')">删除</button>
            </td>
        `;
        userListEl.appendChild(row);
    });
}

// 切换用户状态（启用/禁用）
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? '启用' : '禁用';
    
    if (!confirm(`确定要${actionText}该用户吗？`)) {
        return;
    }
    
    const { error } = await supabase
        .from('users')
        .update({ status: newStatus })
        .eq('id', userId);
    
    if (error) {
        alert(`${actionText}失败：` + error.message);
        return;
    }
    
    alert(`${actionText}成功！`);
    loadUserList(); // 重新加载用户列表
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) {
        return;
    }
    
    // 先删除用户的签到记录
    await supabase
        .from('sign_records')
        .delete()
        .eq('user_id', userId);
    
    // 再删除用户
    const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', userId);
    
    if (error) {
        alert('删除失败：' + error.message);
        return;
    }
    
    // 最后删除Supabase认证用户
    try {
        await supabase.auth.admin.deleteUser(userId);
    } catch (err) {
        console.warn('删除认证用户失败：', err);
    }
    
    alert('删除成功！');
    loadUserList(); // 重新加载用户列表
}
