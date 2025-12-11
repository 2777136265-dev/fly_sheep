// 加载用户列表
async function loadUserList() {
    const { data: users, error } = await supabase
        .from('users')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('加载用户失败：', error);
        return;
    }
    
    const tableBody = document.querySelector('#user-list tbody');
    tableBody.innerHTML = '';
    
    users.forEach(user => {
        const row = document.createElement('tr');
        const isAdmin = user.email === ADMIN_EMAIL;
        row.innerHTML = `
            <td>${user.id}</td>
            <td>${user.username} ${isAdmin ? '<span style="color:red">(管理员)</span>' : ''}</td>
            <td>${user.email}</td>
            <td>${user.points || 0}</td>
            <td>${user.status === 1 ? '<span style="color:green">正常</span>' : '<span style="color:red">禁用</span>'}</td>
            <td>
                ${isAdmin ? 
                    '<button class="action-btn" disabled>不可操作</button>' : 
                    `<button class="action-btn disable-btn" onclick="toggleUserStatus('${user.id}', ${user.status})">
                        ${user.status === 1 ? '禁用' : '启用'}
                    </button>
                    <button class="action-btn delete-btn" onclick="deleteUser('${user.id}')">删除</button>`
                }
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 切换用户状态
async function toggleUserStatus(userId, currentStatus) {
    const newStatus = currentStatus === 1 ? 0 : 1;
    const action = newStatus === 1 ? '启用' : '禁用';
    
    if (!confirm(`确定要${action}该用户吗？`)) return;
    
    try {
        await supabase
            .from('users')
            .update({ status: newStatus })
            .eq('id', userId);
        
        alert(`${action}成功！`);
        loadUserList();
    } catch (err) {
        alert(`${action}失败：` + err.message);
    }
}

// 删除用户
async function deleteUser(userId) {
    if (!confirm('确定要删除该用户吗？此操作不可恢复！')) return;
    
    try {
        // 删除用户的签到记录
        await supabase
            .from('sign_records')
            .delete()
            .eq('user_id', userId);
        
        // 删除用户的资源
        await supabase
            .from('resources')
            .delete()
            .eq('user_id', userId);
        
        // 删除用户
        await supabase
            .from('users')
            .delete()
            .eq('id', userId);
        
        // 删除Supabase认证用户
        try {
            await supabase.auth.admin.deleteUser(userId);
        } catch (err) {
            console.warn('删除认证用户失败：', err);
        }
        
        alert('删除成功！');
        loadUserList();
        loadResourceList();
    } catch (err) {
        alert('删除失败：' + err.message);
    }
}

// 暴露全局函数
window.loadUserList = loadUserList;
window.toggleUserStatus = toggleUserStatus;
window.deleteUser = deleteUser;
