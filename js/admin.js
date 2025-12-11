// 页面加载完成后绑定事件
window.addEventListener('DOMContentLoaded', () => {
    // 验证管理员权限
    if (!isAdmin()) {
        alert('没有管理员权限，无法访问后台！');
        hideAdminPanel();
        return;
    }
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
    
    // 添加刷新用户列表按钮事件
    const refreshBtn = document.createElement('button');
    refreshBtn.textContent = '刷新用户列表';
    refreshBtn.className = 'auth-btn';
    refreshBtn.style.marginLeft = '1rem';
    refreshBtn.addEventListener('click', loadUserList);
    refreshBtn.addEventListener('touchstart', (e) => {
        e.preventDefault();
        loadUserList();
    });
    document.querySelector('.admin-header').appendChild(refreshBtn);
}

// 验证是否为管理员
function isAdmin() {
    // 从URL参数检查管理员权限
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('admin') === '1') return true;
    
    // 从当前用户检查管理员权限
    if (window.currentUser && window.currentUser.email === window.ADMIN_EMAIL) return true;
    
    return false;
}

// 加载用户列表
async function loadUserList() {
    try {
        // 显示加载状态
        const userListEl = document.getElementById('user-list');
        userListEl.innerHTML = '<tr><td colspan="6" style="text-align:center">加载中...</td></tr>';
        
        const { data: users, error } = await window.supabase
            .from('users')
            .select('*')
            .order('created_at', { ascending: false });
        
        if (error) {
            throw new Error(error.message);
        }
        
        userListEl.innerHTML = '';
        
        if (users.length === 0) {
            userListEl.innerHTML = '<tr><td colspan="6" style="text-align:center">暂无用户数据</td></tr>';
            return;
        }
        
        users.forEach(user => {
            const row = document.createElement('tr');
            // 管理员行添加特殊样式
            const isCurrentUserAdmin = window.currentUser && window.currentUser.email === window.ADMIN_EMAIL;
            const isThisAdmin = user.email === window.ADMIN_EMAIL;
            
            row.innerHTML = `
                <td>${user.id}</td>
                <td>${user.username} ${isThisAdmin ? '<span style="color:red">(管理员)</span>' : ''}</td>
                <td>${user.email}</td>
                <td>${user.points || 0}</td>
                <td>${user.status === 1 ? '<span style="color:green">正常</span>' : '<span style="color:red">禁用</span>'}</td>
                <td>
                    ${isThisAdmin && isCurrentUserAdmin ? 
                        '<button class="disable-btn" disabled>不可操作</button>' : 
                        `<button class="disable-btn" onclick="toggleUserStatus('${user.id}', ${user.status || 1})">
                            ${(user.status || 1) === 1 ? '禁用' : '启用'}
                        </button>`
                    }
                    ${isThisAdmin ? 
                        '<button class="delete-btn" disabled>不可删除</button>' : 
                        `<button class="delete-btn" onclick="deleteUser('${user.id}')">删除</button>`
                    }
                </td>
            `;
            userListEl.appendChild(row);
        });
    } catch (err) {
        alert('加载用户列表失败：' + err.message);
        document.getElementById('user-list').innerHTML = '<tr><td colspan="6" style="text-align:center">加载失败，请重试</td></tr>';
    }
}

// 切换用户状态（启用/禁用）
async function toggleUserStatus(userId, currentStatus) {
    // 验证权限
    if (!isAdmin()) {
        alert('权限验证失败，请重新登录');
        return;
    }
    
    const newStatus = currentStatus === 1 ? 0 : 1;
    const actionText = newStatus === 1 ? '启用' : '禁用';
    
    if (!confirm(`确定要${actionText}该用户吗？`)) {
        return;
    }
    
    try {
        const { error } = await window.supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);
        
        if (error) {
            throw new Error(error.message);
        }
        
        alert(`${actionText}成功！`);
        loadUserList(); // 重新加载用户列表
    } catch (err) {
        alert(`${actionText}失败：` + err.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    // 验证权限
    if (!isAdmin()) {
        alert('权限验证失败，请重新登录');
        return;
    }
    
    // 检查是否是管理员账号
    const { data: user } = await window.supabase
        .from('users')
        .select('email')
        .eq('id', userId)
        .single();
    
    if (user && user.email === window.ADMIN_EMAIL) {
        alert('不能删除管理员账号！');
        return;
    }
    
    if (!confirm('确定要删除该用户吗？此操作不可恢复，将同时删除该用户的所有签到记录！')) {
        return;
    }
    
    try {
        // 开启事务处理
        const { data, error: transactionError } = await window.supabase.rpc('delete_user_with_records', {
            target_user_id: userId
        });
        
        if (transactionError) {
            throw new Error(transactionError.message);
        }
        
        // 删除Supabase认证用户
        try {
            await window.supabase.auth.admin.deleteUser(userId);
        } catch (err) {
            console.warn('删除认证用户失败（可能是第三方登录用户）：', err);
        }
        
        alert('删除成功！');
        loadUserList(); // 重新加载用户列表
    } catch (err) {
        alert('删除失败：' + err.message);
    }
}

// 添加批量操作功能
async function batchDeleteUsers() {
    const selectedIds = [];
    document.querySelectorAll('#user-list input[type="checkbox"]:checked').forEach(checkbox => {
        selectedIds.push(checkbox.value);
    });
    
    if (selectedIds.length === 0) {
        alert('请先选择要删除的用户');
        return;
    }
    
    if (!confirm(`确定要删除选中的${selectedIds.length}个用户吗？此操作不可恢复！`)) {
        return;
    }
    
    try {
        // 批量删除签到记录
        await window.supabase
            .from('sign_records')
            .delete()
            .in('user_id', selectedIds);
        
        // 批量删除用户
        const { error } = await window.supabase
            .from('users')
            .delete()
            .in('id', selectedIds);
        
        if (error) {
            throw new Error(error.message);
        }
        
        // 批量删除认证用户
        for (const id of selectedIds) {
            try {
                await window.supabase.auth.admin.deleteUser(id);
            } catch (err) {
                console.warn(`删除用户${id}的认证记录失败：`, err);
            }
        }
        
        alert(`成功删除${selectedIds.length}个用户！`);
        loadUserList();
    } catch (err) {
        alert('批量删除失败：' + err.message);
    }
}
