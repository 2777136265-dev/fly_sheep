// 加载资源列表
async function loadResourceList() {
    const searchKey = document.getElementById('search-input').value.trim();
    const activeTag = document.querySelector('.filter-tag.active').dataset.tag;
    
    let query = supabase.from('resources').select('*').order('created_at', { ascending: false });
    
    // 筛选条件
    if (searchKey) {
        query = query.or(`title.ilike.%${searchKey}%,desc.ilike.%${searchKey}%`);
    }
    if (activeTag !== 'all') {
        query = query.eq('category', activeTag);
    }
    
    const { data: resources, error } = await query;
    
    if (error) {
        console.error('加载资源失败：', error);
        return;
    }
    
    const container = document.getElementById('resource-container');
    if (resources.length === 0) {
        container.innerHTML = `
            <div class="empty-state">
                <i class="fas fa-folder-open"></i>
                <p>暂无资源，登录后可上传分享</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = '';
    resources.forEach(resource => {
        const card = document.createElement('div');
        card.className = 'resource-card';
        card.innerHTML = `
            <div class="resource-header">${resource.category}</div>
            <div class="resource-body">
                <h3 class="resource-title">${resource.title}</h3>
                <p class="resource-desc">${resource.desc || '无描述'}</p>
            </div>
            <div class="resource-footer">
                <span class="resource-tag">上传者：${resource.username}</span>
                <a href="${resource.link}" target="_blank" class="resource-btn">
                    <i class="fas fa-link"></i> 访问资源
                </a>
            </div>
        `;
        container.appendChild(card);
    });
}

// 上传资源
async function uploadResource() {
    if (!currentUser) {
        alert('请先登录！');
        return;
    }

    const title = document.getElementById('resource-title').value.trim();
    const category = document.getElementById('resource-category').value;
    const desc = document.getElementById('resource-desc').value.trim();
    const link = document.getElementById('resource-link').value.trim();

    if (!title || !category || !link) {
        alert('请填写必填项！');
        return;
    }

    try {
        // 获取用户名
        const { data: userData } = await supabase
            .from('users')
            .select('username')
            .eq('id', currentUser.id)
            .single();
        
        // 上传资源
        await supabase.from('resources').insert([{
            title,
            category,
            desc,
            link,
            user_id: currentUser.id,
            username: userData.username,
            created_at: new Date().toISOString()
        }]);

        // 增加积分
        await supabase
            .from('users')
            .update({ points: (userData.points || 0) + 5 })
            .eq('id', currentUser.id);
        
        alert('资源上传成功！获得5积分～');
        document.getElementById('upload-modal').classList.remove('active');
        // 清空表单
        document.getElementById('resource-title').value = '';
        document.getElementById('resource-category').value = '';
        document.getElementById('resource-desc').value = '';
        document.getElementById('resource-link').value = '';
        // 刷新资源列表
        loadResourceList();
        // 刷新用户积分
        loadUserInfo();
    } catch (err) {
        alert('上传失败：' + err.message);
    }
}

// 管理员加载资源列表
async function loadAdminResourceList() {
    const { data: resources, error } = await supabase
        .from('resources')
        .select('*')
        .order('created_at', { ascending: false });
    
    if (error) {
        console.error('加载资源失败：', error);
        return;
    }
    
    const tableBody = document.querySelector('#resource-admin-list tbody');
    tableBody.innerHTML = '';
    
    if (resources.length === 0) {
        tableBody.innerHTML = '<tr><td colspan="5">暂无资源</td></tr>';
        return;
    }
    
    resources.forEach(resource => {
        const row = document.createElement('tr');
        row.innerHTML = `
            <td>${resource.id}</td>
            <td>${resource.title}</td>
            <td>${resource.category}</td>
            <td>${resource.username}</td>
            <td>
                <button class="action-btn delete-btn" onclick="deleteResource('${resource.id}')">删除</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// 删除资源
async function deleteResource(resourceId) {
    if (!confirm('确定要删除该资源吗？')) return;
    
    try {
        await supabase
            .from('resources')
            .delete()
            .eq('id', resourceId);
        
        alert('删除成功！');
        loadAdminResourceList();
        loadResourceList();
    } catch (err) {
        alert('删除失败：' + err.message);
    }
}

// 事件监听
window.addEventListener('DOMContentLoaded', () => {
    // 上传资源按钮
    document.getElementById('do-upload').addEventListener('click',